import { useViewportStore } from "../../store/useViewportStore";

/**
 * Floating bottom toolbar for the photo overlay: zoom controls, pan reset,
 * and opacity. Subscribes directly to useViewportStore.
 */
export function PhotoOverlayToolbar({ onZoom }: { onZoom: (delta: number) => void }) {
  const photoZoom = useViewportStore((s) => s.photoZoom);
  const overlayOpacity = useViewportStore((s) => s.overlayOpacity);
  const setPhotoZoom = useViewportStore((s) => s.setPhotoZoom);
  const setOverlayOpacity = useViewportStore((s) => s.setOverlayOpacity);
  const setPhotoPan = useViewportStore((s) => s.setPhotoPan);
  
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
        onClick={() => onZoom(-0.15)}
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
        onClick={() => onZoom(0.15)}
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

      {/* Photo opacity */}
      <span style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 40 }}>
        Opacity
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={overlayOpacity}
        onChange={(e) => setOverlayOpacity(Number(e.target.value))}
        title={`Photo opacity: ${Math.round(overlayOpacity * 100)}%`}
        style={{ width: 60, accentColor: "var(--accent, #00b4d8)", cursor: "pointer" }}
      />
      <span style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 28, textAlign: "right" }}>
        {Math.round(overlayOpacity * 100)}%
      </span>

      <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />

      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
        Shift+drag: pan &middot; Use +/- to zoom
      </span>
    </div>
  );
}
