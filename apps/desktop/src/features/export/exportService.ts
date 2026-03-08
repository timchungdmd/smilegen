import type { MeshTriangle } from "../import/stlParser";
import type { GeneratedVariantDesign } from "../engine/designEngine";
import { serializeToBinaryStl } from "./binaryStl";

export type ExportFormat = "stl_ascii" | "stl_binary" | "obj";

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  includeAllVariants: boolean;
}

/**
 * Export a variant design in the specified format and trigger download.
 */
export function exportVariant(
  variant: GeneratedVariantDesign,
  options: ExportOptions
): void {
  const triangles = variant.teeth.flatMap((t) => t.previewTriangles);
  const name = options.filename.replace(/\.\w+$/, "");

  let blob: Blob;

  switch (options.format) {
    case "stl_binary": {
      const buffer = serializeToBinaryStl(name, triangles);
      blob = new Blob([buffer], { type: "model/stl" });
      break;
    }
    case "stl_ascii": {
      blob = new Blob([variant.combinedStl], { type: "model/stl" });
      break;
    }
    case "obj": {
      const objContent = serializeToObj(name, triangles);
      blob = new Blob([objContent], { type: "model/obj" });
      break;
    }
  }

  triggerDownload(blob, ensureExtension(options.filename, options.format));
}

/**
 * Export to OBJ format (vertex + face list).
 */
export function serializeToObj(
  name: string,
  triangles: MeshTriangle[]
): string {
  const lines: string[] = ["# SmileGen Export", `o ${name}`];
  const tolerance = 0.001;

  // Deduplicate vertices by position
  const uniqueVertices: { x: number; y: number; z: number }[] = [];
  const vertexIndexMap = new Map<string, number>();

  function getVertexIndex(v: { x: number; y: number; z: number }): number {
    const key = `${roundTo(v.x, tolerance)},${roundTo(v.y, tolerance)},${roundTo(v.z, tolerance)}`;
    const existing = vertexIndexMap.get(key);
    if (existing !== undefined) {
      return existing;
    }
    uniqueVertices.push(v);
    const index = uniqueVertices.length; // 1-indexed
    vertexIndexMap.set(key, index);
    return index;
  }

  // Collect faces and deduplicate vertices
  const faces: [number, number, number][] = [];
  for (const triangle of triangles) {
    const ai = getVertexIndex(triangle.a);
    const bi = getVertexIndex(triangle.b);
    const ci = getVertexIndex(triangle.c);
    faces.push([ai, bi, ci]);
  }

  // Write vertices
  for (const v of uniqueVertices) {
    lines.push(`v ${v.x} ${v.y} ${v.z}`);
  }

  // Write faces
  for (const [a, b, c] of faces) {
    lines.push(`f ${a} ${b} ${c}`);
  }

  return lines.join("\n");
}

function roundTo(value: number, tolerance: number): number {
  return Math.round(value / tolerance) * tolerance;
}

function ensureExtension(filename: string, format: ExportFormat): string {
  const ext = format === "obj" ? ".obj" : ".stl";
  if (filename.toLowerCase().endsWith(ext)) {
    return filename;
  }
  return filename.replace(/\.\w+$/, "") + ext;
}

function triggerDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
