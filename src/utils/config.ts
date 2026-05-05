import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Category } from "../scanner/types.js";
import { fileExists } from "./fileExists.js";

export const configFileName = "repo-doctor.config.json";

export const defaultWeights: Record<Category, number> = {
  presentation: 25,
  buildTest: 25,
  cicd: 20,
  security: 20,
  contributors: 10
};

export type RepoDoctorConfig = {
  projectName?: string;
  license: string;
  author: string;
  ignore: string[];
  weights: Record<Category, number>;
};

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly configPath: string
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

const weightsSchema = z
  .object({
    presentation: z.number().min(0).optional(),
    buildTest: z.number().min(0).optional(),
    cicd: z.number().min(0).optional(),
    security: z.number().min(0).optional(),
    contributors: z.number().min(0).optional()
  })
  .strict();

const configSchema = z
  .object({
    projectName: z.string().min(1).optional(),
    license: z.string().min(1).optional(),
    author: z.string().min(1).optional(),
    ignore: z.array(z.string().min(1)).optional(),
    weights: weightsSchema.optional()
  })
  .strict();

export async function loadConfig(repoPath: string): Promise<RepoDoctorConfig> {
  const configPath = path.join(repoPath, configFileName);

  if (!(await fileExists(configPath))) {
    return defaultConfig();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Invalid ${configFileName}: ${detail}`, configPath);
  }

  const result = configSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
      .join("; ");
    throw new ConfigError(`Invalid ${configFileName}: ${detail}`, configPath);
  }

  return {
    ...defaultConfig(),
    ...result.data,
    weights: {
      ...defaultWeights,
      ...(result.data.weights ?? {})
    },
    ignore: result.data.ignore ?? defaultConfig().ignore
  };
}

export function defaultConfig(): RepoDoctorConfig {
  return {
    license: "MIT",
    author: "Project Contributors",
    ignore: ["dist", "build", "node_modules"],
    weights: { ...defaultWeights }
  };
}

export function toFastGlobIgnore(ignore: string[]): string[] {
  return ignore.flatMap((entry) => {
    const normalized = entry.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
    if (!normalized) {
      return [];
    }

    if (normalized.includes("*")) {
      return [normalized];
    }

    return [normalized, `${normalized}/**`, `**/${normalized}`, `**/${normalized}/**`];
  });
}
