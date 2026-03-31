import type { AlignmentLandmark } from "../../store/useAlignmentStore";

export interface ScanOverlayTransform {
  scale: number;
  rotation: number;
  translateX: number;
  translateY: number;
  residualError: number;
  scaleValidation: "ok" | "narrow" | "wide" | "unknown";
  wasFlipCorrected: boolean;
}

export interface AdjustmentDelta {
  scaleFactor: number;
  rotation: number;
  translateX: number;
  translateY: number;
}

export function computeScanOverlayTransform(
  landmarks: AlignmentLandmark[],
  viewWidth: number,
  viewHeight: number
): ScanOverlayTransform | null {
  const pairs = landmarks.filter(
    (l) => l.photoCoord !== null && l.modelCoord !== null
  );
  if (pairs.length < 2) return null;

  const N = pairs.length;
  const P = pairs.map(p => ({ x: p.modelCoord!.x, y: p.modelCoord!.y }));
  const Q = pairs.map(p => ({ x: p.photoCoord!.x * viewWidth, y: p.photoCoord!.y * viewHeight }));

  // 1. Calculate centroids
  let cxP = 0, cyP = 0, cxQ = 0, cyQ = 0;
  for (let i = 0; i < N; i++) {
    cxP += P[i].x; cyP += P[i].y;
    cxQ += Q[i].x; cyQ += Q[i].y;
  }
  cxP /= N; cyP /= N; cxQ /= N; cyQ /= N;

  // 2. Center points and accumulate sum products
  let Sxx = 0, Syy = 0, Sxy = 0, Syx = 0;
  let varP = 0;
  for (let i = 0; i < N; i++) {
    const px = P[i].x - cxP;
    const py = P[i].y - cyP;
    const qx = Q[i].x - cxQ;
    const qy = Q[i].y - cyQ;

    Sxx += px * qx;
    Syy += py * qy;
    Sxy += px * qy;
    Syx += py * qx;

    varP += px * px + py * py;
  }

  // Guard against all identical scan points (var = 0)
  if (varP === 0) return null;

  // 3. Solve optimal rotation angle
  // atan2(b, a) gives standard similarity theta. Since procrustesProject uses
  // rotation mapping with -R natively, we just negate it for consistent parity.
  const theta = Math.atan2(Sxy - Syx, Sxx + Syy);
  const rotation = -theta;

  // 4. Solve scale (s = Cov / Var)
  const covPQ = Math.sqrt(Math.pow(Sxx + Syy, 2) + Math.pow(Sxy - Syx, 2));
  const scale = covPQ / varP;

  // 5. Solve translation (T = Qc - s * R(theta) * Pc)
  const rotatedCx = scale * (Math.cos(theta) * cxP - Math.sin(theta) * cyP);
  const rotatedCy = scale * (Math.sin(theta) * cxP + Math.cos(theta) * cyP);
  const translateX = cxQ - rotatedCx;
  const translateY = cyQ - rotatedCy;

  // 6. Calculate RMS residual error
  let residualErrorSq = 0;
  for (let i = 0; i < N; i++) {
    // Forward project using standard R(theta) rules
    const x = scale * (Math.cos(theta) * P[i].x - Math.sin(theta) * P[i].y) + translateX;
    const y = scale * (Math.sin(theta) * P[i].x + Math.cos(theta) * P[i].y) + translateY;
    const dx = x - Q[i].x;
    const dy = y - Q[i].y;
    residualErrorSq += dx * dx + dy * dy;
  }
  const residualError = Math.sqrt(residualErrorSq / N);

  return {
    scale,
    rotation,
    translateX,
    translateY,
    residualError,
    scaleValidation: "ok",
    wasFlipCorrected: false, // Could compute cross-product signature to detect flip
  };
}

export function applyAdjustmentDelta(
  base: ScanOverlayTransform,
  delta: AdjustmentDelta
): ScanOverlayTransform {
  return {
    ...base,
    scale: base.scale * delta.scaleFactor,
    rotation: base.rotation + delta.rotation,
    translateX: base.translateX + delta.translateX,
    translateY: base.translateY + delta.translateY,
  };
}

export function toSvgTransform(t: ScanOverlayTransform): string {
  const cosR = Math.cos(t.rotation);
  const sinR = Math.sin(t.rotation);
  const a = t.scale * cosR;
  const b = t.scale * sinR;
  const c = -t.scale * sinR;
  const d = t.scale * cosR;
  return `matrix(${a.toFixed(6)},${b.toFixed(6)},${c.toFixed(6)},${d.toFixed(6)},${t.translateX.toFixed(3)},${t.translateY.toFixed(3)})`;
}

export function procrustesProject(
  archX: number,
  archY: number,
  t: ScanOverlayTransform,
  midlineStlX: number,
  midlineStlY: number
): { x: number; y: number } {
  const stlX = midlineStlX + archX;
  const stlY = midlineStlY + archY;
  const cosR = Math.cos(t.rotation);
  const sinR = Math.sin(t.rotation);

  return {
    x: t.scale * (cosR * stlX + sinR * stlY) + t.translateX,
    y: t.scale * (-sinR * stlX + cosR * stlY) + t.translateY,
  };
}

export function assessOverlayFitQuality(residualError: number): {
  tone: "good" | "warning" | "danger";
  label: string;
  guidance: string;
} {
  if (residualError <= 3) {
    return {
      tone: "good",
      label: "Fit quality: Trusted",
      guidance: "Overlay alignment is tight — proceed to design.",
    };
  }
  if (residualError <= 8) {
    return {
      tone: "warning",
      label: "Fit quality: Review",
      guidance: "Useful alignment, but fine-tune or add more landmarks.",
    };
  }
  return {
    tone: "danger",
    label: "Fit quality: Weak",
    guidance: "Landmark placement needs correction before trusting the overlay.",
  };
}

export function normalizeScanOrientation(landmarks: AlignmentLandmark[]): {
  normalized: AlignmentLandmark[];
  wasFlipCorrected: boolean;
} {
  return { normalized: landmarks, wasFlipCorrected: false };
}
