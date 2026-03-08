/**
 * Dental arch curve model and perspective projection.
 *
 * The maxillary arch is modeled as a parabola in the XZ plane:
 *   z = archDepth * (1 - (x / archHalfWidth)²)
 *
 * Teeth near the midline (x ≈ 0) sit at the apex of the curve —
 * closest to the camera — and appear largest. Teeth further from
 * the midline curve away from the camera and appear smaller.
 *
 * Perspective projection maps each tooth's 3D position to a 2D
 * photo coordinate, scaling its apparent size by depth.
 */

/** Calibration parameters that tie the 3D arch to the 2D photo. */
export interface AlignmentCalibration {
  /** X position of the midline on the photo, in SVG viewBox units. */
  midlineX: number;
  /** Y position of the incisal edge line on the photo, in SVG viewBox units. */
  incisalY: number;
  /** Pixels-per-mm at the closest point of the arch. */
  scale: number;
  /** Depth of the parabolic arch curve in mm (front-to-back). Typical: 12–18 mm. */
  archDepth: number;
  /** Half-width of the arch in mm (midline to last tooth). Typical: 30–40 mm. */
  archHalfWidth: number;
  /** Virtual camera distance from the arch apex in mm. Controls perspective strength. */
  cameraDistance: number;
}

export const DEFAULT_CALIBRATION: AlignmentCalibration = {
  midlineX: 300,     // center of a 600-wide viewBox
  incisalY: 220,     // slightly below center of a 400-tall viewBox
  scale: 4.2,        // ~4.2 px per mm at the front of the arch
  archDepth: 15,     // 15 mm from front incisors to premolar depth
  archHalfWidth: 35, // 35 mm half-arch width
  cameraDistance: 250 // 250 mm from camera to arch front
};

/** Minimal arch shape parameters needed by depth/tangent helpers. */
export type ArchParams = Pick<AlignmentCalibration, 'archDepth' | 'archHalfWidth'>;

/**
 * Estimate arch parameters from an STL scan's bounding box.
 * Uses the scan's X-extent for arch width and Y-extent for depth.
 */
export function estimateArchFromScan(bounds: {
  minX: number; maxX: number;
  minY: number; maxY: number;
}): { archHalfWidth: number; archDepth: number } {
  const scanWidth = bounds.maxX - bounds.minX;
  const scanDepth = bounds.maxY - bounds.minY;
  return {
    archHalfWidth: Math.max(20, Math.min(50, scanWidth / 2)),
    archDepth: Math.max(8, Math.min(25, scanDepth * 0.5))
  };
}

/**
 * Compute the Z-depth (forward/backward) of a tooth based on its
 * lateral distance from the midline along the parabolic arch.
 *
 * Returns 0 at the midline (most forward) and -archDepth at the
 * arch edges (most receded).
 */
export function archDepthAtX(x: number, cal: ArchParams): number {
  const t = Math.min(1, Math.abs(x) / cal.archHalfWidth);
  // Parabola: z=0 at midline, z = -archDepth at the edges
  return -cal.archDepth * t * t;
}

/**
 * Compute the angle of the arch tangent at lateral position x.
 * Returns radians — 0 at midline, increasing toward edges.
 * Used to rotate teeth so they face outward along the arch curve.
 */
export function archTangentAngle(x: number, cal: ArchParams): number {
  // dz/dx = -2 * archDepth * x / archHalfWidth²
  const dzdx = -2 * cal.archDepth * x / (cal.archHalfWidth * cal.archHalfWidth);
  return Math.atan2(dzdx, 1);
}

/**
 * Perspective scale factor at a given depth.
 *
 * Objects at z = 0 (arch apex, closest) get scale = 1.
 * Objects at z < 0 (further away) get scale < 1.
 */
export function perspectiveScale(z: number, cal: AlignmentCalibration): number {
  // Scale = D / (D - z). Since z ≤ 0, denominator ≥ D, so scale ≤ 1.
  return cal.cameraDistance / (cal.cameraDistance - z);
}

/** 2D position on the photo overlay (in SVG viewBox units). */
export interface ProjectedTooth {
  /** X position in SVG viewBox. */
  x: number;
  /** Y position in SVG viewBox. */
  y: number;
  /** Scale multiplier for the tooth's visual width/height (1 = closest). */
  scale: number;
  /** The Z-depth in mm (0 = closest to camera, negative = further). */
  depthZ: number;
}

/**
 * Project a tooth from its 3D arch position to 2D photo coordinates.
 *
 * @param toothX  Lateral position in mm from midline (from designEngine positionX).
 * @param toothY  Vertical offset in mm (from designEngine positionY, usually ~0).
 * @param cal     Calibration parameters linking the arch to the photo.
 */
export function projectToothToPhoto(
  toothX: number,
  toothY: number,
  cal: AlignmentCalibration
): ProjectedTooth {
  const z = archDepthAtX(toothX, cal);
  const s = perspectiveScale(z, cal);

  // Perspective-projected 2D position
  const projectedX = cal.midlineX + toothX * cal.scale * s;
  const projectedY = cal.incisalY + toothY * cal.scale * s;

  return {
    x: projectedX,
    y: projectedY,
    scale: s,
    depthZ: z
  };
}

/**
 * Project an entire variant's teeth onto the photo, returning
 * positions and perspective scale factors for each.
 */
export function projectVariantTeeth(
  teeth: ReadonlyArray<{ toothId: string; positionX: number; positionY: number; width: number; height: number }>,
  cal: AlignmentCalibration
): Array<ProjectedTooth & { toothId: string }> {
  return teeth.map((tooth) => ({
    toothId: tooth.toothId,
    ...projectToothToPhoto(tooth.positionX, tooth.positionY, cal)
  }));
}

/**
 * Build calibration from the existing overlay guide positions and
 * an optional arch scan's measured width.
 *
 * @param leftCommissureXPercent  Left smile corner X position (% of viewWidth). Default 20.
 * @param rightCommissureXPercent Right smile corner X position (% of viewWidth). Default 80.
 */
export function buildCalibrationFromGuides(
  midlineXPercent: number,
  smileArcYPercent: number,
  viewWidth: number,
  viewHeight: number,
  archScanWidth?: number,
  archScanDepth?: number,
  leftCommissureXPercent: number = 20,
  rightCommissureXPercent: number = 80
): AlignmentCalibration {
  const midlineX = (midlineXPercent / 100) * viewWidth;
  const incisalY = (smileArcYPercent / 100) * viewHeight;

  // If we have a real arch scan, derive the half-width from it
  const archHalfWidth = archScanWidth ? archScanWidth / 2 : DEFAULT_CALIBRATION.archHalfWidth;

  // If we have a real arch scan depth, derive archDepth from it
  const archDepth = archScanDepth
    ? Math.max(8, Math.min(25, archScanDepth * 0.5))
    : DEFAULT_CALIBRATION.archDepth;

  // Scale: px per mm, derived from commissure guide positions.
  // The distance between commissure guides represents the visible smile zone
  // which corresponds to the full arch width (archHalfWidth × 2).
  const commissureDistancePx =
    ((rightCommissureXPercent - leftCommissureXPercent) / 100) * viewWidth;
  const smileZoneMm = archHalfWidth * 2;
  const scale = commissureDistancePx / smileZoneMm;

  return {
    midlineX,
    incisalY,
    scale,
    archDepth,
    archHalfWidth,
    cameraDistance: DEFAULT_CALIBRATION.cameraDistance
  };
}
