import pc from "picocolors";
import type { Category, CheckResult, CheckStatus, ScanResult, Severity } from "../scanner/types.js";

const categoryLabels: Record<Category, string> = {
  presentation: "Presentation",
  buildTest: "Build/Test Readiness",
  cicd: "CI/CD Health",
  security: "Security Hygiene",
  contributors: "Contributor Readiness"
};

const categoryOrder: Category[] = ["presentation", "buildTest", "cicd", "security", "contributors"];

export function formatTerminalReport(result: ScanResult): string {
  const stacks =
    result.detectedStacks.length > 0
      ? result.detectedStacks
          .map((stack) => {
            const primary = stack.name === result.primaryStack ? " (primary)" : "";
            return `${stack.name}${primary}`;
          })
          .join(", ")
      : "none detected";

  const lines = [
    pc.bold("Repo Doctor AI"),
    "",
    `Repository: ${result.repoName}`,
    `Score:      ${colorScore(result.score.overall)}`,
    `Stacks:     ${stacks}`,
    `Summary:    ${statusIndicator("pass")} ${result.summary.passed} passed  ${statusIndicator("warn")} ${result.summary.warnings} warnings  ${statusIndicator("fail")} ${result.summary.failed} failed  Critical: ${result.summary.critical}`,
    ""
  ];

  lines.push(pc.bold("Category Scores"));
  for (const category of categoryOrder) {
    const score = result.score.categories[category];
    lines.push(`${categoryLabels[category].padEnd(24)} ${colorScore(score)}`);
  }

  lines.push("", pc.bold("Recommended Fixes"));
  if (result.topFixes.length === 0) {
    lines.push("No priority fixes found. Nice work.");
  } else {
    result.topFixes.slice(0, 5).forEach((check, index) => {
      lines.push(
        `${index + 1}. ${statusIndicator(check.status)} ${severityLabel(check.severity).padEnd(10)} ${check.recommendation}`
      );
    });
  }

  const notableFindings = result.checks
    .filter((check) => check.status !== "pass")
    .slice(0, 8);

  if (notableFindings.length > 0) {
    lines.push("", pc.bold("Notable Findings"));
    for (const finding of notableFindings) {
      lines.push(
        `${statusIndicator(finding.status)} ${categoryLabels[finding.category].padEnd(24)} ${finding.message}`
      );
    }
  }

  return lines.join("\n");
}

function colorScore(score: number): string {
  const value = `${score}/100`;
  if (score >= 80) return pc.green(value);
  if (score >= 60) return pc.yellow(value);
  return pc.red(value);
}

function statusIndicator(status: CheckStatus): string {
  if (status === "pass") return pc.green("[pass]");
  if (status === "warn") return pc.yellow("[warn]");
  return pc.red("[fail]");
}

function severityLabel(severity: Severity): string {
  if (severity === "critical") return pc.red("critical");
  if (severity === "high") return pc.red("high");
  if (severity === "medium") return pc.yellow("medium");
  return pc.dim("low");
}
