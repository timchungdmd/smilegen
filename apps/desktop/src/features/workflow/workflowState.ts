import type { WorkflowState } from "../cases/types";

/**
 * SmileGen Case Workflow State Machine
 *
 * State transitions follow the dental smile design process:
 *
 * ```
 * draft ──► imported ──► mapped ──► prepared ──► needs_doctor_review ──► doctor_approved ──► exported
 *   │           │           │           │               │                    │
 *   └───────────┴───────────┴───────────┴───────────────┴────────────────────┘
 *                     (can return to draft via reset)
 * ```
 *
 * ## State Descriptions
 * - **draft**: Initial state, no data imported yet
 * - **imported**: Photos/models imported, awaiting orientation confirmation
 * - **mapped**: Facial landmarks mapped, awaiting alignment and variant generation
 * - **prepared**: Smile design variants ready, awaiting doctor review
 * - **needs_doctor_review**: Flagged for doctor attention
 * - **doctor_approved**: Doctor has approved the design
 * - **exported**: Final design exported to output format
 *
 * ## Transition Guards
 * Each transition requires specific WorkflowInputs conditions to be met.
 * See transitionCaseState() implementation for guard details.
 */

export interface WorkflowInputs {
  hasRequiredImports?: boolean;
  orientationConfirmed?: boolean;
  mappingConfirmed?: boolean;
  alignmentComplete?: boolean;
  hasVariants?: boolean;
  doctorReviewResolved?: boolean;
  doctorApproved?: boolean;
  exportValidated?: boolean;
}

export function transitionCaseState(
  currentState: WorkflowState,
  inputs: WorkflowInputs
): WorkflowState {
  if (currentState === "draft" && inputs.hasRequiredImports) {
    return "imported";
  }

  if (
    currentState === "imported" &&
    inputs.orientationConfirmed &&
    inputs.mappingConfirmed
  ) {
    return "mapped";
  }

  if (currentState === "mapped" && inputs.hasVariants && inputs.alignmentComplete) {
    return "prepared";
  }

  if (currentState === "prepared" && !inputs.doctorReviewResolved) {
    return "needs_doctor_review";
  }

  if (
    (currentState === "prepared" || currentState === "needs_doctor_review") &&
    inputs.doctorReviewResolved &&
    inputs.doctorApproved
  ) {
    return "doctor_approved";
  }

  if (currentState === "doctor_approved" && inputs.exportValidated) {
    return "exported";
  }

  return currentState;
}
