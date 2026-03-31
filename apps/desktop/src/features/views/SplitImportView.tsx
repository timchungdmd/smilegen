import { useRef, useCallback, useState, useEffect, type DragEvent } from "react";
import { useImportStore } from "../../store/useImportStore";

type DropTarget = "photo" | "scan" | null;

export function SplitImportView() {
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const archScanName = useImportStore((s) => s.archScanName);
  const handlePhotosSelected = useImportStore((s) => s.handlePhotosSelected);
  const handleArchScanSelected = useImportStore((s) => s.handleArchScanSelected);

  const photoRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (uploadedPhotos.length > 0) {
      setPhotoPreview(uploadedPhotos[0].url);
    } else {
      setPhotoPreview(null);
    }
  }, [uploadedPhotos]);

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

  const handleDropPhoto = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTarget(null);
      const files = e.dataTransfer.files;
      if (files.length) {
        handlePhotosSelected(files);
      }
    },
    [handlePhotosSelected]
  );

  const handleDropScan = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTarget(null);
      const files = e.dataTransfer.files;
      if (files.length) {
        setScanLoading(true);
        await handleArchScanSelected(files);
        setScanLoading(false);
      }
    },
    [handleArchScanSelected]
  );

  const handleScanFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || !files.length) return;
      setScanLoading(true);
      await handleArchScanSelected(files);
      setScanLoading(false);
    },
    [handleArchScanSelected]
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* LEFT: Photo */}
      <div
        className={`split-import-panel ${dropTarget === "photo" ? "drop-active" : ""}`}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
          background: photoPreview ? "var(--bg)" : "var(--bg-elevated)",
        }}
        onDragOver={(e) => handleDragOver(e, "photo")}
        onDragLeave={handleDragLeave}
        onDrop={handleDropPhoto}
        onClick={() => !photoPreview && photoRef.current?.click()}
      >
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handlePhotosSelected(e.target.files)}
          style={{ display: "none" }}
        />

        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={photoPreview ? "var(--success)" : "var(--accent)"}>
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Photo</span>
          {photoPreview && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "var(--success)",
                background: "var(--success-dim)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              Loaded
            </span>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            cursor: photoPreview ? "default" : "pointer",
          }}
        >
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Patient photo"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            />
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="var(--text-muted)"
                style={{ marginBottom: 12 }}
              >
                <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
              </svg>
              <div style={{ fontSize: 13, marginBottom: 4 }}>Drop photo here</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>or click to browse</div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Scan */}
      <div
        className={`split-import-panel ${dropTarget === "scan" ? "drop-active" : ""}`}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: archScanMesh ? "var(--bg)" : "var(--bg-elevated)",
        }}
        onDragOver={(e) => handleDragOver(e, "scan")}
        onDragLeave={handleDragLeave}
        onDrop={handleDropScan}
        onClick={() => !archScanMesh && !scanLoading && scanRef.current?.click()}
      >
        <input
          ref={scanRef}
          type="file"
          accept=".stl,.obj,.ply"
          onChange={(e) => handleScanFileSelect(e.target.files)}
          style={{ display: "none" }}
        />

        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={archScanMesh ? "var(--success)" : "var(--accent)"}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 14 }}>3D Scan</span>
          {archScanMesh && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "var(--success)",
                background: "var(--success-dim)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {archScanMesh.triangles.length.toLocaleString()} triangles
            </span>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            cursor: archScanMesh || scanLoading ? "default" : "pointer",
          }}
        >
          {scanLoading ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              <svg
                className="spinner"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="var(--accent)"
              >
                <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8z" />
              </svg>
              <div style={{ fontSize: 13, marginTop: 12 }}>Loading scan...</div>
            </div>
          ) : archScanMesh ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  background: "var(--success-dim)",
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 12,
                }}
              >
                <svg width="64" height="64" viewBox="0 0 24 24" fill="var(--success)">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{archScanName}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {(archScanMesh.bounds.maxX - archScanMesh.bounds.minX).toFixed(1)} mm wide
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="var(--text-muted)"
                style={{ marginBottom: 12 }}
              >
                <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
              </svg>
              <div style={{ fontSize: 13, marginBottom: 4 }}>Drop STL scan here</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                STL, OBJ, or PLY format
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .split-import-panel {
          transition: background 0.15s ease;
        }
        .split-import-panel.drop-active {
          background: rgba(0, 180, 216, 0.08);
          border: 2px dashed var(--accent);
        }
        .split-import-panel.drop-active > * {
          pointer-events: none;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
