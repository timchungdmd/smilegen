import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Workflow-first navigation IDs.
 *
 * Primary case jobs:
 *   import → align → design → review → present
 *
 * Backing workspace routes kept for compatibility:
 *   capture (import/align), overview (case hub), simulate/plan (design),
 *   validate (review), present (present), collaborate (team handoff)
 *
 * Utility views:
 *   cases, settings
 */
export type ViewId =
  | "cases"
  | "import"
  | "design"
  | "review"
  | "present"
  | "handoff"
  | "settings";

/** Maps legacy route-based ViewId values to their canonical workflow stage names */
export const LEGACY_VIEW_MAP: Record<string, ViewId> = {
  capture: "import",
  overview: "import",
  align: "import",
  simulate: "design",
  plan: "design",
  validate: "review",
  collaborate: "handoff",
  compare: "review",
  export: "handoff",
};

/** Normalise a ViewId, resolving any legacy alias to its canonical equivalent */
export function normalizeViewId(id: string): ViewId {
  return (LEGACY_VIEW_MAP[id] as ViewId) ?? (id as ViewId);
}

export type CaseWorkflowStage =
  | "import"
  | "design"
  | "review"
  | "present"
  | "handoff";

const WORKFLOW_STAGES = new Set<string>([
  "import",
  "design",
  "review",
  "present",
  "handoff",
]);

export function getCaseWorkflowStage(id: ViewId): CaseWorkflowStage | null {
  const normalized = normalizeViewId(id);
  return WORKFLOW_STAGES.has(normalized) ? (normalized as CaseWorkflowStage) : null;
}

// ─── State and actions ───────────────────────────────────────────────────────

interface NavigationState {
  activeView: ViewId;
}

interface NavigationActions {
  setActiveView: (view: ViewId) => void;
  resetNavigation: () => void;
}

export type NavigationStore = NavigationState & NavigationActions;

const INITIAL_NAVIGATION_STATE: NavigationState = {
  activeView: "import",
};

export const useNavigationStore = create<NavigationStore>()((set) => ({
  ...INITIAL_NAVIGATION_STATE,

  setActiveView: (view) => {
    set({ activeView: view });
  },

  resetNavigation: () => set(INITIAL_NAVIGATION_STATE),
}));
