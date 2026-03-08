import { canMarkReadyForDoctor } from "./handoffStore";

test("requires assets, mapping, and saved variants before handoff", () => {
  const result = canMarkReadyForDoctor({
    hasImports: true,
    mappingConfirmed: true,
    savedVariantCount: 3
  });

  expect(result).toBe(true);
});
