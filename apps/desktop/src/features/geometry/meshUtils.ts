import type { MeshTriangle, MeshVertex, ParsedStlMesh, MeshBounds } from "../import/stlParser";

/** Recompute bounds from triangles */
export function computeBounds(triangles: MeshTriangle[]): MeshBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const triangle of triangles) {
    for (const vertex of [triangle.a, triangle.b, triangle.c]) {
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
      minZ = Math.min(minZ, vertex.z);
      maxZ = Math.max(maxZ, vertex.z);
    }
  }

  if (triangles.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, width: 0, depth: 0, height: 0 };
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    width: Number((maxX - minX).toFixed(3)),
    depth: Number((maxY - minY).toFixed(3)),
    height: Number((maxZ - minZ).toFixed(3))
  };
}

/** Compute the surface area of a mesh */
export function computeSurfaceArea(triangles: MeshTriangle[]): number {
  let area = 0;

  for (const triangle of triangles) {
    area += triangleArea(triangle.a, triangle.b, triangle.c);
  }

  return area;
}

/** Compute the volume of a closed mesh using the divergence theorem */
export function computeVolume(triangles: MeshTriangle[]): number {
  let volume = 0;

  for (const triangle of triangles) {
    const { a, b, c } = triangle;
    // Signed volume of tetrahedron formed with origin
    volume += signedTetraVolume(a, b, c);
  }

  return Math.abs(volume);
}

/** Scale a mesh uniformly around its center */
export function scaleMesh(mesh: ParsedStlMesh, factor: number): ParsedStlMesh {
  return scaleMeshNonUniform(mesh, { x: factor, y: factor, z: factor });
}

/** Scale a mesh non-uniformly around its center */
export function scaleMeshNonUniform(
  mesh: ParsedStlMesh,
  factors: { x: number; y: number; z: number }
): ParsedStlMesh {
  const centerX = (mesh.bounds.minX + mesh.bounds.maxX) / 2;
  const centerY = (mesh.bounds.minY + mesh.bounds.maxY) / 2;
  const centerZ = (mesh.bounds.minZ + mesh.bounds.maxZ) / 2;

  const triangles = mesh.triangles.map((triangle) => ({
    a: scaleVertex(triangle.a, centerX, centerY, centerZ, factors),
    b: scaleVertex(triangle.b, centerX, centerY, centerZ, factors),
    c: scaleVertex(triangle.c, centerX, centerY, centerZ, factors)
  }));

  return {
    name: mesh.name,
    bounds: computeBounds(triangles),
    vertexCount: mesh.vertexCount,
    triangles
  };
}

/** Translate a mesh by an offset */
export function translateMesh(mesh: ParsedStlMesh, offset: MeshVertex): ParsedStlMesh {
  const triangles = mesh.triangles.map((triangle) => ({
    a: { x: triangle.a.x + offset.x, y: triangle.a.y + offset.y, z: triangle.a.z + offset.z },
    b: { x: triangle.b.x + offset.x, y: triangle.b.y + offset.y, z: triangle.b.z + offset.z },
    c: { x: triangle.c.x + offset.x, y: triangle.c.y + offset.y, z: triangle.c.z + offset.z }
  }));

  return {
    name: mesh.name,
    bounds: computeBounds(triangles),
    vertexCount: mesh.vertexCount,
    triangles
  };
}

/** Check if two axis-aligned bounding boxes overlap */
export function aabbOverlap(a: MeshBounds, b: MeshBounds): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ
  );
}

/** Compute the distance between two AABB surfaces (negative = overlap) */
export function aabbDistance(a: MeshBounds, b: MeshBounds): number {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const dy = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0);
  const dz = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0);

  if (dx > 0 || dy > 0 || dz > 0) {
    // Boxes are separated — return positive distance
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Boxes overlap — return negative penetration depth (smallest overlap axis)
  const overlapX = Math.min(a.maxX - b.minX, b.maxX - a.minX);
  const overlapY = Math.min(a.maxY - b.minY, b.maxY - a.minY);
  const overlapZ = Math.min(a.maxZ - b.minZ, b.maxZ - a.minZ);

  return -Math.min(overlapX, overlapY, overlapZ);
}

// --- Internal helpers ---

function scaleVertex(
  vertex: MeshVertex,
  cx: number,
  cy: number,
  cz: number,
  factors: { x: number; y: number; z: number }
): MeshVertex {
  return {
    x: cx + (vertex.x - cx) * factors.x,
    y: cy + (vertex.y - cy) * factors.y,
    z: cz + (vertex.z - cz) * factors.z
  };
}

function triangleArea(a: MeshVertex, b: MeshVertex, c: MeshVertex): number {
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const uz = b.z - a.z;
  const vx = c.x - a.x;
  const vy = c.y - a.y;
  const vz = c.z - a.z;

  const cx = uy * vz - uz * vy;
  const cy = uz * vx - ux * vz;
  const cz = ux * vy - uy * vx;

  return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
}

function signedTetraVolume(a: MeshVertex, b: MeshVertex, c: MeshVertex): number {
  // V = (1/6) * a . (b x c)
  const crossX = b.y * c.z - b.z * c.y;
  const crossY = b.z * c.x - b.x * c.z;
  const crossZ = b.x * c.y - b.y * c.x;

  return (a.x * crossX + a.y * crossY + a.z * crossZ) / 6;
}
