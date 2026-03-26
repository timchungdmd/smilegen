import { useDesignStore, selectActiveVariant } from "../../store/useDesignStore";
import { useViewportStore } from "../../store/useViewportStore";
import { useOverlayStore } from "../../store/useOverlayStore";
import { useAlignmentStore } from "../../store/useAlignmentStore";
import { useImportStore } from "../../store/useImportStore";
import { assessOverlayFitQuality } from "../alignment/scanOverlayAlignment";
import { DesignSidebar } from "../design/DesignSidebar";
import { DesignToolbar } from "../design/DesignToolbar";
import { useCanvasStore } from "../../store/useCanvasStore";

function PhotoWorkspacePanel() {
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const photoZoom = useCanvasStore((s) => s.photoZoom);
  const setPhotoZoom = useCanvasStore((s) => s.setPhotoZoom);
  const setPhotoPan = useCanvasStore((s) => s.setPhotoPan);
  const showOverlay = useOverlayStore((s) => s.showOverlay);
  const setShowOverlay = useOverlayStore((s) => s.setShowOverlay);
  const overlayOpacity = useOverlayStore((s) => s.overlayOpacity);
  const setOverlayOpacity = useOverlayStore((s) => s.setOverlayOpacity);
  const showMidline = useOverlayStore((s) => s.showMidline);
  const setShowMidline = useOverlayStore((s) => s.setShowMidline);
  const showSmileArc = useOverlayStore((s) => s.showSmileArc);
  const setShowSmileArc = useOverlayStore((s) => s.setShowSmileArc);
  const showGingivalLine = useOverlayStore((s) => s.showGingivalLine);
  const setShowGingivalLine = useOverlayStore((s) => s.setShowGingivalLine);
  const isAlignmentMode = useAlignmentStore((s) => s.isAlignmentMode);
  const activeSurface = useAlignmentStore((s) => s.activeSurface);
  const activeLandmarkId = useAlignmentStore((s) => s.activeLandmarkId);
  const scanInteractionMode = useAlignmentStore((s) => s.scanInteractionMode);
  const landmarks = useAlignmentStore((s) => s.landmarks);
  const setAlignmentMode = useAlignmentStore((s) => s.setAlignmentMode);
  const setActiveSurface = useAlignmentStore((s) => s.setActiveSurface);
  const setActiveLandmark = useAlignmentStore((s) => s.setActiveLandmark);
  const setScanInteractionMode = useAlignmentStore((s) => s.setScanInteractionMode);
  const clearLandmark = useAlignmentStore((s) => s.clearLandmark);
  const clearAllLandmarks = useAlignmentStore((s) => s.clearAllLandmarks);
  const getCompletedPairCount = useAlignmentStore((s) => s.getCompletedPairCount);
  const canSolve = useAlignmentStore((s) => s.canSolve);
  const hasRequiredLandmarks = useAlignmentStore((s) => s.hasRequiredLandmarks);
  const overlayTransform = useAlignmentStore((s) => s.overlayTransform);
  const adjustmentDelta = useAlignmentStore((s) => s.adjustmentDelta);
  const applyAdjustment = useAlignmentStore((s) => s.applyAdjustment);
  const resetAdjustment = useAlignmentStore((s) => s.resetAdjustment);
  const canEnterAlignment = uploadedPhotos.length > 0 && Boolean(archScanMesh);
  const completedPairs = getCompletedPairCount();
  const requiredRemaining = landmarks.filter(
    (landmark) => landmark.required && (!landmark.photoCoord || !landmark.modelCoord)
  );
  const requiredLandmarks = landmarks.filter((l) => l.required);
  const optionalLandmarks = landmarks.filter((l) => !l.required);
  const fitAssessment = overlayTransform ? assessOverlayFitQuality(overlayTransform.residualError) : null;

  const getLandmarkStatus = (landmark: typeof landmarks[number]) => {
    if (landmark.photoCoord && landmark.modelCoord) return "Matched";
    if (landmark.photoCoord) return "Scan missing";
    if (landmark.modelCoord) return "Photo missing";
    return "Pending";
  };

  return (
    <div
      data-testid="photo-workspace-panel"
      style={{ flex: 1, overflow: "auto", borderTop: "1px solid var(--border)" }}
    >
      <div
        className="design-inspector-stack"
        style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <section className="inspector-card inspector-card--accent">
          <div style={{ padding: 14, display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              Photo Overlay Workspace
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              The viewer on the right is the active photo-plus-scan surface. Use this panel to adjust overlay visibility and alignment workflow state.
            </div>
          </div>
        </section>

        <section className="inspector-card inspector-card--subtle">
          <div style={{ padding: 14, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                Landmark Matching
              </div>
              <button
                data-testid="photo-panel-alignment-toggle"
                className="btn btn-sm"
                onClick={() => setAlignmentMode(!isAlignmentMode)}
                disabled={!canEnterAlignment}
              >
                {isAlignmentMode ? "Exit Alignment" : "Landmark Align"}
              </button>
            </div>

            <div data-testid="photo-panel-summary" style={{ display: "grid", gap: 4 }}>
              <div style={{ fontSize: 12, color: "var(--text-primary)" }}>
                {completedPairs} matched pair{completedPairs === 1 ? "" : "s"}
                {overlayTransform?.wasFlipCorrected && (
                  <span style={{ marginLeft: 8, fontSize: 10, color: "#00b4d8" }}>✓ flip corrected</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: canSolve() ? "var(--accent)" : "var(--text-secondary)" }}>
                {isAlignmentMode
                  ? canSolve()
                    ? "Overlay live — refine points or fine-tune with sliders below."
                    : "Place at least 2 matched pairs to activate the overlay."
                  : "Use landmark alignment to register the scan overlay to the photo."}
              </div>
              <div data-testid="photo-panel-required-summary" style={{ fontSize: 11, color: hasRequiredLandmarks() ? "var(--accent)" : "var(--text-secondary)" }}>
                {hasRequiredLandmarks()
                  ? "Required landmarks complete."
                  : `Remaining: ${requiredRemaining.map((l) => l.label).join(", ")}`}
              </div>
            </div>

            {fitAssessment && canSolve() && (
              <div
                data-testid="photo-panel-fit-review"
                style={{
                  display: "grid",
                  gap: 4,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid",
                  borderColor:
                    fitAssessment.tone === "good" ? "var(--accent)"
                    : fitAssessment.tone === "warning" ? "#f59e0b"
                    : "var(--danger, #ef476f)",
                  background:
                    fitAssessment.tone === "good" ? "rgba(0, 180, 216, 0.08)"
                    : fitAssessment.tone === "warning" ? "rgba(245, 158, 11, 0.08)"
                    : "rgba(239, 71, 111, 0.08)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  {fitAssessment.label}
                  {overlayTransform && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: "var(--text-secondary)" }}>
                      ±{overlayTransform.residualError.toFixed(1)}px
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {fitAssessment.guidance}
                </div>
              </div>
            )}

            {/* Fine-tune overlay adjustment sliders — visible when overlay is live */}
            {canSolve() && overlayTransform && !isAlignmentMode && (
              <div style={{ display: "grid", gap: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Fine-Tune Overlay</div>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    Scale: {Math.round(adjustmentDelta.scaleFactor * 100)}%
                  </span>
                  <input
                    type="range" min={0.7} max={1.3} step={0.005}
                    value={adjustmentDelta.scaleFactor}
                  />
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    Rotation: {(adjustmentDelta.rotation * 180 / Math.PI).toFixed(1)}°
                  </span>
                  <input
                    type="range" min={-0.26} max={0.26} step={0.002}
                    value={adjustmentDelta.rotation}
                    onInput={(e) => {
                      const newRot = Number((e.target as HTMLInputElement).value);
                      applyAdjustment({ rotation: newRot - adjustmentDelta.rotation });
                    }}
                    style={{ accentColor: "var(--accent)" }}
                  />
                </div>
                <button
                  type="button" className="btn btn-sm"
                  onClick={() => resetAdjustment()}
                  style={{ color: "var(--text-secondary)", marginTop: 2 }}
                >
                  Reset Adjustments
                </button>
              </div>
            )}

            {isAlignmentMode && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    data-testid="photo-panel-clear-all-warning"
                    style={{ fontSize: 11, color: "var(--danger, #ef476f)", fontWeight: 600 }}
                  >
                    Clears every photo and scan landmark. Replace points manually.
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    data-testid="photo-panel-clear-all"
                    onClick={() => clearAllLandmarks()}
                    disabled={landmarks.every((landmark) => !landmark.photoCoord && !landmark.modelCoord)}
                    style={{
                      borderColor: "var(--danger, #ef476f)",
                      color: "var(--danger, #ef476f)",
                      background: "rgba(239, 71, 111, 0.08)",
                    }}
                  >
                    Clear All Landmarks
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    data-testid="photo-panel-surface-photo"
                    className="btn btn-sm"
                    onClick={() => setActiveSurface("photo")}
                    style={{
                      borderColor: activeSurface === "photo" ? "var(--accent)" : undefined,
                      color: activeSurface === "photo" ? "var(--accent)" : undefined,
                    }}
                  >
                    Place on Photo
                  </button>
        <button
          data-testid="photo-panel-surface-scan"
          className="btn btn-sm"
          onClick={() => {
            setActiveSurface("scan");
            setScanInteractionMode("pick");
          }}
          style={{
            borderColor: activeSurface === "scan" ? "var(--accent)" : undefined,
            color: activeSurface === "scan" ? "var(--accent)" : undefined,
          }}
        >
          Place on Scan
        </button>
                  {activeSurface === "scan" && (
                    <button
                      data-testid="photo-panel-scan-mode"
                      className="btn btn-sm"
                      onClick={() =>
                        setScanInteractionMode(
                          scanInteractionMode === "pick" ? "navigate" : "pick"
                        )
                      }
                      style={{
                        borderColor: scanInteractionMode === "pick" ? "var(--accent)" : undefined,
                        color: scanInteractionMode === "pick" ? "var(--accent)" : undefined,
                      }}
                    >
                      {scanInteractionMode === "pick" ? "Picking On" : "Pick on Scan"}
                    </button>
                  )}
                </div>

                {/* Required landmarks — midline + centrals */}
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Required</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {requiredLandmarks.map((landmark) => {
                    const complete = Boolean(landmark.photoCoord && landmark.modelCoord);
                    const active = activeLandmarkId === landmark.id;
                    return (
                      <div
                        key={landmark.id}
                        data-testid={`photo-panel-card-${landmark.id}`}
                        style={{
                          display: "grid", gap: 6, padding: "8px 10px",
                          borderRadius: 8,
                          border: `1px solid ${!complete ? landmark.color : active ? landmark.color : "var(--border)"}`,
                          background: !complete ? `${landmark.color}12` : active ? `${landmark.color}18` : "var(--bg-secondary)",
                        }}
                      >
                        <button type="button" data-testid={`photo-panel-landmark-${landmark.id}`}
                          onClick={() => setActiveLandmark(landmark.id)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "none", background: "transparent", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", padding: 0 }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: landmark.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{landmark.label}</span>
                          </span>
                          <span data-testid={`photo-panel-status-${landmark.id}`} style={{ fontSize: 10, color: complete ? landmark.color : "var(--text-secondary)" }}>
                            {getLandmarkStatus(landmark)}
                          </span>
                        </button>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button type="button" className="btn btn-sm" data-testid={`photo-panel-clear-${landmark.id}`}
                            onClick={() => clearLandmark(landmark.id)}
                            disabled={!landmark.photoCoord && !landmark.modelCoord}
                          >Clear</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optional landmarks — laterals, canines, premolars */}
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4, marginBottom: 2 }}>Optional (improve accuracy)</div>
                <div style={{ display: "grid", gap: 4 }}>
                  {optionalLandmarks.map((landmark) => {
                    const complete = Boolean(landmark.photoCoord && landmark.modelCoord);
                    const active = activeLandmarkId === landmark.id;
                    return (
                      <div key={landmark.id} data-testid={`photo-panel-card-${landmark.id}`}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 10px", borderRadius: 6, border: `1px solid ${active ? landmark.color : "var(--border)"}`, background: active ? `${landmark.color}12` : "transparent" }}
                      >
                        <button type="button" data-testid={`photo-panel-landmark-${landmark.id}`}
                          onClick={() => setActiveLandmark(landmark.id)}
                          style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", color: complete ? "var(--text-primary)" : "var(--text-secondary)", cursor: "pointer", padding: 0, flex: 1 }}
                        >
                          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: complete ? landmark.color : "var(--border)", flexShrink: 0 }} />
                          <span style={{ fontSize: 11 }}>{landmark.label}</span>
                          <span data-testid={`photo-panel-status-${landmark.id}`} style={{ fontSize: 10, color: complete ? landmark.color : "var(--text-secondary)", marginLeft: "auto" }}>
                            {getLandmarkStatus(landmark)}
                          </span>
                        </button>
                        <button type="button" className="btn btn-sm" data-testid={`photo-panel-clear-${landmark.id}`}
                          onClick={() => clearLandmark(landmark.id)}
                          disabled={!landmark.photoCoord && !landmark.modelCoord}
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        >×</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="inspector-card">
          <div style={{ padding: 14, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
              Overlay Controls
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input type="checkbox" checked={showOverlay} onChange={() => setShowOverlay(!showOverlay)} />
              Show projected teeth
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input type="checkbox" checked={showMidline} onChange={() => setShowMidline(!showMidline)} />
              Show midline
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input type="checkbox" checked={showSmileArc} onChange={() => setShowSmileArc(!showSmileArc)} />
              Show smile arc
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input type="checkbox" checked={showGingivalLine} onChange={() => setShowGingivalLine(!showGingivalLine)} />
              Show gingival line
            </label>
            <div style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Overlay opacity: {Math.round(overlayOpacity * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        <section className="inspector-card">
          <div style={{ padding: 14, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
              Photo Navigation
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn btn-sm" onClick={() => setPhotoZoom(Math.max(0.25, photoZoom - 0.15))}>
                Zoom Out
              </button>
              <span style={{ fontSize: 12, minWidth: 44, textAlign: "center" }}>
                {Math.round(photoZoom * 100)}%
              </span>
              <button className="btn btn-sm" onClick={() => setPhotoZoom(Math.min(5, photoZoom + 0.15))}>
                Zoom In
              </button>
            </div>
            <button className="btn btn-sm" onClick={() => { setPhotoZoom(1); setPhotoPan(0, 0); }}>
              Reset Photo View
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * DesignPanel — The left-hand control panel for the Design stage.
 * In the new split layout, this contains all the design tools (morphology,
 * proportions, sliders) while the 3D preview stays on the right.
 */
export function DesignPanel() {
  const activeVariant = useDesignStore(selectActiveVariant);
  const selectedToothId = useDesignStore((s) => s.selectedToothId);
  const selectTooth = useDesignStore((s) => s.selectTooth);
  const designTab = useViewportStore((s) => s.designTab);
  const isPhotoTab = designTab === "photo";

  return (
    <div
      className="workspace-intake-panel"
      data-testid="workspace-intake-panel-design"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-primary)"
      }}
    >
      {/* Design Toolbar (undo/redo, export) */}
      <DesignToolbar />

      {isPhotoTab ? (
        <PhotoWorkspacePanel />
      ) : (
        <>
          <div
            data-testid="design-workspace-panel"
            style={{ flex: 1, overflow: "auto", borderTop: "1px solid var(--border)" }}
          >
            <DesignSidebar />
          </div>

          {activeVariant && (
            <div
              className="tooth-strip"
              style={{
                padding: "12px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                display: "flex",
                gap: 8,
                overflowX: "auto"
              }}
            >
              {activeVariant.teeth.map((tooth) => {
                const isSelected = tooth.toothId === selectedToothId;
                const barH = Math.max(tooth.height * 2, 12);
                const barW = Math.max(tooth.width * 1.5, 6);
                const color = isSelected ? "var(--accent)" : "var(--tooth-fill)";

                return (
                  <div
                    key={tooth.toothId}
                    className={`tooth-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => selectTooth(tooth.toothId)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: isSelected ? "rgba(0,180,216,0.1)" : "transparent"
                    }}
                  >
                    <div
                      style={{
                        width: barW,
                        height: barH,
                        background: color,
                        borderRadius: 2
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "var(--accent)" : "var(--text-muted)" }}>
                      {tooth.toothId}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
