import { readFile } from "node:fs/promises";
import { parse } from "yaml";

export async function readYamlSafe<T = unknown>(path: string): Promise<T | undefined> {
  try {
    return parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}
