import { transitionCaseState } from "./workflowState";

test("moves imported cases to mapped only when orientation and mapping are confirmed", () => {
  const result = transitionCaseState("imported", {
    orientationConfirmed: true,
    mappingConfirmed: true
  });

  expect(result).toBe("mapped");
});
