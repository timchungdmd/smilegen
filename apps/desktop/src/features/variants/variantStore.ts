import type { VariantLabel } from "../engine/engineTypes";

export interface VariantSummary {
  id: string;
  label: VariantLabel;
  widthTendency: string;
  lengthTendency: string;
  additiveIntensity: string;
}

const DEFAULT_VARIANTS: VariantSummary[] = [
  {
    id: "variant-conservative",
    label: "conservative",
    widthTendency: "contained",
    lengthTendency: "minimal",
    additiveIntensity: "low"
  },
  {
    id: "variant-balanced",
    label: "balanced",
    widthTendency: "harmonized",
    lengthTendency: "moderate",
    additiveIntensity: "medium"
  },
  {
    id: "variant-enhanced",
    label: "enhanced",
    widthTendency: "assertive",
    lengthTendency: "lifted",
    additiveIntensity: "high"
  }
];

export function createDefaultVariants() {
  return DEFAULT_VARIANTS;
}
