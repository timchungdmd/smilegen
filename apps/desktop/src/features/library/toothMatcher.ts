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

function computeDimensionalScore(
  criteria: ToothMatchCriteria,
  entry: ToothLibraryEntry
): number {
  const dw = (criteria.targetWidth - entry.dimensions.width) / criteria.targetWidth;
  const dh = (criteria.targetHeight - entry.dimensions.height) / criteria.targetHeight;
  const dd = (criteria.targetDepth - entry.dimensions.depth) / criteria.targetDepth;

  const distance = Math.sqrt(
    WEIGHT_WIDTH * dw * dw +
    WEIGHT_HEIGHT * dh * dh +
    WEIGHT_DEPTH * dd * dd
  );

  return Math.max(0, 1 - distance);
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

export function findBestCollection(
  targetDimensions: Record<string, { width: number; height: number }>,
  collections: ToothLibraryCollection[]
): ToothLibraryCollection {
  if (collections.length === 0) {
    throw new Error("No collections provided");
  }

  let bestCollection = collections[0];
  let bestScore = -1;

  for (const collection of collections) {
    let totalScore = 0;
    let matchCount = 0;

    for (const [toothNumber, target] of Object.entries(targetDimensions)) {
      const entry = collection.entries[toothNumber];

      if (!entry) {
        continue;
      }

      const criteria: ToothMatchCriteria = {
        toothNumber,
        targetWidth: target.width,
        targetHeight: target.height,
        targetDepth: entry.dimensions.depth
      };

      totalScore += computeDimensionalScore(criteria, entry);
      matchCount += 1;
    }

    const averageScore = matchCount > 0 ? totalScore / matchCount : 0;

    if (averageScore > bestScore) {
      bestScore = averageScore;
      bestCollection = collection;
    }
  }

  return bestCollection;
}
