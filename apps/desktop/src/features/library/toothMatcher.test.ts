import { BUNDLED_COLLECTIONS } from "./bundledLibrary";
import { findBestMatches, findBestCollection } from "./toothMatcher";
import type { ToothMatchCriteria } from "./toothLibraryTypes";

test("findBestMatches returns up to topN results sorted by score", () => {
  const criteria: ToothMatchCriteria = {
    toothNumber: "8",
    targetWidth: 8.6,
    targetHeight: 10.8,
    targetDepth: 7.0
  };

  const results = findBestMatches(criteria, BUNDLED_COLLECTIONS, 3);

  expect(results.length).toBeGreaterThan(0);
  expect(results.length).toBeLessThanOrEqual(3);

  for (let i = 1; i < results.length; i++) {
    expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
  }
});

test("findBestMatches boosts score for matching morphology preference", () => {
  // Use dimensions that don't perfectly match any collection so the boost
  // is visible before the score is clamped to 1.
  const baseCriteria: ToothMatchCriteria = {
    toothNumber: "8",
    targetWidth: 9.5,
    targetHeight: 11.5,
    targetDepth: 7.8
  };

  const withoutPref = findBestMatches(baseCriteria, BUNDLED_COLLECTIONS, 3);
  const withOvoidPref = findBestMatches(
    { ...baseCriteria, morphologyPreference: "ovoid" },
    BUNDLED_COLLECTIONS,
    3
  );

  const ovoidWithout = withoutPref.find(
    (r) => r.entry.morphologyTag === "ovoid"
  );
  const ovoidWith = withOvoidPref.find(
    (r) => r.entry.morphologyTag === "ovoid"
  );

  expect(ovoidWith).toBeDefined();
  expect(ovoidWithout).toBeDefined();
  expect(ovoidWith!.score).toBeGreaterThan(ovoidWithout!.score);
});

test("findBestMatches computes scaleFactor as target / candidate", () => {
  const criteria: ToothMatchCriteria = {
    toothNumber: "8",
    targetWidth: 10.0,
    targetHeight: 12.0,
    targetDepth: 8.0
  };

  const results = findBestMatches(criteria, BUNDLED_COLLECTIONS, 3);

  for (const result of results) {
    const expectedWidthScale = criteria.targetWidth / result.entry.dimensions.width;
    const expectedHeightScale = criteria.targetHeight / result.entry.dimensions.height;
    const expectedDepthScale = criteria.targetDepth / result.entry.dimensions.depth;

    expect(result.scaleFactor.width).toBeCloseTo(expectedWidthScale, 5);
    expect(result.scaleFactor.height).toBeCloseTo(expectedHeightScale, 5);
    expect(result.scaleFactor.depth).toBeCloseTo(expectedDepthScale, 5);
  }
});

test("findBestMatches distortion is max absolute deviation from 1", () => {
  const criteria: ToothMatchCriteria = {
    toothNumber: "6",
    targetWidth: 9.0,
    targetHeight: 11.0,
    targetDepth: 8.0
  };

  const results = findBestMatches(criteria, BUNDLED_COLLECTIONS, 3);

  for (const result of results) {
    const expectedDistortion = Math.max(
      Math.abs(result.scaleFactor.width - 1),
      Math.abs(result.scaleFactor.height - 1),
      Math.abs(result.scaleFactor.depth - 1)
    );

    expect(result.distortion).toBeCloseTo(expectedDistortion, 5);
  }
});

test("findBestCollection picks the ovoid collection when target matches ovoid dimensions", () => {
  const ovoid = BUNDLED_COLLECTIONS.find((c) => c.morphology === "ovoid")!;
  const targetDimensions: Record<string, { width: number; height: number }> = {};

  for (const [toothNumber, entry] of Object.entries(ovoid.entries)) {
    targetDimensions[toothNumber] = {
      width: entry.dimensions.width,
      height: entry.dimensions.height
    };
  }

  const best = findBestCollection(targetDimensions, BUNDLED_COLLECTIONS);

  expect(best.id).toBe("natural-ovoid");
});

test("findBestCollection picks the square collection when target matches square dimensions", () => {
  const square = BUNDLED_COLLECTIONS.find((c) => c.morphology === "square")!;
  const targetDimensions: Record<string, { width: number; height: number }> = {};

  for (const [toothNumber, entry] of Object.entries(square.entries)) {
    targetDimensions[toothNumber] = {
      width: entry.dimensions.width,
      height: entry.dimensions.height
    };
  }

  const best = findBestCollection(targetDimensions, BUNDLED_COLLECTIONS);

  expect(best.id).toBe("natural-square");
});

test("findBestMatches returns empty array when tooth number has no entries", () => {
  const criteria: ToothMatchCriteria = {
    toothNumber: "99",
    targetWidth: 8.0,
    targetHeight: 10.0,
    targetDepth: 6.0
  };

  const results = findBestMatches(criteria, BUNDLED_COLLECTIONS);

  expect(results).toHaveLength(0);
});
