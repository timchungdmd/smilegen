import { computeSmileMetrics } from "./smileMetrics";

/**
 * Helper: build a set of teeth with ideal golden-proportion widths.
 * Central = 8.7mm, Lateral = 8.7 * 0.618 ≈ 5.377, Canine = 5.377 * 0.618 ≈ 3.323
 * Height: central 10.8mm gives W/H ≈ 0.806 (close to ideal 0.75–0.80).
 */
function idealTeeth() {
  const centralW = 8.7;
  const lateralW = centralW * 0.618;
  const canineW = lateralW * 0.618;
  const centralH = centralW / 0.775; // ≈ 11.226, giving ratio ≈ 0.775
  const lateralH = 9.8;
  const canineH = 10.4;

  return [
    { toothId: "8", width: centralW, height: centralH, positionX: -4.35 },
    { toothId: "9", width: centralW, height: centralH, positionX: 4.35 },
    { toothId: "7", width: lateralW, height: lateralH, positionX: -10 },
    { toothId: "10", width: lateralW, height: lateralH, positionX: 10 },
    { toothId: "6", width: canineW, height: canineH, positionX: -16 },
    { toothId: "11", width: canineW, height: canineH, positionX: 16 }
  ];
}

test("ideal proportions produce a high overall score", () => {
  const metrics = computeSmileMetrics(idealTeeth());

  expect(metrics.centralToLateralRatio).toBeCloseTo(0.618, 2);
  expect(metrics.lateralToCanineRatio).toBeCloseTo(0.618, 2);
  expect(metrics.widthToHeightRatio).toBeCloseTo(0.775, 2);
  expect(metrics.symmetryScore).toBeCloseTo(1.0, 2);
  expect(metrics.goldenProportionScore).toBeGreaterThan(0.9);
  expect(metrics.overallScore).toBeGreaterThanOrEqual(85);
  expect(metrics.recommendations).toHaveLength(0);
});

test("asymmetric teeth produce a lower symmetry score", () => {
  const teeth = idealTeeth();
  // Make the left lateral much wider than the right
  const modified = teeth.map((t) =>
    t.toothId === "10" ? { ...t, width: t.width * 1.3 } : t
  );

  const metrics = computeSmileMetrics(modified);

  expect(metrics.symmetryScore).toBeLessThan(0.95);
  expect(metrics.overallScore).toBeLessThan(
    computeSmileMetrics(idealTeeth()).overallScore
  );
});

test("poor ratios generate appropriate recommendations", () => {
  const teeth = [
    { toothId: "8", width: 8.7, height: 10.8, positionX: -4.35 },
    { toothId: "9", width: 8.7, height: 10.8, positionX: 4.35 },
    // Very narrow laterals — poor golden ratio
    { toothId: "7", width: 3.0, height: 9.8, positionX: -10 },
    { toothId: "10", width: 3.0, height: 9.8, positionX: 10 },
    // Very wide canines
    { toothId: "6", width: 7.0, height: 10.4, positionX: -16 },
    { toothId: "11", width: 7.0, height: 10.4, positionX: 16 }
  ];

  const metrics = computeSmileMetrics(teeth);

  expect(metrics.recommendations.length).toBeGreaterThan(0);
  // Lateral incisors are too narrow relative to centrals
  expect(
    metrics.recommendations.some((r) => r.toLowerCase().includes("lateral"))
  ).toBe(true);
});

test("empty or minimal teeth array does not throw", () => {
  const emptyMetrics = computeSmileMetrics([]);
  expect(emptyMetrics.overallScore).toBeGreaterThanOrEqual(0);
  expect(emptyMetrics.overallScore).toBeLessThanOrEqual(100);

  const singleTooth = computeSmileMetrics([
    { toothId: "8", width: 8.7, height: 10.8, positionX: 0 }
  ]);
  expect(singleTooth.overallScore).toBeGreaterThanOrEqual(0);
  expect(singleTooth.centralToLateralRatio).toBe(0);
});

test("width-to-height ratio is correctly computed from the central incisor", () => {
  const teeth = [
    { toothId: "8", width: 9.0, height: 12.0, positionX: -4.5 },
    { toothId: "9", width: 9.0, height: 12.0, positionX: 4.5 }
  ];

  const metrics = computeSmileMetrics(teeth);
  expect(metrics.widthToHeightRatio).toBeCloseTo(0.75, 2);
});
