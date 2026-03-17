/**
 * SimulateView — Design workspace.
 *
 * Design is the third case job. Renders the existing DesignView while
 * adding a stage-aware header with before/after toggle and navigation CTA.
 *
 * Phase 7 full implementation targets:
 *  - Portrait-first layout (photo canvas as main, 3D as secondary panel)
 *  - Before / After split-screen toggle
 *  - Variant strip at bottom for quick design switching
 *  - "Looks good → Plan" CTA when a variant is generated
 */

import { useEffect, useRef, useState } from "react";
import { useImportStore } from "../../store/useImportStore";
import { useDesignStore } from "../../store/useDesignStore";
import {
  getCaseWorkflowStage,
  useViewportStore,
} from "../../store/useViewportStore";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";
import { DesignView } from "./DesignView";
import { AlignmentCalibrationWizard } from "../capture/AlignmentCalibrationWizard";
import { useWorkspaceVariantStore } from "../experiments/workspaceVariantStore";
import {
  recordAlignmentAttempt,
  recordFirstSimulationReady,
} from "../experiments/workspaceMetrics";

// ── Stage header ──────────────────────────────────────────────────────────

function SimulateStageHeader({
  showWizard,
  onToggleWizard,
  hasPhotos,
}: {
  showWizard: boolean;
  onToggleWizard: () => void;
  hasPhotos: boolean;
}) {
  const variants = useDesignStore((s) => s.variants);
  const setActiveView = useViewportStore((s) => s.setActiveView);
  const hasVariants = variants.length > 0;

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
          Design
        </span>
        {hasVariants && (
          <span
            style={{
              fontSize: 11,
              color: "var(--accent, #00b4d8)",
              background: "rgba(0,180,216,0.1)",
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            {variants.length} design{variants.length !== 1 ? "s" : ""} generated
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Align Photo — always visible so users can discover it; disabled until photo uploaded */}
        <button
          onClick={onToggleWizard}
          disabled={!hasPhotos}
          style={{
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
          }}
          title={
            !hasPhotos
              ? "Upload a patient photo first to use the alignment wizard"
              : "Open the 2-point photo-to-scan alignment wizard"
          }
        >
          {showWizard ? "Hide Alignment" : "Refine Alignment"}
        </button>

        {hasVariants && (
          <button
            onClick={() => setActiveView("review")}
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
            Continue to Review
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── SimulateView ──────────────────────────────────────────────────────────

export function SimulateView() {
  const [showWizard, setShowWizard] = useState(false);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const variants = useDesignStore((s) => s.variants);
  const activeView = useViewportStore((s) => s.activeView);
  const setActiveView = useViewportStore((s) => s.setActiveView);
  const workspaceVariant = useWorkspaceVariantStore((s) => s.variant);
  const hasPhotos = uploadedPhotos.length > 0;
  const isWorkspaceVariant = workspaceVariant === "workspace";
  const isActiveDesignStage = getCaseWorkflowStage(activeView) === "design";
  const previousWizardOpenRef = useRef(false);
  const hasRecordedSimulationReadyRef = useRef(false);

  useEffect(() => {
    if (showWizard && !previousWizardOpenRef.current) {
      recordAlignmentAttempt("design");
    }
    previousWizardOpenRef.current = showWizard;
  }, [showWizard]);

  useEffect(() => {
    if (variants.length > 0 && !hasRecordedSimulationReadyRef.current) {
      recordFirstSimulationReady();
      hasRecordedSimulationReadyRef.current = true;
      return;
    }

    if (variants.length === 0) {
      hasRecordedSimulationReadyRef.current = false;
    }
  }, [variants.length]);

  return (
    <div
      className={isWorkspaceVariant ? "studio-stage studio-stage--design" : undefined}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <SimulateStageHeader
        showWizard={showWizard}
        onToggleWizard={() => setShowWizard((v) => !v)}
        hasPhotos={hasPhotos}
      />

      {!isWorkspaceVariant && isActiveDesignStage && (
        <div className="guided-stage-panel" data-testid="guided-context-panel">
          <div className="guided-stage-panel__header">
            <div>
              <div className="guided-stage-panel__eyebrow">
                {variants.length > 0 ? "Ready for review" : "Recommended next"}
              </div>
              <div className="guided-stage-panel__title">
                {variants.length > 0 ? "Move the concept into Review" : "Generate the first concept"}
              </div>
            </div>
            <div className="guided-stage-panel__status">
              <span
                className={`guided-stage-chip ${hasPhotos ? "is-ready" : "is-pending"}`}
              >
                {hasPhotos ? "Photo ready" : "Photo needed"}
              </span>
              <span
                className={`guided-stage-chip ${variants.length > 0 ? "is-ready" : "is-pending"}`}
              >
                {variants.length > 0 ? "Concept ready" : "Concept needed"}
              </span>
            </div>
          </div>
          <p className="guided-stage-panel__body">
            {variants.length > 0
              ? "Compare the proposal, check measurements, and approve it for presentation."
              : "Create a concept here so Review can focus on validation instead of setup."}
          </p>
        </div>
      )}

      {!hasPhotos ? (
        <StageBlockerScreen
          stage="design"
          reason="Upload at least one patient photo in Import before building a design."
          actionLabel="Go to Import"
          onAction={() => setActiveView("import")}
        />
      ) : (
        <DesignView />
      )}

      {isWorkspaceVariant && (
        <div className="studio-bottom-strip" data-testid="design-studio-strip">
          <div className="studio-bottom-strip__section">
            <span className="studio-bottom-strip__label">Design deck</span>
            <span className="studio-bottom-strip__value">
              {variants.length > 0
                ? `${variants.length} concept${variants.length === 1 ? "" : "s"} live`
                : "Generate your first concept"}
            </span>
          </div>
          <div className="studio-bottom-strip__section">
            <span className="studio-bottom-strip__label">Canvas</span>
            <span className="studio-bottom-strip__value">Photo-first studio</span>
          </div>
          <div className="studio-bottom-strip__section">
            <span className="studio-bottom-strip__label">Next</span>
            <span className="studio-bottom-strip__value">
              {variants.length > 0 ? "Review smile proposal" : "Align and generate"}
            </span>
          </div>
        </div>
      )}

      {/* Full-screen alignment wizard modal — accessible from Simulate, not just Capture */}
      {showWizard && (
        <AlignmentCalibrationWizard onClose={() => setShowWizard(false)} />
      )}
    </div>
  );
}
