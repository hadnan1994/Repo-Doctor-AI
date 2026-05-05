export type Category =
  | "presentation"
  | "buildTest"
  | "cicd"
  | "security"
  | "contributors";

export type CheckStatus = "pass" | "warn" | "fail";

export type Severity = "low" | "medium" | "high" | "critical";

export type StackName =
  | "node"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "dotnet"
  | "php"
  | "ruby";

export type DetectedStack = {
  name: StackName;
  confidence: "low" | "medium" | "high";
  indicators: string[];
  scripts?: string[];
};

export type StackDetectionResult = {
  detectedStacks: DetectedStack[];
  primaryStack?: StackName;
};

export type CheckResult = {
  id: string;
  title: string;
  category: Category;
  status: CheckStatus;
  severity: Severity;
  message: string;
  recommendation: string;
};

export type ScanResult = {
  repoPath: string;
  repoName: string;
  generatedAt: string;
  detectedStacks: DetectedStack[];
  primaryStack?: StackName;
  score: {
    overall: number;
    categories: Record<Category, number>;
  };
  checks: CheckResult[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    critical: number;
  };
  topFixes: CheckResult[];
};
