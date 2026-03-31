/**
 * CaptureView — Import stage left panel.
 *
 * This version of CaptureView is strictly for the control panel area.
 * The 3D viewer is handled by the parent Workspace.
 */

import { useImportStore } from "../../store/useImportStore";
import { useViewportStore } from "../../store/useViewportStore";
import { ImportPanel } from "./ImportPanel";

function CaptureStageHeader() {
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanName = useImportStore((s) => s.archScanName);
  const setActiveView = useViewportStore((s) => s.setActiveView);

  const photoCount = uploadedPhotos.length;
  const hasPhotos = photoCount > 0;
  const hasScan = Boolean(archScanName);
  const canContinue = hasPhotos && hasScan;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        borderBottom: "1px solid var(--border, #2a2f3b)",
        background: "var(--bg-secondary, #1a1f2b)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted, #8892a0)",
            textTransform: "uppercase",
          }}
        >
          Import
        </span>
      </div>

      <button
        onClick={() => setActiveView("design")}
        disabled={!canContinue}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          background: "var(--accent, #00b4d8)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: canContinue ? "pointer" : "not-allowed",
          opacity: canContinue ? 1 : 0.5,
        }}
      >
        Continue
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>
  );
}

export function CaptureView() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <CaptureStageHeader />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ImportPanel />
      </div>
    </div>
  );
}
