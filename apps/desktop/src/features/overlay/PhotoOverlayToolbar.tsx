import { useCallback } from "react";
import { useViewportStore, type AlignmentMarker } from "../../store/useViewportStore";

/** Default incisal/cusp markers for the anterior teeth — mirrored from PhotoOverlay */
const DEFAULT_INCISAL_MARKERS: Omit<AlignmentMarker, "id">[] = [
  { type: "cusp", toothId: "6", x: 22, y: 52 },
  { type: "incisal", toothId: "7", x: 32, y: 55 },
  { type: "incisal", toothId: "8", x: 42, y: 56 },
  { type: "incisal", toothId: "9", x: 58, y: 56 },
  { type: "incisal", toothId: "10", x: 68, y: 55 },
  { type: "cusp", toothId: "11", x: 78, y: 52 },
];

let markerIdCounter = 0;
function nextMarkerId(): string {
  return `m_${++markerIdCounter}_${Date.now()}`;
}

/**
 * Floating bottom toolbar for the photo overlay: zoom controls, pan reset,
 * and alignment marker tools. Subscribes directly to useViewportStore so it
 * can be dropped into any parent without prop drilling.
 */
export function PhotoOverlayToolbar() {
  const photoZoom = useViewportStore((s) => s.photoZoom);
  const alignmentMarkers = useViewportStore((s) => s.alignmentMarkers);
  const setPhotoZoom = useViewportStore((s) => s.setPhotoZoom);
  const setPhotoPan = useViewportStore((s) => s.setPhotoPan);
  const addAlignmentMarker = useViewportStore((s) => s.addAlignmentMarker);
  const clearAlignmentMarkers = useViewportStore((s) => s.clearAlignmentMarkers);

  const seedDefaultMarkers = useCallback(() => {
    clearAlignmentMarkers();
    DEFAULT_INCISAL_MARKERS.forEach((m) => {
      addAlignmentMarker({ ...m, id: nextMarkerId() });
    });
  }, [clearAlignmentMarkers, addAlignmentMarker]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        background: "rgba(15, 20, 25, 0.8)",
        backdropFilter: "blur(8px)",
        borderRadius: 8,
        border: "1px solid var(--border)",
        zIndex: 10
      }}
    >
      {/* Zoom controls */}
      <button
        className="btn-icon"
        onClick={() => setPhotoZoom(photoZoom - 0.15)}
        title="Zoom out"
        style={{ color: "#8b949e", padding: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13H5v-2h14v2z" />
        </svg>
      </button>
      <span style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 36, textAlign: "center" }}>
        {Math.round(photoZoom * 100)}%
      </span>
      <button
        className="btn-icon"
        onClick={() => setPhotoZoom(photoZoom + 0.15)}
        title="Zoom in"
        style={{ color: "#8b949e", padding: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
      <button
        className="btn-icon"
        onClick={() => { setPhotoZoom(1); setPhotoPan(0, 0); }}
        title="Reset view"
        style={{ color: "#8b949e", padding: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
        </svg>
      </button>

      <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />

      {/* Alignment marker tools */}
      <button
        className="btn-icon"
        onClick={seedDefaultMarkers}
        title="Place incisal edge & cusp markers"
        style={{ color: "#06d6a0", padding: 4, fontSize: 10, gap: 3, display: "flex", alignItems: "center" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
        </svg>
        Markers
      </button>

      {alignmentMarkers.length > 0 && (
        <button
          className="btn-icon"
          onClick={clearAlignmentMarkers}
          title="Clear all markers"
          style={{ color: "#ef476f", padding: 4 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      )}

      <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />

      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
        Alt+drag: pan &middot; Scroll: zoom
      </span>
    </div>
  );
}
