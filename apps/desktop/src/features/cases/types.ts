export type WorkflowState =
  | "draft"
  | "imported"
  | "mapped"
  | "prepared"
  | "needs_doctor_review"
  | "doctor_approved"
  | "exported";

export interface AssetRecord {
  id: string;
  type: string;
  localPath: string;
}

export interface CaseRecord {
  id: string;
  title: string;
  workflowState: WorkflowState;
  presentationReady: boolean;
  exportBlocked: boolean;
  activeDesignVersionId: string;
  assets: AssetRecord[];
  createdAt: string;
  updatedAt: string;
}
