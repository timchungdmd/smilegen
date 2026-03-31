import { computeScanOverlayTransform } from "./scanOverlayAlignment";

export type PhotoAlignedView = {
  overlayTransform: {
    scale: number;
    rotation: number;
    translateX: number;
    translateY: number;
  };
  error: number | null;
};

export function resolveLandmarkAlignmentView(
  landmarks: Array<{ id: string; photoCoord: { x: number; y: number } | null; modelCoord: { x: number; y: number; z: number } | null }>,
  viewWidth: number,
  viewHeight: number
): PhotoAlignedView | null {
  const transform = computeScanOverlayTransform(landmarks as any, viewWidth, viewHeight);
  if (!transform) return null;

  return {
    overlayTransform: {
      scale: transform.scale,
      rotation: transform.rotation,
      translateX: transform.translateX,
      translateY: transform.translateY,
    },
    error: transform.residualError,
  };
}
