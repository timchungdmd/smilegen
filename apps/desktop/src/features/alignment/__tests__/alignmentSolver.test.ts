import { describe, it, expect } from "vitest";
import { solveAlignment } from "../alignmentSolver";
import type { LandmarkCorrespondence, ProjectionParams } from "../alignmentTypes";

describe("alignmentSolver", () => {
  const defaultParams: ProjectionParams = {
    fov: 45,
    imageWidth: 1000,
    imageHeight: 750,
    principalPoint: { x: 0.5, y: 0.5 },
  };

  it("returns identity transform for perfect alignment", () => {
    const correspondences: LandmarkCorrespondence[] = [
      {
        id: "midline",
        anatomicId: "midline",
        photoPoint: { x: 0.5, y: 0.5 },
        modelPoint: { x: 0, y: 0, z: 0 },
        weight: 6,
      },
      {
        id: "right-central",
        anatomicId: "right-central-incisor",
        photoPoint: { x: 0.536, y: 0.5 },
        modelPoint: { x: -4, y: 0, z: 0 },
        weight: 4,
      },
      {
        id: "left-central",
        anatomicId: "left-central-incisor",
        photoPoint: { x: 0.464, y: 0.5 },
        modelPoint: { x: 4, y: 0, z: 0 },
        weight: 4,
      },
    ];

    const result = solveAlignment(correspondences, defaultParams);

    expect(result.transform.scale).toBeCloseTo(1, 1);
    expect(result.quality).toMatch(/excellent|good/);
  });

  it("computes scale for larger arch", () => {
    const correspondences: LandmarkCorrespondence[] = [
      {
        id: "right-central",
        anatomicId: "right-central-incisor",
        photoPoint: { x: 0.62, y: 0.5 },
        modelPoint: { x: -4, y: 0, z: 0 },
        weight: 4,
      },
      {
        id: "left-central",
        anatomicId: "left-central-incisor",
        photoPoint: { x: 0.38, y: 0.5 },
        modelPoint: { x: 4, y: 0, z: 0 },
        weight: 4,
      },
      {
        id: "midline",
        anatomicId: "midline",
        photoPoint: { x: 0.5, y: 0.5 },
        modelPoint: { x: 0, y: 0, z: 0 },
        weight: 6,
      },
    ];

    const result = solveAlignment(correspondences, defaultParams);

    expect(result.transform.scale).toBeGreaterThan(0.5);
    expect(result.meanErrorPx).toBeLessThan(50);
  });

  it("requires minimum 3 correspondences", () => {
    const correspondences: LandmarkCorrespondence[] = [
      {
        id: "midline",
        anatomicId: "midline",
        photoPoint: { x: 0.5, y: 0.6 },
        modelPoint: { x: 0, y: 0, z: 0 },
        weight: 6,
      },
    ];

    expect(() => solveAlignment(correspondences, defaultParams)).toThrow(
      "Minimum 3 correspondences required"
    );
  });
});
