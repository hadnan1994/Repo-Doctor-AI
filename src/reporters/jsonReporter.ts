import type { ScanResult } from "../scanner/types.js";

export function formatJsonReport(result: ScanResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}
