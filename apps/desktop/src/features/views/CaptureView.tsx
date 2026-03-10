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

import { useState } from "react";
import { useImportStore } from "../../store/useImportStore";
import { useViewportStore } from "../../store/useViewportStore";
import { ImportView } from "./ImportView";
import { AlignmentCalibrationWizard } from "../capture/AlignmentCalibrationWizard";

// ── Stage header ──────────────────────────────────────────────────────────

function CaptureStageHeader({
  showWizard,
  onToggleWizard,
}: {
  showWizard: boolean;
  onToggleWizard: () => void;
}) {
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanName = useImportStore((s) => s.archScanName);
  const setActiveView = useViewportStore((s) => s.setActiveView);
  const hasPhotos = uploadedPhotos.length > 0;

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

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Alignment wizard toggle — only shown when photos are available */}
        {hasPhotos && (
          <button
            onClick={onToggleWizard}
            style={{
              padding: "6px 12px",
              background: showWizard
                ? "rgba(0,180,216,0.15)"
                : "var(--bg-tertiary, #252b38)",
              color: showWizard ? "var(--accent, #00b4d8)" : "var(--text-muted)",
              border: "1px solid",
              borderColor: showWizard
                ? "var(--accent, #00b4d8)"
                : "var(--border, #2a2f3b)",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
            title="Open the 2-point alignment wizard"
          >
            {showWizard ? "Hide Alignment" : "Align Photo"}
          </button>
        )}

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
    </div>
  );
}

// ── CaptureView ───────────────────────────────────────────────────────────

export function CaptureView() {
  const [showWizard, setShowWizard] = useState(false);

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
      <CaptureStageHeader
        showWizard={showWizard}
        onToggleWizard={() => setShowWizard((v) => !v)}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Main import panel */}
        <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
          <ImportView />
        </div>

        {/* Alignment wizard side-panel */}
        {showWizard && (
          <div
            style={{
              width: 360,
              flexShrink: 0,
              borderLeft: "1px solid var(--border, #2a2f3b)",
              overflow: "auto",
              background: "var(--bg-primary, #111827)",
            }}
          >
            <AlignmentCalibrationWizard
              onClose={() => setShowWizard(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
