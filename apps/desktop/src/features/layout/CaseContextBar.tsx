/**
 * CaseContextBar
 *
 * Persistent narrow bar displayed between the Header and the Workspace when
 * a case is active. Shows:
 *  - Case title (clickable → goes to Overview)
 *  - Workflow stage breadcrumb with status indicators
 *  - "New Case" escape hatch
 *
 * Collapses to nothing when no case is open (cases list view).
 *
 * Phase 3 implementation.
 */

import { useCaseStore } from "../../store/useCaseStore";
import { useViewportStore } from "../../store/useViewportStore";
import { useWorkflowStore } from "../../store/useWorkflowStore";
import { STAGE_CONTRACTS } from "../workflow/stageContracts";
import type { ViewId } from "../../store/useViewportStore";

// ── Stage pip ─────────────────────────────────────────────────────────────

function StagePip({
  stage,
  isActive,
  onNavigate,
}: {
  stage: (typeof STAGE_CONTRACTS)[0];
  isActive: boolean;
  onNavigate: (id: ViewId) => void;
}) {
  const getStageStatus = useWorkflowStore((s) => s.getStageStatus);
  const status = getStageStatus(stage.id);

  const color =
    status === "complete"
      ? "var(--accent, #00b4d8)"
      : isActive
      ? "var(--text-primary, #e8eaf0)"
      : status === "locked"
      ? "var(--text-disabled, #3a3f4b)"
      : "var(--text-muted, #8892a0)";

  return (
    <button
      onClick={() => onNavigate(stage.id as ViewId)}
      title={stage.description}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        background: isActive ? "rgba(0,180,216,0.1)" : "transparent",
        border: "1px solid",
        borderColor: isActive ? "var(--accent, #00b4d8)" : "transparent",
        borderRadius: 5,
        cursor: "pointer",
        fontSize: 11,
        fontWeight: isActive ? 600 : 500,
        color,
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {/* Completion dot */}
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background:
            status === "complete"
              ? "var(--accent, #00b4d8)"
              : isActive
              ? "var(--text-primary)"
              : "var(--text-disabled, #3a3f4b)",
          flexShrink: 0,
        }}
      />
      {stage.shortLabel}
    </button>
  );
}

// ── CaseContextBar ────────────────────────────────────────────────────────

export function CaseContextBar() {
  const caseRecord = useCaseStore((s) => s.caseRecord);
  const activeView = useViewportStore((s) => s.activeView);
  const setActiveView = useViewportStore((s) => s.setActiveView);
  const newCase = useCaseStore((s) => s.newCase);

  // Only show when a case is active
  if (!caseRecord) return null;

  const workflowViews: ViewId[] = [
    "overview",
    "capture",
    "simulate",
    "plan",
    "validate",
    "present",
    "collaborate",
  ];

  // Only show breadcrumb on workflow views
  const isWorkflowView = workflowViews.includes(activeView as ViewId);

  return (
    <div
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 16px",
        height: 32,
        borderBottom: "1px solid var(--border, #2a2f3b)",
        background: "var(--bg-secondary, #1a1f2b)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Case title chip */}
      <button
        onClick={() => setActiveView("overview")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "2px 8px",
          background: "var(--bg-tertiary, #252b38)",
          border: "1px solid var(--border, #2a2f3b)",
          borderRadius: 5,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-primary, #e8eaf0)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        title="View case overview"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
        </svg>
        {caseRecord.title}
      </button>

      {/* Chevron separator */}
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="var(--text-disabled, #3a3f4b)"
        style={{ flexShrink: 0 }}
      >
        <path d="M8 5v14l11-7z" />
      </svg>

      {/* Stage breadcrumb — only shown on workflow views */}
      {isWorkflowView && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            overflow: "hidden",
            flex: 1,
          }}
        >
          {STAGE_CONTRACTS.map((stage) => (
            <StagePip
              key={stage.id}
              stage={stage}
              isActive={activeView === stage.id}
              onNavigate={(id) => setActiveView(id)}
            />
          ))}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* New case */}
      <button
        onClick={() => {
          if (
            window.confirm(
              `Start a new case? Unsaved changes to "${caseRecord.title}" will be lost.`
            )
          ) {
            newCase();
          }
        }}
        style={{
          padding: "2px 8px",
          background: "transparent",
          border: "1px solid var(--border, #2a2f3b)",
          borderRadius: 5,
          cursor: "pointer",
          fontSize: 11,
          color: "var(--text-muted, #8892a0)",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
        title="Discard current case and start fresh"
      >
        New Case
      </button>
    </div>
  );
}
