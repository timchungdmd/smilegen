/**
 * parsedMeshToStlBlob.ts
 *
 * Converts an in-memory ParsedStlMesh (triangle soup) to a binary STL Blob
 * that can be sent to the mesh synthesis service.
 *
 * Binary STL format:
 *   80-byte ASCII header
 *   4-byte uint32 — triangle count
 *   Per triangle (50 bytes each):
 *     12 bytes — normal vector  (float32 x3)
 *     12 bytes — vertex A       (float32 x3)
 *     12 bytes — vertex B       (float32 x3)
 *     12 bytes — vertex C       (float32 x3)
 *      2 bytes — attribute byte count (always 0)
 */

import type { ParsedStlMesh, MeshVertex } from "../import/stlParser";

function writeVec3(view: DataView, offset: number, v: MeshVertex): number {
  view.setFloat32(offset, v.x, true);
  view.setFloat32(offset + 4, v.y, true);
  view.setFloat32(offset + 8, v.z, true);
  return offset + 12;
}

function cross(
  a: MeshVertex,
  b: MeshVertex,
  c: MeshVertex
): MeshVertex {
  const ax = b.x - a.x, ay = b.y - a.y, az = b.z - a.z;
  const bx = c.x - a.x, by = c.y - a.y, bz = c.z - a.z;
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

export function parsedMeshToStlBlob(mesh: ParsedStlMesh): Blob {
  const triangleCount = mesh.triangles.length;
  // 80-byte header + 4-byte count + 50 bytes per triangle
  const byteLength = 80 + 4 + triangleCount * 50;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);

  // Header: ASCII padded to 80 bytes
  const header = `Exported by SmileGen — ${mesh.name}`;
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  // Triangle count
  view.setUint32(80, triangleCount, true);

  let offset = 84;
  for (const tri of mesh.triangles) {
    const n = cross(tri.a, tri.b, tri.c);
    offset = writeVec3(view, offset, n);
    offset = writeVec3(view, offset, tri.a);
    offset = writeVec3(view, offset, tri.b);
    offset = writeVec3(view, offset, tri.c);
    view.setUint16(offset, 0, true); // attribute byte count
    offset += 2;
  }

  return new Blob([buffer], { type: "model/x.stl-binary" });
}
