import { useMemo, useState } from "react";
import { useCaseStore } from "../../store/useCaseStore";
import { useDesignStore, selectActiveVariant } from "../../store/useDesignStore";
import { useImportStore } from "../../store/useImportStore";
import { canMarkReadyForDoctor } from "../handoff/handoffStore";
import { exportVariant, type ExportFormat } from "../export/exportService";
import { openReportForPrint } from "../export/reportGenerator";
import { packageCase, downloadPackagedCase } from "../collaboration/casePackager";

export function ExportView() {
  const activeVariant = useDesignStore(selectActiveVariant);
  const generatedDesign = useDesignStore((s) => s.generatedDesign);
  const caseRecord = useCaseStore((s) => s.caseRecord);
  const readyForDoctor = useDesignStore((s) => s.readyForDoctor);
  const markReadyForDoctor = useDesignStore((s) => s.markReadyForDoctor);
  const downloadActiveStl = useDesignStore((s) => s.downloadActiveStl);
  const variants = useDesignStore((s) => s.variants);

  const statusLabel = caseRecord?.workflowState ?? "draft";
  const canMarkReady = useMemo(
    () =>
      canMarkReadyForDoctor({
        hasImports: Boolean(caseRecord),
        mappingConfirmed: caseRecord?.workflowState === "mapped",
        savedVariantCount: variants.length
      }),
    [caseRecord, variants.length]
  );
  const plan = useDesignStore((s) => s.plan);
  const activeVariantId = useDesignStore((s) => s.activeVariantId);
  const selectedShadeId = useDesignStore((s) => s.selectedShadeId);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const uploadedToothModels = useImportStore((s) => s.uploadedToothModels);
  const archScanName = useImportStore((s) => s.archScanName);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("stl_binary");

  if (!generatedDesign) {
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
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
        <span>Generate a design first to export</span>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflow: "auto", padding: 16 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Export & Handoff</h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
          Download STL files, review the design summary, and mark the case ready for the doctor.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16
        }}
      >
        {/* STL Export */}
        <div className="panel">
          <div className="panel-header">
            <h3>STL Export</h3>
          </div>
          <div className="panel-body" style={{ display: "grid", gap: 12 }}>
            {generatedDesign.variants.map((variant) => {
              const isActive = variant.id === activeVariantId;
              const triangleCount = variant.teeth.reduce((s, t) => s + t.previewTriangles.length, 0);
              // Binary STL: 80-byte header + 4-byte count + 50 bytes per triangle
              const sizeKB = ((84 + triangleCount * 50) / 1024).toFixed(1);

              return (
                <div
                  key={variant.id}
                  className={`card ${isActive ? "active" : ""}`}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>
                      {variant.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {variant.teeth.length} teeth &middot; ~{sizeKB} KB
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      exportVariant(variant, {
                        format: "stl_binary",
                        filename: `SmileGen_${variant.label}_${variant.id.slice(0, 8)}`,
                        includeAllVariants: false
                      })
                    }
                  >
                    Download
                  </button>
                </div>
              );
            })}

            {activeVariant && (
              <button className="btn btn-primary" onClick={downloadActiveStl} style={{ marginTop: 4 }}>
                Download Active STL ({activeVariant.label})
              </button>
            )}

            <div className="divider" />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Format:</span>
              <select
                className="input"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                style={{ flex: 1 }}
              >
                <option value="stl_binary">STL (Binary)</option>
                <option value="stl_ascii">STL (ASCII)</option>
                <option value="obj">OBJ</option>
              </select>
            </div>

            {activeVariant && (
              <button
                className="btn btn-sm"
                onClick={() =>
                  exportVariant(activeVariant, {
                    format: exportFormat,
                    filename: `SmileGen_${activeVariant.label}`,
                    includeAllVariants: false
                  })
                }
              >
                Export {exportFormat.toUpperCase()} ({activeVariant.label})
              </button>
            )}
          </div>
        </div>

        {/* Reports & Sharing */}
        <div className="panel">
          <div className="panel-header">
            <h3>Reports & Sharing</h3>
          </div>
          <div className="panel-body" style={{ display: "grid", gap: 10 }}>
            <button
              className="btn btn-sm"
              onClick={() =>
                openReportForPrint({
                  caseTitle: caseRecord?.title ?? "Untitled Case",
                  workflowState: statusLabel,
                  plan: {
                    additiveBias: plan.additiveBias,
                    selectedTeeth: plan.selectedTeeth,
                    treatmentMap: plan.treatmentMap as Record<string, string>
                  },
                  variants: generatedDesign.variants.map((v) => ({
                    label: v.label,
                    teethCount: v.teeth.length,
                    avgWidth: v.teeth.reduce((s, t) => s + t.width, 0) / v.teeth.length,
                    avgHeight: v.teeth.reduce((s, t) => s + t.height, 0) / v.teeth.length
                  })),
                  activeVariantLabel: activeVariant?.label,
                  shadeId: selectedShadeId,
                  generatedAt: new Date().toISOString()
                })
              }
            >
              Print Case Report (PDF)
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                const pkg = packageCase({
                  title: caseRecord?.title ?? "Untitled",
                  workflowState: statusLabel,
                  plan,
                  design: generatedDesign,
                  photoNames: uploadedPhotos.map((p) => p.name),
                  archScanName,
                  toothModelNames: uploadedToothModels.map((m) => m.name)
                });
                downloadPackagedCase(pkg, `${caseRecord?.title ?? "case"}.smilegen`);
              }}
            >
              Export .smilegen Package
            </button>
          </div>
        </div>

        {/* Design Summary */}
        <div className="panel">
          <div className="panel-header">
            <h3>Design Summary</h3>
          </div>
          <div className="panel-body" style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--text-secondary)" }}>Case</span>
              <span className="label-value">{caseRecord?.title ?? "N/A"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--text-secondary)" }}>Status</span>
              <span className={`badge ${statusLabel === "prepared" ? "badge-success" : "badge-info"}`}>
                {statusLabel}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--text-secondary)" }}>Bias</span>
              <span className="label-value" style={{ textTransform: "capitalize" }}>
                {plan.additiveBias}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--text-secondary)" }}>Variants</span>
              <span className="label-value">{variants.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--text-secondary)" }}>Selected Teeth</span>
              <span className="label-value">{plan.selectedTeeth.join(", ")}</span>
            </div>

            <div className="divider" />

            <div className="label" style={{ marginBottom: 4 }}>
              Treatment Map
            </div>
            {Object.entries(plan.treatmentMap).map(([toothId, treatment]) => (
              <div
                key={toothId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--text-secondary)"
                }}
              >
                <span>Tooth #{toothId}</span>
                <span style={{ textTransform: "capitalize" }}>{treatment}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor Handoff */}
        <div className="panel">
          <div className="panel-header">
            <h3>Doctor Handoff</h3>
          </div>
          <div className="panel-body" style={{ display: "grid", gap: 12 }}>
            {readyForDoctor ? (
              <div
                className="card"
                style={{
                  borderColor: "var(--success)",
                  background: "var(--success-dim)",
                  textAlign: "center",
                  padding: 20
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="var(--success)"
                  style={{ marginBottom: 8 }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <div style={{ fontWeight: 600, color: "var(--success)", marginBottom: 4 }}>
                  Case Ready for Doctor
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  All variants have been reviewed and the case is marked as prepared.
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Review all variants and confirm the design before handing off to the doctor.
                  Requires at least 3 saved variants with confirmed mapping.
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <CheckItem
                    label="Case created"
                    checked={Boolean(caseRecord)}
                  />
                  <CheckItem
                    label="Mapping confirmed"
                    checked={caseRecord?.workflowState === "mapped" || caseRecord?.workflowState === "prepared"}
                  />
                  <CheckItem
                    label="Variants generated (3+ required)"
                    checked={variants.length >= 3}
                  />
                </div>

                <button
                  className="btn btn-success"
                  onClick={markReadyForDoctor}
                  disabled={!canMarkReady}
                >
                  Mark Ready for Doctor
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: checked ? "var(--success)" : "var(--text-muted)"
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        {checked ? (
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        ) : (
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
        )}
      </svg>
      <span>{label}</span>
    </div>
  );
}
