/**
 * Facial landmark detection service.
 *
 * In production this would use MediaPipe Face Mesh or TensorFlow.js.
 * For now, provides a simulation-based detector that estimates landmarks
 * from photo dimensions, and a manual landmark interface.
 */

import type { FacialLandmarks, Point2D } from "./analysisTypes";

export interface LandmarkDetectionResult {
  landmarks: FacialLandmarks | null;
  error: string | null;
  processingTimeMs: number;
}

/**
 * Simulate landmark detection from a photo.
 * In production, this would run MediaPipe Face Mesh WASM.
 * For now, returns estimated positions based on standard facial proportions.
 */
export function detectFacialLandmarks(
  imageWidth: number,
  imageHeight: number
): LandmarkDetectionResult {
  const start = performance.now();

  if (imageWidth <= 0 || imageHeight <= 0) {
    return {
      landmarks: null,
      error: "Invalid image dimensions",
      processingTimeMs: performance.now() - start
    };
  }

  const pupilLeft: Point2D = { x: imageWidth * 0.35, y: imageHeight * 0.30 };
  const pupilRight: Point2D = { x: imageWidth * 0.65, y: imageHeight * 0.30 };

  const nasion: Point2D = { x: imageWidth * 0.50, y: imageHeight * 0.35 };
  const subnasale: Point2D = { x: imageWidth * 0.50, y: imageHeight * 0.55 };
  const menton: Point2D = { x: imageWidth * 0.50, y: imageHeight * 0.85 };

  const upperLipCenter: Point2D = { x: imageWidth * 0.50, y: imageHeight * 0.65 };
  const lowerLipCenter: Point2D = { x: imageWidth * 0.50, y: imageHeight * 0.72 };

  const commissureLeft: Point2D = { x: imageWidth * 0.38, y: imageHeight * 0.70 };
  const commissureRight: Point2D = { x: imageWidth * 0.62, y: imageHeight * 0.70 };

  // Generate upper lip curve (gentle arc, ~10 points)
  const upperLipLine: Point2D[] = [];
  const lowerLipLine: Point2D[] = [];
  const lipSteps = 10;

  for (let i = 0; i <= lipSteps; i++) {
    const t = i / lipSteps;
    const x = commissureLeft.x + (commissureRight.x - commissureLeft.x) * t;

    // Upper lip: cupid's bow shape (slight dip at center)
    const upperArc = Math.sin(t * Math.PI) * (imageHeight * 0.015);
    const cupidDip = Math.abs(t - 0.5) < 0.15 ? imageHeight * 0.005 : 0;
    const upperY = upperLipCenter.y - upperArc + cupidDip;
    upperLipLine.push({ x, y: upperY });

    // Lower lip: gentle downward arc
    const lowerArc = Math.sin(t * Math.PI) * (imageHeight * 0.02);
    const lowerY = lowerLipCenter.y + lowerArc;
    lowerLipLine.push({ x, y: lowerY });
  }

  const midlineX = imageWidth * 0.50;
  const midlineEstimate = {
    start: { x: midlineX, y: imageHeight * 0.10 },
    end: { x: midlineX, y: imageHeight * 0.90 }
  };

  const teethRegionWidth = imageWidth * 0.24;
  const teethRegionHeight = imageHeight * 0.08;

  const landmarks: FacialLandmarks = {
    pupilLeft,
    pupilRight,
    bipupillaryLine: { start: pupilLeft, end: pupilRight },
    nasion,
    subnasale,
    menton,
    upperLipCenter,
    lowerLipCenter,
    commissureLeft,
    commissureRight,
    upperLipLine,
    lowerLipLine,
    teethVisible: true,
    teethRegion: {
      x: midlineX - teethRegionWidth / 2,
      y: upperLipCenter.y,
      width: teethRegionWidth,
      height: teethRegionHeight
    },
    midlineEstimate,
    confidence: 0.75,
    faceAngle: 0,
    isSmiling: true
  };

  return {
    landmarks,
    error: null,
    processingTimeMs: performance.now() - start
  };
}

/**
 * Derive overlay guide positions from detected landmarks.
 */
export function landmarksToGuidePositions(
  landmarks: FacialLandmarks,
  viewWidth: number,
  viewHeight: number
): { midlineX: number; smileArcY: number; gingivalLineY: number } {
  // Convert pixel coordinates to percentage values
  const midlineX = ((landmarks.midlineEstimate.start.x + landmarks.midlineEstimate.end.x) / 2 / viewWidth) * 100;
  const smileArcY = (landmarks.upperLipCenter.y / viewHeight) * 100;
  const gingivalLineY = ((landmarks.upperLipCenter.y - viewHeight * 0.05) / viewHeight) * 100;

  return {
    midlineX: Math.max(10, Math.min(90, midlineX)),
    smileArcY: Math.max(20, Math.min(80, smileArcY)),
    gingivalLineY: Math.max(10, Math.min(70, gingivalLineY))
  };
}
