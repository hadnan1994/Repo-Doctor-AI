import path from "node:path";
import fg from "fast-glob";
import type { DetectedStack, StackDetectionResult, StackName } from "./types.js";
import { readJsonSafe } from "../utils/readJsonSafe.js";
import { defaultConfig, toFastGlobIgnore } from "../utils/config.js";

type PackageJson = {
  scripts?: Record<string, string>;
};

const scriptNames = ["test", "build", "lint", "format", "typecheck"] as const;

const stackPriority: StackName[] = [
  "node",
  "python",
  "go",
  "rust",
  "java",
  "dotnet",
  "php",
  "ruby"
];

const strongIndicators: Record<StackName, string[]> = {
  node: ["package.json"],
  python: ["pyproject.toml", "requirements.txt"],
  go: ["go.mod"],
  rust: ["Cargo.toml"],
  java: ["pom.xml", "build.gradle", "gradlew"],
  dotnet: [".sln", ".csproj"],
  php: ["composer.json"],
  ruby: ["Gemfile"]
};

export type DetectStackOptions = {
  ignore?: string[];
};

export async function detectStack(
  repoPath: string,
  options: DetectStackOptions = {}
): Promise<StackDetectionResult> {
  const ignore = toFastGlobIgnore(options.ignore ?? defaultConfig().ignore);
  const files = new Set(
    await fg(
      [
        "package.json",
        "pnpm-lock.yaml",
        "package-lock.json",
        "yarn.lock",
        "tsconfig.json",
        "pyproject.toml",
        "requirements.txt",
        "setup.py",
        "Pipfile",
        "poetry.lock",
        "go.mod",
        "go.sum",
        "Cargo.toml",
        "Cargo.lock",
        "pom.xml",
        "build.gradle",
        "gradlew",
        "*.csproj",
        "*.sln",
        "**/*.csproj",
        "**/*.sln",
        "composer.json",
        "composer.lock",
        "Gemfile",
        "Gemfile.lock"
      ],
      {
        cwd: repoPath,
        dot: true,
        ignore: [...ignore, "**/vendor/**"],
        onlyFiles: true
      }
    )
  );

  const stacks: DetectedStack[] = [];

  const nodeIndicators = [
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "tsconfig.json"
  ].filter((file) => files.has(file));

  if (nodeIndicators.length > 0) {
    const packageJson = await readJsonSafe<PackageJson>(path.join(repoPath, "package.json"));
    const scripts = scriptNames.filter((script) => typeof packageJson?.scripts?.[script] === "string");

    stacks.push({
      name: "node",
      confidence: files.has("package.json") ? "high" : "medium",
      indicators: nodeIndicators,
      scripts
    });
  }

  addStack(stacks, "python", findExactIndicators(files, [
    "pyproject.toml",
    "requirements.txt",
    "setup.py",
    "Pipfile",
    "poetry.lock"
  ]));
  addStack(stacks, "go", findExactIndicators(files, ["go.mod", "go.sum"]));
  addStack(stacks, "rust", findExactIndicators(files, ["Cargo.toml", "Cargo.lock"]));
  addStack(stacks, "java", findExactIndicators(files, ["pom.xml", "build.gradle", "gradlew"]));
  addStack(stacks, "php", findExactIndicators(files, ["composer.json", "composer.lock"]));
  addStack(stacks, "ruby", findExactIndicators(files, ["Gemfile", "Gemfile.lock"]));

  const dotnetIndicators = [...files].filter(
    (file) => file.endsWith(".csproj") || file.endsWith(".sln")
  );
  if (dotnetIndicators.length > 0) {
    stacks.push({
      name: "dotnet",
      confidence: "high",
      indicators: dotnetIndicators
    });
  }

  return {
    detectedStacks: stacks,
    primaryStack: selectPrimaryStack(stacks)
  };
}

function addStack(stacks: DetectedStack[], name: StackName, indicators: string[]): void {
  if (indicators.length === 0) {
    return;
  }

  stacks.push({
    name,
    confidence: hasStrongIndicator(name, indicators) || indicators.length > 1 ? "high" : "medium",
    indicators
  });
}

function findExactIndicators(files: Set<string>, indicators: string[]): string[] {
  return indicators.filter((file) => files.has(file));
}

function selectPrimaryStack(stacks: DetectedStack[]): StackName | undefined {
  return [...stacks].sort((left, right) => stackScore(right) - stackScore(left))[0]?.name;
}

function stackScore(stack: DetectedStack): number {
  const confidenceScore = stack.confidence === "high" ? 100 : stack.confidence === "medium" ? 50 : 10;
  const strongScore = hasStrongIndicator(stack.name, stack.indicators) ? 25 : 0;
  const indicatorScore = stack.indicators.length;
  const priorityScore = stackPriority.length - stackPriority.indexOf(stack.name);

  return confidenceScore + strongScore + indicatorScore + priorityScore / 100;
}

function hasStrongIndicator(name: StackName, indicators: string[]): boolean {
  return indicators.some((indicator) =>
    strongIndicators[name].some((strongIndicator) => indicator === strongIndicator || indicator.endsWith(strongIndicator))
  );
}
