import path from "node:path";
import { existsSync } from "node:fs";
import fg from "fast-glob";
import type { Category, CheckResult, Severity, StackDetectionResult } from "./types.js";
import { fileExists } from "../utils/fileExists.js";
import { readJsonSafe } from "../utils/readJsonSafe.js";
import { readTextSafe } from "../utils/readTextSafe.js";
import { readYamlSafe } from "../utils/readYamlSafe.js";
import { defaultConfig, toFastGlobIgnore } from "../utils/config.js";

type PackageJson = {
  name?: string;
  description?: string;
  scripts?: Record<string, string>;
};

type WorkflowFile = {
  path: string;
  text: string;
  data?: unknown;
};

export type RunChecksOptions = {
  ignore?: string[];
};

export async function runChecks(
  repoPath: string,
  stackDetection: StackDetectionResult,
  options: RunChecksOptions = {}
): Promise<CheckResult[]> {
  const ignore = toFastGlobIgnore(options.ignore ?? defaultConfig().ignore);
  const packageJson = await readJsonSafe<PackageJson>(path.join(repoPath, "package.json"));
  const readme = await readTextSafe(path.join(repoPath, "README.md"));
  const gitignore = await readTextSafe(path.join(repoPath, ".gitignore"));
  const workflowFiles = await readWorkflows(repoPath);
  const checks: CheckResult[] = [];

  checks.push(...presentationChecks(repoPath, readme));
  checks.push(...(await buildTestChecks(repoPath, stackDetection, packageJson, ignore)));
  checks.push(...(await cicdChecks(repoPath, workflowFiles)));
  checks.push(...(await securityChecks(repoPath, gitignore, workflowFiles, ignore)));
  checks.push(...(await contributorChecks(repoPath, readme, ignore)));

  return checks;
}

export async function createPlaceholderChecks(repoPath = process.cwd()): Promise<CheckResult[]> {
  return runChecks(repoPath, { detectedStacks: [], primaryStack: undefined });
}

function presentationChecks(repoPath: string, readme: string | undefined): CheckResult[] {
  return [
    check({
      id: "presentation.readme.exists",
      title: "README exists",
      category: "presentation",
      status: readme ? "pass" : "fail",
      severity: "critical",
      message: readme ? "README.md is present." : "README.md is missing.",
      recommendation: "Add a README.md with project overview, installation, and usage."
    }),
    contentCheck({
      id: "presentation.readme.install",
      title: "README has installation instructions",
      category: "presentation",
      text: readme,
      pattern: /\b(install|installation|setup|getting started)\b/i,
      severity: "medium",
      recommendation: "Add installation or setup instructions to README.md."
    }),
    contentCheck({
      id: "presentation.readme.usage",
      title: "README has usage instructions",
      category: "presentation",
      text: readme,
      pattern: /\b(usage|example|command|quickstart)\b/i,
      severity: "medium",
      recommendation: "Add usage examples so readers can try the project quickly."
    }),
    contentCheck({
      id: "presentation.readme.description",
      title: "README has a project description",
      category: "presentation",
      text: readme,
      pattern: /(^#\s+.+)|\b(is a|helps|provides|tool|library|application)\b/i,
      severity: "medium",
      recommendation: "Add a concise project description near the top of README.md."
    }),
    contentCheck({
      id: "presentation.readme.badges",
      title: "README has badges",
      category: "presentation",
      text: readme,
      pattern: /!\[[^\]]*]\([^)]+\)/,
      severity: "low",
      recommendation: "Add useful badges such as license, CI, Node version, or package status."
    }),
    contentCheck({
      id: "presentation.readme.license",
      title: "README mentions license",
      category: "presentation",
      text: readme,
      pattern: /\blicen[cs]e\b/i,
      severity: "medium",
      recommendation: "Mention the project license in README.md."
    }),
    contentCheck({
      id: "presentation.readme.demo",
      title: "README has screenshots or demo section",
      category: "presentation",
      text: readme,
      pattern: /\b(screenshot|demo|preview|example output)\b/i,
      severity: "low",
      recommendation: "Add a screenshot, demo, or example output section."
    }),
    existsCheck(repoPath, {
      id: "presentation.license.exists",
      title: "LICENSE exists",
      category: "presentation",
      file: "LICENSE",
      severity: "critical",
      recommendation: "Add a LICENSE file so users understand how they can use the project."
    }),
    existsCheck(repoPath, {
      id: "presentation.changelog.exists",
      title: "CHANGELOG exists",
      category: "presentation",
      file: "CHANGELOG.md",
      severity: "low",
      recommendation: "Add a CHANGELOG.md to document notable project changes."
    })
  ];
}

async function buildTestChecks(
  repoPath: string,
  stackDetection: StackDetectionResult,
  packageJson: PackageJson | undefined,
  ignore: string[]
): Promise<CheckResult[]> {
  const hasNode = stackDetection.detectedStacks.some((stack) => stack.name === "node");
  const hasTypescript = await fileExists(path.join(repoPath, "tsconfig.json"));
  const testFiles = await fg(["tests/**", "test/**", "**/*.test.*", "**/*.spec.*"], {
    cwd: repoPath,
    dot: true,
    ignore,
    onlyFiles: true
  });

  return [
    check({
      id: "build.stack.detected",
      title: "Stack detected",
      category: "buildTest",
      status: stackDetection.detectedStacks.length > 0 ? "pass" : "fail",
      severity: "high",
      message:
        stackDetection.detectedStacks.length > 0
          ? `Detected ${stackDetection.detectedStacks.map((stack) => stack.name).join(", ")}.`
          : "No supported stack was detected.",
      recommendation: "Add standard project files such as package.json, pyproject.toml, go.mod, or Cargo.toml."
    }),
    scriptCheck(packageJson, "build", "Build script exists", "Add a build script where applicable."),
    scriptCheck(packageJson, "test", "Test script exists", "Add a test script so CI can validate changes.", "high"),
    scriptCheck(packageJson, "lint", "Lint script exists", "Add a lint script to catch common quality issues."),
    check({
      id: "build.lockfile.exists",
      title: "Lockfile exists",
      category: "buildTest",
      status: hasNode
        ? (await anyFileExists(repoPath, ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]))
          ? "pass"
          : "fail"
        : "warn",
      severity: "medium",
      message: hasNode
        ? "Node lockfile check completed."
        : "Lockfile check is most relevant for Node projects in this MVP.",
      recommendation: "Commit the package manager lockfile for reproducible installs."
    }),
    check({
      id: "build.typescript.config",
      title: "TypeScript config exists",
      category: "buildTest",
      status: hasNode && hasTypescript ? "pass" : hasNode ? "warn" : "warn",
      severity: "low",
      message: hasTypescript ? "tsconfig.json is present." : "No tsconfig.json was found.",
      recommendation: "Add tsconfig.json for TypeScript projects."
    }),
    check({
      id: "build.metadata.exists",
      title: "Basic project metadata exists",
      category: "buildTest",
      status: packageJson?.name || packageJson?.description ? "pass" : hasNode ? "warn" : "warn",
      severity: "medium",
      message:
        packageJson?.name || packageJson?.description
          ? "Basic package metadata is present."
          : "Basic project metadata appears incomplete.",
      recommendation: "Add clear project metadata such as name and description."
    }),
    check({
      id: "build.tests.present",
      title: "Tests are present",
      category: "buildTest",
      status: packageJson?.scripts?.test || testFiles.length > 0 ? "pass" : "fail",
      severity: "high",
      message:
        packageJson?.scripts?.test || testFiles.length > 0
          ? "A test script or test files were found."
          : "No test script or test files were found.",
      recommendation: "Add automated tests and expose them through the project test command."
    })
  ];
}

async function cicdChecks(repoPath: string, workflows: WorkflowFile[]): Promise<CheckResult[]> {
  const workflowsDirExists = await fileExists(path.join(repoPath, ".github", "workflows"));
  const combined = workflows.map((workflow) => workflow.text).join("\n").toLowerCase();

  return [
    check({
      id: "cicd.workflows.dir",
      title: "GitHub workflows directory exists",
      category: "cicd",
      status: workflowsDirExists ? "pass" : "fail",
      severity: "high",
      message: workflowsDirExists
        ? ".github/workflows exists."
        : ".github/workflows is missing.",
      recommendation: "Add a GitHub Actions workflow under .github/workflows."
    }),
    check({
      id: "cicd.workflow.file",
      title: "Workflow file exists",
      category: "cicd",
      status: workflows.length > 0 ? "pass" : "fail",
      severity: "high",
      message:
        workflows.length > 0
          ? `Found ${workflows.length} workflow file(s).`
          : "No .yml or .yaml workflow files were found.",
      recommendation: "Add at least one CI workflow file."
    }),
    check({
      id: "cicd.triggers.pull_request",
      title: "CI runs on pull requests",
      category: "cicd",
      status: hasWorkflowTrigger(workflows, "pull_request") ? "pass" : "warn",
      severity: "medium",
      message: hasWorkflowTrigger(workflows, "pull_request")
        ? "A workflow appears to run on pull requests."
        : "No pull_request trigger was detected.",
      recommendation: "Configure CI to run on pull_request."
    }),
    check({
      id: "cicd.triggers.push",
      title: "CI runs on push",
      category: "cicd",
      status: hasWorkflowTrigger(workflows, "push") ? "pass" : "warn",
      severity: "medium",
      message: hasWorkflowTrigger(workflows, "push")
        ? "A workflow appears to run on push."
        : "No push trigger was detected.",
      recommendation: "Configure CI to run on push."
    }),
    check({
      id: "cicd.commands",
      title: "Workflow runs project commands",
      category: "cicd",
      status: /\b(install|build|test|lint)\b/.test(combined) ? "pass" : "warn",
      severity: "medium",
      message: /\b(install|build|test|lint)\b/.test(combined)
        ? "Workflow appears to run install, build, test, or lint commands."
        : "Workflow does not appear to run common project validation commands.",
      recommendation: "Run install, build, test, or lint commands in CI."
    }),
    check({
      id: "cicd.checkout",
      title: "Workflow uses checkout action",
      category: "cicd",
      status: combined.includes("actions/checkout") ? "pass" : "warn",
      severity: "medium",
      message: combined.includes("actions/checkout")
        ? "Workflow uses actions/checkout."
        : "Workflow does not appear to use actions/checkout.",
      recommendation: "Use actions/checkout in workflows that inspect or build repository code."
    })
  ];
}

async function securityChecks(
  repoPath: string,
  gitignore: string | undefined,
  workflows: WorkflowFile[],
  ignore: string[]
): Promise<CheckResult[]> {
  const envFiles = await fg([".env", ".env.*"], {
    cwd: repoPath,
    dot: true,
    ignore: [...ignore, ".env.example"],
    onlyFiles: true
  });
  const workflowsText = workflows.map((workflow) => workflow.text).join("\n").toLowerCase();

  return [
    existsCheck(repoPath, {
      id: "security.policy.exists",
      title: "SECURITY policy exists",
      category: "security",
      file: "SECURITY.md",
      severity: "high",
      recommendation: "Add SECURITY.md with private vulnerability reporting guidance."
    }),
    existsCheck(repoPath, {
      id: "security.dependabot.exists",
      title: "Dependabot config exists",
      category: "security",
      file: path.join(".github", "dependabot.yml"),
      severity: "medium",
      recommendation: "Add .github/dependabot.yml to keep dependencies fresh."
    }),
    check({
      id: "security.env.not_committed",
      title: "No obvious .env files committed",
      category: "security",
      status: envFiles.length === 0 ? "pass" : "fail",
      severity: "critical",
      message:
        envFiles.length === 0
          ? "No obvious committed .env files were found."
          : `Found possible secret files: ${envFiles.join(", ")}.`,
      recommendation: "Remove committed .env files and rotate any exposed secrets."
    }),
    check({
      id: "security.gitignore.exists",
      title: ".gitignore exists",
      category: "security",
      status: gitignore ? "pass" : "fail",
      severity: "high",
      message: gitignore ? ".gitignore is present." : ".gitignore is missing.",
      recommendation: "Add .gitignore with common build outputs and secret file patterns."
    }),
    check({
      id: "security.gitignore.secrets",
      title: ".gitignore ignores common secret files",
      category: "security",
      status: gitignore && /(^|\n)\.env(\.\*)?(\n|$)/.test(gitignore) ? "pass" : "warn",
      severity: "medium",
      message:
        gitignore && /(^|\n)\.env(\.\*)?(\n|$)/.test(gitignore)
          ? ".gitignore includes .env patterns."
          : ".gitignore does not clearly ignore .env files.",
      recommendation: "Add .env and .env.* to .gitignore while allowing .env.example if needed."
    }),
    check({
      id: "security.codeql.workflow",
      title: "CodeQL workflow exists",
      category: "security",
      status: workflowsText.includes("codeql") ? "pass" : "warn",
      severity: "low",
      message: workflowsText.includes("codeql")
        ? "A CodeQL workflow appears to be configured."
        : "No CodeQL workflow was detected.",
      recommendation: "Consider adding CodeQL for supported languages."
    }),
    check({
      id: "security.actions.versioned",
      title: "GitHub Actions are versioned",
      category: "security",
      status: workflowsText.includes("uses:") && /uses:\s*[^@\s]+@v?\d+/i.test(workflowsText) ? "pass" : "warn",
      severity: "low",
      message:
        workflowsText.includes("uses:") && /uses:\s*[^@\s]+@v?\d+/i.test(workflowsText)
          ? "Workflow actions appear to use version tags."
          : "Workflow actions are missing or do not appear versioned.",
      recommendation: "Use explicit action versions such as actions/checkout@v4."
    })
  ];
}

async function contributorChecks(
  repoPath: string,
  readme: string | undefined,
  ignore: string[]
): Promise<CheckResult[]> {
  const issueTemplates = await fg([".github/ISSUE_TEMPLATE/*.md", ".github/ISSUE_TEMPLATE/*.yml", ".github/ISSUE_TEMPLATE/*.yaml"], {
    cwd: repoPath,
    dot: true,
    ignore,
    onlyFiles: true
  });

  return [
    existsCheck(repoPath, {
      id: "contributors.contributing.exists",
      title: "CONTRIBUTING guide exists",
      category: "contributors",
      file: "CONTRIBUTING.md",
      severity: "medium",
      recommendation: "Add CONTRIBUTING.md with local setup and contribution expectations."
    }),
    existsCheck(repoPath, {
      id: "contributors.code_of_conduct.exists",
      title: "Code of Conduct exists",
      category: "contributors",
      file: "CODE_OF_CONDUCT.md",
      severity: "medium",
      recommendation: "Add CODE_OF_CONDUCT.md for contributor community expectations."
    }),
    existsCheck(repoPath, {
      id: "contributors.pr_template.exists",
      title: "Pull request template exists",
      category: "contributors",
      file: path.join(".github", "pull_request_template.md"),
      severity: "medium",
      recommendation: "Add a pull request template to guide contributors."
    }),
    check({
      id: "contributors.issue_templates.exists",
      title: "Issue templates exist",
      category: "contributors",
      status: issueTemplates.length > 0 ? "pass" : "warn",
      severity: "medium",
      message:
        issueTemplates.length > 0
          ? `Found ${issueTemplates.length} issue template(s).`
          : "No issue templates were found.",
      recommendation: "Add bug report and feature request issue templates."
    }),
    contentCheck({
      id: "contributors.readme.contact",
      title: "README has maintainer or contact information",
      category: "contributors",
      text: readme,
      pattern: /\b(contact|maintainer|author|support|email)\b/i,
      severity: "low",
      recommendation: "Add maintainer or contact information to README.md."
    }),
    contentCheck({
      id: "contributors.readme.roadmap",
      title: "README has roadmap or future work",
      category: "contributors",
      text: readme,
      pattern: /\b(roadmap|future work|planned|next steps)\b/i,
      severity: "low",
      recommendation: "Add a roadmap or future work section to README.md."
    })
  ];
}

async function readWorkflows(repoPath: string): Promise<WorkflowFile[]> {
  const files = await fg([".github/workflows/*.yml", ".github/workflows/*.yaml"], {
    cwd: repoPath,
    dot: true,
    onlyFiles: true
  });

  return Promise.all(
    files.map(async (file): Promise<WorkflowFile> => {
      const absolutePath = path.join(repoPath, file);

      return {
        path: file,
        text: (await readTextSafe(absolutePath)) ?? "",
        data: await readYamlSafe(absolutePath)
      };
    })
  );
}

function check(input: CheckResult): CheckResult {
  return input;
}

function contentCheck(options: {
  id: string;
  title: string;
  category: Category;
  text: string | undefined;
  pattern: RegExp;
  severity: Severity;
  recommendation: string;
}): CheckResult {
  const hasContent = Boolean(options.text);
  const passes = hasContent && options.pattern.test(options.text ?? "");

  return {
    id: options.id,
    title: options.title,
    category: options.category,
    status: passes ? "pass" : hasContent ? "warn" : "fail",
    severity: options.severity,
    message: passes
      ? `${options.title}.`
      : hasContent
        ? missingContentMessage(options.title)
        : "README.md is missing.",
    recommendation: options.recommendation
  };
}

function missingContentMessage(title: string): string {
  if (title.startsWith("README has ")) {
    return `README is missing ${title.slice("README has ".length)}.`;
  }

  if (title.startsWith("README mentions ")) {
    return `README does not mention ${title.slice("README mentions ".length)}.`;
  }

  return `${title} was not detected.`;
}

function existsCheck(
  repoPath: string,
  options: {
    id: string;
    title: string;
    category: Category;
    file: string;
    severity: Severity;
    recommendation: string;
  }
): CheckResult {
  const exists = fileExistsSyncish(repoPath, options.file);

  return {
    id: options.id,
    title: options.title,
    category: options.category,
    status: exists ? "pass" : "fail",
    severity: options.severity,
    message: exists ? `${options.file} is present.` : `${options.file} is missing.`,
    recommendation: options.recommendation
  };
}

function scriptCheck(
  packageJson: PackageJson | undefined,
  script: string,
  title: string,
  recommendation: string,
  severity: Severity = "medium"
): CheckResult {
  const hasPackageJson = Boolean(packageJson);
  const hasScript = typeof packageJson?.scripts?.[script] === "string";

  return {
    id: `build.script.${script}`,
    title,
    category: "buildTest",
    status: hasScript ? "pass" : hasPackageJson ? "fail" : "warn",
    severity,
    message: hasScript
      ? `package.json defines a ${script} script.`
      : hasPackageJson
        ? `package.json does not define a ${script} script.`
        : "No package.json was found.",
    recommendation
  };
}

async function anyFileExists(repoPath: string, files: string[]): Promise<boolean> {
  const results = await Promise.all(files.map((file) => fileExists(path.join(repoPath, file))));
  return results.some(Boolean);
}

function fileExistsSyncish(repoPath: string, file: string): boolean {
  return existsSync(path.join(repoPath, file));
}

function hasWorkflowTrigger(workflows: WorkflowFile[], trigger: "push" | "pull_request"): boolean {
  return workflows.some((workflow) => {
    if (workflow.text.toLowerCase().includes(trigger)) {
      return true;
    }

    return workflowHasTrigger(workflow.data, trigger);
  });
}

function workflowHasTrigger(data: unknown, trigger: "push" | "pull_request"): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const workflow = data as Record<string, unknown>;
  const onValue = workflow.on ?? workflow.On ?? workflow.ON;

  if (typeof onValue === "string") {
    return onValue === trigger;
  }

  if (Array.isArray(onValue)) {
    return onValue.includes(trigger);
  }

  if (onValue && typeof onValue === "object") {
    return trigger in onValue;
  }

  return false;
}
