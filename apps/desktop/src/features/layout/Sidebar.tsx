import { useViewportStore, type ViewId } from "../../store/useViewportStore";
import { useWorkflowStore } from "../../store/useWorkflowStore";
import { STAGE_CONTRACT_MAP } from "../workflow/stageContracts";

interface SidebarProps {
  activeView: ViewId;
}

// ── Icon paths ────────────────────────────────────────────────────────────

const SETTINGS_ICON =
  "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z";

const CASES_ICON =
  "M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z";

// ── NavButton ─────────────────────────────────────────────────────────────

interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
}

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      title={item.label}
      style={{
        width: 48,
        height: 44,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        background: isActive ? "var(--accent-dim)" : "transparent",
        color: isActive ? "var(--accent)" : "var(--text-muted)",
        transition: "all 0.15s ease",
        position: "relative",
      }}
      className="nav-btn"
    >
      {/* Active indicator bar */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            left: -6,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 20,
            borderRadius: "0 2px 2px 0",
            background: "var(--accent)",
          }}
        />
      )}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d={item.icon} />
      </svg>
      <span
        style={{
          fontSize: 9,
          fontWeight: isActive ? 600 : 500,
          letterSpacing: "0.02em",
        }}
      >
        {item.label}
      </span>
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────

/** Legacy view aliases — map old ViewIds to their modern equivalents */
const LEGACY: Partial<Record<ViewId, ViewId>> = {
  import: "capture",
  design: "simulate",
  compare: "validate",
  export: "collaborate",
};

export function Sidebar({ activeView }: SidebarProps) {
  const setActiveView = useViewportStore((s) => s.setActiveView);
  // Ensure canNavigateTo subscribes to tick changes so locked state re-renders
  const _tick = useWorkflowStore((s) => s._tick);

  // Resolve legacy aliases for highlight matching
  const resolvedActive: ViewId = LEGACY[activeView] ?? activeView;

  // ── Top nav: Cases + workflow stages ────────────────────────────────────
  const workflowStageIds: ViewId[] = [
    "overview",
    "capture",
    "simulate",
    "plan",
    "validate",
    "present",
    "collaborate",
  ];

  const topItems: NavItem[] = [
    { id: "cases", label: "Cases", icon: CASES_ICON },
    ...workflowStageIds.map((id) => {
      const contract = STAGE_CONTRACT_MAP[id as keyof typeof STAGE_CONTRACT_MAP];
      return {
        id,
        label: contract?.shortLabel ?? id,
        icon: contract?.icon ?? "",
      };
    }),
  ];

  const bottomItems: NavItem[] = [
    { id: "settings", label: "Settings", icon: SETTINGS_ICON },
  ];

  return (
    <aside className="app-sidebar">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        {topItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={resolvedActive === item.id}
            onClick={() => setActiveView(item.id)}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        {bottomItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={resolvedActive === item.id}
            onClick={() => setActiveView(item.id)}
          />
        ))}
      </div>
    </aside>
  );
}
