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
  const asciiCandidate = decoder.decode(bytes.slice(0, Math.min(bytes.length, 1024)));
  let triangles: MeshTriangle[] = [];

  if (buffer.byteLength < 84 || looksLikeAsciiStl(asciiCandidate)) {
    triangles = parseAsciiTriangles(decoder.decode(bytes));
  }

  if (triangles.length === 0 && buffer.byteLength >= 84) {
    try {
      triangles = parseBinaryTriangles(buffer);
    } catch {
      // If binary parse fails, keep fallback behavior below.
    }
  }

  if (triangles.length === 0 && !looksLikeAsciiStl(asciiCandidate)) {
    triangles = parseAsciiTriangles(decoder.decode(bytes));
  }

  const boundsResult = createBoundsFromTriangles(triangles);

  if (boundsResult.vertexCount === 0) {
    throw new Error(`No vertices found in STL: ${name}`);
  }

  return {
    name,
    bounds: boundsResult.bounds,
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

function createBoundsFromTriangles(triangles: MeshTriangle[]) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let vertexCount = 0;

  for (const triangle of triangles) {
    const triangleVertices = [triangle.a, triangle.b, triangle.c];

    for (const vertex of triangleVertices) {
      if (!isFiniteVertex(vertex)) {
        continue;
      }

      vertexCount += 1;
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxY = Math.max(maxY, vertex.y);
      minZ = Math.min(minZ, vertex.z);
      maxZ = Math.max(maxZ, vertex.z);
    }
  }

  const safeMinX = vertexCount > 0 ? minX : 0;
  const safeMaxX = vertexCount > 0 ? maxX : 0;
  const safeMinY = vertexCount > 0 ? minY : 0;
  const safeMaxY = vertexCount > 0 ? maxY : 0;
  const safeMinZ = vertexCount > 0 ? minZ : 0;
  const safeMaxZ = vertexCount > 0 ? maxZ : 0;

  return {
    bounds: {
      minX: safeMinX,
      maxX: safeMaxX,
      minY: safeMinY,
      maxY: safeMaxY,
      minZ: safeMinZ,
      maxZ: safeMaxZ,
      width: Number((safeMaxX - safeMinX).toFixed(3)),
      depth: Number((safeMaxY - safeMinY).toFixed(3)),
      height: Number((safeMaxZ - safeMinZ).toFixed(3))
    },
    vertexCount
  };
}
