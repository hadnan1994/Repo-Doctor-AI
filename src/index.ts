export { scanRepo, ScanRepoError } from "./scanner/scanRepo.js";
export { runChecks } from "./scanner/checks.js";
export { detectStack } from "./scanner/detectStack.js";
export {
  calculateScore,
  categoryWeights,
  getTopFixes,
  overallScore,
  scoreChecks,
  summarizeChecks
} from "./scanner/score.js";
export { formatTerminalReport } from "./reporters/terminalReporter.js";
export { formatMarkdownReport } from "./reporters/markdownReporter.js";
export { formatJsonReport } from "./reporters/jsonReporter.js";
export { generateTemplates } from "./templates/generateTemplates.js";
export { ConfigError, defaultConfig, loadConfig } from "./utils/config.js";
export type {
  Category,
  CheckResult,
  CheckStatus,
  DetectedStack,
  ScanResult,
  StackDetectionResult,
  StackName,
  Severity
} from "./scanner/types.js";
