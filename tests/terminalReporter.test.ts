import { describe, expect, it } from "vitest";
import { formatTerminalReport } from "../src/reporters/terminalReporter";
import type { ScanResult } from "../src/scanner/types";

function stripAnsi(value: string): string {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

describe("formatTerminalReport", () => {
  it("includes score, stacks, summary, top fixes, and status indicators", () => {
    const result: ScanResult = {
      repoPath: "/tmp/example",
      repoName: "example",
      generatedAt: "2026-05-05T00:00:00.000Z",
      detectedStacks: [
        {
          name: "node",
          primary: true,
          confidence: "high",
          signals: ["package.json"]
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
      summary: {
        passed: 3,
        warnings: 1,
        failed: 2,
        critical: 1
      },
      topFixes: [
        {
          id: "readme-missing",
          title: "Add README.md.",
          category: "presentation",
          status: "fail",
          severity: "critical",
          message: "README.md is missing.",
          recommendation: "Add a clear README with installation and usage instructions."
        }
      ],
      checks: [
        {
          id: "readme-missing",
          title: "Add README.md.",
          category: "presentation",
          status: "fail",
          severity: "critical",
          message: "README.md is missing.",
          recommendation: "Add a clear README with installation and usage instructions."
        },
        {
          id: "tests-incomplete",
          title: "Improve test coverage.",
          category: "buildTest",
          status: "warn",
          severity: "medium",
          message: "Tests are incomplete.",
          recommendation: "Add or improve tests for the project."
        }
      ]
    };

    const output = stripAnsi(formatTerminalReport(result));

    expect(output).toContain("Repo Doctor AI");
    expect(output).toContain("Score:");
    expect(output).toContain("node (primary)");
    expect(output).toContain("[pass] 3 passed");
    expect(output).toContain("[warn] 1 warnings");
    expect(output).toContain("[fail] 2 failed");
    expect(output).toContain("Critical: 1");
    expect(output).toContain("Add a clear README with installation and usage instructions.");
    expect(output).toContain("README.md is missing.");
    expect(output).toContain("Tests are incomplete.");
  });
});
