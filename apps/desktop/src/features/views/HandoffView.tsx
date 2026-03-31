import { useCaseStore } from "../../store/useCaseStore";
import { useViewportStore } from "../../store/useViewportStore";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";
import { ExportView } from "./ExportView";

export function HandoffView() {
  const caseRecord = useCaseStore((s) => s.caseRecord);
  const setActiveView = useViewportStore((s) => s.setActiveView);

  if (!caseRecord) {
    return (
      <StageBlockerScreen
        stage="handoff"
        reason="Open or create a case before preparing a handoff package."
        actionLabel="Go to Cases"
        onAction={() => setActiveView("cases")}
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border, #2a2f3b)",
          background: "var(--bg-secondary, #1a1f2b)",
          flexShrink: 0,
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted, #8892a0)",
          }}
        >
          Handoff
        </span>
        <span style={{ fontSize: 12, color: "var(--text-primary, #e8eaf0)" }}>
          {caseRecord.title}
        </span>
      </div>

      <ExportView />
    </div>
  );
}
