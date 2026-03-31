import type { ParsedStlMesh } from "../import/stlParser";

export function getImportedScanSignature(
  mesh: ParsedStlMesh | null | undefined
): string | null {
  if (!mesh) {
    return null;
  }

  const { bounds } = mesh;
  return [
    mesh.name,
    mesh.vertexCount,
    bounds.width,
    bounds.depth,
    bounds.height,
  ].join(":");
}
