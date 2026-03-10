/**
 * SimulateView — Photo-first smile simulation.
 *
 * Stage 3 in the clinical workflow. Renders the existing DesignView while
 * adding a stage-aware header with before/after toggle and navigation CTA.
 *
 * Phase 7 full implementation targets:
 *  - Portrait-first layout (photo canvas as main, 3D as secondary panel)
 *  - Before / After split-screen toggle
 *  - Variant strip at bottom for quick design switching
 *  - "Looks good → Plan" CTA when a variant is generated
 */

import { useImportStore } from "../../store/useImportStore";
import { useDesignStore } from "../../store/useDesignStore";
import { useViewportStore } from "../../store/useViewportStore";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";
import { DesignView } from "./DesignView";

// ── Stage header ──────────────────────────────────────────────────────────

function SimulateStageHeader() {
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
          Simulate
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

      {hasVariants && (
        <button
          onClick={() => setActiveView("plan")}
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
          Proceed to Plan
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── SimulateView ──────────────────────────────────────────────────────────

export function SimulateView() {
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const setActiveView = useViewportStore((s) => s.setActiveView);
  const hasPhotos = uploadedPhotos.length > 0;

  if (!hasPhotos) {
    return (
      <StageBlockerScreen
        stage="simulate"
        reason="Upload at least one patient photo in Capture before running a simulation."
        actionLabel="Go to Capture"
        onAction={() => setActiveView("capture")}
      />
    );
  }

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
      <SimulateStageHeader />
      <DesignView />
    </div>
  );
}
