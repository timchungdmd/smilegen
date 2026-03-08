import { computeBounds, computeSurfaceArea, aabbOverlap, aabbDistance, computeVolume, scaleMesh, translateMesh } from "./meshUtils";
import type { MeshTriangle, MeshBounds } from "../import/stlParser";

function triangle(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number
): MeshTriangle {
  return {
    a: { x: ax, y: ay, z: az },
    b: { x: bx, y: by, z: bz },
    c: { x: cx, y: cy, z: cz }
  };
}

test("computeBounds returns correct extents for a single triangle", () => {
  const triangles = [triangle(0, 0, 0, 3, 0, 0, 0, 4, 5)];
  const bounds = computeBounds(triangles);

  expect(bounds.minX).toBe(0);
  expect(bounds.maxX).toBe(3);
  expect(bounds.minY).toBe(0);
  expect(bounds.maxY).toBe(4);
  expect(bounds.minZ).toBe(0);
  expect(bounds.maxZ).toBe(5);
  expect(bounds.width).toBe(3);
  expect(bounds.depth).toBe(4);
  expect(bounds.height).toBe(5);
});

test("computeBounds returns zero bounds for empty triangles", () => {
  const bounds = computeBounds([]);

  expect(bounds.width).toBe(0);
  expect(bounds.depth).toBe(0);
  expect(bounds.height).toBe(0);
});

test("computeSurfaceArea for a right triangle", () => {
  // Right triangle with legs 3 and 4 in XY plane → area = 6
  const triangles = [triangle(0, 0, 0, 3, 0, 0, 0, 4, 0)];
  const area = computeSurfaceArea(triangles);

  expect(area).toBeCloseTo(6, 5);
});

test("computeSurfaceArea sums multiple triangles", () => {
  const triangles = [
    triangle(0, 0, 0, 3, 0, 0, 0, 4, 0), // area = 6
    triangle(0, 0, 0, 2, 0, 0, 0, 2, 0)  // area = 2
  ];
  const area = computeSurfaceArea(triangles);

  expect(area).toBeCloseTo(8, 5);
});

test("aabbOverlap detects overlapping boxes", () => {
  const a: MeshBounds = { minX: 0, maxX: 2, minY: 0, maxY: 2, minZ: 0, maxZ: 2, width: 2, depth: 2, height: 2 };
  const b: MeshBounds = { minX: 1, maxX: 3, minY: 1, maxY: 3, minZ: 1, maxZ: 3, width: 2, depth: 2, height: 2 };

  expect(aabbOverlap(a, b)).toBe(true);
});

test("aabbOverlap returns false for separated boxes", () => {
  const a: MeshBounds = { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1, width: 1, depth: 1, height: 1 };
  const b: MeshBounds = { minX: 5, maxX: 6, minY: 5, maxY: 6, minZ: 5, maxZ: 6, width: 1, depth: 1, height: 1 };

  expect(aabbOverlap(a, b)).toBe(false);
});

test("aabbDistance returns positive distance for separated boxes", () => {
  const a: MeshBounds = { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1, width: 1, depth: 1, height: 1 };
  const b: MeshBounds = { minX: 4, maxX: 5, minY: 0, maxY: 1, minZ: 0, maxZ: 1, width: 1, depth: 1, height: 1 };

  // Gap of 3 in X only
  expect(aabbDistance(a, b)).toBeCloseTo(3, 5);
});

test("aabbDistance returns negative distance for overlapping boxes", () => {
  const a: MeshBounds = { minX: 0, maxX: 3, minY: 0, maxY: 3, minZ: 0, maxZ: 3, width: 3, depth: 3, height: 3 };
  const b: MeshBounds = { minX: 2, maxX: 5, minY: 2, maxY: 5, minZ: 2, maxZ: 5, width: 3, depth: 3, height: 3 };

  // Overlap of 1 on each axis, so penetration = -1
  expect(aabbDistance(a, b)).toBeLessThan(0);
  expect(aabbDistance(a, b)).toBeCloseTo(-1, 5);
});

test("computeVolume of a unit tetrahedron", () => {
  // A tetrahedron with 4 triangular faces enclosing volume 1/6
  // Vertices: (0,0,0), (1,0,0), (0,1,0), (0,0,1)
  const triangles = [
    triangle(0, 0, 0, 1, 0, 0, 0, 1, 0),
    triangle(0, 0, 0, 0, 1, 0, 0, 0, 1),
    triangle(0, 0, 0, 0, 0, 1, 1, 0, 0),
    triangle(1, 0, 0, 0, 0, 1, 0, 1, 0)
  ];

  const vol = computeVolume(triangles);
  expect(vol).toBeCloseTo(1 / 6, 4);
});
