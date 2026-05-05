import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { ScanRepoError, scanRepo } from "../src/scanner/scanRepo.js";

describe("scanRepo", () => {
  it("returns a complete ScanResult for a repository path", async () => {
    const repoPath = await makeFixture("complete");
    await writeFile(
      path.join(repoPath, "package.json"),
      JSON.stringify({
        name: "demo",
        scripts: {
          test: "vitest"
        }
      }),
      "utf8"
    );

    const result = await scanRepo(repoPath);

    expect(result.repoPath).toBe(repoPath);
    expect(result.repoName).toBe(path.basename(repoPath));
    expect(result.generatedAt).toEqual(expect.any(String));
    expect(result.detectedStacks).toContainEqual(expect.objectContaining({ name: "node" }));
    expect(result.primaryStack).toBe("node");
    expect(result.score.overall).toBeGreaterThanOrEqual(0);
    expect(result.score.overall).toBeLessThanOrEqual(100);
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.summary.failed + result.summary.passed + result.summary.warnings).toBe(
      result.checks.length
    );
    expect(result.topFixes.length).toBeGreaterThan(0);
  });

  it("throws a useful error when the path does not exist", async () => {
    const missingPath = path.join(tmpdir(), `repo-doctor-ai-missing-${randomUUID()}`);

    await expect(scanRepo(missingPath)).rejects.toMatchObject({
      name: "ScanRepoError",
      code: "PATH_NOT_FOUND",
      message: `Repository path does not exist: ${missingPath}`
    });
  });

  it("throws a useful error when the path is not a directory", async () => {
    const repoPath = await makeFixture("file-path");
    const filePath = path.join(repoPath, "README.md");
    await writeFile(filePath, "# Demo\n", "utf8");

    await expect(scanRepo(filePath)).rejects.toMatchObject({
      name: "ScanRepoError",
      code: "PATH_NOT_DIRECTORY",
      message: `Repository path is not a directory: ${filePath}`
    });
  });
});

async function makeFixture(name: string): Promise<string> {
  const repoPath = path.join(tmpdir(), `repo-doctor-ai-scan-${name}-${randomUUID()}`);
  await mkdir(repoPath, { recursive: true });
  return repoPath;
}
