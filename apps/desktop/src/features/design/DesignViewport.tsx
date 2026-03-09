import { useImportStore } from "../../store/useImportStore";
import { useDesignStore, selectActiveVariant } from "../../store/useDesignStore";
import { useViewportStore } from "../../store/useViewportStore";
import { SceneCanvas } from "../viewer/SceneCanvas";
import { PhotoOverlay } from "../overlay/PhotoOverlay";
import { ErrorBoundary } from "../layout/ErrorBoundary";

/**
 * Centre panel of the Design view: 3D canvas or photo overlay depending on
 * the active design tab, followed by the tooth-proportion strip.
 * Reads state directly from stores — no props required.
 */
export function DesignViewport() {
  const designTab = useViewportStore((s) => s.designTab);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const activeVariant = useDesignStore(selectActiveVariant);
  const selectedToothId = useDesignStore((s) => s.selectedToothId);
  const selectTooth = useDesignStore((s) => s.selectTooth);
  const moveTooth = useDesignStore((s) => s.moveTooth);

  return (
    <>
      {/* Viewport */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", padding: 12 }}>
        {designTab === "3d" ? (
          <ErrorBoundary label="3D Canvas">
            <SceneCanvas
              archScanMesh={archScanMesh}
              activeVariant={activeVariant}
              selectedToothId={selectedToothId}
              onSelectTooth={selectTooth}
            />
          </ErrorBoundary>
        ) : uploadedPhotos.length > 0 ? (
          <ErrorBoundary label="Photo Overlay">
            <PhotoOverlay
              photo={uploadedPhotos[0]}
              activeVariant={activeVariant}
              selectedToothId={selectedToothId}
              onSelectTooth={selectTooth}
              onMoveTooth={moveTooth}
            />
          </ErrorBoundary>
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
              align the design with the patient&apos;s face. Drag the yellow L/R
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
    </>
  );
}
