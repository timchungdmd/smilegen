export type WorkflowState =
  | "draft"
  | "imported"
  | "mapped"
  | "prepared"
  | "needs_doctor_review"
  | "doctor_approved"
  | "exported";

export type AssetType =
  | "PhotoFrontalSmile"
  | "PhotoRetracted"
  | "ScanUpperJaw"
  | "ScanLowerJaw"
  | "ScanToothLibrary"
  | "Cbct";

export const ALLOWED_ASSET_TYPES: AssetType[] = [
  "PhotoFrontalSmile",
  "PhotoRetracted",
  "ScanUpperJaw",
  "ScanLowerJaw",
  "ScanToothLibrary",
  "Cbct",
];

export function isValidAssetType(value: string): value is AssetType {
  return ALLOWED_ASSET_TYPES.includes(value as AssetType);
}

export interface AssetRecord {
  id: string;
  type: AssetType;
  localPath: string;
}

export type CaseArtifactKind =
  | "source-photo"
  | "source-scan"
  | "alignment-session"
  | "design-revision"
  | "review-note"
  | "presentation-snapshot"
  | "handoff-package";

export type CaseArtifactStatus = "draft" | "ready" | "approved" | "archived";

export interface CaseArtifactRecord {
  id: string;
  kind: CaseArtifactKind;
  label: string;
  status: CaseArtifactStatus;
  createdAt: string;
  updatedAt: string;
  sourceAssetIds: string[];
}

export interface CaseRecord {
  id: string;
  title: string;
  workflowState: WorkflowState;
  presentationReady: boolean;
  exportBlocked: boolean;
  activeDesignVersionId: string;
  assets: AssetRecord[];
  artifacts: CaseArtifactRecord[];
  createdAt: string;
  updatedAt: string;
}
