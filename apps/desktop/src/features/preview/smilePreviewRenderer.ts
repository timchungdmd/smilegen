/**
 * Computes tooth fill colors and SVG gradient definitions based on
 * the selected VITA shade and per-tooth perspective projection.
 *
 * Teeth further from the camera are rendered slightly darker and
 * less saturated to reinforce the depth illusion from the arch model.
 */

import type { ShadeEntry } from "../color/shadeGuide";

export interface ToothRenderStyle {
  /** CSS color string for the body fill */
  bodyFill: string;
  /** CSS color for the incisal gradient stop */
  incisalFill: string;
  /** CSS color for the cervical gradient stop */
  cervicalFill: string;
  /** Subtle edge / outline color */
  strokeColor: string;
  /** Base opacity for the rendered tooth (0-1) */
  opacity: number;
  /** Unique SVG gradient ID for this tooth */
  gradientId: string;
}

/**
 * Adjust an RGB channel by a depth factor.
 * Teeth further away (lower scale) get slightly darker and
 * desaturated toward a neutral midpoint.
 */
function depthAdjust(value: number, depthFactor: number): number {
  // Blend toward a neutral gray (160) as depth increases
  const neutral = 160;
  const adjusted = value * depthFactor + neutral * (1 - depthFactor);
  return Math.round(Math.min(255, Math.max(0, adjusted)));
}

function toRgb(
  color: { r: number; g: number; b: number },
  depthFactor: number
): string {
  return `rgb(${depthAdjust(color.r, depthFactor)}, ${depthAdjust(color.g, depthFactor)}, ${depthAdjust(color.b, depthFactor)})`;
}

/**
 * Compute the render style for a single tooth.
 *
 * @param toothId   - Universal tooth number (used for gradient ID uniqueness)
 * @param shade     - The selected VITA shade entry
 * @param projected - Perspective-projected data: scale (0-1) and depthZ (negative mm)
 */
export function computeToothStyle(
  toothId: string,
  shade: ShadeEntry,
  projected: { scale: number; depthZ: number }
): ToothRenderStyle {
  // Depth factor: 1.0 at apex (closest), diminishing as teeth recede.
  // We map the scale (which is ~0.88 to 1.0 for typical arches) into
  // a 0.85–1.0 depth factor range so the adjustment is subtle.
  const depthFactor = 0.85 + 0.15 * Math.min(1, Math.max(0, projected.scale));

  const bodyFill = toRgb(shade.bodyColor, depthFactor);
  const incisalFill = toRgb(shade.incisalColor, depthFactor);
  const cervicalFill = toRgb(shade.cervicalColor, depthFactor);

  // Stroke is a slightly darker version of the body color
  const strokeR = depthAdjust(shade.bodyColor.r, depthFactor * 0.7);
  const strokeG = depthAdjust(shade.bodyColor.g, depthFactor * 0.7);
  const strokeB = depthAdjust(shade.bodyColor.b, depthFactor * 0.7);
  const strokeColor = `rgb(${strokeR}, ${strokeG}, ${strokeB})`;

  // Opacity: closer teeth are more opaque, further teeth fade slightly
  const opacity = shade.translucency * (0.7 + 0.3 * projected.scale);

  const gradientId = `tooth-grad-${toothId}`;

  return {
    bodyFill,
    incisalFill,
    cervicalFill,
    strokeColor,
    opacity,
    gradientId
  };
}
