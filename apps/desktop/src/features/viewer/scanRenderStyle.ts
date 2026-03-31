interface ScanRenderStyleInput {
  meshOpacity: number;
  hasActiveVariant: boolean;
}

interface ScanRenderStyle {
  color: string;
  opacity: number;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
}

export function getScanRenderStyle({
  meshOpacity,
  hasActiveVariant,
}: ScanRenderStyleInput): ScanRenderStyle {
  if (hasActiveVariant) {
    return {
      color: "#5c6d77",
      opacity: Math.min(meshOpacity, 0.48),
      metalness: 0.1,
      roughness: 0.45,
      emissive: "#1b2b34",
      emissiveIntensity: 0.16,
    };
  }

  return {
    color: "#6b7a85",
    opacity: meshOpacity,
    metalness: 0.1,
    roughness: 0.4,
    emissive: "#142028",
    emissiveIntensity: 0.12,
  };
}
