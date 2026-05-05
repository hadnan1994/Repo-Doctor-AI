# Repo Doctor AI Report

## Repository

| Field | Value |
| --- | --- |
| Repository | `launchdeck-api` |
| Generated | `2026-05-05T03:30:00.000Z` |
| Overall score | **86/100** |

## Category Scores

| Category | Score |
| --- | ---: |
| Presentation | 89/100 |
| Build/Test Readiness | 88/100 |
| CI/CD Health | 100/100 |
| Security Hygiene | 86/100 |
| Contributor Readiness | 83/100 |

## Detected Stacks

- **node** (primary) (high confidence) - `package.json`, `pnpm-lock.yaml`, `tsconfig.json` - scripts: `test`, `build`, `lint`, `typecheck`

## Summary

| Passed | Warnings | Failed | Critical |
| ---: | ---: | ---: | ---: |
| 31 | 3 | 2 | 0 |

## Top Fixes

1. **FAIL** Add `.github/dependabot.yml` to keep dependencies fresh.
2. **FAIL** Add `CHANGELOG.md` to document notable project changes.
3. **WARN** Consider adding CodeQL for supported languages.
4. **WARN** Add a demo screenshot or terminal recording to the README.
5. **WARN** Add maintainer contact information to the README.

## Score Story

| Stage | Score | What Changed |
| --- | ---: | --- |
| Before | 41/100 | README was thin, CI was missing, no license, no tests, no security policy |
| After | 86/100 | Added README structure, MIT license, test script, GitHub Actions, security policy, PR and issue templates |

Repo Doctor AI does not guess at intent. It points to concrete repository hygiene signals and gives maintainers a practical next step list.

## Full Check Table

| Check | Category | Status | Severity | Message | Recommendation |
| --- | --- | --- | --- | --- | --- |
| README exists | Presentation | PASS | critical | README.md is present. | Keep the README current as features change. |
| README has installation instructions | Presentation | PASS | medium | Installation instructions were found. | Keep setup commands copy-pasteable. |
| README has usage instructions | Presentation | PASS | medium | Usage examples were found. | Add new examples when commands change. |
| README has a project description | Presentation | PASS | medium | Project description is clear. | Keep the first paragraph specific. |
| README has badges | Presentation | PASS | low | Badges were found. | Keep badges useful and minimal. |
| README mentions license | Presentation | PASS | medium | License is mentioned in README.md. | Link to the license file. |
| README has screenshots or demo section | Presentation | WARN | low | No visual demo section was detected. | Add a screenshot, terminal recording, or example output. |
| LICENSE exists | Presentation | PASS | critical | LICENSE is present. | No action needed. |
| CHANGELOG exists | Presentation | FAIL | low | CHANGELOG.md is missing. | Add a changelog before public releases. |
| Stack detected | Build/Test Readiness | PASS | high | Detected node. | No action needed. |
| Build script exists | Build/Test Readiness | PASS | medium | package.json defines a build script. | No action needed. |
| Test script exists | Build/Test Readiness | PASS | high | package.json defines a test script. | No action needed. |
| Lint script exists | Build/Test Readiness | PASS | medium | package.json defines a lint script. | No action needed. |
| Lockfile exists | Build/Test Readiness | PASS | medium | pnpm lockfile is present. | Keep the lockfile committed. |
| TypeScript config exists | Build/Test Readiness | PASS | low | tsconfig.json is present. | No action needed. |
| GitHub workflows directory exists | CI/CD Health | PASS | high | .github/workflows exists. | No action needed. |
| Workflow file exists | CI/CD Health | PASS | high | Found 1 workflow file. | No action needed. |
| CI runs on pull requests | CI/CD Health | PASS | medium | pull_request trigger was found. | No action needed. |
| CI runs on push | CI/CD Health | PASS | medium | push trigger was found. | No action needed. |
| Workflow runs project commands | CI/CD Health | PASS | medium | install, lint, test, and build commands were found. | No action needed. |
| Workflow uses checkout action | CI/CD Health | PASS | medium | actions/checkout is configured. | No action needed. |
| SECURITY policy exists | Security Hygiene | PASS | high | SECURITY.md is present. | Keep reporting instructions current. |
| Dependabot config exists | Security Hygiene | FAIL | medium | .github/dependabot.yml is missing. | Add Dependabot to monitor dependencies. |
| No obvious .env files committed | Security Hygiene | PASS | critical | No committed .env files were found. | No action needed. |
| .gitignore exists | Security Hygiene | PASS | high | .gitignore is present. | No action needed. |
| .gitignore ignores common secret files | Security Hygiene | PASS | medium | .env patterns are ignored. | No action needed. |
| CodeQL workflow exists | Security Hygiene | WARN | low | No CodeQL workflow was detected. | Consider adding CodeQL for supported languages. |
| CONTRIBUTING guide exists | Contributor Readiness | PASS | medium | CONTRIBUTING.md is present. | No action needed. |
| Code of Conduct exists | Contributor Readiness | PASS | medium | CODE_OF_CONDUCT.md is present. | No action needed. |
| Pull request template exists | Contributor Readiness | PASS | medium | Pull request template is present. | No action needed. |
| Issue templates exist | Contributor Readiness | PASS | medium | Bug and feature templates were found. | No action needed. |
| README has maintainer or contact information | Contributor Readiness | WARN | low | Maintainer contact was not detected. | Add support or maintainer contact information. |
| README has roadmap or future work | Contributor Readiness | PASS | low | Roadmap section was found. | Keep roadmap realistic. |

## Recommended Next Steps

1. Add `.github/dependabot.yml` using the package manager already detected in the repo.
2. Add `CHANGELOG.md` before the next release and keep entries short.
3. Add a small demo section to README.md with terminal output or a screenshot.
4. Add maintainer contact details so contributors know where to ask security and support questions.

---

Generated by [Repo Doctor AI](https://www.npmjs.com/package/repo-doctor-ai).
