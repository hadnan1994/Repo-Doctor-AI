import type { Category, CheckResult, Severity } from "./types.js";
import { defaultWeights } from "../utils/config.js";

const categories: Category[] = ["presentation", "buildTest", "cicd", "security", "contributors"];

export const categoryWeights: Record<Category, number> = defaultWeights;

export type ScoreResult = {
  score: {
    overall: number;
    categories: Record<Category, number>;
  };
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    critical: number;
  };
  topFixes: CheckResult[];
};

export function scoreChecks(checks: CheckResult[]): Record<Category, number> {
  return Object.fromEntries(
    categories.map((category) => {
      const categoryChecks = checks.filter((check) => check.category === category);
      if (categoryChecks.length === 0) {
        return [category, 0];
      }

      const points = categoryChecks.reduce((total, check) => {
        if (check.status === "pass") return total + 1;
        if (check.status === "warn") return total + 0.5;
        return total;
      }, 0);

      return [category, Math.round((points / categoryChecks.length) * 100)];
    })
  ) as Record<Category, number>;
}

export function overallScore(
  categoryScores: Record<Category, number>,
  weights: Record<Category, number> = categoryWeights
): number {
  const totalWeight = categories.reduce((total, category) => total + weights[category], 0);
  if (totalWeight === 0) {
    return 0;
  }

  const weighted = categories.reduce(
    (total, category) => total + categoryScores[category] * weights[category],
    0
  );

  return Math.round(weighted / totalWeight);
}

export function summarizeChecks(checks: CheckResult[]): ScoreResult["summary"] {
  const failedChecks = checks.filter((check) => check.status === "fail");

  return {
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: checks.filter((check) => check.status === "warn").length,
    failed: failedChecks.length,
    critical: failedChecks.filter((check) => check.severity === "critical").length
  };
}

export function getTopFixes(checks: CheckResult[], limit = 5): CheckResult[] {
  return checks
    .map((check, index) => ({ check, index }))
    .filter(({ check }) => check.status !== "pass")
    .sort((left, right) => {
      const statusDifference = statusRank(left.check.status) - statusRank(right.check.status);
      if (statusDifference !== 0) {
        return statusDifference;
      }

      const severityDifference =
        severityRank(right.check.severity) - severityRank(left.check.severity);
      if (severityDifference !== 0) {
        return severityDifference;
      }

      return left.index - right.index;
    })
    .slice(0, limit)
    .map(({ check }) => check);
}

export function calculateScore(
  checks: CheckResult[],
  weights: Record<Category, number> = categoryWeights
): ScoreResult {
  const categoryScores = scoreChecks(checks);

  return {
    score: {
      overall: overallScore(categoryScores, weights),
      categories: categoryScores
    },
    summary: summarizeChecks(checks),
    topFixes: getTopFixes(checks)
  };
}

function statusRank(status: CheckResult["status"]): number {
  if (status === "fail") return 0;
  if (status === "warn") return 1;
  return 2;
}

function severityRank(severity: Severity): number {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}
