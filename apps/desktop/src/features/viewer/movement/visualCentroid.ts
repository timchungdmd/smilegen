/**
 * ============================================================================
 * VISUAL CENTROID CALCULATION - DO NOT MODIFY
 * ============================================================================
 *
 * This module handles the critical calculation of where the camera rotates around.
 * 
 * RULES:
 * 1. Scan mesh is centered at origin by StlMeshView (position=[-center.x, -center.y, -center.z])
 * 2. When scan only: rotation center = (0,0,0) - the centered scan
 * 3. When teeth exist: rotation center = average of all tooth positions
 * 4. Teeth dominate when present
 *
 * ============================================================================
 */
import * as THREE from "three";
import type { ParsedStlMesh } from "../../import/stlParser";
import type { GeneratedVariantDesign } from "../../engine/designEngine";

/**
 * Compute the visual centroid for camera rotation.
 * 
 * When scan only: returns (0,0,0) - the scan's centered position in world space
 * When teeth exist: returns average of all tooth positions
 * When both: returns teeth center (teeth dominate)
 */
export function computeVisualCentroid(
  bounds: ParsedStlMesh["bounds"] | null,
  teeth: GeneratedVariantDesign["teeth"] | undefined
): THREE.Vector3 {
  // When teeth exist, rotation center is the average tooth position
  if (teeth && teeth.length > 0) {
    const teethCenter = new THREE.Vector3();
    teeth.forEach(t => {
      teethCenter.add(new THREE.Vector3(t.positionX, t.positionY, t.positionZ ?? 0));
    });
    teethCenter.divideScalar(teeth.length);
    return teethCenter;
  }
  
  // When only scan exists, rotation center is origin (scan is centered there by StlMeshView)
  if (bounds) {
    return new THREE.Vector3(0, 0, 0);
  }
  
  // Fallback when nothing loaded
  return new THREE.Vector3(0, 0, 0);
}

/**
 * Debug log for centroid calculation
 * Only logs when bounds exist to avoid console spam
 */
export function logCentroidDebug(
  centroid: THREE.Vector3,
  bounds: ParsedStlMesh["bounds"] | null,
  teeth: GeneratedVariantDesign["teeth"] | undefined
): void {
  if (!bounds) return;
  
  const scanCenter = new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2
  );
  
  const teethCount = teeth?.length ?? 0;
  const source = teethCount > 0 ? 'teeth' : 'scan_origin';
  
  console.log('[VisualCentroid]', { 
    source,
    x: centroid.x.toFixed(2), 
    y: centroid.y.toFixed(2), 
    z: centroid.z.toFixed(2),
    teethCount,
    scanCenterWorld: { x: 0, y: 0, z: 0 },
    scanCenterOriginal: { 
      x: scanCenter.x.toFixed(2), 
      y: scanCenter.y.toFixed(2), 
      z: scanCenter.z.toFixed(2) 
    }
  });
}

/**
 * Get camera distance based on mesh size
 */
export function getCameraDistance(bounds: ParsedStlMesh["bounds"] | null): number {
  if (!bounds) return 30;
  const size = Math.max(bounds.width, bounds.depth, bounds.height);
  return size * 1.8;
}

/**
 * Get default camera position for "reset view"
 * Positioned relative to the visual centroid
 */
export function getDefaultCameraPosition(
  centroid: THREE.Vector3,
  bounds: ParsedStlMesh["bounds"] | null
): THREE.Vector3 {
  const size = bounds ? Math.max(bounds.width, bounds.depth, bounds.height) : 10;
  return new THREE.Vector3(
    centroid.x,
    centroid.y + size * 0.3,
    centroid.z + size * 1.8
  );
}

/**
 * Get preset camera position
 * Preset is scaled and then offset by centroid
 */
export function getPresetCameraPosition(
  presetPosition: [number, number, number],
  centroid: THREE.Vector3,
  bounds: ParsedStlMesh["bounds"] | null
): THREE.Vector3 {
  const scale = bounds ? Math.max(bounds.width, bounds.depth, bounds.height) * 0.04 : 1;
  const presetPos = new THREE.Vector3(...presetPosition).multiplyScalar(scale);
  // Offset by centroid so camera looks at visual center
  presetPos.add(centroid);
  return presetPos;
}
