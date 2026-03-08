import type { AdditiveBias, SmilePlan, SmilePlanControls, TreatmentType } from "./smilePlanTypes";

const DEFAULT_TEETH = ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];

export function createDefaultSmilePlan(): SmilePlan {
  return {
    workingRange: "premolar_to_premolar",
    additiveBias: "balanced",
    symmetryMode: "soft",
    selectedTeeth: DEFAULT_TEETH,
    treatmentMap: Object.fromEntries(DEFAULT_TEETH.map((toothId) => [toothId, "veneer"])),
    controls: {
      midline: 0,
      widthScale: 1,
      lengthScale: 1,
      incisalCurve: 0.4,
      proportionMode: "golden"
    }
  };
}

export function updateAdditiveBias(plan: SmilePlan, additiveBias: AdditiveBias): SmilePlan {
  return {
    ...plan,
    additiveBias
  };
}

export function updatePlanControls(
  plan: SmilePlan,
  controls: Partial<SmilePlanControls>
): SmilePlan {
  return {
    ...plan,
    controls: { ...plan.controls, ...controls }
  };
}

export function toggleTooth(plan: SmilePlan, toothId: string): SmilePlan {
  const selected = plan.selectedTeeth.includes(toothId);
  const selectedTeeth = selected
    ? plan.selectedTeeth.filter((id) => id !== toothId)
    : [...plan.selectedTeeth, toothId].sort((a, b) => Number(a) - Number(b));

  const treatmentMap = { ...plan.treatmentMap };
  if (selected) {
    delete treatmentMap[toothId];
  } else {
    treatmentMap[toothId] = "veneer";
  }

  return { ...plan, selectedTeeth, treatmentMap };
}

export function setTreatmentType(
  plan: SmilePlan,
  toothId: string,
  type: TreatmentType
): SmilePlan {
  return {
    ...plan,
    treatmentMap: { ...plan.treatmentMap, [toothId]: type }
  };
}
