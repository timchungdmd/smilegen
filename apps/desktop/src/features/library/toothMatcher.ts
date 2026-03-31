import type {
  ToothLibraryCollection,
  ToothLibraryEntry,
  ToothMatchCriteria,
  ToothMatchResult
} from "./toothLibraryTypes";

const WEIGHT_WIDTH = 0.4;
const WEIGHT_HEIGHT = 0.35;
const WEIGHT_DEPTH = 0.25;

const DISTORTION_PENALTY = 0.5;
const MORPHOLOGY_BOOST = 1.2;

/**
 * Biometric tolerance bands (10%, 20%, 30% deviance).
 * Matches within tighter bands receive higher scores.
 */
const TOLERANCE_PLATINUM = 0.10;
const TOLERANCE_GOLD = 0.20;
const TOLERANCE_SILVER = 0.30;

function computeDimensionalScore(
  criteria: ToothMatchCriteria,
  entry: ToothLibraryEntry
): number {
  const dw = Math.abs(criteria.targetWidth - entry.dimensions.width) / criteria.targetWidth;
  const dh = Math.abs(criteria.targetHeight - entry.dimensions.height) / criteria.targetHeight;
  const dd = Math.abs(criteria.targetDepth - entry.dimensions.depth) / criteria.targetDepth;

  // Root mean square distance
  const distance = Math.sqrt(
    WEIGHT_WIDTH * dw * dw +
    WEIGHT_HEIGHT * dh * dh +
    WEIGHT_DEPTH * dd * dd
  );

  let score = Math.max(0, 1 - distance);

  // Apply biometric tolerance band weighting
  if (distance <= TOLERANCE_PLATINUM) {
    score *= 1.1; // Platinum bonus
  } else if (distance > TOLERANCE_SILVER) {
    score *= 0.7; // Rapid fall-off outside 30% deviance
  }

  return Math.min(1, score);
}

function computeScaleFactor(
  criteria: ToothMatchCriteria,
  entry: ToothLibraryEntry
): ToothMatchResult["scaleFactor"] {
  return {
    width: entry.dimensions.width === 0 ? 1 : criteria.targetWidth / entry.dimensions.width,
    height: entry.dimensions.height === 0 ? 1 : criteria.targetHeight / entry.dimensions.height,
    depth: entry.dimensions.depth === 0 ? 1 : criteria.targetDepth / entry.dimensions.depth
  };
}

function computeDistortion(scaleFactor: ToothMatchResult["scaleFactor"]): number {
  return Math.max(
    Math.abs(scaleFactor.width - 1),
    Math.abs(scaleFactor.height - 1),
    Math.abs(scaleFactor.depth - 1)
  );
}

export function findBestMatches(
  criteria: ToothMatchCriteria,
  collections: ToothLibraryCollection[],
  topN: number = 3
): ToothMatchResult[] {
  const candidates: ToothMatchResult[] = [];

  for (const collection of collections) {
    const entry = collection.entries[criteria.toothNumber];

    if (!entry) {
      continue;
    }

    let score = computeDimensionalScore(criteria, entry);
    const scaleFactor = computeScaleFactor(criteria, entry);
    const distortion = computeDistortion(scaleFactor);

    score *= (1 - distortion * DISTORTION_PENALTY);

    if (
      criteria.morphologyPreference &&
      entry.morphologyTag === criteria.morphologyPreference
    ) {
      score *= MORPHOLOGY_BOOST;
    }

    score = Math.min(1, Math.max(0, score));

    candidates.push({ entry, score, scaleFactor, distortion });
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, topN);
}

/**
 * Searches for the best-fit collection given target dimensions and 
 * optional restorative space constraints.
 * 
 * @param targetDimensions Measured ideal dimensions per tooth.
 * @param collections Available biometric libraries.
 * @param restorativeSpace Optional constraints (max width/height available in the arch).
 */
export function findBestCollection(
  targetDimensions: Record<string, { width: number; height: number; depth?: number }>,
  collections: ToothLibraryCollection[],
  restorativeSpace?: Record<string, { maxWidth: number; maxHeight: number }>
): ToothLibraryCollection {
  if (collections.length === 0) {
    throw new Error("No collections provided");
  }

  // Use the first collection's first entry's depth as reference if no depth is provided
  // This ensures consistent depth comparison across collections
  const referenceDepth = Object.values(collections[0].entries)[0]?.dimensions.depth ?? 7;

  let bestCollection = collections[0];
  let bestScore = -Infinity;  // Start at -Infinity to ensure first collection is always considered

  for (const collection of collections) {
    let totalScore = 0;
    let matchCount = 0;

    for (const [toothNumber, target] of Object.entries(targetDimensions)) {
      const entry = collection.entries[toothNumber];

      if (!entry) {
        continue;
      }

      // Check restorative space constraint
      if (restorativeSpace?.[toothNumber]) {
        if (entry.dimensions.width > restorativeSpace[toothNumber].maxWidth) {
          totalScore -= 0.5; // Penalty for exceeding space
        }
      }

      const criteria: ToothMatchCriteria = {
        toothNumber,
        targetWidth: target.width,
        targetHeight: target.height,
        // Use provided depth, or fallback to reference depth (not entry's own depth)
        // This ensures all collections are scored against the same target depth
        targetDepth: target.depth ?? referenceDepth
      };

      const toothScore = computeDimensionalScore(criteria, entry);
      totalScore += toothScore;
      matchCount += 1;
    }

    const averageScore = matchCount > 0 ? totalScore / matchCount : 0;

    // Use > (strict) to prefer first collection when scores are equal
    if (averageScore > bestScore) {
      bestScore = averageScore;
      bestCollection = collection;
    }
  }

  return bestCollection;
}
