import path from "node:path";
import { stat } from "node:fs/promises";
import { runChecks } from "./checks.js";
import { detectStack } from "./detectStack.js";
import { calculateScore } from "./score.js";
import type { ScanResult } from "./types.js";
import { repoNameFromPath } from "../utils/paths.js";
import { loadConfig } from "../utils/config.js";

export class ScanRepoError extends Error {
  constructor(
    message: string,
    public readonly code: "PATH_NOT_FOUND" | "PATH_NOT_DIRECTORY"
  ) {
    super(message);
    this.name = "ScanRepoError";
  }
}

export async function scanRepo(inputPath = "."): Promise<ScanResult> {
  const repoPath = path.resolve(process.cwd(), inputPath);
  await assertScannableDirectory(repoPath);

  const config = await loadConfig(repoPath);
  const stackDetection = await detectStack(repoPath, { ignore: config.ignore });
  const checks = await runChecks(repoPath, stackDetection, { ignore: config.ignore });
  const scoring = calculateScore(checks, config.weights);

  return {
    repoPath,
    repoName: config.projectName ?? repoNameFromPath(repoPath),
    generatedAt: new Date().toISOString(),
    detectedStacks: stackDetection.detectedStacks,
    primaryStack: stackDetection.primaryStack,
    score: scoring.score,
    checks,
    summary: scoring.summary,
    topFixes: scoring.topFixes
  };
}

async function assertScannableDirectory(repoPath: string): Promise<void> {
  let stats;

  try {
    stats = await stat(repoPath);
  } catch {
    throw new ScanRepoError(`Repository path does not exist: ${repoPath}`, "PATH_NOT_FOUND");
  }

  if (!stats.isDirectory()) {
    throw new ScanRepoError(`Repository path is not a directory: ${repoPath}`, "PATH_NOT_DIRECTORY");
  }
}
