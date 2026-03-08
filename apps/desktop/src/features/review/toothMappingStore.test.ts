import { applyMappingResult } from "./toothMappingStore";

test("flags low-confidence tooth mapping for manual confirmation", () => {
  const state = applyMappingResult({
    teeth: [{ toothId: "8", confidence: 0.42 }]
  });

  expect(state.requiresConfirmation).toBe(true);
});
