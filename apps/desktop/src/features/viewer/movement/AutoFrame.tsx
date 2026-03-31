/**
 * ============================================================================
 * AUTO FRAME COMPONENT - DO NOT MODIFY
 * ============================================================================
 *
 * Automatically frames the camera on initial load and keeps
 * the rotation center (TrackballControls target) at the visual centroid.
 */
import { useRef, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AutoFrameProps } from "./types";
import { computeVisualCentroid, logCentroidDebug } from "./visualCentroid";

/**
 * AutoFrame - Auto-frames camera on load and tracks centroid
 * 
 * Place this inside the <Canvas> component.
 * 
 * The visual centroid is computed from:
 * - Scan: contributes (0,0,0) since StlMeshView centers it at origin
 * - Teeth: contributes the average of all tooth positions
 * 
 * When teeth exist, rotation is around the teeth center.
 * When only scan exists, rotation is around the scan center (origin).
 */
export function AutoFrame({
  bounds,
  teeth,
  controlsRef,
  onComplete,
}: AutoFrameProps) {
  const { camera } = useThree();
  const hasFramed = useRef(false);
  const prevCentroid = useRef<THREE.Vector3 | null>(null);

  // Compute visual centroid based on scan bounds and teeth positions
  const visualCentroid = useMemo(() => {
    const centroid = computeVisualCentroid(bounds, teeth);
    logCentroidDebug(centroid, bounds, teeth);
    return centroid;
  }, [bounds, teeth]);

  // Initial camera positioning when mesh loads
  useEffect(() => {
    if (!bounds || hasFramed.current) return;
    hasFramed.current = true;

    const size = Math.max(bounds.width, bounds.depth, bounds.height);
    const dist = size * 1.8;
    
    camera.position.set(
      visualCentroid.x,
      visualCentroid.y + size * 0.3,
      visualCentroid.z + dist
    );
    camera.lookAt(visualCentroid);
    camera.updateProjectionMatrix();

    // Sync TrackballControls target to visual centroid
    if (controlsRef.current) {
      controlsRef.current.target.copy(visualCentroid);
      controlsRef.current.update();
    }
    
    prevCentroid.current = visualCentroid.clone();
    onComplete?.();
  }, [bounds, visualCentroid, camera, controlsRef, onComplete]);

  // Update controls target when visual centroid changes (e.g., teeth moved)
  useEffect(() => {
    if (!controlsRef.current || !prevCentroid.current) return;
    if (!visualCentroid.equals(prevCentroid.current)) {
      controlsRef.current.target.copy(visualCentroid);
      controlsRef.current.update();
      prevCentroid.current = visualCentroid.clone();
    }
  }, [visualCentroid, controlsRef]);

  // Reset flag when bounds change (new mesh loaded)
  useEffect(() => {
    hasFramed.current = false;
  }, [bounds?.width, bounds?.depth, bounds?.height]);

  return null;
}
