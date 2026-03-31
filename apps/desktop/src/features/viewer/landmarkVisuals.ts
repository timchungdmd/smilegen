import type { AlignmentLandmark } from "../../store/useAlignmentStore";

export interface ScanLandmarkVisualState {
  baseRadius: number;
  haloRadius: number;
  emissiveIntensity: number;
  haloOpacity: number;
  markerOpacity: number;
  showHalo: boolean;
}

export function getScanLandmarkVisualState(
  landmark: AlignmentLandmark,
  activeLandmarkId: AlignmentLandmark["id"] | null
): ScanLandmarkVisualState {
  const isActive = landmark.id === activeLandmarkId;
  return {
    baseRadius: isActive ? 0.18 : 0.13,
    haloRadius: isActive ? 0.30 : 0.20,
    emissiveIntensity: isActive ? 0.65 : 0.35,
    haloOpacity: isActive ? 0.18 : 0.06,
    markerOpacity: isActive ? 1 : 0.75,
    showHalo: true,
  };
}
