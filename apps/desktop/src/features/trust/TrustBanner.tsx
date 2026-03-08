import type { TrustSummary } from "./trustEngine";
import { trustBannerLabel } from "./trustSelectors";

interface TrustBannerProps {
  summary: TrustSummary;
}

export function TrustBanner({ summary }: TrustBannerProps) {
  const label = trustBannerLabel(summary);
  const allReady = !summary.exportBlocked && summary.needsAttentionCount === 0;

  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        background: allReady ? "var(--success-dim)" : "var(--warning-dim)"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={allReady ? "var(--success)" : "var(--warning)"}
        >
          {allReady ? (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          ) : (
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          )}
        </svg>
        <span style={{ color: allReady ? "var(--success)" : "var(--warning)", fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 6,
          fontSize: 11,
          color: "var(--text-secondary)"
        }}
      >
        {summary.needsAttentionCount > 0 && (
          <span style={{ color: "var(--warning)" }}>
            Needs attention: {summary.needsAttentionCount}
          </span>
        )}
        {summary.blockedCount > 0 && (
          <span style={{ color: "var(--danger)" }}>Blocked: {summary.blockedCount}</span>
        )}
        {allReady && <span style={{ color: "var(--success)" }}>All teeth ready</span>}
      </div>
    </div>
  );
}
