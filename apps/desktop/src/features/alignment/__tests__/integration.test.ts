import { describe, it, expect } from "vitest";
import { solveAlignment } from "../alignmentSolver";
import { project3Dto2D, applyTransform } from "../projection";
import type { LandmarkCorrespondence, ProjectionParams } from "../alignmentTypes";

describe("alignment integration", () => {
  const defaultParams: ProjectionParams = {
    fov: 45,
    imageWidth: 1000,
    imageHeight: 750,
    principalPoint: { x: 0.5, y: 0.5 },
  };

  it("solves and projects consistently", () => {
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
      {
        id: "right-canine",
        anatomicId: "right-canine",
        photoPoint: { x: 0.584, y: 0.5 },
        modelPoint: { x: -14, y: 0, z: 0 },
        weight: 3,
      },
      {
        id: "left-canine",
        anatomicId: "left-canine",
        photoPoint: { x: 0.416, y: 0.5 },
        modelPoint: { x: 14, y: 0, z: 0 },
        weight: 3,
      },
    ];

    const result = solveAlignment(correspondences, defaultParams);

    expect(result.quality).toMatch(/excellent|good|acceptable|poor/);

    for (const c of correspondences) {
      const error = result.landmarkErrors.get(c.id) || 0;
      expect(error).toBeLessThan(20);
    }
  });

  it("handles scale adjustment for different arch sizes", () => {
    const wideArchCorrespondences: LandmarkCorrespondence[] = [
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

    const result = solveAlignment(wideArchCorrespondences, defaultParams);

    expect(result.transform.scale).toBeGreaterThan(0.5);
    expect(result.meanErrorPx).toBeLessThan(50);
  });

  it("maintains quality with minimal landmarks", () => {
    const minimalCorrespondences: LandmarkCorrespondence[] = [
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
        photoPoint: { x: 0.45, y: 0.5 },
        modelPoint: { x: -4, y: 0, z: 0 },
        weight: 4,
      },
      {
        id: "left-central",
        anatomicId: "left-central-incisor",
        photoPoint: { x: 0.55, y: 0.5 },
        modelPoint: { x: 4, y: 0, z: 0 },
        weight: 4,
      },
    ];

    const result = solveAlignment(minimalCorrespondences, defaultParams);

    expect(result.transform.scale).toBeGreaterThan(0.5);
    expect(result.transform.scale).toBeLessThan(1.5);
    expect(result.quality).toMatch(/excellent|good|acceptable/);
  });

  it("projection produces valid normalized coordinates", () => {
    const point = { x: 10, y: 5, z: -2 };
    const cameraPos = { x: 0, y: -50, z: -200 };
    const target = { x: 0, y: 0, z: 0 };

    const projected = project3Dto2D(
      point,
      cameraPos,
      target,
      { x: 0, y: 1, z: 0 },
      defaultParams
    );

    expect(projected.x).toBeGreaterThanOrEqual(0);
    expect(projected.x).toBeLessThanOrEqual(1);
    expect(projected.y).toBeGreaterThanOrEqual(0);
    expect(projected.y).toBeLessThanOrEqual(1);
    expect(typeof projected.depth).toBe("number");
  });
});
