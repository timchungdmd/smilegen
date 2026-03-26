import { describe, it, expect } from "vitest";
import { project3Dto2D, createProjectionMatrix } from "../projection";

describe("projection", () => {
  describe("createProjectionMatrix", () => {
    it("creates perspective projection matrix for FOV 45", () => {
      const matrix = createProjectionMatrix({
        fov: 45,
        imageWidth: 1000,
        imageHeight: 750,
        principalPoint: { x: 0.5, y: 0.5 },
      });
      expect(matrix[0]).toBeCloseTo(2.414, 2);
      expect(matrix[5]).toBeCloseTo(3.219, 2);
    });
  });

  describe("project3Dto2D", () => {
    it("projects origin to center of image", () => {
      const params = {
        fov: 45,
        imageWidth: 1000,
        imageHeight: 750,
        principalPoint: { x: 0.5, y: 0.5 },
      };
      const cameraPos = { x: 0, y: 0, z: -300 };
      const target = { x: 0, y: 0, z: 0 };
      const result = project3Dto2D(
        { x: 0, y: 0, z: 0 },
        cameraPos,
        target,
        { x: 0, y: 1, z: 0 },
        params
      );
      expect(result.x).toBeCloseTo(0.5, 3);
      expect(result.y).toBeCloseTo(0.5, 3);
    });

    it("projects point at (10, 5, 0) to offset position", () => {
      const params = {
        fov: 45,
        imageWidth: 1000,
        imageHeight: 750,
        principalPoint: { x: 0.5, y: 0.5 },
      };
      const cameraPos = { x: 0, y: 0, z: -300 };
      const target = { x: 0, y: 0, z: 0 };
      const result = project3Dto2D(
        { x: 10, y: 5, z: 0 },
        cameraPos,
        target,
        { x: 0, y: 1, z: 0 },
        params
      );
      expect(result.x).toBeLessThan(0.5);
      expect(result.y).toBeLessThan(0.5);
    });
  });
});
