/**
 * stageContracts.ts
 *
 * Defines the Stage Contract for each workflow stage.
 * Each contract specifies:
 *  - preconditions (isReady): what must be true to enter this stage
 *  - completion check (isComplete): what constitutes finishing the stage
 *
 * Readiness is derived from live store state — no additional persistence needed.
 * Call getStageContract(id) to look up a contract by ViewId.
 */

import { useImportStore } from "../../store/useImportStore";
import { useCaseStore } from "../../store/useCaseStore";
import { useDesignStore } from "../../store/useDesignStore";
import { useAlignmentStore } from "../../store/useAlignmentStore";

// ── Types ──────────────────────────────────────────────────────────────────

/** Workflow stage IDs — a subset of ViewId, excluding "cases" and "settings" */
export type WorkflowStageId =
  | "import"
  | "design"
  | "review"
  | "present"
  | "handoff";

export interface StageContract {
  id: WorkflowStageId;
  /** Full label for sidebar and context bar */
  label: string;
  /** Abbreviated label for narrow layouts */
  shortLabel: string;
  /** One-line description shown in overview and blockers */
  description: string;
  /** SVG path data for the stage icon (24×24 viewBox) */
  icon: string;
  /** Step number (1-based) in the linear workflow */
  step: number;
  /** Returns true when all preconditions to enter this stage are met */
  isReady: () => boolean;
  /** Returns true when this stage has been sufficiently completed */
  isComplete: () => boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const hasPhotos = () => useImportStore.getState().uploadedPhotos.length > 0;
const hasScan = () => Boolean(useImportStore.getState().archScanMesh);
const hasCapture = () => hasPhotos() && hasScan();
const hasDesign = () => Boolean(useDesignStore.getState().generatedDesign);
const hasVariants = () => useDesignStore.getState().variants.length > 0;
const savedVariantCount = () => useDesignStore.getState().variants.length;
const isReadyForDoctor = () => useDesignStore.getState().readyForDoctor;
const hasAlignmentReady = () => useAlignmentStore.getState().overlayTransform !== null;
const hasPresentationReady = () => useCaseStore.getState().caseRecord?.presentationReady ?? false;
const isExported = () => useCaseStore.getState().caseRecord?.workflowState === "exported";

// ── Stage Contract Definitions ─────────────────────────────────────────────

export const STAGE_CONTRACTS: StageContract[] = [
  {
    id: "import",
    label: "Import",
    shortLabel: "Import",
    description: "Import patient assets and prepare case setup",
    icon: "M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z",
    step: 1,
    isReady: () => true, // Always accessible — first step of any workflow
    isComplete: () => hasCapture(),
  },

  {
    id: "design",
    label: "Design",
    shortLabel: "Design",
    description: "Align assets and build the working smile design",
    icon: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    step: 2,
    isReady: () => hasCapture(),
    isComplete: () => hasVariants() && hasAlignmentReady(),
  },

  {
    id: "review",
    label: "Review",
    shortLabel: "Review",
    description: "Compare, measure, and review the design for approval",
    icon: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    step: 3,
    isReady: () => hasDesign() && hasAlignmentReady(),
    isComplete: () => isReadyForDoctor() && savedVariantCount() >= 3,
  },

  {
    id: "present",
    label: "Present",
    shortLabel: "Present",
    description: "Patient-friendly presentation of the smile design",
    icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
    step: 4,
    isReady: () => isReadyForDoctor(),
    isComplete: () => hasPresentationReady(),
  },

  {
    id: "handoff",
    label: "Handoff",
    shortLabel: "Handoff",
    description: "Export packages and deliver the approved case to team or lab",
    icon: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    step: 5,
    isReady: () => isReadyForDoctor() && savedVariantCount() >= 3,
    isComplete: () => isExported(),
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────

export const STAGE_CONTRACT_MAP = Object.fromEntries(
  STAGE_CONTRACTS.map((c) => [c.id, c])
) as Record<WorkflowStageId, StageContract>;

/** Returns the contract for the given stage id, or null if not a workflow stage */
export function getStageContract(id: string): StageContract | null {
  return STAGE_CONTRACT_MAP[id as WorkflowStageId] ?? null;
}

/** Ordered list of workflow stage IDs */
export const WORKFLOW_STAGE_ORDER: WorkflowStageId[] = STAGE_CONTRACTS.map((c) => c.id);
