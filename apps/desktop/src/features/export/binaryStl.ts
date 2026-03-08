import type { MeshTriangle } from "../import/stlParser";

/**
 * Serialize triangles to binary STL format.
 * Binary STL: 80-byte header + 4-byte triangle count + (50 bytes per triangle)
 */
export function serializeToBinaryStl(
  name: string,
  triangles: MeshTriangle[]
): ArrayBuffer {
  const headerSize = 80;
  const countSize = 4;
  const triangleSize = 50; // 12 (normal) + 36 (3 vertices) + 2 (attribute)
  const totalSize = headerSize + countSize + triangles.length * triangleSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const headerBytes = new Uint8Array(buffer, 0, headerSize);

  // Write header (padded with zeros)
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name.slice(0, 80));
  headerBytes.set(nameBytes, 0);

  // Write triangle count (uint32 LE)
  view.setUint32(headerSize, triangles.length, true);

  // Write each triangle
  for (let i = 0; i < triangles.length; i++) {
    const offset = headerSize + countSize + i * triangleSize;
    const { a, b, c } = triangles[i];

    // Compute normal
    const normal = computeNormal(a, b, c);

    // Normal vector (3 x float32 LE)
    view.setFloat32(offset + 0, normal.x, true);
    view.setFloat32(offset + 4, normal.y, true);
    view.setFloat32(offset + 8, normal.z, true);

    // Vertex 1 (3 x float32 LE)
    view.setFloat32(offset + 12, a.x, true);
    view.setFloat32(offset + 16, a.y, true);
    view.setFloat32(offset + 20, a.z, true);

    // Vertex 2 (3 x float32 LE)
    view.setFloat32(offset + 24, b.x, true);
    view.setFloat32(offset + 28, b.y, true);
    view.setFloat32(offset + 32, b.z, true);

    // Vertex 3 (3 x float32 LE)
    view.setFloat32(offset + 36, c.x, true);
    view.setFloat32(offset + 40, c.y, true);
    view.setFloat32(offset + 44, c.z, true);

    // Attribute byte count (uint16 LE) = 0
    view.setUint16(offset + 48, 0, true);
  }

  return buffer;
}

function computeNormal(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const uz = b.z - a.z;
  const vx = c.x - a.x;
  const vy = c.y - a.y;
  const vz = c.z - a.z;

  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;

  return { x: nx / length, y: ny / length, z: nz / length };
}
