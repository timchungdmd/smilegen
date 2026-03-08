import type { VariantGenerationInput, VariantGenerationRequest } from "./engineTypes";

const DEFAULT_VARIANTS: VariantGenerationRequest["variants"] = [
  "conservative",
  "balanced",
  "enhanced"
];

export function createVariantGenerationRequest(
  input: VariantGenerationInput
): VariantGenerationRequest {
  return {
    additiveBias: input.additiveBias,
    variants: DEFAULT_VARIANTS,
    teeth: input.selectedTeeth.map((toothId) => ({
      toothId,
      treatmentType: input.treatmentMap[toothId] ?? "veneer"
    }))
  };
}
