import { readFile } from "node:fs/promises";

export async function readJsonSafe<T = unknown>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}
