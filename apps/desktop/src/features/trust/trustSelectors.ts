import type { TrustSummary } from "./trustEngine";

export function trustBannerLabel(summary: TrustSummary) {
  if (summary.exportBlocked) {
    return `${summary.blockedCount} blocked tooth${summary.blockedCount === 1 ? "" : "s"}`;
  }

  if (summary.needsAttentionCount > 0) {
    return `${summary.needsAttentionCount} tooth needs review`;
  }

  return "All teeth ready";
}
