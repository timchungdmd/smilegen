/**
 * CaptureView — Import and alignment workspace.
 *
 * This view now covers two case jobs:
 *  - Import (legacy route: capture)
 *  - Align (legacy route: overview)
 *
 * It renders ImportView directly, adding stage-aware framing and completion
 * state feedback while keeping the underlying tools backward compatible.
 *
 * Future enhancements (Phase 6):
 *  - Photo quality checklist (lighting, angle, focus indicators)
 *  - Scan completeness panel (arch coverage heatmap)
 *  - "Continue to Align / Design →" CTA once preconditions are met
 */

import { useEffect, useState } from "react";
import { useImportStore } from "../../store/useImportStore";
import { getCaseWorkflowStage, useViewportStore } from "../../store/useViewportStore";
import { ImportView } from "./ImportView";
import { AlignmentCalibrationWizard } from "../capture/AlignmentCalibrationWizard";
import { detectLandmarks, getMouthMask } from "../../services/visionClient";
import { useSidecarStore } from "../../store/useSidecarStore";
import { useWorkspaceVariantStore } from "../experiments/workspaceVariantStore";
import { recordAlignmentAttempt } from "../experiments/workspaceMetrics";

// ── Stage header ──────────────────────────────────────────────────────────

type SharedCaptureUiState = {
  showWizard: boolean;
  detectError: string | null;
};

const sharedCaptureUiState: SharedCaptureUiState = {
  showWizard: false,
  detectError: null,
};

function CaptureStageHeader({
  showWizard,
  onToggleWizard,
  detectError,
  setDetectError,
}: {
  showWizard: boolean;
  onToggleWizard: () => void;
  detectError: string | null;
  setDetectError: (value: string | null) => void;
}) {
  const [detecting, setDetecting] = useState(false);

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
  const activeView = useViewportStore((s) => s.activeView);

  const sidecarState = useSidecarStore((s) => s.sidecarState);
  const stage = getCaseWorkflowStage(activeView);
  const isAlignStage = stage === "align";
  const stageLabel = isAlignStage ? "Align" : "Import";
  const continueLabel = isAlignStage ? "Continue to Design" : "Continue to Align";
  const continueTarget = isAlignStage ? "design" : "align";

  const hasPhotos = uploadedPhotos.length > 0;
  const photoCount = uploadedPhotos.length;
  const hasScan = Boolean(archScanName);
  const canContinue = isAlignStage ? hasPhotos && hasScan : hasPhotos || hasScan;

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
            {stageLabel}
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
          {/* Auto-detect button — primary when sidecar is ready and assets are available */}
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
            style={
              sidecarState === "ready" && hasPhotos && hasScan
                ? {
                    padding: "6px 14px",
                    background: autoDetectDisabled
                      ? "var(--bg-tertiary, #252b38)"
                      : "var(--accent, #00b4d8)",
                    color: autoDetectDisabled
                      ? "var(--text-muted, #555)"
                      : "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: autoDetectDisabled ? "not-allowed" : "pointer",
                    opacity: autoDetectDisabled ? 0.6 : 1,
                  }
                : {
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
                  }
            }
          >
            {autoDetectLabel}
          </button>

          {/* Alignment wizard toggle — secondary "Refine Alignment" when auto-detect is primary */}
          <button
            onClick={onToggleWizard}
            disabled={!hasPhotos}
            style={
              sidecarState === "ready" && hasPhotos && hasScan
                ? {
                    padding: "6px 12px",
                    background: showWizard
                      ? "rgba(0,180,216,0.15)"
                      : "transparent",
                    color: !hasPhotos
                      ? "var(--text-muted)"
                      : showWizard
                      ? "var(--accent, #00b4d8)"
                      : "var(--text-muted, #8892a0)",
                    border: "1px solid",
                    borderColor: showWizard
                      ? "var(--accent, #00b4d8)"
                      : "var(--border, #2a2f3b)",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: !hasPhotos ? "not-allowed" : "pointer",
                    opacity: !hasPhotos ? 0.5 : 1,
                  }
                : {
                    padding: "6px 12px",
                    background: showWizard
                      ? "rgba(0,180,216,0.15)"
                      : "var(--bg-tertiary, #252b38)",
                    color: !hasPhotos
                      ? "var(--text-muted)"
                      : showWizard
                      ? "var(--accent, #00b4d8)"
                      : "var(--text-muted)",
                    border: "1px solid",
                    borderColor: showWizard
                      ? "var(--accent, #00b4d8)"
                      : "var(--border, #2a2f3b)",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: !hasPhotos ? "not-allowed" : "pointer",
                    opacity: !hasPhotos ? 0.5 : 1,
                  }
            }
            title={
              !hasPhotos
                ? "Upload a patient photo first to use the alignment wizard"
                : "Open the 2-point photo-to-scan alignment wizard"
            }
          >
            {showWizard
              ? "Hide Alignment"
              : sidecarState === "ready" && hasPhotos && hasScan
              ? "Refine Alignment"
              : "Align Photo"}
          </button>

          <button
            onClick={() => setActiveView(continueTarget)}
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
            title={
              canContinue
                ? undefined
                : isAlignStage
                ? "Upload both a patient photo and arch scan before continuing to Design."
                : "Upload at least one photo or scan to continue through the case workflow."
            }
          >
            {continueLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
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
  const [showWizard, setShowWizard] = useState(sharedCaptureUiState.showWizard);
  const [detectError, setDetectError] = useState<string | null>(
    sharedCaptureUiState.detectError,
  );
  const workspaceVariant = useWorkspaceVariantStore((s) => s.variant);
  const activeView = useViewportStore((s) => s.activeView);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanName = useImportStore((s) => s.archScanName);
  const stage = getCaseWorkflowStage(activeView);
  const hasPhotos = uploadedPhotos.length > 0;
  const hasScan = Boolean(archScanName);
  const isAlignStage = stage === "align";
  const isGuidedVariant = workspaceVariant === "guided";
  const isActiveCaptureStage = stage === "import" || stage === "align";
  const guidanceMessage = isAlignStage
    ? hasPhotos && hasScan
      ? "Refine the landmark match, then continue into Design when the overlay looks believable."
      : "Bring in both the patient photo and arch scan so alignment can be calibrated."
    : hasPhotos || hasScan
      ? "Complete the missing asset so the case can move into alignment."
      : "Upload a patient photo or arch scan to start the case.";

  useEffect(() => {
    const wasOpen = sharedCaptureUiState.showWizard;
    if (showWizard && !wasOpen) {
      recordAlignmentAttempt("import");
    }
  }, [showWizard]);

  useEffect(() => {
    sharedCaptureUiState.showWizard = showWizard;
  }, [showWizard]);

  useEffect(() => {
    sharedCaptureUiState.detectError = detectError;
  }, [detectError]);

  useEffect(() => {
    setShowWizard(sharedCaptureUiState.showWizard);
    setDetectError(sharedCaptureUiState.detectError);
  }, [activeView]);

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
        detectError={detectError}
        setDetectError={setDetectError}
      />

      {isGuidedVariant && isActiveCaptureStage && (
        <div className="guided-stage-panel" data-testid="guided-context-panel">
          <div className="guided-stage-panel__header">
            <div>
              <div className="guided-stage-panel__eyebrow">Recommended next</div>
              <div className="guided-stage-panel__title">
                {isAlignStage ? "Calibrate the overlay" : "Finish the intake set"}
              </div>
            </div>
            <div className="guided-stage-panel__status">
              <span
                className={`guided-stage-chip ${hasPhotos ? "is-ready" : "is-pending"}`}
              >
                {hasPhotos ? "Photo ready" : "Photo needed"}
              </span>
              <span
                className={`guided-stage-chip ${hasScan ? "is-ready" : "is-pending"}`}
              >
                {hasScan ? "Scan ready" : "Scan needed"}
              </span>
            </div>
          </div>
          <p className="guided-stage-panel__body">{guidanceMessage}</p>
          <div
            className="guided-stage-panel__status"
            data-testid="guided-import-readiness"
          >
            <span
              className={`guided-stage-chip ${hasPhotos ? "is-ready" : "is-pending"}`}
            >
              {hasPhotos ? "Photo ready" : "Photo needed"}
            </span>
            <span
              className={`guided-stage-chip ${hasScan ? "is-ready" : "is-pending"}`}
            >
              {hasScan ? "Scan ready" : "Scan needed"}
            </span>
          </div>
        </div>
      )}

      {/* Main content — no side panel split needed */}
      <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        <ImportView />
      </div>

      {/* Full-screen modal — rendered at root level via fixed positioning */}
      {showWizard && (
        <AlignmentCalibrationWizard onClose={() => setShowWizard(false)} />
      )}
    </div>
  );
}
