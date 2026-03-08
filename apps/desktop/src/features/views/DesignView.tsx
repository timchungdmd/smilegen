import { useState, useMemo } from "react";
import { useSmileStore, selectActiveVariant } from "../../store/useSmileStore";
import { validateImportSet } from "../import/importService";
import { SceneCanvas } from "../viewer/SceneCanvas";
import { PhotoOverlay } from "../overlay/PhotoOverlay";
import { SmilePlanPanel } from "../smile-plan/SmilePlanPanel";
import { ToothInspector } from "../inspector/ToothInspector";
import { TrustBanner } from "../trust/TrustBanner";
import { ScanReviewPanel } from "../review/ScanReviewPanel";
import { LibraryPanel } from "../library/LibraryPanel";
import { ShadeSelector } from "../color/ShadeSelector";
import { SmileMetricsPanel } from "../analysis/SmileMetricsPanel";
import { BUNDLED_COLLECTIONS } from "../library/bundledLibrary";
import type { ToothLibraryEntry } from "../library/toothLibraryTypes";
import { ArchFormEditor } from "../alignment/ArchFormEditor";

type DesignTab = "3d" | "photo";

export function DesignView() {
  const [activeTab, setActiveTab] = useState<DesignTab>("3d");
  const archScanMesh = useSmileStore((s) => s.archScanMesh);
  const activeVariant = useSmileStore(selectActiveVariant);
  const selectedToothId = useSmileStore((s) => s.selectedToothId);
  const selectTooth = useSmileStore((s) => s.selectTooth);
  const moveTooth = useSmileStore((s) => s.moveTooth);
  const adjustTooth = useSmileStore((s) => s.adjustTooth);
  const uploadedPhotos = useSmileStore((s) => s.uploadedPhotos);
  const plan = useSmileStore((s) => s.plan);
  const changeBias = useSmileStore((s) => s.changeBias);
  const updatePlanControls = useSmileStore((s) => s.updatePlanControls);
  const toggleToothAction = useSmileStore((s) => s.toggleTooth);
  const setTreatmentTypeFn = useSmileStore((s) => s.setTreatmentType);
  const trustSummary = useSmileStore((s) => s.trustSummary);
  const mappingState = useSmileStore((s) => s.mappingState);
  const generatedDesign = useSmileStore((s) => s.generatedDesign);
  const generateDesign = useSmileStore((s) => s.generateDesign);
  const confirmMapping = useSmileStore((s) => s.confirmMapping);
  const createCase = useSmileStore((s) => s.createCase);
  const caseRecord = useSmileStore((s) => s.caseRecord);
  const photoNames = useMemo(() => uploadedPhotos.map((p) => p.name), [uploadedPhotos]);
  const toothModelNames = useMemo(() => useSmileStore.getState().uploadedToothModels.map((m) => m.name), []);
  const archName = useSmileStore((s) => s.archScanName);
  const validation = useMemo(
    () => validateImportSet({ photos: photoNames, archScan: archName, toothLibrary: toothModelNames }),
    [photoNames, archName, toothModelNames]
  );
  const canPreview = caseRecord?.workflowState === "mapped" && validation.ok;

  const showOverlay = useSmileStore((s) => s.showOverlay);
  const setShowOverlay = useSmileStore((s) => s.setShowOverlay);
  const overlayOpacity = useSmileStore((s) => s.overlayOpacity);
  const setOverlayOpacity = useSmileStore((s) => s.setOverlayOpacity);
  const showSmileArc = useSmileStore((s) => s.showSmileArc);
  const setShowSmileArc = useSmileStore((s) => s.setShowSmileArc);
  const showMidline = useSmileStore((s) => s.showMidline);
  const setShowMidline = useSmileStore((s) => s.setShowMidline);
  const showGingivalLine = useSmileStore((s) => s.showGingivalLine);
  const setShowGingivalLine = useSmileStore((s) => s.setShowGingivalLine);

  const activeVariantId = useSmileStore((s) => s.activeVariantId);
  const selectVariant = useSmileStore((s) => s.selectVariant);
  const selectedTooth = activeVariant?.teeth.find((t) => t.toothId === selectedToothId) ?? null;
  const selectedShadeId = useSmileStore((s) => s.selectedShadeId);
  const setSelectedShadeId = useSmileStore((s) => s.setSelectedShadeId);
  const applyLibraryCollection = useSmileStore((s) => s.applyLibraryCollection);
  const activeCollectionId = useSmileStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useSmileStore((s) => s.setActiveCollectionId);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 280px",
        height: "100%",
        overflow: "hidden"
      }}
    >
      {/* Main design area */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Quick-start hint when no design exists */}
        {!generatedDesign && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: "var(--bg-tertiary)",
              borderBottom: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.4
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" style={{ flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <span>
              <strong>Getting started:</strong> Create a case, confirm mapping, select a tooth library, then click Generate Design.
              Adjust tooth proportions, arch form, and overlay alignment in the sidebar panels.
            </span>
          </div>
        )}
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            borderBottom: "1px solid var(--border)",
            gap: 8
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="tab-bar">
              <button
                className={`tab ${activeTab === "3d" ? "active" : ""}`}
                onClick={() => setActiveTab("3d")}
              >
                3D View
              </button>
              <button
                className={`tab ${activeTab === "photo" ? "active" : ""}`}
                onClick={() => setActiveTab("photo")}
                disabled={uploadedPhotos.length === 0}
              >
                Photo Overlay
              </button>
            </div>

            {/* Variant tabs */}
            {generatedDesign && (
              <div className="variant-tab-bar">
                {generatedDesign.variants.map((v) => (
                  <button
                    key={v.id}
                    className={`variant-tab ${v.id === activeVariantId ? "active" : ""}`}
                    onClick={() => selectVariant(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {!generatedDesign && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {!caseRecord && (
                  <button className="btn btn-sm" onClick={createCase}>
                    Create Case
                  </button>
                )}
                {caseRecord?.workflowState === "imported" && (
                  <button className="btn btn-sm" onClick={confirmMapping}>
                    Confirm Mapping
                  </button>
                )}
                {canPreview && (
                  <>
                    <select
                      className="input"
                      value={activeCollectionId ?? ""}
                      onChange={(e) => setActiveCollectionId(e.target.value || null)}
                      style={{ fontSize: 12, padding: "4px 8px", minWidth: 140 }}
                    >
                      <option value="">Tooth Library…</option>
                      {BUNDLED_COLLECTIONS.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={generateDesign}
                      disabled={!activeCollectionId}
                      title={!activeCollectionId ? "Select a tooth library first" : undefined}
                    >
                      Generate Design
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {activeTab === "photo" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}>
                <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />
                Overlay
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}>
                <input type="checkbox" checked={showMidline} onChange={(e) => setShowMidline(e.target.checked)} />
                Midline
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}>
                <input type="checkbox" checked={showSmileArc} onChange={(e) => setShowSmileArc(e.target.checked)} />
                Smile Arc
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}>
                <input type="checkbox" checked={showGingivalLine} onChange={(e) => setShowGingivalLine(e.target.checked)} />
                Gingival
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  style={{ width: 60 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Viewport */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", padding: 12 }}>
          {activeTab === "3d" ? (
            <SceneCanvas
              archScanMesh={archScanMesh}
              activeVariant={activeVariant}
              selectedToothId={selectedToothId}
              onSelectTooth={selectTooth}
            />
          ) : uploadedPhotos.length > 0 ? (
            <PhotoOverlay
              photo={uploadedPhotos[0]}
              activeVariant={activeVariant}
              selectedToothId={selectedToothId}
              onSelectTooth={selectTooth}
              onMoveTooth={moveTooth}
            />
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                gap: 8
              }}
            >
              <div>Import photos to use the photo overlay</div>
              <div style={{ fontSize: 11, maxWidth: 320, textAlign: "center", lineHeight: 1.5 }}>
                Upload a front smile photo in the Import tab, then switch here to
                align the design with the patient's face. Drag the yellow L/R
                commissure guides to match the smile corners.
              </div>
            </div>
          )}
        </div>

        {/* Tooth strip */}
        {activeVariant && (
          <div className="tooth-strip">
            <span className="tooth-strip-label">Teeth</span>
            {activeVariant.teeth.map((tooth) => {
              const isSelected = tooth.toothId === selectedToothId;
              const barH = Math.max(tooth.height * 2.5, 14);
              const barW = Math.max(tooth.width * 1.8, 8);
              const color =
                isSelected ? "var(--accent)"
                  : tooth.trustState === "blocked" ? "var(--danger)"
                  : tooth.trustState === "needs_correction" ? "var(--warning)"
                  : "var(--tooth-fill)";

              return (
                <div
                  key={tooth.toothId}
                  className={`tooth-chip ${isSelected ? "selected" : ""}`}
                  onClick={() => selectTooth(tooth.toothId)}
                  title={`#${tooth.toothId}: ${tooth.width.toFixed(1)}w x ${tooth.height.toFixed(1)}h mm`}
                >
                  <div
                    className="tooth-chip-bar"
                    style={{
                      width: barW,
                      height: barH,
                      background: color,
                      opacity: isSelected ? 1 : 0.7,
                      boxShadow: isSelected ? "0 0 6px var(--accent-glow)" : "none"
                    }}
                  />
                  <span className="tooth-chip-label">{tooth.toothId}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right sidebar - Design controls */}
      <div
        style={{
          borderLeft: "1px solid var(--border)",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 0
        }}
      >
        {/* Trust banner */}
        {trustSummary && <TrustBanner summary={trustSummary} />}

        {/* Smile Plan */}
        <SmilePlanPanel
          plan={plan}
          onBiasChange={changeBias}
          onControlsChange={updatePlanControls}
          onToggleTooth={toggleToothAction}
          onSetTreatmentType={setTreatmentTypeFn}
        />

        {/* Arch Form */}
        <ArchFormEditor />

        {/* Mapping */}
        {mappingState && <ScanReviewPanel mappingState={mappingState} />}

        {/* Tooth Inspector */}
        {selectedTooth && (
          <ToothInspector
            tooth={selectedTooth}
            onDimensionChange={adjustTooth}
          />
        )}

        {/* Shade selector */}
        <ShadeSelector
          selectedShade={selectedShadeId}
          onSelectShade={setSelectedShadeId}
        />

        {/* Tooth Library */}
        <LibraryPanel
          selectedToothId={selectedToothId}
          onApplyTooth={(_toothNumber: string, entry: ToothLibraryEntry) => {
            if (selectedToothId) {
              adjustTooth(selectedToothId, {
                width: entry.dimensions.width,
                height: entry.dimensions.height,
                depth: entry.dimensions.depth
              });
            }
          }}
          onApplyCollection={applyLibraryCollection}
        />

        {/* Smile Metrics */}
        {activeVariant && (
          <SmileMetricsPanel teeth={activeVariant.teeth} />
        )}

        {/* Design info */}
        {activeVariant && (
          <div style={{ padding: 14, borderTop: "1px solid var(--border)" }}>
            <div className="label" style={{ marginBottom: 8 }}>
              Active Design
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Variant</span>
                <span className="label-value">{activeVariant.label}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Teeth</span>
                <span className="label-value">{activeVariant.teeth.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>STL Size</span>
                <span className="label-value">
                  {(activeVariant.combinedStl.length / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
