import { useDesignStore, selectActiveVariant } from "../../store/useDesignStore";

export function CompareView() {
  const variants = useDesignStore((s) => s.variants);
  const activeVariantId = useDesignStore((s) => s.activeVariantId);
  const selectVariant = useDesignStore((s) => s.selectVariant);
  const selectedToothId = useDesignStore((s) => s.selectedToothId);
  const selectTooth = useDesignStore((s) => s.selectTooth);
  const plan = useDesignStore((s) => s.plan);
  const generatedDesign = useDesignStore((s) => s.generatedDesign);
  const activeVariant = useDesignStore(selectActiveVariant);

  if (!generatedDesign || variants.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          color: "var(--text-muted)"
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity={0.3}>
          <path d="M10 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v-2H5V5h5V3zm9-1h-5v2h5v14h-5v2h5c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
        <span>Generate a design first to compare variants</span>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflow: "auto", padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Compare Variants</h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
          Review and compare design variants side by side. Select a variant to make it active.
        </p>
      </div>

      {/* Variant cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
          marginBottom: 20
        }}
      >
        {generatedDesign.variants.map((variant) => {
          const isActive = variant.id === activeVariantId;
          const toothCount = variant.teeth.length;
          const avgWidth =
            toothCount > 0
              ? variant.teeth.reduce((sum, t) => sum + t.width, 0) / toothCount
              : 0;
          const avgHeight =
            toothCount > 0
              ? variant.teeth.reduce((sum, t) => sum + t.height, 0) / toothCount
              : 0;

          return (
            <div
              key={variant.id}
              className={`card variant-card ${isActive ? "active" : ""}`}
              onClick={() => selectVariant(variant.id)}
              style={{ cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>
                    {variant.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    {variant.id.slice(0, 8)}
                  </div>
                </div>
                {isActive && (
                  <span className="badge badge-info">Active</span>
                )}
              </div>

              {/* Tooth visualization strip */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-end",
                  gap: 2,
                  padding: "12px 0",
                  background: "var(--bg-primary)",
                  borderRadius: 6,
                  marginBottom: 10,
                  minHeight: 60
                }}
              >
                {variant.teeth.map((tooth) => {
                  const barH = Math.max(tooth.height * 3, 12);
                  const barW = Math.max(tooth.width * 2.5, 8);
                  const isSelected = tooth.toothId === selectedToothId;

                  return (
                    <div
                      key={tooth.toothId}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectTooth(tooth.toothId);
                      }}
                      style={{
                        width: barW,
                        height: barH,
                        borderRadius: `${barW * 0.3}px ${barW * 0.3}px 2px 2px`,
                        background: isSelected
                          ? "var(--accent)"
                          : tooth.trustState === "ready"
                            ? "var(--tooth-fill)"
                            : tooth.trustState === "needs_correction"
                              ? "var(--warning)"
                              : "var(--danger)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                      title={`Tooth ${tooth.toothId}: ${tooth.width.toFixed(1)}w x ${tooth.height.toFixed(1)}h`}
                    />
                  );
                })}
              </div>

              {/* Stats */}
              <div className="grid-3" style={{ fontSize: 11 }}>
                <div>
                  <div className="label">Teeth</div>
                  <div className="label-value">{toothCount}</div>
                </div>
                <div>
                  <div className="label">Avg W</div>
                  <div className="label-value">{avgWidth.toFixed(1)}</div>
                </div>
                <div>
                  <div className="label">Avg H</div>
                  <div className="label-value">{avgHeight.toFixed(1)}</div>
                </div>
              </div>

              {/* Bias indicator */}
              <div style={{ marginTop: 8 }}>
                <div className="confidence-bar">
                  <div
                    className="confidence-bar-fill"
                    style={{
                      width: `${variant.label === "conservative" ? 33 : variant.label === "balanced" ? 66 : 100}%`,
                      background:
                        variant.label === "conservative"
                          ? "var(--success)"
                          : variant.label === "balanced"
                            ? "var(--accent)"
                            : "var(--warning)"
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginTop: 2
                  }}
                >
                  <span>Conservative</span>
                  <span>Enhanced</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail comparison table */}
      {activeVariant && (
        <div className="panel" style={{ marginTop: 8 }}>
          <div className="panel-header">
            <h3>Tooth Details &mdash; {activeVariant.label}</h3>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tooth</th>
                  <th>Width</th>
                  <th>Height</th>
                  <th>Depth</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeVariant.teeth.map((tooth) => (
                  <tr
                    key={tooth.toothId}
                    onClick={() => selectTooth(tooth.toothId)}
                    className={tooth.toothId === selectedToothId ? "active" : ""}
                  >
                    <td style={{ fontWeight: 600 }}>#{tooth.toothId}</td>
                    <td>{tooth.width.toFixed(2)} mm</td>
                    <td>{tooth.height.toFixed(2)} mm</td>
                    <td>{tooth.depth.toFixed(2)} mm</td>
                    <td>
                      <span
                        className={`badge ${
                          tooth.trustState === "ready"
                            ? "badge-success"
                            : tooth.trustState === "needs_correction"
                              ? "badge-warning"
                              : "badge-danger"
                        }`}
                      >
                        {tooth.trustState}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
