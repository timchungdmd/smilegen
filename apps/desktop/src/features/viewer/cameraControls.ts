import * as THREE from "three";
import type { ParsedStlMesh } from "../import/stlParser";
import type { GeneratedVariantDesign } from "../engine/designEngine";

/**
 * Computes the visual centroid for camera rotation target.
 * 
 * IMPORTANT: The scan mesh is centered at origin by StlMeshView, so scan
 * contributes position (0,0,0) to the centroid calculation, not its original bounds center.
 * 
 * When teeth exist, the centroid is the average teeth position.
 * When only scan exists, the centroid is (0,0,0) - the scan's centered position.
 */
export function computeVisualCentroid(
  bounds: ParsedStlMesh["bounds"] | null,
  teeth: GeneratedVariantDesign["teeth"] | undefined
): THREE.Vector3 {
  const points: THREE.Vector3[] = [];
  
  // Scan is centered at origin by StlMeshView, so its world position is (0,0,0)
  // Only add it if there's no teeth - otherwise let teeth dominate the centroid
  if (bounds && (!teeth || teeth.length === 0)) {
    // When only scan exists, rotation should be around the scan's center (which is at origin after centering)
    points.push(new THREE.Vector3(0, 0, 0));
  }
  
  // Add teeth centroid if teeth exist - this is the primary rotation center when teeth are present
  if (teeth && teeth.length > 0) {
    const teethCenter = new THREE.Vector3();
    teeth.forEach(t => {
      teethCenter.add(new THREE.Vector3(t.positionX, t.positionY, t.positionZ ?? 0));
    });
    teethCenter.divideScalar(teeth.length);
    points.push(teethCenter);
  }
  
  // Return average of all points, or origin if none
  if (points.length === 0) return new THREE.Vector3(0, 0, 0);
  const centroid = new THREE.Vector3();
  points.forEach(p => centroid.add(p));
  return centroid.divideScalar(points.length);
}

/**
 * Gets camera distance based on scan bounds size
 */
export function getCameraDistance(bounds: ParsedStlMesh["bounds"] | null): number {
  if (!bounds) return 30;
  const size = Math.max(bounds.width, bounds.depth, bounds.height);
  return size * 1.8;
}

/**
 * Gets default camera position relative to a centroid
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
 * Gets preset camera position relative to a centroid
 */
export function getPresetCameraPosition(
  presetPosition: [number, number, number],
  centroid: THREE.Vector3,
  bounds: ParsedStlMesh["bounds"] | null
): THREE.Vector3 {
  const scale = bounds ? Math.max(bounds.width, bounds.depth, bounds.height) * 0.04 : 1;
  const presetPos = new THREE.Vector3(...presetPosition).multiplyScalar(scale);
  // Offset preset position by centroid so camera looks at visual center
  presetPos.add(centroid);
  return presetPos;
}

/**
 * Debug log for centroid calculation
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
  console.log('[VisualCentroid]', { 
    centroid: { x: centroid.x.toFixed(2), y: centroid.y.toFixed(2), z: centroid.z.toFixed(2) },
    teethCount,
    scanCenter: { x: scanCenter.x.toFixed(2), y: scanCenter.y.toFixed(2), z: scanCenter.z.toFixed(2) }
  });
}
