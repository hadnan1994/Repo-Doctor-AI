import path from "node:path";

export function resolveRepoPath(inputPath = "."): string {
  return path.resolve(process.cwd(), inputPath);
}

export function repoNameFromPath(repoPath: string): string {
  return path.basename(repoPath);
}
