import type { WorkflowState } from "../cases/types";

export interface WorkflowInputs {
  hasRequiredImports?: boolean;
  orientationConfirmed?: boolean;
  mappingConfirmed?: boolean;
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

  if (currentState === "mapped" && inputs.hasVariants) {
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
