/**
 * ============================================================================
 * CAMERA CONTROLS HOOK - DO NOT MODIFY
 * ============================================================================
 *
 * Main hook for all camera-related actions.
 * Combines visual centroid calculation with camera movement operations.
 */
import { useMemo, useCallback, useState } from "react";
import * as THREE from "three";
import type { ParsedStlMesh } from "../../import/stlParser";
import type { GeneratedVariantDesign } from "../../engine/designEngine";
import { 
  computeVisualCentroid,
  getDefaultCameraPosition,
  getPresetCameraPosition 
} from "./visualCentroid";
import { CAMERA_PRESETS } from "./constants";
import type { CameraPreset, CameraAnimTarget } from "./types";

interface UseCameraControlsParams {
  archScanMesh: ParsedStlMesh | null | undefined;
  activeVariant: GeneratedVariantDesign | null | undefined;
}

interface UseCameraControlsReturn {
  /** The current visual centroid - where camera rotates around */
  visualCentroid: THREE.Vector3;
  /** Current animation target, or null if not animating */
  animTarget: CameraAnimTarget | null;
  /** Set a new animation target - use this for camera transitions */
  setAnimTarget: (target: CameraAnimTarget | null) => void;
  /** Reset camera to default position relative to visual centroid */
  resetView: () => void;
  /** Go to a preset camera view */
  goToPreset: (preset: CameraPreset) => void;
  /** Available camera presets */
  presets: CameraPreset[];
}

/**
 * Hook for camera controls.
 * 
 * Usage:
 * ```tsx
 * const { visualCentroid, animTarget, setAnimTarget, resetView, goToPreset } = useCameraControls({
 *   archScanMesh,
 *   activeVariant
 * });
 * ```
 */
export function useCameraControls({
  archScanMesh,
  activeVariant,
}: UseCameraControlsParams): UseCameraControlsReturn {
  const bounds = archScanMesh?.bounds ?? null;
  const teeth = activeVariant?.teeth;
  
  // Compute visual centroid - this is the rotation center
  const visualCentroid = useMemo(() => {
    return computeVisualCentroid(bounds, teeth);
  }, [bounds, teeth]);

  // Animation state
  const [animTarget, setAnimTarget] = useState<CameraAnimTarget | null>(null);

  /**
   * Reset camera to default position, looking at visual centroid
   */
  const resetView = useCallback(() => {
    const pos = getDefaultCameraPosition(visualCentroid, bounds);
    setAnimTarget({
      pos,
      up: new THREE.Vector3(0, 1, 0),
      lookAt: visualCentroid,
    });
  }, [visualCentroid, bounds, setAnimTarget]);

  /**
   * Go to a preset camera view, positioned relative to visual centroid
   */
  const goToPreset = useCallback((preset: CameraPreset) => {
    const pos = getPresetCameraPosition(preset.position, visualCentroid, bounds);
    setAnimTarget({
      pos,
      up: new THREE.Vector3(...(preset.up ?? [0, 1, 0])),
      lookAt: visualCentroid,
    });
  }, [visualCentroid, bounds, setAnimTarget]);

  return {
    visualCentroid,
    animTarget,
    setAnimTarget,
    resetView,
    goToPreset,
    presets: CAMERA_PRESETS,
  };
}

// Re-export types for convenience
export type { CameraPreset, CameraAnimTarget };
