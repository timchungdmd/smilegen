export type TrustState = "ready" | "needs_correction" | "blocked";

export interface ToothTrust {
  toothId: string;
  state: TrustState;
}

export interface TrustSummary {
  exportBlocked: boolean;
  needsAttentionCount: number;
  blockedCount: number;
}

export function summarizeTrustState(teeth: ToothTrust[]): TrustSummary {
  const blockedCount = teeth.filter((tooth) => tooth.state === "blocked").length;
  const needsAttentionCount = teeth.filter((tooth) => tooth.state !== "ready").length;

  return {
    exportBlocked: blockedCount > 0,
    needsAttentionCount,
    blockedCount
  };
}
