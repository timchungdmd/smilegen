/**
 * Smile design metrics computed from generated tooth dimensions.
 *
 * Evaluates how closely a smile design follows the golden proportion
 * and standard esthetic guidelines:
 *   - Central-to-lateral width ratio (ideal ≈ 0.618)
 *   - Lateral-to-canine width ratio (ideal ≈ 0.618)
 *   - Central incisor width-to-height ratio (ideal 0.75–0.80)
 *   - Left/right symmetry
 */

export interface SmileMetrics {
  /** Width ratio of lateral to central incisor — ideal ≈ 0.618 */
  centralToLateralRatio: number;
  /** Width ratio of canine to lateral incisor — ideal ≈ 0.618 */
  lateralToCanineRatio: number;
  /** Width / height of the central incisor — ideal 0.75–0.80 */
  widthToHeightRatio: number;
  /** Symmetry score 0–1 (1 = perfectly symmetric) */
  symmetryScore: number;
  /** Golden proportion adherence score 0–1 */
  goldenProportionScore: number;
  /** Composite score 0–100 */
  overallScore: number;
  /** Textual suggestions for improvement */
  recommendations: string[];
}

interface ToothInput {
  toothId: string;
  width: number;
  height: number;
  positionX: number;
}

const GOLDEN_RATIO = 0.618;
const IDEAL_WH_LOW = 0.75;
const IDEAL_WH_HIGH = 0.80;
const IDEAL_WH_MID = (IDEAL_WH_LOW + IDEAL_WH_HIGH) / 2;

/** Mirror pairs: left tooth → right tooth (Universal numbering) */
const MIRROR_PAIRS: [string, string][] = [
  ["8", "9"],   // central incisors
  ["7", "10"],  // lateral incisors
  ["6", "11"],  // canines
  ["5", "12"],  // first premolars
  ["4", "13"]   // second premolars
];

function findTooth(teeth: ReadonlyArray<ToothInput>, id: string): ToothInput | undefined {
  return teeth.find((t) => t.toothId === id);
}

/**
 * Compute how far a value deviates from an ideal, returning 0–1
 * where 1 means perfect match.
 */
function ratioScore(actual: number, ideal: number): number {
  const deviation = Math.abs(actual - ideal) / ideal;
  return Math.max(0, 1 - deviation);
}

/**
 * Compute smile design metrics from the generated teeth.
 *
 * Uses Universal Numbering: 8 = right central incisor, 9 = left central,
 * 7 = right lateral, 10 = left lateral, 6 = right canine, 11 = left canine.
 */
export function computeSmileMetrics(
  teeth: ReadonlyArray<ToothInput>
): SmileMetrics {
  const recommendations: string[] = [];

  // ── Central-to-lateral ratio ──
  // Use teeth 7 & 8 (right side) as primary, fall back to 10 & 9 (left)
  const central = findTooth(teeth, "8") ?? findTooth(teeth, "9");
  const lateral = findTooth(teeth, "7") ?? findTooth(teeth, "10");
  const canine = findTooth(teeth, "6") ?? findTooth(teeth, "11");

  const centralToLateralRatio =
    central && lateral ? lateral.width / central.width : 0;

  const lateralToCanineRatio =
    lateral && canine ? canine.width / lateral.width : 0;

  // ── Width-to-height ratio (central incisor) ──
  const centralForWH = findTooth(teeth, "8") ?? findTooth(teeth, "9");
  const widthToHeightRatio =
    centralForWH && centralForWH.height > 0
      ? centralForWH.width / centralForWH.height
      : 0;

  // ── Symmetry score ──
  let symmetryTotal = 0;
  let symmetryCount = 0;
  for (const [leftId, rightId] of MIRROR_PAIRS) {
    const left = findTooth(teeth, leftId);
    const right = findTooth(teeth, rightId);
    if (left && right) {
      const maxWidth = Math.max(left.width, right.width);
      if (maxWidth > 0) {
        const widthSym = 1 - Math.abs(left.width - right.width) / maxWidth;
        symmetryTotal += widthSym;
        symmetryCount++;
      }
    }
  }
  const symmetryScore = symmetryCount > 0 ? symmetryTotal / symmetryCount : 0;

  // ── Golden proportion score ──
  const clScore = centralToLateralRatio > 0
    ? ratioScore(centralToLateralRatio, GOLDEN_RATIO)
    : 0;
  const lcScore = lateralToCanineRatio > 0
    ? ratioScore(lateralToCanineRatio, GOLDEN_RATIO)
    : 0;
  const goldenProportionScore =
    clScore > 0 && lcScore > 0
      ? (clScore + lcScore) / 2
      : clScore || lcScore;

  // ── Width-to-height score ──
  const whScore = widthToHeightRatio > 0
    ? ratioScore(widthToHeightRatio, IDEAL_WH_MID)
    : 0;

  // ── Overall score (weighted composite, 0–100) ──
  const overallScore = Math.round(
    (goldenProportionScore * 30 +
      symmetryScore * 30 +
      whScore * 25 +
      // Bonus for having enough teeth to evaluate
      (teeth.length >= 6 ? 15 : teeth.length >= 4 ? 10 : 5)) *
      100 / 100
  );

  // ── Recommendations ──
  if (centralToLateralRatio > 0 && Math.abs(centralToLateralRatio - GOLDEN_RATIO) > 0.06) {
    if (centralToLateralRatio < GOLDEN_RATIO) {
      recommendations.push("Consider widening lateral incisors to improve golden proportion.");
    } else {
      recommendations.push("Consider narrowing lateral incisors or widening central incisors.");
    }
  }

  if (lateralToCanineRatio > 0 && Math.abs(lateralToCanineRatio - GOLDEN_RATIO) > 0.06) {
    if (lateralToCanineRatio < GOLDEN_RATIO) {
      recommendations.push("Consider widening canines relative to lateral incisors.");
    } else {
      recommendations.push("Consider narrowing canines relative to lateral incisors.");
    }
  }

  if (widthToHeightRatio > 0) {
    if (widthToHeightRatio < IDEAL_WH_LOW - 0.05) {
      recommendations.push("Central incisors appear narrow — consider increasing width.");
    } else if (widthToHeightRatio > IDEAL_WH_HIGH + 0.05) {
      recommendations.push("Central incisors appear wide — consider increasing height or reducing width.");
    }
  }

  if (symmetryScore < 0.9 && symmetryCount > 0) {
    recommendations.push("Left-right symmetry can be improved — check mirrored tooth widths.");
  }

  return {
    centralToLateralRatio: round(centralToLateralRatio),
    lateralToCanineRatio: round(lateralToCanineRatio),
    widthToHeightRatio: round(widthToHeightRatio),
    symmetryScore: round(symmetryScore),
    goldenProportionScore: round(goldenProportionScore),
    overallScore: Math.min(100, Math.max(0, overallScore)),
    recommendations
  };
}

function round(value: number): number {
  return Number(value.toFixed(3));
}
