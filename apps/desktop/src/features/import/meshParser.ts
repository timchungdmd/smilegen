/**
 * Unified mesh parser — converts OBJ, PLY, and other 3D formats into
 * the same ParsedStlMesh triangle-soup format used throughout the app.
 */

import { parseStlArrayBuffer, type ParsedStlMesh, type MeshTriangle, type MeshVertex } from "./stlParser";
import { MAX_TRIANGLES, MESH_EXTENSIONS } from "./importConstants";

export function isMeshFile(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return MESH_EXTENSIONS.has(ext);
}

/**
 * Parse any supported 3D mesh file into our internal triangle format.
 * Dispatches to the correct parser based on file extension.
 */
export function parseMeshBuffer(buffer: ArrayBuffer, filename: string): ParsedStlMesh {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  switch (ext) {
    case "stl":
      return parseStlArrayBuffer(buffer, filename);
    case "obj":
      return parseObjBuffer(buffer, filename);
    case "ply":
      return parsePlyBuffer(buffer, filename);
    default:
      throw new Error(`Unsupported 3D file format: .${ext}. Supported: ${[...MESH_EXTENSIONS].join(", ")}`);
  }
}

// ─── OBJ Parser ───────────────────────────────────────────────────────

function parseObjBuffer(buffer: ArrayBuffer, name: string): ParsedStlMesh {
  const text = new TextDecoder("utf-8").decode(new Uint8Array(buffer));
  const vertices: MeshVertex[] = [];
  const triangles: MeshTriangle[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("#") || line.length === 0) continue;

    const parts = line.split(/\s+/);
    const cmd = parts[0];

    if (cmd === "v" && parts.length >= 4) {
      const x = Number(parts[1]);
      const y = Number(parts[2]);
      const z = Number(parts[3]);
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        vertices.push({ x, y, z });
      }
    } else if (cmd === "f" && parts.length >= 4) {
      // Face: f v1 v2 v3 [v4 ...]  — indices may be v, v/vt, v/vt/vn, v//vn
      const faceIndices: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const idxStr = parts[i].split("/")[0];
        const idx = parseInt(idxStr, 10);
        if (!Number.isFinite(idx)) continue;
        // OBJ uses 1-based indexing, negative means relative to end
        faceIndices.push(idx > 0 ? idx - 1 : vertices.length + idx);
      }
      // Triangulate face (fan triangulation for n-gons)
      for (let i = 1; i < faceIndices.length - 1; i++) {
        const a = vertices[faceIndices[0]];
        const b = vertices[faceIndices[i]];
        const c = vertices[faceIndices[i + 1]];
        if (a && b && c) {
          triangles.push({ a, b, c });
        }
      }
    }
  }

  if (triangles.length === 0) {
    throw new Error(`No faces found in OBJ file: ${name}`);
  }

  return {
    name,
    ...computeBounds(triangles)
  };
}

// ─── PLY Parser ───────────────────────────────────────────────────────

function parsePlyBuffer(buffer: ArrayBuffer, name: string): ParsedStlMesh {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder("utf-8").decode(bytes);

  // Parse header
  const headerEndIdx = text.indexOf("end_header");
  if (headerEndIdx === -1) {
    throw new Error(`Invalid PLY file (no end_header): ${name}`);
  }
  const header = text.slice(0, headerEndIdx);
  const headerLines = header.split("\n").map((l) => l.trim());

  let vertexCount = 0;
  let faceCount = 0;
  let format = "ascii";
  const vertexProps: string[] = [];

  for (const line of headerLines) {
    if (line.startsWith("format")) {
      format = line.split(/\s+/)[1] ?? "ascii";
    } else if (line.startsWith("element vertex")) {
      vertexCount = parseInt(line.split(/\s+/)[2] ?? "0", 10);
    } else if (line.startsWith("element face")) {
      faceCount = parseInt(line.split(/\s+/)[2] ?? "0", 10);
    } else if (line.startsWith("property") && vertexProps.length < 20) {
      // Track property names to find x, y, z column indices
      const propName = line.split(/\s+/).pop() ?? "";
      vertexProps.push(propName);
    }
  }

  if (faceCount > MAX_TRIANGLES) {
    throw new Error(
      `PLY file claims ${faceCount.toLocaleString()} faces, exceeding the limit of ${MAX_TRIANGLES.toLocaleString()}.`
    );
  }

  const xIdx = vertexProps.indexOf("x");
  const yIdx = vertexProps.indexOf("y");
  const zIdx = vertexProps.indexOf("z");

  if (xIdx === -1 || yIdx === -1 || zIdx === -1) {
    throw new Error(`PLY file missing x/y/z vertex properties: ${name}`);
  }

  if (format !== "ascii") {
    // Binary PLY — parse binary data after header
    return parsePlyBinary(buffer, name, headerEndIdx, vertexCount, faceCount, xIdx, yIdx, zIdx, format);
  }

  // ASCII PLY
  const body = text.slice(headerEndIdx + "end_header".length).trim();
  const bodyLines = body.split("\n");

  const vertices: MeshVertex[] = [];
  const triangles: MeshTriangle[] = [];

  // Read vertices
  for (let i = 0; i < vertexCount && i < bodyLines.length; i++) {
    const parts = bodyLines[i].trim().split(/\s+/);
    const x = Number(parts[xIdx]);
    const y = Number(parts[yIdx]);
    const z = Number(parts[zIdx]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      vertices.push({ x, y, z });
    } else {
      vertices.push({ x: 0, y: 0, z: 0 }); // placeholder to keep indices aligned
    }
  }

  // Read faces
  for (let i = vertexCount; i < vertexCount + faceCount && i < bodyLines.length; i++) {
    const parts = bodyLines[i].trim().split(/\s+/).map(Number);
    const n = parts[0]; // vertex count for this face
    if (n >= 3) {
      // Fan triangulation
      for (let j = 1; j < n - 1; j++) {
        const a = vertices[parts[1]];
        const b = vertices[parts[1 + j]];
        const c = vertices[parts[2 + j]];
        if (a && b && c) {
          triangles.push({ a, b, c });
        }
      }
    }
  }

  if (triangles.length === 0) {
    throw new Error(`No faces found in PLY file: ${name}`);
  }

  return { name, ...computeBounds(triangles) };
}

function parsePlyBinary(
  buffer: ArrayBuffer, name: string,
  headerEndIdx: number,
  vertexCount: number, faceCount: number,
  xIdx: number, yIdx: number, zIdx: number,
  format: string
): ParsedStlMesh {
  // Find byte offset after "end_header\n"
  const bytes = new Uint8Array(buffer);
  let dataStart = headerEndIdx + "end_header".length;
  // Skip past the newline after end_header
  while (dataStart < bytes.length && (bytes[dataStart] === 10 || bytes[dataStart] === 13)) {
    dataStart++;
  }

  const littleEndian = format.includes("little");
  const view = new DataView(buffer);

  const vertices: MeshVertex[] = [];
  const triangles: MeshTriangle[] = [];

  // Assume all vertex properties are float32 (most common for x,y,z)
  // This is a simplification — full PLY parsing would check property types
  const floatsPerVertex = Math.max(xIdx, yIdx, zIdx) + 1;
  const bytesPerVertex = floatsPerVertex * 4; // assume float32 for all props

  let offset = dataStart;
  for (let i = 0; i < vertexCount; i++) {
    if (offset + bytesPerVertex > buffer.byteLength) break;
    const x = view.getFloat32(offset + xIdx * 4, littleEndian);
    const y = view.getFloat32(offset + yIdx * 4, littleEndian);
    const z = view.getFloat32(offset + zIdx * 4, littleEndian);
    vertices.push({ x, y, z });
    offset += bytesPerVertex;
  }

  // Read faces — format: uint8 count, then uint32 indices
  for (let i = 0; i < faceCount; i++) {
    if (offset >= buffer.byteLength) break;
    const n = view.getUint8(offset);
    offset += 1;
    const indices: number[] = [];
    for (let j = 0; j < n; j++) {
      if (offset + 4 > buffer.byteLength) break;
      indices.push(view.getInt32(offset, littleEndian));
      offset += 4;
    }
    // Fan triangulate
    for (let j = 1; j < indices.length - 1; j++) {
      const a = vertices[indices[0]];
      const b = vertices[indices[j]];
      const c = vertices[indices[j + 1]];
      if (a && b && c) triangles.push({ a, b, c });
    }
  }

  if (triangles.length === 0) {
    throw new Error(`No faces found in binary PLY file: ${name}`);
  }

  return { name, ...computeBounds(triangles) };
}

// ─── Shared utilities ─────────────────────────────────────────────────

function computeBounds(triangles: MeshTriangle[]) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let vertexCount = 0;

  for (const tri of triangles) {
    for (const v of [tri.a, tri.b, tri.c]) {
      if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) continue;
      vertexCount++;
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.z > maxZ) maxZ = v.z;
    }
  }

  if (vertexCount === 0) {
    minX = maxX = minY = maxY = minZ = maxZ = 0;
  }

  return {
    bounds: {
      minX, maxX, minY, maxY, minZ, maxZ,
      width: Number((maxX - minX).toFixed(3)),
      depth: Number((maxY - minY).toFixed(3)),
      height: Number((maxZ - minZ).toFixed(3))
    },
    vertexCount,
    triangles
  };
}
