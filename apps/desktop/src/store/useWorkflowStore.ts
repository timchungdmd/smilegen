/**
 * useWorkflowStore.ts
 *
 * Provides computed stage statuses for the clinical workflow navigation.
 * Derives readiness purely from other stores (import, case, design) —
 * no additional state is duplicated here.
 *
 * Stage status:
 *   "locked"      — preconditions not met; stage is inaccessible
 *   "ready"       — preconditions met; stage not yet started
 *   "in-progress" — preconditions met; some work done, not complete
 *   "complete"    — stage's completion condition is satisfied
 */

import { create } from "zustand";
import {
  STAGE_CONTRACT_MAP,
  WORKFLOW_STAGE_ORDER,
  type WorkflowStageId,
} from "../features/workflow/stageContracts";

// ── Types ──────────────────────────────────────────────────────────────────

export type StageStatus = "locked" | "ready" | "in-progress" | "complete";

export interface StageInfo {
  id: WorkflowStageId;
  status: StageStatus;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  step: number;
}

interface WorkflowState {
  /** Monotonic tick — increment to force re-evaluation of stage statuses */
  _tick: number;
}

interface WorkflowActions {
  /** Force re-check of all stage statuses after store mutations */
  tick: () => void;
  /** Returns computed status for a single stage */
  getStageStatus: (stage: WorkflowStageId) => StageStatus;
  /** Returns true if navigation to this stage is allowed */
  canNavigateTo: (stage: WorkflowStageId) => boolean;
  /** Returns StageInfo for all workflow stages, in order */
  getAllStages: () => StageInfo[];
  /** Returns the first incomplete, unlocked stage (the "current" stage) */
  getCurrentStage: () => WorkflowStageId | null;
}

export type WorkflowStore = WorkflowState & WorkflowActions;

// ── Store ──────────────────────────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowStore>()((set, get) => ({
  _tick: 0,

  tick: () => set((s) => ({ _tick: s._tick + 1 })),

  getStageStatus: (stage: WorkflowStageId): StageStatus => {
    const contract = STAGE_CONTRACT_MAP[stage];
    if (!contract) return "locked";

    const ready = contract.isReady();
    if (!ready) return "locked";

    const complete = contract.isComplete();
    if (complete) return "complete";

    return "ready";
  },

  canNavigateTo: (stage: WorkflowStageId): boolean => {
    const contract = STAGE_CONTRACT_MAP[stage];
    if (!contract) return false;
    return contract.isReady();
  },

  getAllStages: (): StageInfo[] => {
    const { getStageStatus } = get();
    return WORKFLOW_STAGE_ORDER.map((id) => {
      const contract = STAGE_CONTRACT_MAP[id];
      return {
        id,
        status: getStageStatus(id),
        label: contract.label,
        shortLabel: contract.shortLabel,
        description: contract.description,
        icon: contract.icon,
        step: contract.step,
      };
    });
  },

  getCurrentStage: (): WorkflowStageId | null => {
    const { getStageStatus } = get();
    // First unlocked, incomplete stage is the "current" stage
    const current = WORKFLOW_STAGE_ORDER.find((id) => {
      const status = getStageStatus(id);
      return status === "ready" || status === "in-progress";
    });
    return current ?? null;
  },
}));
