import { createVariantGenerationRequest } from "./engineClient";

test("serializes smile-plan intent into a multi-variant generation request", () => {
  const request = createVariantGenerationRequest({
    selectedTeeth: ["6", "7", "8", "9", "10", "11"],
    treatmentMap: { "8": "veneer", "9": "crown" },
    additiveBias: "balanced"
  });

  expect(request.variants).toEqual(["conservative", "balanced", "enhanced"]);
  expect(request.teeth.find((item) => item.toothId === "9")?.treatmentType).toBe("crown");
});
