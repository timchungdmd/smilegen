import type { CaseRecord } from "../cases/types";

export function canGenerateVariants(caseRecord: CaseRecord) {
  return caseRecord.workflowState === "mapped" || caseRecord.workflowState === "prepared";
}

export function isDoctorActionRequired(caseRecord: CaseRecord) {
  return caseRecord.workflowState === "needs_doctor_review";
}
