import { useMemo } from "react";
import { useImportStore } from "../../store/useImportStore";
import { useDesignStore } from "../../store/useDesignStore";
import { useCaseStore } from "../../store/useCaseStore";
import { useViewportStore } from "../../store/useViewportStore";
import { validateImportSet } from "../import/importService";
import { BUNDLED_COLLECTIONS } from "../library/bundledLibrary";

/**
 * Top bar of the Design view: 3D/Photo tabs, variant tabs, case action
 * buttons, and photo-overlay controls. Reads state directly from stores —
 * no props required.
 */
export function DesignToolbar() {
  const designTab = useViewportStore((s) => s.designTab);
  const setDesignTab = useViewportStore((s) => s.setDesignTab);
  const activeCollectionId = useViewportStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useViewportStore((s) => s.setActiveCollectionId);
  const showOverlay = useViewportStore((s) => s.showOverlay);
  const setShowOverlay = useViewportStore((s) => s.setShowOverlay);
  const overlayOpacity = useViewportStore((s) => s.overlayOpacity);
  const setOverlayOpacity = useViewportStore((s) => s.setOverlayOpacity);
  const showSmileArc = useViewportStore((s) => s.showSmileArc);
  const setShowSmileArc = useViewportStore((s) => s.setShowSmileArc);
  const showMidline = useViewportStore((s) => s.showMidline);
  const setShowMidline = useViewportStore((s) => s.setShowMidline);
  const showGingivalLine = useViewportStore((s) => s.showGingivalLine);
  const setShowGingivalLine = useViewportStore((s) => s.setShowGingivalLine);

  const generatedDesign = useDesignStore((s) => s.generatedDesign);
  const activeVariantId = useDesignStore((s) => s.activeVariantId);
  const selectVariant = useDesignStore((s) => s.selectVariant);
  const generateDesign = useDesignStore((s) => s.generateDesign);

  const confirmMapping = useCaseStore((s) => s.confirmMapping);
  const createCase = useCaseStore((s) => s.createCase);
  const caseRecord = useCaseStore((s) => s.caseRecord);

  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const uploadedToothModels = useImportStore((s) => s.uploadedToothModels);
  const archName = useImportStore((s) => s.archScanName);

  const photoNames = useMemo(() => uploadedPhotos.map((p) => p.name), [uploadedPhotos]);
  const toothModelNames = useMemo(() => uploadedToothModels.map((m) => m.name), [uploadedToothModels]);
  const validation = useMemo(
    () => validateImportSet({ photos: photoNames, archScan: archName, toothLibrary: toothModelNames }),
    [photoNames, archName, toothModelNames]
  );
  const canPreview = caseRecord?.workflowState === "mapped" && validation.ok;

  return (
    <>
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
      <div className="design-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div role="tablist" aria-label="Design view" className="tab-bar">
            <button
              role="tab"
              aria-selected={designTab === "3d"}
              className={`tab ${designTab === "3d" ? "active" : ""}`}
              onClick={() => setDesignTab("3d")}
            >
              3D View
            </button>
            <button
              role="tab"
              aria-selected={designTab === "photo"}
              className={`tab ${designTab === "photo" ? "active" : ""}`}
              onClick={() => setDesignTab("photo")}
              disabled={uploadedPhotos.length === 0}
            >
              Photo Overlay
            </button>
          </div>

          {/* Variant tabs */}
          {generatedDesign && (
            <div role="tablist" aria-label="Design variants" className="variant-tab-bar">
              {generatedDesign.variants.map((v) => (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={v.id === activeVariantId}
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

        {designTab === "photo" && (
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
    </>
  );
}
