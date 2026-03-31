import { describe, expect, test } from "vitest";
import { getScanLandmarkVisualState } from "./landmarkVisuals";
import type { AlignmentLandmark } from "../../store/useAlignmentStore";

const landmark: AlignmentLandmark = {
  id: "left-central",
  label: "Left Central",
  color: "#ef4444",
  required: true,
  anatomicId: "left-central-incisor",
  photoCoord: { x: 0.4, y: 0.4 },
  modelCoord: { x: 1, y: 2, z: 3 },
};

describe("getScanLandmarkVisualState", () => {
  test("emphasizes the active landmark more strongly than passive landmarks", () => {
    const active = getScanLandmarkVisualState(landmark, "left-central");
    const passive = getScanLandmarkVisualState(landmark, "midline");

    expect(active.baseRadius).toBe(0.14);
    expect(passive.baseRadius).toBe(0.095);
    expect(active.haloRadius).toBe(0.23);
    expect(passive.haloRadius).toBe(0.15);
    expect(active.baseRadius).toBeGreaterThan(passive.baseRadius);
    expect(active.haloRadius).toBeGreaterThan(passive.haloRadius);
    expect(active.emissiveIntensity).toBeGreaterThan(passive.emissiveIntensity);
    expect(active.haloOpacity).toBeGreaterThan(passive.haloOpacity);
    expect(active.markerOpacity).toBeGreaterThan(passive.markerOpacity);
    expect(passive.markerOpacity).toBeLessThan(1);
    expect(active.showHalo).toBe(true);
    expect(passive.showHalo).toBe(true);
  });
});
