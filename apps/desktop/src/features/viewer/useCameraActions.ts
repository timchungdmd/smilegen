import { useCallback, useMemo } from "react";
import * as THREE from "three";
import type { ParsedStlMesh } from "../import/stlParser";
import type { GeneratedVariantDesign } from "../engine/designEngine";
import { 
  computeVisualCentroid, 
  getDefaultCameraPosition,
  getPresetCameraPosition 
} from "./cameraControls";

export interface CameraPreset {
  label: string;
  icon: string;
  position: [number, number, number];
  up?: [number, number, number];
}

export const DEFAULT_CAMERA_PRESETS: CameraPreset[] = [
  { label: "Front", icon: "F", position: [0, 0, 40] },
  { label: "Back", icon: "B", position: [0, 0, -40] },
  { label: "Top", icon: "T", position: [0, 40, 0], up: [0, 0, -1] },
  { label: "Bottom", icon: "Bt", position: [0, -40, 0], up: [0, 0, 1] },
  { label: "Left", icon: "L", position: [-40, 0, 0] },
  { label: "Right", icon: "R", position: [40, 0, 0] },
  { label: "3/4 View", icon: "3/4", position: [25, 15, 30] },
];

export const DEFAULT_POSITION = new THREE.Vector3(0, 8, 30);
export const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

interface UseCameraActionsParams {
  archScanMesh: ParsedStlMesh | null | undefined;
  activeVariant: GeneratedVariantDesign | null | undefined;
  setAnimTarget: (target: {
    pos: THREE.Vector3;
    up: THREE.Vector3;
    lookAt?: THREE.Vector3;
  } | null) => void;
}

interface CameraActions {
  visualCentroid: THREE.Vector3;
  resetView: () => void;
  goToPreset: (preset: CameraPreset) => void;
}

/**
 * Hook for camera actions (reset, presets) that compute proper
 * rotation centers based on visual centroid.
 */
export function useCameraActions({
  archScanMesh,
  activeVariant,
  setAnimTarget,
}: UseCameraActionsParams): CameraActions {
  const bounds = archScanMesh?.bounds ?? null;
  const teeth = activeVariant?.teeth;
  
  // Compute visual centroid - this is the rotation center
  const visualCentroid = useMemo(() => {
    return computeVisualCentroid(bounds, teeth);
  }, [bounds, teeth]);

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
    resetView,
    goToPreset,
  };
}
