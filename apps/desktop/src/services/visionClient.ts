// apps/desktop/src/services/visionClient.ts

const VISION_API_URL =
  import.meta.env.VITE_VISION_API_URL ?? "http://localhost:8003";

export interface VisionLandmarkResult {
  /** Normalized facial midline X (0–1). Multiply × 100 for viewport store. */
  midlineX: number;
  /** Left mouth corner, normalized (0–1). */
  commissureLeft: { x: number; y: number };
  /** Right mouth corner, normalized (0–1). */
  commissureRight: { x: number; y: number };
  /** Normalized Y of upper lip center / incisal line (0–1). */
  smileArcY: number;
  /** Estimated normalized Y of gingival line, above smileArcY. */
  gingivalLineY: number;
  /** Full lip contour — all points normalized (0–1). */
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

  const data = await res.json();

  // outer lip contour: 22 points built from UPPER_LIP_OUTER + reversed LOWER_LIP_OUTER
  // outer[0]  = lm[61]  = left commissure
  // outer[5]  = lm[0]   = philtrum center / upper lip top (smile arc reference)
  // outer[10] = lm[291] = right commissure
  const outer: { x: number; y: number; z?: number }[] = data.lipContour.outer;
  const inner: { x: number; y: number; z?: number }[] = data.lipContour.inner;

  const smileArcY = outer[5].y;

  return {
    midlineX: data.midlineX,
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
