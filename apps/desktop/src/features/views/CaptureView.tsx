/**
 * CaptureView — Patient data capture (photos + 3D scans).
 *
 * This is the workflow-first rename of ImportView (stage 2: Capture).
 * It renders ImportView directly, adding a stage-aware header bar and
 * completion state feedback.
 *
 * Future enhancements (Phase 6):
 *  - Photo quality checklist (lighting, angle, focus indicators)
 *  - Scan completeness panel (arch coverage heatmap)
 *  - "Continue to Simulate →" CTA once preconditions are met
 */

import { useImportStore } from "../../store/useImportStore";
import { useViewportStore } from "../../store/useViewportStore";
import { ImportView } from "./ImportView";

// ── Stage header ──────────────────────────────────────────────────────────

function CaptureStageHeader() {
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanName = useImportStore((s) => s.archScanName);
  const setActiveView = useViewportStore((s) => s.setActiveView);

  const photoCount = uploadedPhotos.length;
  const hasScan = Boolean(archScanName);
  const isComplete = photoCount > 0 || hasScan;

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
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted, #8892a0)",
          }}
        >
          Capture
        </span>
        {photoCount > 0 && (
          <span
            style={{
              fontSize: 11,
              color: "var(--accent, #00b4d8)",
              background: "rgba(0,180,216,0.1)",
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            {photoCount} photo{photoCount !== 1 ? "s" : ""}
          </span>
        )}
        {hasScan && (
          <span
            style={{
              fontSize: 11,
              color: "var(--accent, #00b4d8)",
              background: "rgba(0,180,216,0.1)",
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            Arch scan
          </span>
        )}
      </div>

      {isComplete && (
        <button
          onClick={() => setActiveView("simulate")}
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
            cursor: "pointer",
          }}
        >
          Continue to Simulate
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── CaptureView ───────────────────────────────────────────────────────────

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
      <ImportView />
    </div>
  );
}
