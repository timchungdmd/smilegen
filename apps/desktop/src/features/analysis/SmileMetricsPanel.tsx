import { useState, useMemo } from "react";
import { computeSmileMetrics, type SmileMetrics } from "./smileMetrics";

interface SmileMetricsPanelProps {
  teeth: ReadonlyArray<{
    toothId: string;
    width: number;
    height: number;
    positionX: number;
  }>;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--warning)";
  return "var(--danger)";
}

function statusBadge(value: number, ideal: number, tolerance: number): string {
  const deviation = Math.abs(value - ideal);
  if (deviation <= tolerance) return "badge-success";
  if (deviation <= tolerance * 2) return "badge-warning";
  return "badge-danger";
}

function statusLabel(value: number, ideal: number, tolerance: number): string {
  const deviation = Math.abs(value - ideal);
  if (deviation <= tolerance) return "Good";
  if (deviation <= tolerance * 2) return "Fair";
  return "Poor";
}

interface MetricRowProps {
  label: string;
  value: number;
  ideal: string;
  badgeClass: string;
  status: string;
}

function MetricRow({ label, value, ideal, badgeClass, status }: MetricRowProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        alignItems: "center",
        gap: 8,
        padding: "4px 0"
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="label-value" style={{ fontSize: 12 }}>
        {value.toFixed(3)}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          whiteSpace: "nowrap"
        }}
      >
        {ideal}
      </span>
      <span className={`badge ${badgeClass}`}>{status}</span>
    </div>
  );
}

export function SmileMetricsPanel({ teeth }: SmileMetricsPanelProps) {
  const [collapsed, setCollapsed] = useState(true);

  const metrics: SmileMetrics = useMemo(
    () => computeSmileMetrics(teeth),
    [teeth]
  );

  return (
    <div className="panel">
      <div
        className="panel-header"
        style={{ cursor: "pointer" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3>Smile Metrics</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: scoreColor(metrics.overallScore),
              fontVariantNumeric: "tabular-nums"
            }}
          >
            {metrics.overallScore}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              transition: "transform 0.15s ease",
              transform: collapsed ? "rotate(0deg)" : "rotate(180deg)"
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {!collapsed && (
        <div className="panel-body" style={{ display: "grid", gap: 8 }}>
          {/* Overall score display */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              marginBottom: 4
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: scoreColor(metrics.overallScore),
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1
              }}
            >
              {metrics.overallScore}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)"
              }}
            >
              / 100
            </span>
          </div>

          <div className="divider" />

          {/* Individual metrics */}
          <MetricRow
            label="Central : Lateral"
            value={metrics.centralToLateralRatio}
            ideal="≈ 0.618"
            badgeClass={statusBadge(metrics.centralToLateralRatio, 0.618, 0.04)}
            status={statusLabel(metrics.centralToLateralRatio, 0.618, 0.04)}
          />
          <MetricRow
            label="Lateral : Canine"
            value={metrics.lateralToCanineRatio}
            ideal="≈ 0.618"
            badgeClass={statusBadge(metrics.lateralToCanineRatio, 0.618, 0.04)}
            status={statusLabel(metrics.lateralToCanineRatio, 0.618, 0.04)}
          />
          <MetricRow
            label="Width : Height"
            value={metrics.widthToHeightRatio}
            ideal="0.75–0.80"
            badgeClass={statusBadge(metrics.widthToHeightRatio, 0.775, 0.03)}
            status={statusLabel(metrics.widthToHeightRatio, 0.775, 0.03)}
          />
          <MetricRow
            label="Symmetry"
            value={metrics.symmetryScore}
            ideal="≈ 1.0"
            badgeClass={statusBadge(metrics.symmetryScore, 1.0, 0.05)}
            status={statusLabel(metrics.symmetryScore, 1.0, 0.05)}
          />
          <MetricRow
            label="Golden Proportion"
            value={metrics.goldenProportionScore}
            ideal="≈ 1.0"
            badgeClass={statusBadge(metrics.goldenProportionScore, 1.0, 0.05)}
            status={statusLabel(metrics.goldenProportionScore, 1.0, 0.05)}
          />

          {/* Recommendations */}
          {metrics.recommendations.length > 0 && (
            <>
              <div className="divider" />
              <div>
                <div
                  className="label"
                  style={{ marginBottom: 6 }}
                >
                  Recommendations
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    display: "grid",
                    gap: 4
                  }}
                >
                  {metrics.recommendations.map((rec) => (
                    <li
                      key={rec}
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        lineHeight: 1.4
                      }}
                    >
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
