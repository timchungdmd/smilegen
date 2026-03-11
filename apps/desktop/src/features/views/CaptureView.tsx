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
import { detectLandmarks, getMouthMask } from "../../services/visionClient";
import { useSidecarStore } from "../../store/useSidecarStore";

// ── Stage header ──────────────────────────────────────────────────────────

function CaptureStageHeader({
  showWizard,
  onToggleWizard,
}: {
  showWizard: boolean;
  onToggleWizard: () => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const setMouthMaskUrl = useImportStore((s) => s.setMouthMaskUrl);
  const archScanName = useImportStore((s) => s.archScanName);

  const setActiveView = useViewportStore((s) => s.setActiveView);
  const setMidlineX = useViewportStore((s) => s.setMidlineX);
  const setSmileArcY = useViewportStore((s) => s.setSmileArcY);
  const setGingivalLineY = useViewportStore((s) => s.setGingivalLineY);
  const setLeftCommissureX = useViewportStore((s) => s.setLeftCommissureX);
  const setRightCommissureX = useViewportStore((s) => s.setRightCommissureX);
  const clearAlignmentMarkers = useViewportStore((s) => s.clearAlignmentMarkers);
  const addAlignmentMarker = useViewportStore((s) => s.addAlignmentMarker);

  const sidecarState = useSidecarStore((s) => s.sidecarState);

  const hasPhotos = uploadedPhotos.length > 0;
  const photoCount = uploadedPhotos.length;
  const hasScan = Boolean(archScanName);
  const isComplete = photoCount > 0 || hasScan;

  const handleAutoDetect = async () => {
    const photo = uploadedPhotos[0];
    if (!photo) return;

    setDetecting(true);
    setDetectError(null);
    try {
      // Prefer the blob stored at upload time — this avoids fetch(blob: URL)
      // which fails in Tauri because its network layer doesn't handle the
      // browser-internal blob: protocol. Fall back to fetch only for
      // environments where blob is not stored (e.g. test fixtures).
      let imageBlob: Blob;
      if (photo.blob) {
        imageBlob = photo.blob;
      } else {
        try {
          imageBlob = await fetch(photo.url).then((r) => r.blob());
        } catch {
          throw new Error(
            "Could not read the uploaded photo. Please re-upload and try again."
          );
        }
      }

      // Call vision service — both calls must succeed before any store writes
      const result = await detectLandmarks(imageBlob);
      const maskBlob = await getMouthMask(imageBlob);

      // Write landmark results to viewport store (normalized 0–1 → percent 0–100).
      // All store writes happen after both API calls succeed (atomic commit).
      setMidlineX(result.midlineX * 100);
      setSmileArcY(result.smileArcY * 100);
      setGingivalLineY(result.gingivalLineY * 100);
      setLeftCommissureX(result.commissureLeft.x * 100);
      setRightCommissureX(result.commissureRight.x * 100);

      // Replace alignment markers with detected commissures (draggable in overlay)
      clearAlignmentMarkers();
      addAlignmentMarker({
        id: "commissure-L",
        type: "cusp",
        toothId: "commissure-L",
        x: result.commissureLeft.x * 100,
        y: result.commissureLeft.y * 100,
      });
      addAlignmentMarker({
        id: "commissure-R",
        type: "cusp",
        toothId: "commissure-R",
        x: result.commissureRight.x * 100,
        y: result.commissureRight.y * 100,
      });

      // Store mouth mask for PhotoOverlay to apply as CSS mask-image
      const maskUrl = URL.createObjectURL(maskBlob);
      setMouthMaskUrl(maskUrl);
    } catch (err) {
      setDetectError(
        err instanceof Error ? err.message : "Auto-detect failed. Please try again."
      );
    } finally {
      setDetecting(false);
    }
  };

  // Button label changes based on sidecar state and detecting flag
  const autoDetectLabel =
    sidecarState === "starting"
      ? "Services loading…"
      : sidecarState === "unavailable"
      ? "Vision offline"
      : detecting
      ? "Detecting…"
      : "Auto-detect";

  const autoDetectDisabled =
    !hasPhotos || detecting || sidecarState !== "ready";

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: detectError ? "none" : "1px solid var(--border, #2a2f3b)",
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
          {/* Auto-detect button */}
          <button
            onClick={handleAutoDetect}
            disabled={autoDetectDisabled}
            title={
              sidecarState === "unavailable"
                ? "Vision service is offline. Start the vision service to enable Auto-detect."
                : sidecarState === "starting"
                ? "Vision service is starting up…"
                : !hasPhotos
                ? "Upload a photo first"
                : "Detect facial landmarks from the first uploaded photo"
            }
            style={{
              padding: "6px 12px",
              background: "var(--bg-tertiary, #252b38)",
              color: autoDetectDisabled
                ? "var(--text-muted, #555)"
                : "var(--text-primary, #e0e6ef)",
              border: "1px solid var(--border, #2a2f3b)",
              borderRadius: 6,
              fontSize: 12,
              cursor: autoDetectDisabled ? "not-allowed" : "pointer",
              opacity: autoDetectDisabled ? 0.6 : 1,
            }}
          >
            {autoDetectLabel}
          </button>

          {/* Alignment wizard toggle */}
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

      {/* Inline error banner — shown below header row, not in a modal */}
      {detectError && (
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(220, 53, 69, 0.1)",
            borderBottom: "1px solid var(--border, #2a2f3b)",
            borderLeft: "3px solid #dc3545",
            color: "#ff6b7a",
            fontSize: 12,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{detectError}</span>
          <button
            onClick={() => setDetectError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#ff6b7a",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
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
