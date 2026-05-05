import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { detectStack } from "../src/scanner/detectStack.js";
import type { StackName } from "../src/scanner/types.js";

describe("detectStack", () => {
  it("detects a Node stack and package scripts", async () => {
    const repoPath = await makeFixture("node-stack");
    await writeFile(
      path.join(repoPath, "package.json"),
      JSON.stringify({
        scripts: {
          test: "vitest",
          build: "tsup",
          lint: "eslint .",
          format: "prettier --write .",
          typecheck: "tsc --noEmit",
          start: "node dist/index.js"
        }
      }),
      "utf8"
    );
    await writeFile(path.join(repoPath, "tsconfig.json"), "{}", "utf8");

    const result = await detectStack(repoPath);

    expect(result.primaryStack).toBe("node");
    expect(result.detectedStacks).toContainEqual(
      expect.objectContaining({
        name: "node",
        confidence: "high",
        indicators: ["package.json", "tsconfig.json"],
        scripts: ["test", "build", "lint", "format", "typecheck"]
      })
    );
  });

  it.each([
    ["python", "pyproject.toml", "[project]\nname = \"demo\"\n"],
    ["go", "go.mod", "module demo\n"],
    ["rust", "Cargo.toml", "[package]\nname = \"demo\"\n"],
    ["java", "pom.xml", "<project></project>\n"],
    ["php", "composer.json", "{}\n"],
    ["ruby", "Gemfile", "source \"https://rubygems.org\"\n"]
  ] satisfies Array<[StackName, string, string]>)("detects a %s stack", async (stackName, file, contents) => {
    const repoPath = await makeFixture(`${stackName}-stack`);
    await writeFile(path.join(repoPath, file), contents, "utf8");

    const result = await detectStack(repoPath);

    expect(result.primaryStack).toBe(stackName);
    expect(result.detectedStacks).toContainEqual(
      expect.objectContaining({
        name: stackName,
        indicators: [file]
      })
    );
  });

  it("detects a .NET stack from nested project files", async () => {
    const repoPath = await makeFixture("dotnet-stack");
    const projectDir = path.join(repoPath, "src", "Demo");
    await mkdir(projectDir, { recursive: true });
    await writeFile(path.join(projectDir, "Demo.csproj"), "<Project />\n", "utf8");

    const result = await detectStack(repoPath);

    expect(result.primaryStack).toBe("dotnet");
    expect(result.detectedStacks).toContainEqual(
      expect.objectContaining({
        name: "dotnet",
        indicators: ["src/Demo/Demo.csproj"]
      })
    );
  });

  it("returns all detected stacks and picks the strongest primary stack", async () => {
    const repoPath = await makeFixture("multi-stack");
    await writeFile(path.join(repoPath, "package.json"), JSON.stringify({ scripts: {} }), "utf8");
    await writeFile(path.join(repoPath, "requirements.txt"), "pytest\n", "utf8");
    await writeFile(path.join(repoPath, "go.mod"), "module demo\n", "utf8");

    const result = await detectStack(repoPath);

    expect(result.detectedStacks.map((stack) => stack.name)).toEqual(
      expect.arrayContaining(["node", "python", "go"])
    );
    expect(result.primaryStack).toBe("node");
  });

  it("returns no primary stack for an empty repository", async () => {
    const repoPath = await makeFixture("empty");

    const result = await detectStack(repoPath);

    expect(result.detectedStacks).toEqual([]);
    expect(result.primaryStack).toBeUndefined();
  });
});

async function makeFixture(name: string): Promise<string> {
  const repoPath = path.join(tmpdir(), `repo-doctor-ai-${name}-${randomUUID()}`);
  await mkdir(repoPath, { recursive: true });
  return repoPath;
}
