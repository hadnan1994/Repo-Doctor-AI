import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { scanRepo } from "../src/scanner/scanRepo.js";
import { generateTemplates } from "../src/templates/generateTemplates.js";
import { ConfigError, defaultConfig, loadConfig } from "../src/utils/config.js";

describe("loadConfig", () => {
  it("returns defaults when repo-doctor.config.json is missing", async () => {
    const repoPath = await makeFixture("defaults");

    await expect(loadConfig(repoPath)).resolves.toEqual(defaultConfig());
  });

  it("loads and merges a valid config file", async () => {
    const repoPath = await makeFixture("valid");
    await writeConfig(repoPath, {
      projectName: "Configured Project",
      author: "Configured Author",
      ignore: ["fixtures"],
      weights: {
        presentation: 100
      }
    });

    await expect(loadConfig(repoPath)).resolves.toEqual({
      projectName: "Configured Project",
      license: "MIT",
      author: "Configured Author",
      ignore: ["fixtures"],
      weights: {
        presentation: 100,
        buildTest: 25,
        cicd: 20,
        security: 20,
        contributors: 10
      }
    });
  });

  it("throws a clear error for invalid JSON", async () => {
    const repoPath = await makeFixture("invalid-json");
    await writeFile(path.join(repoPath, "repo-doctor.config.json"), "{ nope", "utf8");

    await expect(loadConfig(repoPath)).rejects.toBeInstanceOf(ConfigError);
    await expect(loadConfig(repoPath)).rejects.toThrow("Invalid repo-doctor.config.json");
  });

  it("throws a clear error for invalid config shape", async () => {
    const repoPath = await makeFixture("invalid-shape");
    await writeConfig(repoPath, {
      ignore: "dist",
      weights: {
        presentation: -1
      }
    });

    await expect(loadConfig(repoPath)).rejects.toThrow("ignore: Expected array");
    await expect(loadConfig(repoPath)).rejects.toThrow("weights.presentation");
  });

  it("uses projectName and weights during scanning", async () => {
    const repoPath = await makeFixture("scan-integration");
    await writeConfig(repoPath, {
      projectName: "Configured Scan",
      weights: {
        presentation: 0,
        buildTest: 100,
        cicd: 0,
        security: 0,
        contributors: 0
      }
    });

    const result = await scanRepo(repoPath);

    expect(result.repoName).toBe("Configured Scan");
    expect(result.score.overall).toBe(result.score.categories.buildTest);
  });

  it("uses author and license when generating templates", async () => {
    const repoPath = await makeFixture("templates");
    await writeConfig(repoPath, {
      author: "Template Author",
      license: "MIT"
    });

    await generateTemplates(repoPath);

    const license = await readFile(path.join(repoPath, "LICENSE"), "utf8");
    expect(license).toContain(`Copyright (c) ${new Date().getFullYear()} Template Author`);
  });
});

async function makeFixture(name: string): Promise<string> {
  const repoPath = path.join(tmpdir(), `repo-doctor-ai-config-${name}-${randomUUID()}`);
  await mkdir(repoPath, { recursive: true });
  return repoPath;
}

async function writeConfig(repoPath: string, config: unknown): Promise<void> {
  await writeFile(
    path.join(repoPath, "repo-doctor.config.json"),
    JSON.stringify(config, null, 2),
    "utf8"
  );
}
