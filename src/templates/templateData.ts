import type { DetectedStack, StackDetectionResult } from "../scanner/types.js";
import type { RepoDoctorConfig } from "../utils/config.js";

export type TemplateFile = {
  path: string;
  contents: string;
};

export function getTemplateFiles(
  stackDetection: StackDetectionResult,
  config: RepoDoctorConfig
): TemplateFile[] {
  return [
    ...baseTemplateFiles.map((template) =>
      template.path === "LICENSE" ? { ...template, contents: licenseTemplate(config) } : template
    ),
    {
      path: ".github/workflows/ci.yml",
      contents: getCiTemplate(stackDetection)
    }
  ];
}

function licenseTemplate(config: RepoDoctorConfig): string {
  if (config.license.toLowerCase() !== "mit") {
    return `# ${config.license} License

Copyright (c) ${new Date().getFullYear()} ${config.author}

Add the full ${config.license} license text before publishing.
`;
  }

  return `MIT License

Copyright (c) ${new Date().getFullYear()} ${config.author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

const baseTemplateFiles: TemplateFile[] = [
  {
    path: "LICENSE",
    contents: ""
  },
  {
    path: "SECURITY.md",
    contents: "# Security Policy\n\nPlease report security issues privately to the maintainers.\n"
  },
  {
    path: "CONTRIBUTING.md",
    contents: "# Contributing\n\nThanks for your interest in contributing. Please open an issue before large changes.\n"
  },
  {
    path: "CHANGELOG.md",
    contents: "# Changelog\n\nAll notable changes to this project will be documented here.\n"
  },
  {
    path: ".github/dependabot.yml",
    contents: `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
`
  },
  {
    path: ".github/pull_request_template.md",
    contents: `## Summary

Describe the change and why it matters.

## Testing

- [ ] Tests pass locally
`
  },
  {
    path: ".github/ISSUE_TEMPLATE/bug_report.md",
    contents: `---
name: Bug report
about: Report a reproducible problem
---

## What happened?

## How can we reproduce it?
`
  },
  {
    path: ".github/ISSUE_TEMPLATE/feature_request.md",
    contents: `---
name: Feature request
about: Suggest an improvement
---

## What would you like to see?

## Why does it matter?
`
  }
];

function getCiTemplate(stackDetection: StackDetectionResult): string {
  const primaryStack = stackDetection.detectedStacks.find(
    (stack) => stack.name === stackDetection.primaryStack
  );

  if (!primaryStack) {
    return genericCiTemplate();
  }

  if (primaryStack.name === "node") return nodeCiTemplate(primaryStack);
  if (primaryStack.name === "python") return pythonCiTemplate();
  if (primaryStack.name === "go") return goCiTemplate();
  if (primaryStack.name === "rust") return rustCiTemplate();

  return genericCiTemplate();
}

function nodeCiTemplate(stack: DetectedStack): string {
  const packageManager = getNodePackageManager(stack);
  const scripts = new Set(stack.scripts ?? []);
  const hasLockfile = stack.indicators.some((indicator) =>
    ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"].includes(indicator)
  );
  const setupPnpm =
    packageManager === "pnpm"
      ? `      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

`
      : "";
  const installCommand =
    packageManager === "pnpm"
      ? "pnpm install --frozen-lockfile"
      : packageManager === "yarn"
        ? "corepack enable && yarn install --frozen-lockfile"
        : hasLockfile
          ? "npm ci"
          : "npm install";
  const cacheName = packageManager === "yarn" ? "yarn" : packageManager === "npm" ? "npm" : "pnpm";
  const cacheConfig = hasLockfile ? `          cache: ${cacheName}\n` : "";
  const scriptSteps = ["lint", "test", "build"]
    .filter((script) => scripts.has(script))
    .map(
      (script) => `      - name: Run ${script}
        run: ${packageManager} run ${script}`
    )
    .join("\n\n");
  const validationSteps =
    scriptSteps ||
    `      - name: Inspect project
        run: ls`;

  return `name: CI

on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

${setupPnpm}      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
${cacheConfig}

      - name: Install dependencies
        run: ${installCommand}

${validationSteps}
`;
}

function getNodePackageManager(stack: DetectedStack): "pnpm" | "npm" | "yarn" {
  if (stack.indicators.includes("pnpm-lock.yaml")) return "pnpm";
  if (stack.indicators.includes("yarn.lock")) return "yarn";
  return "npm";
}

function pythonCiTemplate(): string {
  return `name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          if [ -f pyproject.toml ]; then pip install -e .; fi

      - name: Run tests
        run: pytest
`;
}

function goCiTemplate(): string {
  return `name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: stable

      - name: Run tests
        run: go test ./...
`;
}

function rustCiTemplate(): string {
  return `name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Rust
        run: rustup toolchain install stable --profile minimal

      - name: Run tests
        run: cargo test
`;
}

function genericCiTemplate(): string {
  return `name: CI

on:
  push:
  pull_request:

jobs:
  inspect:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Inspect project files
        run: ls

      - name: Customize CI
        run: echo "Customize this workflow with your project install, build, test, and lint commands."
`;
}
