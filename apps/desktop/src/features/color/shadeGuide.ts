/**
 * VITA Classical shade guide for dental restorations.
 *
 * Each shade entry defines body, incisal, and cervical RGB colors
 * that approximate the layered translucency of natural dentition.
 * The A group (reddish-brown) is most commonly selected; B1 and A1
 * are the lightest clinical shades.
 */

export interface ShadeEntry {
  /** Shade identifier, e.g. "A1", "B2", "A3.5" */
  id: string;
  /** VITA group letter */
  group: "A" | "B" | "C" | "D";
  /** Human-readable name */
  name: string;
  /** Base RGB for the body (middle third) of the tooth */
  bodyColor: { r: number; g: number; b: number };
  /** RGB for the incisal third (more translucent / blue-gray) */
  incisalColor: { r: number; g: number; b: number };
  /** RGB for the cervical third (warmer / darker) */
  cervicalColor: { r: number; g: number; b: number };
  /** Opacity for translucency simulation, 0-1 */
  translucency: number;
}

/**
 * Complete VITA Classical shade guide (16 shades).
 *
 * RGB values are approximations of the clinical shade tabs under
 * D65 illuminant, calibrated to dental photography references.
 */
export const VITA_CLASSICAL_SHADES: ShadeEntry[] = [
  // ── A group: reddish-brown ──
  {
    id: "A1",
    group: "A",
    name: "A1 - Light Reddish Brown",
    bodyColor: { r: 235, g: 224, b: 200 },
    incisalColor: { r: 220, g: 218, b: 210 },
    cervicalColor: { r: 220, g: 200, b: 170 },
    translucency: 0.82
  },
  {
    id: "A2",
    group: "A",
    name: "A2 - Reddish Brown",
    bodyColor: { r: 228, g: 215, b: 185 },
    incisalColor: { r: 214, g: 212, b: 204 },
    cervicalColor: { r: 212, g: 190, b: 156 },
    translucency: 0.78
  },
  {
    id: "A3",
    group: "A",
    name: "A3 - Medium Reddish Brown",
    bodyColor: { r: 218, g: 204, b: 170 },
    incisalColor: { r: 206, g: 204, b: 196 },
    cervicalColor: { r: 200, g: 176, b: 140 },
    translucency: 0.74
  },
  {
    id: "A3.5",
    group: "A",
    name: "A3.5 - Dark Reddish Brown",
    bodyColor: { r: 210, g: 194, b: 158 },
    incisalColor: { r: 200, g: 198, b: 190 },
    cervicalColor: { r: 192, g: 166, b: 128 },
    translucency: 0.70
  },
  {
    id: "A4",
    group: "A",
    name: "A4 - Darkest Reddish Brown",
    bodyColor: { r: 198, g: 180, b: 142 },
    incisalColor: { r: 190, g: 188, b: 180 },
    cervicalColor: { r: 180, g: 152, b: 112 },
    translucency: 0.66
  },

  // ── B group: reddish-yellow ──
  {
    id: "B1",
    group: "B",
    name: "B1 - Light Reddish Yellow",
    bodyColor: { r: 230, g: 222, b: 195 },
    incisalColor: { r: 218, g: 216, b: 208 },
    cervicalColor: { r: 215, g: 200, b: 165 },
    translucency: 0.84
  },
  {
    id: "B2",
    group: "B",
    name: "B2 - Reddish Yellow",
    bodyColor: { r: 224, g: 214, b: 182 },
    incisalColor: { r: 212, g: 210, b: 202 },
    cervicalColor: { r: 208, g: 190, b: 152 },
    translucency: 0.78
  },
  {
    id: "B3",
    group: "B",
    name: "B3 - Medium Reddish Yellow",
    bodyColor: { r: 214, g: 202, b: 168 },
    incisalColor: { r: 204, g: 202, b: 194 },
    cervicalColor: { r: 196, g: 176, b: 138 },
    translucency: 0.72
  },
  {
    id: "B4",
    group: "B",
    name: "B4 - Dark Reddish Yellow",
    bodyColor: { r: 202, g: 188, b: 150 },
    incisalColor: { r: 194, g: 192, b: 184 },
    cervicalColor: { r: 184, g: 162, b: 122 },
    translucency: 0.66
  },

  // ── C group: gray ──
  {
    id: "C1",
    group: "C",
    name: "C1 - Light Gray",
    bodyColor: { r: 222, g: 218, b: 200 },
    incisalColor: { r: 210, g: 210, b: 206 },
    cervicalColor: { r: 206, g: 198, b: 172 },
    translucency: 0.80
  },
  {
    id: "C2",
    group: "C",
    name: "C2 - Gray",
    bodyColor: { r: 212, g: 208, b: 186 },
    incisalColor: { r: 202, g: 202, b: 198 },
    cervicalColor: { r: 196, g: 186, b: 158 },
    translucency: 0.74
  },
  {
    id: "C3",
    group: "C",
    name: "C3 - Medium Gray",
    bodyColor: { r: 200, g: 196, b: 172 },
    incisalColor: { r: 192, g: 192, b: 188 },
    cervicalColor: { r: 184, g: 174, b: 144 },
    translucency: 0.68
  },
  {
    id: "C4",
    group: "C",
    name: "C4 - Dark Gray",
    bodyColor: { r: 188, g: 182, b: 156 },
    incisalColor: { r: 182, g: 182, b: 178 },
    cervicalColor: { r: 170, g: 158, b: 128 },
    translucency: 0.62
  },

  // ── D group: reddish-gray ──
  {
    id: "D2",
    group: "D",
    name: "D2 - Reddish Gray",
    bodyColor: { r: 216, g: 208, b: 184 },
    incisalColor: { r: 206, g: 206, b: 200 },
    cervicalColor: { r: 200, g: 186, b: 154 },
    translucency: 0.76
  },
  {
    id: "D3",
    group: "D",
    name: "D3 - Medium Reddish Gray",
    bodyColor: { r: 206, g: 196, b: 170 },
    incisalColor: { r: 198, g: 198, b: 192 },
    cervicalColor: { r: 190, g: 172, b: 140 },
    translucency: 0.70
  },
  {
    id: "D4",
    group: "D",
    name: "D4 - Dark Reddish Gray",
    bodyColor: { r: 194, g: 182, b: 154 },
    incisalColor: { r: 188, g: 188, b: 182 },
    cervicalColor: { r: 176, g: 156, b: 124 },
    translucency: 0.64
  }
];

/** Default shade used when no selection has been made. */
export const DEFAULT_SHADE = "A2";

/** Look up a shade entry by its id (e.g. "A1", "B2"). */
export function getShadeById(id: string): ShadeEntry | undefined {
  return VITA_CLASSICAL_SHADES.find((s) => s.id === id);
}
