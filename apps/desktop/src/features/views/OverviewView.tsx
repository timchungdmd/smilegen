/**
 * OverviewView — Case summary dashboard.
 *
 * Shows the active case's workflow progress and quick-jump actions to each stage.
 * Renders the StageBlocker if no case is selected.
 *
 * Phase 5 implementation — currently provides a structural scaffold.
 * Full implementation: status cards, timeline rail, next-action CTA.
 */

import { useCaseStore } from "../../store/useCaseStore";
import { useWorkflowStore } from "../../store/useWorkflowStore";
import { useViewportStore } from "../../store/useViewportStore";
import { STAGE_CONTRACTS } from "../workflow/stageContracts";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";
import type { ViewId } from "../../store/useViewportStore";

// ── Stage Status Badge ────────────────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case "complete":
      return "var(--accent, #00b4d8)";
    case "ready":
      return "var(--text-muted, #8892a0)";
    case "locked":
      return "var(--text-disabled, #3a3f4b)";
    default:
      return "var(--text-muted, #8892a0)";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "ready":
      return "Ready";
    case "locked":
      return "Locked";
    default:
      return "–";
  }
}

// ── Stage Card ────────────────────────────────────────────────────────────

function StageCard({
  contract,
  status,
  onNavigate,
}: {
  contract: (typeof STAGE_CONTRACTS)[0];
  status: string;
  onNavigate: (id: ViewId) => void;
}) {
  const isComplete = status === "complete";
  const isLocked = status === "locked";
  const color = statusColor(status);

  return (
    <button
      onClick={() => !isLocked && onNavigate(contract.id as ViewId)}
      disabled={isLocked}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        border: "1px solid",
        borderColor: isComplete
          ? "var(--accent, #00b4d8)"
          : "var(--border, #2a2f3b)",
        borderRadius: 10,
        background: isComplete
          ? "rgba(0,180,216,0.06)"
          : "var(--bg-secondary, #1a1f2b)",
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.45 : 1,
        textAlign: "left",
        transition: "all 0.15s ease",
        width: "100%",
      }}
    >
      {/* Step badge */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: isComplete ? "var(--accent, #00b4d8)" : "var(--bg-tertiary, #252b38)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: isComplete ? "#fff" : "var(--text-muted)",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {isComplete ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        ) : (
          contract.step
        )}
      </div>

      {/* Icon + label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isLocked ? "var(--text-disabled, #3a3f4b)" : "var(--text-primary, #e8eaf0)",
            marginBottom: 2,
          }}
        >
          {contract.label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted, #8892a0)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {contract.description}
        </div>
      </div>

      {/* Status pill */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color,
          borderRadius: 4,
          padding: "2px 6px",
          background: isComplete ? "rgba(0,180,216,0.12)" : "transparent",
          flexShrink: 0,
        }}
      >
        {statusLabel(status)}
      </span>
    </button>
  );
}

// ── OverviewView ──────────────────────────────────────────────────────────

export function OverviewView() {
  const caseRecord = useCaseStore((s) => s.caseRecord);
  const getAllStages = useWorkflowStore((s) => s.getAllStages);
  const setActiveView = useViewportStore((s) => s.setActiveView);

  if (!caseRecord) {
    return (
      <StageBlockerScreen
        stage="overview"
        reason="Open or create a case to see its overview."
        actionLabel="Go to Cases"
        onAction={() => setActiveView("cases")}
      />
    );
  }

  const stages = getAllStages();
  const completeCount = stages.filter((s) => s.status === "complete").length;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "24px 28px",
        gap: 20,
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary, #e8eaf0)",
            margin: 0,
            marginBottom: 4,
          }}
        >
          {caseRecord.title}
        </h1>
        <div
          style={{ fontSize: 12, color: "var(--text-muted, #8892a0)" }}
        >
          {completeCount} of {stages.length} stages complete ·{" "}
          {new Date(caseRecord.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "var(--bg-tertiary, #252b38)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(completeCount / stages.length) * 100}%`,
            background: "var(--accent, #00b4d8)",
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Stage cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stages.map((stageInfo) => {
          const contract = STAGE_CONTRACTS.find((c) => c.id === stageInfo.id)!;
          return (
            <StageCard
              key={stageInfo.id}
              contract={contract}
              status={stageInfo.status}
              onNavigate={(id) => setActiveView(id)}
            />
          );
        })}
      </div>
    </div>
  );
}
