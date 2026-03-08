import type { CaseRecord } from "./types";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyCase(title: string): CaseRecord {
  const now = new Date().toISOString();

  return {
    id: createId("case"),
    title,
    workflowState: "draft",
    presentationReady: false,
    exportBlocked: false,
    activeDesignVersionId: createId("design"),
    assets: [],
    createdAt: now,
    updatedAt: now
  };
}
