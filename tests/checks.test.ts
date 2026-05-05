import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { runChecks } from "../src/scanner/checks.js";
import { detectStack } from "../src/scanner/detectStack.js";
import type { CheckResult } from "../src/scanner/types.js";

describe("runChecks", () => {
  it("detects important missing repository basics", async () => {
    const repoPath = await makeFixture("empty");
    const checks = await runChecks(repoPath, await detectStack(repoPath));

    expect(find(checks, "presentation.readme.exists")).toMatchObject({
      status: "fail",
      severity: "critical"
    });
    expect(find(checks, "presentation.license.exists")).toMatchObject({
      status: "fail",
      severity: "critical"
    });
    expect(find(checks, "cicd.workflow.file")).toMatchObject({
      status: "fail",
      severity: "high"
    });
    expect(find(checks, "security.policy.exists")).toMatchObject({
      status: "fail",
      severity: "high"
    });
    expect(find(checks, "security.gitignore.exists")).toMatchObject({
      status: "fail",
      severity: "high"
    });
    expect(find(checks, "build.tests.present")).toMatchObject({
      status: "fail",
      severity: "high"
    });
  });

  it("returns checks across all five categories", async () => {
    const repoPath = await makeFixture("categories");
    const checks = await runChecks(repoPath, await detectStack(repoPath));

    expect(new Set(checks.map((check) => check.category))).toEqual(
      new Set(["presentation", "buildTest", "cicd", "security", "contributors"])
    );
    for (const check of checks) {
      expect(check).toEqual({
        id: expect.any(String),
        title: expect.any(String),
        category: expect.any(String),
        status: expect.stringMatching(/^(pass|warn|fail)$/),
        severity: expect.stringMatching(/^(low|medium|high|critical)$/),
        message: expect.any(String),
        recommendation: expect.any(String)
      });
    }
  });

  it("passes simple checks for a polished Node fixture", async () => {
    const repoPath = await makeFixture("polished-node");
    await writePolishedNodeFixture(repoPath);

    const checks = await runChecks(repoPath, await detectStack(repoPath));

    expect(find(checks, "presentation.readme.exists").status).toBe("pass");
    expect(find(checks, "presentation.license.exists").status).toBe("pass");
    expect(find(checks, "build.stack.detected").status).toBe("pass");
    expect(find(checks, "build.script.test").status).toBe("pass");
    expect(find(checks, "build.tests.present").status).toBe("pass");
    expect(find(checks, "cicd.workflow.file").status).toBe("pass");
    expect(find(checks, "cicd.triggers.pull_request").status).toBe("pass");
    expect(find(checks, "cicd.triggers.push").status).toBe("pass");
    expect(find(checks, "security.policy.exists").status).toBe("pass");
    expect(find(checks, "security.gitignore.exists").status).toBe("pass");
    expect(find(checks, "contributors.contributing.exists").status).toBe("pass");
    expect(find(checks, "contributors.pr_template.exists").status).toBe("pass");
  });
});

async function makeFixture(name: string): Promise<string> {
  const repoPath = path.join(tmpdir(), `repo-doctor-ai-checks-${name}-${randomUUID()}`);
  await mkdir(repoPath, { recursive: true });
  return repoPath;
}

function find(checks: CheckResult[], id: string): CheckResult {
  const check = checks.find((candidate) => candidate.id === id);
  expect(check, `Expected check ${id} to exist`).toBeDefined();
  return check as CheckResult;
}

async function writePolishedNodeFixture(repoPath: string): Promise<void> {
  await mkdir(path.join(repoPath, ".github", "workflows"), { recursive: true });
  await mkdir(path.join(repoPath, ".github", "ISSUE_TEMPLATE"), { recursive: true });
  await mkdir(path.join(repoPath, "tests"), { recursive: true });

  await writeFile(
    path.join(repoPath, "README.md"),
    `# Demo Project

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

Demo Project is a useful CLI tool.

## Installation

Install with pnpm.

## Usage

Run the command.

## Demo

Example output is shown here.

## Roadmap

Planned next steps are listed here.

## Contact

Maintainer: Demo Team

## License

MIT
`,
    "utf8"
  );
  await writeFile(path.join(repoPath, "LICENSE"), "MIT License\n", "utf8");
  await writeFile(path.join(repoPath, "CHANGELOG.md"), "# Changelog\n", "utf8");
  await writeFile(path.join(repoPath, "SECURITY.md"), "# Security\n", "utf8");
  await writeFile(path.join(repoPath, "CONTRIBUTING.md"), "# Contributing\n", "utf8");
  await writeFile(path.join(repoPath, "CODE_OF_CONDUCT.md"), "# Code of Conduct\n", "utf8");
  await writeFile(path.join(repoPath, ".gitignore"), "node_modules/\n.env\n.env.*\n", "utf8");
  await writeFile(path.join(repoPath, ".github", "dependabot.yml"), "version: 2\nupdates: []\n", "utf8");
  await writeFile(path.join(repoPath, ".github", "pull_request_template.md"), "## Summary\n", "utf8");
  await writeFile(path.join(repoPath, ".github", "ISSUE_TEMPLATE", "bug_report.md"), "# Bug\n", "utf8");
  await writeFile(path.join(repoPath, "tests", "demo.test.ts"), "export {};\n", "utf8");
  await writeFile(path.join(repoPath, "tsconfig.json"), "{}", "utf8");
  await writeFile(path.join(repoPath, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
  await writeFile(
    path.join(repoPath, "package.json"),
    JSON.stringify({
      name: "demo-project",
      description: "Demo project",
      scripts: {
        build: "tsup",
        test: "vitest",
        lint: "eslint ."
      }
    }),
    "utf8"
  );
  await writeFile(
    path.join(repoPath, ".github", "workflows", "ci.yml"),
    `name: CI
on:
  push:
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
`,
    "utf8"
  );
}
