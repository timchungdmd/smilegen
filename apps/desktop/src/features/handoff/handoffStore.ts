export interface HandoffReadiness {
  hasImports: boolean;
  mappingConfirmed: boolean;
  savedVariantCount: number;
}

export function canMarkReadyForDoctor(input: HandoffReadiness) {
  return input.hasImports && input.mappingConfirmed && input.savedVariantCount >= 3;
}
