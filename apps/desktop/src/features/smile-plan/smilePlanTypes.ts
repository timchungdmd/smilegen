export type AdditiveBias = "conservative" | "balanced" | "enhanced";
export type WorkingRange = "premolar_to_premolar";
export type SymmetryMode = "soft" | "strict";
export type TreatmentType = "veneer" | "crown";

/**
 * Tooth width proportion mode.
 * - "golden": Central:Lateral:Canine = 1.618:1:0.618 (recurring esthetic dental proportion)
 * - "percentage": Central=23%, Lateral=15%, Canine=12% of total visible smile width
 * - "library": Use tooth library dimensions as-is
 */
export type ProportionMode = "golden" | "percentage" | "library";

export interface SmilePlanControls {
  midline: number;
  widthScale: number;
  lengthScale: number;
  incisalCurve: number;
  proportionMode: ProportionMode;
}

export interface SmilePlan {
  workingRange: WorkingRange;
  additiveBias: AdditiveBias;
  symmetryMode: SymmetryMode;
  selectedTeeth: string[];
  treatmentMap: Record<string, TreatmentType>;
  controls: SmilePlanControls;
}
