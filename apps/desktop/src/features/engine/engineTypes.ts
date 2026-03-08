import type { AdditiveBias, TreatmentType } from "../smile-plan/smilePlanTypes";

export type VariantLabel = "conservative" | "balanced" | "enhanced";

export interface ToothGenerationIntent {
  toothId: string;
  treatmentType: TreatmentType;
}

export interface VariantGenerationInput {
  selectedTeeth: string[];
  treatmentMap: Record<string, TreatmentType>;
  additiveBias: AdditiveBias;
}

export interface VariantGenerationRequest {
  additiveBias: AdditiveBias;
  variants: VariantLabel[];
  teeth: ToothGenerationIntent[];
}
