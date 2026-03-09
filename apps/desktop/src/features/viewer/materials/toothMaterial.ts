// apps/desktop/src/features/viewer/materials/toothMaterial.ts
import * as THREE from "three";

/** PBR-approximating dental enamel material.
 *  Uses MeshPhysicalMaterial for transmission (translucency) and clearcoat (gloss).
 */
export function createToothMaterial(options?: {
  shade?: "A1" | "A2" | "A3" | "B1" | "B2";
}): THREE.MeshPhysicalMaterial {
  const shadeColors: Record<string, THREE.ColorRepresentation> = {
    A1: 0xf5f0e8, A2: 0xf0e8d5, A3: 0xe8d9b8, B1: 0xf8f2e4, B2: 0xf0e8d0,
  };
  const color = shadeColors[options?.shade ?? "A2"] ?? shadeColors.A2;

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.15,          // Polished enamel — low roughness
    metalness: 0.0,
    transmission: 0.08,       // Slight translucency — light passes through enamel
    thickness: 1.5,           // Enamel thickness for transmission depth
    ior: 1.65,                // Enamel refractive index
    clearcoat: 0.4,           // Gloss layer
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.8,
  });
}

/** Gingival (gum tissue) material with subsurface scattering approximation. */
export function createGingivalMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe8748a,
    roughness: 0.55,
    metalness: 0.0,
    transmission: 0.04,       // Very slight SSS approximation
    thickness: 0.8,
    clearcoat: 0.05,
  });
}
