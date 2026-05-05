#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { formatJsonReport } from "./reporters/jsonReporter.js";
import { formatMarkdownReport } from "./reporters/markdownReporter.js";
import { formatTerminalReport } from "./reporters/terminalReporter.js";
import { ScanRepoError, scanRepo } from "./scanner/scanRepo.js";
import { TemplateGenerationError, generateTemplates } from "./templates/generateTemplates.js";
import { ConfigError } from "./utils/config.js";
import { resolveRepoPath } from "./utils/paths.js";

const program = new Command();

program
  .name("repo-doctor-ai")
  .description("Scan, score, and improve repository health.")
  .version("0.1.0")
  .showHelpAfterError()
  .addHelpText(
    "after",
    `

Examples:
  $ repo-doctor-ai scan
  $ repo-doctor-ai scan ./some-project
  $ repo-doctor-ai scan --format markdown --out repo-doctor-report.md
  $ repo-doctor-ai fix --dry-run
`
  );

program
  .command("scan")
  .description("Scan a repository and print or export a health report.")
  .argument("[path]", "repository path to scan", ".")
  .option("-f, --format <format>", "output format: terminal, markdown, or json", "terminal")
  .option("-o, --out <file>", "write markdown or json output to a file")
  .addHelpText(
    "after",
    `

Examples:
  $ repo-doctor-ai scan
  $ repo-doctor-ai scan ./some-project
  $ repo-doctor-ai scan --format markdown --out repo-doctor-report.md
  $ repo-doctor-ai scan --format json --out repo-doctor-report.json
`
  )
  .action(async (inputPath: string, options: { format: string; out?: string }) => {
    const repoPath = resolveRepoPath(inputPath);
    const result = await scanRepo(repoPath);
    const format = normalizeFormat(options.format);

    const output = formatReport(result, format);

    if (options.out) {
      const outputPath = path.resolve(process.cwd(), options.out);
      await writeFile(outputPath, output, "utf8");
      console.log(`${formatLabel(format)} report written to ${outputPath}`);
      return;
    }

    console.log(output);
  });

program
  .command("fix")
  .description("Create safe missing repository templates.")
  .argument("[path]", "repository path to update", ".")
  .option("--dry-run", "preview files without writing changes")
  .option("--force", "overwrite existing template files")
  .addHelpText(
    "after",
    `

Examples:
  $ repo-doctor-ai fix --dry-run
  $ repo-doctor-ai fix
  $ repo-doctor-ai fix --force
`
  )
  .action(async (inputPath: string, options: { dryRun?: boolean; force?: boolean }) => {
    const repoPath = resolveRepoPath(inputPath);
    const result = await generateTemplates(repoPath, options);
    const createVerb = result.dryRun ? "Would create" : "Created";
    const overwriteVerb = result.dryRun ? "Would overwrite" : "Overwrote";

    if (result.dryRun) {
      console.log(`Template dry run for ${repoPath}`);
      console.log("No files will be written.");
      console.log("");
    }

    for (const file of result.created) {
      console.log(`${createVerb}: ${file}`);
    }

    for (const file of result.overwritten) {
      console.log(`${overwriteVerb}: ${file}`);
    }

    for (const file of result.skipped) {
      console.log(`Skipped existing file: ${file}`);
    }

    if (result.created.length === 0 && result.overwritten.length === 0 && result.skipped.length === 0) {
      console.log("No template changes needed.");
      return;
    }

    console.log("");
    if (result.dryRun) {
      console.log(
        `Dry run complete: ${result.created.length} to create, ${result.overwritten.length} to overwrite, ${result.skipped.length} existing files skipped.`
      );
      return;
    }

    console.log(
      `Template update complete: ${result.created.length} created, ${result.overwritten.length} overwritten, ${result.skipped.length} skipped.`
    );
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  if (
    error instanceof ScanRepoError ||
    error instanceof ConfigError ||
    error instanceof TemplateGenerationError
  ) {
    console.error(error.message);
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
});

type OutputFormat = "terminal" | "markdown" | "json";

function normalizeFormat(format: string): OutputFormat {
  const normalizedFormat = format.toLowerCase();
  if (
    normalizedFormat === "terminal" ||
    normalizedFormat === "markdown" ||
    normalizedFormat === "json"
  ) {
    return normalizedFormat;
  }

  throw new Error(`Unsupported format: ${format}`);
}

function formatReport(result: Awaited<ReturnType<typeof scanRepo>>, format: OutputFormat): string {
  if (format === "markdown") return formatMarkdownReport(result);
  if (format === "json") return formatJsonReport(result);
  return formatTerminalReport(result);
}

function formatLabel(format: OutputFormat): string {
  if (format === "json") return "JSON";
  if (format === "markdown") return "Markdown";
  return "Terminal";
}
