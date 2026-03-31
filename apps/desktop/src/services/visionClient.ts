// apps/desktop/src/services/visionClient.ts
import { SERVICE_URLS } from "../features/shared/serviceConfig";

const VISION_API_URL =
  import.meta.env.VITE_VISION_API_URL ?? SERVICE_URLS.VISION;

interface RawLandmarkResponse {
  midlineX: number;
  landmarks: { x: number; y: number; z?: number }[];
  interpupillaryLine: { leftX: number; leftY: number; rightX: number; rightY: number };
  lipContour: {
    outer: { x: number; y: number; z?: number }[];
    inner: { x: number; y: number; z?: number }[];
  };
  mouthMaskBbox: { xMin: number; yMin: number; xMax: number; yMax: number };
}

export interface VisionLandmarkResult {
  midlineX: number;
  landmarks: { x: number; y: number }[];
  interpupillaryLine: { x1: number; y1: number; x2: number; y2: number };
  commissureLeft: { x: number; y: number };
  commissureRight: { x: number; y: number };
  smileArcY: number;
  gingivalLineY: number;
  lipContour: {
    outer: { x: number; y: number }[];
    inner: { x: number; y: number }[];
  };
  mouthMaskBbox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
}

/**
 * Detect facial landmarks in a photo.
 *
 * Calls POST /landmarks/detect on the vision service.
 * Maps the raw API response to VisionLandmarkResult.
 *
 * Throws with a user-readable message on HTTP error or network failure.
 */
export async function detectLandmarks(
  imageBlob: Blob
): Promise<VisionLandmarkResult> {
  const form = new FormData();
  form.append("image", imageBlob, "photo.jpg");

  let res: Response;
  try {
    res = await fetch(`${VISION_API_URL}/landmarks/detect`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error(
      "Vision service unavailable. Make sure the vision service is running."
    );
  }

  if (res.status === 422) {
    throw new Error(
      "No face detected in the uploaded photo. Try a clearer frontal photo."
    );
  }
  if (!res.ok) {
    throw new Error(
      `Vision detection failed (${res.status}). Please try again.`
    );
  }

  const data = (await res.json()) as RawLandmarkResponse;

  // outer lip contour: 22 points built from UPPER_LIP_OUTER + reversed LOWER_LIP_OUTER
  // outer[0]  = lm[61]  = left commissure
  // outer[5]  = lm[0]   = philtrum center / upper lip top (smile arc reference)
  // outer[10] = lm[291] = right commissure
  const outer = data.lipContour.outer;
  const inner = data.lipContour.inner;

  if (!Array.isArray(outer) || outer.length < 11 || !Array.isArray(inner)) {
    throw new Error("Vision service returned an unexpected landmark format.");
  }

  const smileArcY = outer[5].y;

  return {
    midlineX: data.midlineX,
    landmarks: (data.landmarks ?? []).map(({ x, y }) => ({ x, y })),
    interpupillaryLine: data.interpupillaryLine
      ? { x1: data.interpupillaryLine.leftX, y1: data.interpupillaryLine.leftY, x2: data.interpupillaryLine.rightX, y2: data.interpupillaryLine.rightY }
      : { x1: 0, y1: 0.5, x2: 1, y2: 0.5 },
    commissureLeft: { x: outer[0].x, y: outer[0].y },
    commissureRight: { x: outer[10].x, y: outer[10].y },
    smileArcY,
    gingivalLineY: Math.max(0, smileArcY - 0.1),
    lipContour: {
      outer: outer.map(({ x, y }) => ({ x, y })),
      inner: inner.map(({ x, y }) => ({ x, y })),
    },
    mouthMaskBbox: data.mouthMaskBbox,
  };
}

/**
 * Generate a mouth mask PNG from a photo.
 *
 * Calls POST /masks/mouth on the vision service.
 * Returns a Blob containing the PNG mask image.
 */
export async function getMouthMask(imageBlob: Blob): Promise<Blob> {
  const form = new FormData();
  form.append("image", imageBlob, "photo.jpg");

  let res: Response;
  try {
    res = await fetch(`${VISION_API_URL}/masks/mouth`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error(
      "Vision service unavailable. Make sure the vision service is running."
    );
  }

  if (!res.ok) {
    throw new Error(
      `Mouth mask generation failed (${res.status}). Please try again.`
    );
  }

  return res.blob();
}
