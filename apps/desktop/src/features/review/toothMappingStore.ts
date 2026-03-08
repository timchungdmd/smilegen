export interface MappingTooth {
  toothId: string;
  confidence: number;
}

export interface MappingResult {
  teeth: MappingTooth[];
}

export interface ToothMappingState {
  teeth: MappingTooth[];
  requiresConfirmation: boolean;
}

const CONFIRMATION_THRESHOLD = 0.65;

export function applyMappingResult(result: MappingResult): ToothMappingState {
  return {
    teeth: result.teeth,
    requiresConfirmation: result.teeth.some((tooth) => tooth.confidence < CONFIRMATION_THRESHOLD)
  };
}
