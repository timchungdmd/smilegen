/**
 * SimulateView — Design stage left panel.
 *
 * This version of SimulateView is strictly for the design panel (tools, sliders, etc.).
 * The 3D viewer is handled by the parent Workspace and is persistent.
 */

import { useRef, useEffect } from "react";
import { useImportStore } from "../../store/useImportStore";
import { useDesignStore } from "../../store/useDesignStore";
import { useViewportStore } from "../../store/useViewportStore";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";
import { DesignPanel } from "./DesignPanel";
import { recordFirstSimulationReady } from "../experiments/workspaceMetrics";

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

      <button
        onClick={() => setActiveView("review")}
        disabled={!hasVariants}
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
          cursor: hasVariants ? "pointer" : "not-allowed",
          opacity: hasVariants ? 1 : 0.5,
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

// ── SimulateView ──────────────────────────────────────────────────────────

export function SimulateView() {
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const variants = useDesignStore((s) => s.variants);
  const setActiveView = useViewportStore((s) => s.setActiveView);
  const hasPhotos = uploadedPhotos.length > 0;
  const hasRecordedSimulationReadyRef = useRef(false);

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
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <SimulateStageHeader />

      {!hasPhotos ? (
        <StageBlockerScreen
          stage="design"
          reason="Upload at least one patient photo in Import before building a design."
          actionLabel="Go to Import"
          onAction={() => setActiveView("import")}
        />
      ) : (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <DesignPanel />
        </div>
      )}
    </div>
  );
}
