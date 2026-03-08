import type { ToothMappingState } from "./toothMappingStore";

interface ScanReviewPanelProps {
  mappingState: ToothMappingState;
}

export function ScanReviewPanel({ mappingState }: ScanReviewPanelProps) {
  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <div className="panel-header">
        <h3>Scan Mapping</h3>
        <span
          className={`badge ${!mappingState.requiresConfirmation ? "badge-success" : "badge-warning"}`}
        >
          {!mappingState.requiresConfirmation ? "mapped" : "needs review"}
        </span>
      </div>
      <div className="panel-body" style={{ display: "grid", gap: 8 }}>
        {mappingState.teeth.map((tooth) => {
          const pct = Math.round(tooth.confidence * 100);
          const isHigh = tooth.confidence >= 0.65;

          return (
            <div key={tooth.toothId}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 3
                }}
              >
                <span style={{ fontWeight: 600 }}>Tooth #{tooth.toothId}</span>
                <span
                  style={{
                    color: isHigh ? "var(--success)" : "var(--warning)",
                    fontVariantNumeric: "tabular-nums"
                  }}
                >
                  {pct}%
                </span>
              </div>
              <div className="confidence-bar">
                <div
                  className="confidence-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: isHigh ? "var(--success)" : "var(--warning)"
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
