import { describe, expect, it } from "vitest";
import { formatTerminalReport } from "../src/reporters/terminalReporter.js";
import type { ScanResult } from "../src/scanner/types.js";

describe("formatTerminalReport", () => {
  it("includes score, stacks, summary, top fixes, and status indicators", () => {
    const output = formatTerminalReport(makeResult());

    expect(output).toContain("Repo Doctor AI");
    expect(output).toContain("Repository: example");
    expect(output).toContain("Score:");
    expect(output).toContain("node (primary)");
    expect(output).toContain("[pass] 3 passed");
    expect(output).toContain("[warn] 1 warnings");
    expect(output).toContain("[fail] 2 failed");
    expect(output).toContain("critical");
    expect(output).toContain("Recommended Fixes");
    expect(output).toContain("Add README.md.");
    expect(output).toContain("Notable Findings");
  });
});

function makeResult(): ScanResult {
  return {
    repoPath: "/tmp/example",
    repoName: "example",
    generatedAt: "2026-01-01T00:00:00.000Z",
    detectedStacks: [
      {
        name: "node",
        confidence: "high",
        indicators: ["package.json"],
        scripts: ["test"]
      }
    ],
    primaryStack: "node",
    score: {
      overall: 72,
      categories: {
        presentation: 50,
        buildTest: 80,
        cicd: 70,
        security: 65,
        contributors: 90
      }
    },
    checks: [
      {
        id: "presentation.readme.exists",
        title: "README exists",
        category: "presentation",
        status: "fail",
        severity: "critical",
        message: "README.md is missing.",
        recommendation: "Add README.md."
      },
      {
        id: "build.tests.present",
        title: "Tests are present",
        category: "buildTest",
        status: "warn",
        severity: "high",
        message: "Tests are incomplete.",
        recommendation: "Add automated tests."
      },
      {
        id: "security.gitignore.exists",
        title: ".gitignore exists",
        category: "security",
        status: "pass",
        severity: "high",
        message: ".gitignore is present.",
        recommendation: "Keep .gitignore updated."
      }
    ],
    summary: {
      passed: 3,
      warnings: 1,
      failed: 2,
      critical: 1
    },
    topFixes: [
      {
        id: "presentation.readme.exists",
        title: "README exists",
        category: "presentation",
        status: "fail",
        severity: "critical",
        message: "README.md is missing.",
        recommendation: "Add README.md."
      }
    ]
  };
}
