import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  TemplateGenerationError,
  generateTemplates
} from "../src/templates/generateTemplates.js";

describe("generateTemplates", () => {
  it("does not overwrite files by default", async () => {
    const repoPath = await makeFixture("no-overwrite");
    await writeFile(path.join(repoPath, "SECURITY.md"), "existing policy\n", "utf8");

    const result = await generateTemplates(repoPath);

    await expect(readFile(path.join(repoPath, "SECURITY.md"), "utf8")).resolves.toBe(
      "existing policy\n"
    );
    expect(result.skipped).toContain("SECURITY.md");
  });

  it("overwrites existing files only when force is used", async () => {
    const repoPath = await makeFixture("force");
    await writeFile(path.join(repoPath, "SECURITY.md"), "existing policy\n", "utf8");

    const result = await generateTemplates(repoPath, { force: true });

    await expect(readFile(path.join(repoPath, "SECURITY.md"), "utf8")).resolves.toContain(
      "# Security Policy"
    );
    expect(result.overwritten).toContain("SECURITY.md");
    expect(result.skipped).not.toContain("SECURITY.md");
  });

  it("dry run reports files without creating them", async () => {
    const repoPath = await makeFixture("dry-run");

    const result = await generateTemplates(repoPath, { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.created).toEqual(
      expect.arrayContaining([
        "LICENSE",
        "SECURITY.md",
        "CONTRIBUTING.md",
        "CHANGELOG.md",
        ".github/dependabot.yml",
        ".github/pull_request_template.md",
        ".github/ISSUE_TEMPLATE/bug_report.md",
        ".github/ISSUE_TEMPLATE/feature_request.md",
        ".github/workflows/ci.yml"
      ])
    );
    await expect(readFile(path.join(repoPath, "LICENSE"), "utf8")).rejects.toThrow();
  });

  it("creates nested template directories as needed", async () => {
    const repoPath = await makeFixture("nested");

    await generateTemplates(repoPath);

    await expect(
      readFile(path.join(repoPath, ".github", "ISSUE_TEMPLATE", "bug_report.md"), "utf8")
    ).resolves.toContain("Bug report");
    await expect(
      readFile(path.join(repoPath, ".github", "workflows", "ci.yml"), "utf8")
    ).resolves.toContain("name: CI");
  });

  it("generates Node-specific CI using pnpm and detected scripts", async () => {
    const repoPath = await makeFixture("node-ci");
    await writeFile(
      path.join(repoPath, "package.json"),
      JSON.stringify({
        scripts: {
          test: "vitest",
          build: "tsup",
          lint: "eslint ."
        }
      }),
      "utf8"
    );
    await writeFile(path.join(repoPath, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

    await generateTemplates(repoPath);

    const ci = await readFile(path.join(repoPath, ".github", "workflows", "ci.yml"), "utf8");
    expect(ci).toContain("uses: pnpm/action-setup@v4");
    expect(ci).toContain("node-version: 20");
    expect(ci).toContain("pnpm install --frozen-lockfile");
    expect(ci).toContain("pnpm run lint");
    expect(ci).toContain("pnpm run test");
    expect(ci).toContain("pnpm run build");
  });

  it("uses generic CI when no stack is detected", async () => {
    const repoPath = await makeFixture("generic-ci");

    await generateTemplates(repoPath);

    const ci = await readFile(path.join(repoPath, ".github", "workflows", "ci.yml"), "utf8");
    expect(ci).toContain("Inspect project files");
    expect(ci).toContain("Customize this workflow");
  });

  it("throws a clear error for missing template targets", async () => {
    const repoPath = path.join(tmpdir(), `repo-doctor-ai-missing-${randomUUID()}`);

    await expect(generateTemplates(repoPath)).rejects.toBeInstanceOf(TemplateGenerationError);
    await expect(generateTemplates(repoPath)).rejects.toMatchObject({
      code: "PATH_NOT_FOUND",
      message: `Template target does not exist: ${repoPath}`
    });
  });

  it("throws a clear error when the template target is a file", async () => {
    const repoPath = await makeFixture("file-target");
    const filePath = path.join(repoPath, "README.md");
    await writeFile(filePath, "# Demo\n", "utf8");

    await expect(generateTemplates(filePath)).rejects.toMatchObject({
      code: "PATH_NOT_DIRECTORY",
      message: `Template target is not a directory: ${filePath}`
    });
  });
});

async function makeFixture(name: string): Promise<string> {
  const repoPath = path.join(tmpdir(), `repo-doctor-ai-fix-${name}-${randomUUID()}`);
  await mkdir(repoPath, { recursive: true });
  return repoPath;
}
