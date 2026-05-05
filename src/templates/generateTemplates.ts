import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectStack } from "../scanner/detectStack.js";
import { getTemplateFiles } from "./templateData.js";
import { fileExists } from "../utils/fileExists.js";
import { loadConfig } from "../utils/config.js";

export type GenerateTemplateOptions = {
  dryRun?: boolean;
  force?: boolean;
};

export type GenerateTemplateResult = {
  created: string[];
  overwritten: string[];
  skipped: string[];
  dryRun: boolean;
};

export class TemplateGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: "PATH_NOT_FOUND" | "PATH_NOT_DIRECTORY"
  ) {
    super(message);
    this.name = "TemplateGenerationError";
  }
}

export async function generateTemplates(
  repoPath: string,
  options: GenerateTemplateOptions = {}
): Promise<GenerateTemplateResult> {
  await assertTemplateTarget(repoPath);

  const created: string[] = [];
  const overwritten: string[] = [];
  const skipped: string[] = [];
  const config = await loadConfig(repoPath);
  const stackDetection = await detectStack(repoPath, { ignore: config.ignore });
  const templateFiles = getTemplateFiles(stackDetection, config);

  for (const template of templateFiles) {
    const target = path.join(repoPath, template.path);
    const exists = await fileExists(target);

    if (exists && !options.force) {
      skipped.push(template.path);
      continue;
    }

    if (exists) {
      overwritten.push(template.path);
    } else {
      created.push(template.path);
    }

    if (!options.dryRun) {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, template.contents, "utf8");
    }
  }

  return {
    created,
    overwritten,
    skipped,
    dryRun: Boolean(options.dryRun)
  };
}

async function assertTemplateTarget(repoPath: string): Promise<void> {
  let stats;

  try {
    stats = await stat(repoPath);
  } catch {
    throw new TemplateGenerationError(
      `Template target does not exist: ${repoPath}`,
      "PATH_NOT_FOUND"
    );
  }

  if (!stats.isDirectory()) {
    throw new TemplateGenerationError(
      `Template target is not a directory: ${repoPath}`,
      "PATH_NOT_DIRECTORY"
    );
  }
}
