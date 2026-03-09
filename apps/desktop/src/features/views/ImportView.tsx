import { useRef, useMemo, useState, useCallback, type DragEvent } from "react";
import { useImportStore } from "../../store/useImportStore";
import { useDesignStore } from "../../store/useDesignStore";
import { useViewportStore } from "../../store/useViewportStore";
import { validateImportSet } from "../import/importService";
import { SceneCanvas } from "../viewer/SceneCanvas";
import { BUNDLED_COLLECTIONS } from "../library/bundledLibrary";
import { HowToGuidePanel } from "./HowToGuidePanel";

type DropTarget = "photos" | "arch" | "tooth" | null;

export function ImportView() {
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const archScanName = useImportStore((s) => s.archScanName);
  const uploadedToothModels = useImportStore((s) => s.uploadedToothModels);
  const importError = useImportStore((s) => s.importError);
  const handlePhotosSelected = useImportStore((s) => s.handlePhotosSelected);
  const handleArchScanSelected = useImportStore((s) => s.handleArchScanSelected);
  const handleToothModelsSelected = useImportStore((s) => s.handleToothModelsSelected);
  const removePhoto = useImportStore((s) => s.removePhoto);
  const clearPhotos = useImportStore((s) => s.clearPhotos);
  const clearArchScan = useImportStore((s) => s.clearArchScan);
  const removeToothModel = useImportStore((s) => s.removeToothModel);
  const clearToothModels = useImportStore((s) => s.clearToothModels);
  const quickGenerate = useDesignStore((s) => s.quickGenerate);
  const activeCollectionId = useViewportStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useViewportStore((s) => s.setActiveCollectionId);

  const validation = useMemo(
    () =>
      validateImportSet({
        photos: uploadedPhotos.map((p) => p.name),
        archScan: archScanName,
        toothLibrary: uploadedToothModels.map((m) => m.name)
      }),
    [uploadedPhotos, archScanName, uploadedToothModels]
  );
  const canQuickGenerate = validation.ok;
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);

  const photoRef = useRef<HTMLInputElement>(null);
  const archRef = useRef<HTMLInputElement>(null);
  const toothRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(target);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, target: DropTarget) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTarget(null);
      const files = e.dataTransfer.files;
      if (!files.length) return;
      if (target === "photos") handlePhotosSelected(files);
      else if (target === "arch") handleArchScanSelected(files);
      else if (target === "tooth") handleToothModelsSelected(files);
    },
    [handlePhotosSelected, handleArchScanSelected, handleToothModelsSelected]
  );

  const photosLoaded = uploadedPhotos.length > 0;
  const archLoaded = Boolean(archScanName);
  const toothLoaded = uploadedToothModels.length > 0;
  const stepsComplete = [photosLoaded, archLoaded].filter(Boolean).length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "400px 1fr",
        height: "100%",
        overflow: "hidden"
      }}
    >
      {/* Left panel - Import controls */}
      <div
        style={{
          borderRight: "1px solid var(--border)",
          overflow: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14
        }}
      >
        {/* Header with progress */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Import Assets</h2>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {stepsComplete}/2 required
            </span>
          </div>
          <div className="import-progress-track">
            <div
              className="import-progress-fill"
              style={{ width: `${(stepsComplete / 2) * 100}%` }}
            />
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "8px 0 0" }}>
            Upload patient photos and arch scan to begin designing.
          </p>
        </div>

        {/* How to Use Guide */}
        <HowToGuidePanel />

        {/* ====== PATIENT PHOTOS ====== */}
        <div className={`import-card ${dropTarget === "photos" ? "drop-active" : ""} ${photosLoaded ? "loaded" : ""}`}>
          <div className="import-card-header">
            <div className="import-card-icon" style={{ background: photosLoaded ? "var(--success-dim)" : "var(--accent-dim)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={photosLoaded ? "var(--success)" : "var(--accent)"}>
                {photosLoaded
                  ? <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  : <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                }
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="import-card-title">Patient Photos</div>
              <div className="import-card-subtitle">
                {photosLoaded ? `${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? "s" : ""} uploaded` : "Front smile, retracted, side views"}
              </div>
            </div>
            <span className={`badge ${photosLoaded ? "badge-success" : "badge-warning"}`}>
              {photosLoaded ? "ready" : "required"}
            </span>
          </div>

          {/* Upload zone / loaded state */}
          <div className="import-card-body">
            {!photosLoaded ? (
              <div
                className="import-drop-zone"
                onClick={() => photoRef.current?.click()}
                onDragOver={(e) => handleDragOver(e, "photos")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "photos")}
              >
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotosSelected(e.target.files)}
                />
                <svg className="import-drop-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
                <div className="import-drop-text">Drop photos here or click to browse</div>
                <div className="import-drop-hint">JPG, PNG, HEIC accepted</div>
              </div>
            ) : (
              <div>
                <div className="import-photo-grid">
                  {uploadedPhotos.map((photo) => (
                    <div key={photo.name} className="import-photo-item">
                      <img src={photo.url} alt={photo.name} />
                      <button
                        className="import-photo-remove"
                        onClick={(e) => { e.stopPropagation(); removePhoto(photo.name); }}
                        title="Remove photo"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                      <div className="import-photo-name">{photo.name}</div>
                    </div>
                  ))}
                  {/* Add more button */}
                  <div
                    className="import-photo-add"
                    onClick={() => photoRef.current?.click()}
                  >
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotosSelected(e.target.files)}
                    />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                  </div>
                </div>
                <button className="import-clear-btn" onClick={clearPhotos}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                  Clear all photos
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ====== ARCH SCAN ====== */}
        <div className={`import-card ${dropTarget === "arch" ? "drop-active" : ""} ${archLoaded ? "loaded" : ""}`}>
          <div className="import-card-header">
            <div className="import-card-icon" style={{ background: archLoaded ? "var(--success-dim)" : "var(--accent-dim)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={archLoaded ? "var(--success)" : "var(--accent)"}>
                {archLoaded
                  ? <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  : <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                }
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="import-card-title">Arch Scan</div>
              <div className="import-card-subtitle">
                {archLoaded ? archScanName : "Intraoral scanner export"}
              </div>
            </div>
            <span className={`badge ${archLoaded ? "badge-success" : "badge-warning"}`}>
              {archLoaded ? "ready" : "required"}
            </span>
          </div>

          <div className="import-card-body">
            {!archLoaded ? (
              <div
                className="import-drop-zone"
                onClick={() => archRef.current?.click()}
                onDragOver={(e) => handleDragOver(e, "arch")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "arch")}
              >
                <input
                  ref={archRef}
                  type="file"
                  accept=".stl,.obj,.ply"
                  onChange={(e) => handleArchScanSelected(e.target.files)}
                />
                <svg className="import-drop-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
                <div className="import-drop-text">Drop 3D scan here or click to browse</div>
                <div className="import-drop-hint">STL, OBJ, PLY from iTero, TRIOS, Medit, etc.</div>
              </div>
            ) : (
              <div>
                <div className="import-file-info">
                  <div className="import-file-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)">
                      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="import-file-name">{archScanName}</div>
                    {archScanMesh && (
                      <div className="import-file-meta">
                        <span>{archScanMesh.triangles.length.toLocaleString()} triangles</span>
                        <span className="import-file-dot" />
                        <span>
                          {(archScanMesh.bounds.maxX - archScanMesh.bounds.minX).toFixed(1)} mm wide
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    className="import-file-remove"
                    onClick={clearArchScan}
                    title="Remove arch scan"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
                {archScanMesh && (
                  <div className="import-mesh-stats">
                    <div className="import-stat">
                      <span className="import-stat-label">Bounds X</span>
                      <span className="import-stat-value">
                        {archScanMesh.bounds.minX.toFixed(1)} to {archScanMesh.bounds.maxX.toFixed(1)} mm
                      </span>
                    </div>
                    <div className="import-stat">
                      <span className="import-stat-label">Bounds Y</span>
                      <span className="import-stat-value">
                        {archScanMesh.bounds.minY.toFixed(1)} to {archScanMesh.bounds.maxY.toFixed(1)} mm
                      </span>
                    </div>
                    <div className="import-stat">
                      <span className="import-stat-label">Bounds Z</span>
                      <span className="import-stat-value">
                        {archScanMesh.bounds.minZ.toFixed(1)} to {archScanMesh.bounds.maxZ.toFixed(1)} mm
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ====== TOOTH LIBRARY ====== */}
        <div className={`import-card ${dropTarget === "tooth" ? "drop-active" : ""} ${toothLoaded ? "loaded" : ""}`}>
          <div className="import-card-header">
            <div className="import-card-icon" style={{ background: toothLoaded ? "var(--success-dim)" : "rgba(139, 148, 158, 0.1)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={toothLoaded ? "var(--success)" : "var(--text-muted)"}>
                {toothLoaded
                  ? <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  : <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z" />
                }
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="import-card-title">Tooth Library</div>
              <div className="import-card-subtitle">
                {toothLoaded ? `${uploadedToothModels.length} tooth model${uploadedToothModels.length > 1 ? "s" : ""} loaded` : "Individual tooth STL files"}
              </div>
            </div>
            <span className={`badge ${toothLoaded ? "badge-success" : "badge-info"}`}>
              {toothLoaded ? "ready" : "optional"}
            </span>
          </div>

          <div className="import-card-body">
            {!toothLoaded ? (
              <div
                className="import-drop-zone compact"
                onClick={() => toothRef.current?.click()}
                onDragOver={(e) => handleDragOver(e, "tooth")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "tooth")}
              >
                <input
                  ref={toothRef}
                  type="file"
                  accept=".stl,.obj,.ply"
                  multiple
                  onChange={(e) => handleToothModelsSelected(e.target.files)}
                />
                <svg className="import-drop-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
                <div className="import-drop-text" style={{ fontSize: 11 }}>Drop tooth 3D files or click to browse</div>
                <div className="import-drop-hint">STL, OBJ, PLY — named with tooth number (e.g. tooth_8.stl)</div>
              </div>
            ) : (
              <div>
                <div className="import-tooth-chips">
                  {uploadedToothModels.map((model) => (
                    <div key={model.toothId} className="import-tooth-chip">
                      <span className="import-tooth-chip-id">#{model.toothId}</span>
                      <button
                        className="import-tooth-chip-remove"
                        onClick={() => removeToothModel(model.toothId)}
                        title={`Remove tooth ${model.toothId}`}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <div
                    className="import-tooth-chip add"
                    onClick={() => toothRef.current?.click()}
                  >
                    <input
                      ref={toothRef}
                      type="file"
                      accept=".stl,.obj,.ply"
                      multiple
                      onChange={(e) => handleToothModelsSelected(e.target.files)}
                    />
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                  </div>
                </div>
                <button className="import-clear-btn" onClick={clearToothModels}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Validation status */}
        {importError && (
          <div className="import-status-banner error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--danger)">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span>{importError}</span>
          </div>
        )}

        {!validation.ok && !importError && (
          <div className="import-status-banner warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--warning)">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            <span>{validation.errors[0] ?? "Upload required assets to proceed."}</span>
          </div>
        )}

        {validation.ok && (
          <div className="import-generate-card">
            <div className="import-generate-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--success)">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              <span>All required assets imported</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="label" style={{ display: "block", marginBottom: 6 }}>
                Tooth Morphology Library
              </label>
              <select
                className="input"
                value={activeCollectionId ?? ""}
                onChange={(e) => setActiveCollectionId(e.target.value || null)}
                style={{ width: "100%" }}
              >
                <option value="">-- Select tooth shape --</option>
                {BUNDLED_COLLECTIONS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
              {activeCollectionId && (
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>
                  {BUNDLED_COLLECTIONS.find((c) => c.id === activeCollectionId)?.description}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary import-generate-btn"
              onClick={quickGenerate}
              disabled={!canQuickGenerate || !activeCollectionId}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z" />
              </svg>
              Generate Smile Design
            </button>
            {!activeCollectionId && (
              <div style={{ fontSize: 11, color: "var(--warning)", marginTop: 6, textAlign: "center" }}>
                Select a tooth library to enable generation
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right - 3D Preview */}
      <div style={{ display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          3D Scan Preview
        </div>
        <SceneCanvas archScanMesh={archScanMesh} />
      </div>
    </div>
  );
}
