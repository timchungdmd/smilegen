import { createDefaultSmilePlan } from "./smilePlanStore";

test("creates a premolar-to-premolar additive-first smile plan", () => {
  const plan = createDefaultSmilePlan();

  expect(plan.workingRange).toBe("premolar_to_premolar");
  expect(plan.additiveBias).toBe("balanced");
  expect(plan.selectedTeeth.length).toBeGreaterThan(0);
});
