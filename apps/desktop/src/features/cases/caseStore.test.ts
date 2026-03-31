import { createEmptyCase } from "./caseStore";

test("creates a case with workflow and presentation flags", () => {
  const draft = createEmptyCase("Consult 001");
  expect(draft.title).toBe("Consult 001");
  expect(draft.workflowState).toBe("draft");
  expect(draft.presentationReady).toBe(false);
  expect(draft.exportBlocked).toBe(false);
  expect(draft.artifacts).toEqual([]);
});
