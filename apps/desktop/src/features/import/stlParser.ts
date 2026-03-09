import { MAX_TRIANGLES } from "./importConstants";
import { computeBounds } from "../geometry/meshUtils";

export interface MeshVertex {
  x: number;
  y: number;
  z: number;
}

export interface MeshTriangle {
  a: MeshVertex;
  b: MeshVertex;
  c: MeshVertex;
}

export interface MeshBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
  height: number;
}

export interface ParsedStlMesh {
  name: string;
  bounds: MeshBounds;
  vertexCount: number;
  triangles: MeshTriangle[];
}

export function parseStlArrayBuffer(buffer: ArrayBuffer, name: string): ParsedStlMesh {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("utf-8");
  // Decode header slice for format detection; cache full text to avoid re-decoding.
  const asciiCandidate = decoder.decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  // fullText is decoded lazily (once) and reused for both ASCII parse paths below.
  let fullText: string | null = null;
  const getFullText = () => {
    if (fullText === null) fullText = decoder.decode(bytes);
    return fullText;
  };
  let triangles: MeshTriangle[] = [];

  if (buffer.byteLength < 84 || looksLikeAsciiStl(asciiCandidate)) {
    triangles = parseAsciiTriangles(getFullText());
  }

  if (triangles.length === 0 && buffer.byteLength >= 84) {
    // Pre-check triangle count before entering the try block so the size
    // limit error is not silently swallowed.
    const potentialCount = new DataView(buffer).getUint32(80, true);
    if (potentialCount > MAX_TRIANGLES) {
      throw new Error(
        `Too many triangles: file claims ${potentialCount.toLocaleString()} but limit is ${MAX_TRIANGLES.toLocaleString()}. File may be corrupt.`
      );
    }
    try {
      triangles = parseBinaryTriangles(buffer);
    } catch {
      // If binary parse fails, keep fallback behavior below.
    }
  }

  if (triangles.length === 0 && !looksLikeAsciiStl(asciiCandidate)) {
    triangles = parseAsciiTriangles(getFullText());
  }

  const boundsResult = computeBounds(triangles);

  if (boundsResult.vertexCount === 0) {
    throw new Error(`No vertices found in STL: ${name}`);
  }

  return {
    name,
    bounds: boundsResult,
    vertexCount: boundsResult.vertexCount,
    triangles
  };
}

function parseAsciiTriangles(text: string): MeshTriangle[] {
  const matches = [...text.matchAll(/vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/g)];
  const vertices = matches
    .map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      z: Number(match[3])
    }))
    .filter(isFiniteVertex);
  const triangles: MeshTriangle[] = [];

  for (let index = 0; index < vertices.length; index += 3) {
    if (!vertices[index + 2]) {
      break;
    }

    triangles.push({
      a: vertices[index],
      b: vertices[index + 1],
      c: vertices[index + 2]
    });
  }

  return triangles;
}

function looksLikeAsciiStl(candidate: string) {
  const normalized = candidate.trimStart().toLowerCase();
  return (
    normalized.startsWith("solid") &&
    normalized.includes("facet") &&
    normalized.includes("vertex")
  );
}

function isFiniteVertex(vertex: MeshVertex) {
  return (
    Number.isFinite(vertex.x) &&
    Number.isFinite(vertex.y) &&
    Number.isFinite(vertex.z)
  );
}

function parseBinaryTriangles(buffer: ArrayBuffer): MeshTriangle[] {
  if (buffer.byteLength < 84) {
    throw new Error("Binary STL header is incomplete.");
  }

  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  if (triangleCount > MAX_TRIANGLES) {
    throw new Error(
      `Too many triangles: file claims ${triangleCount.toLocaleString()} but limit is ${MAX_TRIANGLES.toLocaleString()}. File may be corrupt.`
    );
  }
  const expectedLength = 84 + triangleCount * 50;

  if (buffer.byteLength < expectedLength) {
    throw new Error("Binary STL payload is truncated.");
  }

  const triangles: MeshTriangle[] = [];

  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
    const baseOffset = 84 + triangleIndex * 50 + 12;
    const triangleVertices: MeshVertex[] = [];

    for (let vertexIndex = 0; vertexIndex < 3; vertexIndex += 1) {
      const offset = baseOffset + vertexIndex * 12;
      triangleVertices.push({
        x: view.getFloat32(offset, true),
        y: view.getFloat32(offset + 4, true),
        z: view.getFloat32(offset + 8, true)
      });
    }

    triangles.push({
      a: triangleVertices[0],
      b: triangleVertices[1],
      c: triangleVertices[2]
    });
  }

  return triangles;
}


