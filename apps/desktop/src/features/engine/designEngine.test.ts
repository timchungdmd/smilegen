import { createDefaultSmilePlan } from "../smile-plan/smilePlanStore";
import {
  generateSmileDesign,
  updateVariantToothDimensions,
  updateVariantToothPlacement,
  createTriangleStl
} from "./designEngine";

test("generates three design variants with previewTriangles for export", () => {
  const plan = createDefaultSmilePlan();
  const result = generateSmileDesign(plan);

  expect(result.variants).toHaveLength(3);
  expect(result.variants[0].teeth).toHaveLength(plan.selectedTeeth.length);
  // Each tooth must have geometry triangles for preview and export
  expect(result.variants[0].teeth[0].previewTriangles.length).toBeGreaterThan(0);
  // STL can be generated on-demand from the stored triangles
  const allTriangles = result.variants[0].teeth.flatMap((t) => t.previewTriangles);
  expect(createTriangleStl("smilegen", allTriangles).startsWith("solid smilegen")).toBe(true);
  expect(result.variants[1].teeth[0].facialVolume).toBeGreaterThan(
    result.variants[0].teeth[0].facialVolume
  );
});

test("uses uploaded tooth model dimensions when provided", () => {
  const plan = createDefaultSmilePlan();
  const result = generateSmileDesign(plan, {
    toothLibrary: {
      "8": {
        name: "8.stl",
        vertexCount: 12,
        triangles: [
          {
            a: { x: 0, y: 0, z: 0 },
            b: { x: 12, y: 0, z: 0 },
            c: { x: 0, y: 4, z: 9 }
          }
        ],
        bounds: {
          minX: 0,
          maxX: 12,
          minY: 0,
          maxY: 4,
          minZ: 0,
          maxZ: 9,
          width: 12,
          depth: 4,
          height: 9
        }
      }
    }
  });

  const central = result.variants[1].teeth.find((tooth) => tooth.toothId === "8");
  expect(central?.width).toBe(12);
  // The uploaded mesh has exactly 1 triangle; that triangle should be present in previewTriangles
  expect(central?.previewTriangles).toHaveLength(1);
});

test("updates one tooth inside a variant and rebuilds its geometry", () => {
  const plan = createDefaultSmilePlan();
  const result = generateSmileDesign(plan);
  const originalTooth = result.variants[1].teeth.find((tooth) => tooth.toothId === "8");
  const updatedVariant = updateVariantToothDimensions(result.variants[1], "8", {
    width: 9.9
  });
  const updatedTooth = updatedVariant.teeth.find((tooth) => tooth.toothId === "8");

  expect(originalTooth?.width).toBe(8.7);
  expect(updatedTooth?.width).toBe(9.9);
  // previewTriangles must be a new array (rebuilt geometry)
  expect(updatedTooth?.previewTriangles).not.toBe(originalTooth?.previewTriangles);
  // STL can be generated on-demand from the updated triangles
  const allTriangles = updatedVariant.teeth.flatMap((t) => t.previewTriangles);
  expect(createTriangleStl("smilegen", allTriangles).startsWith("solid smilegen")).toBe(true);
});

test("moves one tooth inside a variant and rebuilds its positioned geometry", () => {
  const plan = createDefaultSmilePlan();
  const result = generateSmileDesign(plan);
  const originalTooth = result.variants[1].teeth.find((tooth) => tooth.toothId === "8");
  const updatedVariant = updateVariantToothPlacement(result.variants[1], "8", {
    deltaX: 4,
    deltaY: -1.5
  });
  const updatedTooth = updatedVariant.teeth.find((tooth) => tooth.toothId === "8");

  expect(updatedTooth?.positionX).toBeCloseTo((originalTooth?.positionX ?? 0) + 4, 3);
  expect(updatedTooth?.positionY).toBeCloseTo((originalTooth?.positionY ?? 0) - 1.5, 3);
  // previewTriangles must be a new array reflecting the new position
  expect(updatedTooth?.previewTriangles).not.toBe(originalTooth?.previewTriangles);
});
