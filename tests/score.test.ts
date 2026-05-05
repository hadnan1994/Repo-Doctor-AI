import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { scanRepo } from "../src/scanner/scanRepo.js";
import {
  calculateScore,
  getTopFixes,
  overallScore,
  scoreChecks,
  summarizeChecks
} from "../src/scanner/score.js";
import type { CheckResult } from "../src/scanner/types.js";

describe("scoreChecks", () => {
  it("scores pass, warn, and fail checks", () => {
    const checks: CheckResult[] = [
      makeCheck("pass"),
      makeCheck("warn"),
      makeCheck("fail")
    ];

    const categoryScores = scoreChecks(checks);

    expect(categoryScores.presentation).toBe(50);
    expect(overallScore(categoryScores)).toBe(13);
  });

  it("scores an empty repo poorly", async () => {
    const repoPath = await makeFixture("empty");

    const result = await scanRepo(repoPath);

    expect(result.score.overall).toBeLessThan(35);
    expect(result.score.categories.presentation).toBe(0);
    expect(result.summary.failed).toBeGreaterThan(0);
    expect(result.summary.critical).toBeGreaterThan(0);
  });

  it("scores a polished fixture repo highly", async () => {
    const repoPath = await makeFixture("polished");
    await writePolishedNodeFixture(repoPath);

    const result = await scanRepo(repoPath);

    expect(result.score.overall).toBeGreaterThanOrEqual(85);
    expect(result.score.categories.presentation).toBeGreaterThanOrEqual(85);
    expect(result.score.categories.buildTest).toBeGreaterThanOrEqual(85);
    expect(result.score.categories.cicd).toBeGreaterThanOrEqual(85);
    expect(result.score.categories.security).toBeGreaterThanOrEqual(70);
    expect(result.score.categories.contributors).toBeGreaterThanOrEqual(85);
  });

  it("keeps checked-in demo fixtures meaningfully separated", async () => {
    const messy = await scanRepo(path.join(process.cwd(), "tests", "fixtures", "messy-repo"));
    const polished = await scanRepo(path.join(process.cwd(), "tests", "fixtures", "polished-repo"));

    expect(messy.score.overall).toBeLessThan(50);
    expect(polished.score.overall).toBeGreaterThanOrEqual(90);
    expect(polished.score.overall - messy.score.overall).toBeGreaterThanOrEqual(40);
  });

  it("summarizes checks and calculates score payloads", () => {
    const checks = [
      makeCheck("pass", "low", "presentation"),
      makeCheck("warn", "medium", "presentation"),
      makeCheck("fail", "critical", "security")
    ];

    const scoring = calculateScore(checks);

    expect(scoring.summary).toEqual({
      passed: 1,
      warnings: 1,
      failed: 1,
      critical: 1
    });
    expect(scoring.score.overall).toBeGreaterThanOrEqual(0);
    expect(scoring.score.overall).toBeLessThanOrEqual(100);
    expect(scoring.topFixes).toHaveLength(2);
    expect(summarizeChecks(checks).critical).toBe(1);
  });

  it("prioritizes top fixes by failed status and severity", () => {
    const checks: CheckResult[] = [
      makeCheck("warn", "critical", "security", "warn-critical"),
      makeCheck("fail", "medium", "contributors", "fail-medium"),
      makeCheck("fail", "high", "buildTest", "fail-high"),
      makeCheck("pass", "critical", "presentation", "pass-critical"),
      makeCheck("fail", "critical", "presentation", "fail-critical"),
      makeCheck("warn", "high", "cicd", "warn-high")
    ];

    expect(getTopFixes(checks).map((check) => check.id)).toEqual([
      "fail-critical",
      "fail-high",
      "fail-medium",
      "warn-critical",
      "warn-high"
    ]);
  });
});

function makeCheck(
  status: CheckResult["status"],
  severity: CheckResult["severity"] = "low",
  category: CheckResult["category"] = "presentation",
  id: string = status
): CheckResult {
  return {
    id,
    title: id,
    category,
    status,
    severity,
    message: id,
    recommendation: id
  };
}

async function makeFixture(name: string): Promise<string> {
  const repoPath = path.join(tmpdir(), `repo-doctor-ai-score-${name}-${randomUUID()}`);
  await mkdir(repoPath, { recursive: true });
  return repoPath;
}

async function writePolishedNodeFixture(repoPath: string): Promise<void> {
  await mkdir(path.join(repoPath, ".github", "workflows"), { recursive: true });
  await mkdir(path.join(repoPath, ".github", "ISSUE_TEMPLATE"), { recursive: true });
  await mkdir(path.join(repoPath, "tests"), { recursive: true });

  await writeFile(
    path.join(repoPath, "README.md"),
    `# Demo Project

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

Demo Project is a useful CLI tool for healthy repositories.

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
