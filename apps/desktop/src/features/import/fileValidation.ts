import { MESH_EXTENSIONS, PHOTO_EXTENSIONS } from "./importConstants";

function getExtension(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

export function isPhotoFile(filename: string) {
  return PHOTO_EXTENSIONS.has(getExtension(filename));
}

export function isStlFile(filename: string) {
  return MESH_EXTENSIONS.has(getExtension(filename));
}

export function isMeshFile(filename: string) {
  return MESH_EXTENSIONS.has(getExtension(filename));
}

export function getMeshExtension(filename: string) {
  return getExtension(filename);
}

/**
 * Content-based validation for mesh files. Reads the first few bytes of the
 * buffer to confirm the file matches its declared extension.
 *
 * - OBJ: no magic bytes, trust extension
 * - PLY: must start with the ASCII string "ply"
 * - STL: detection handled internally by the STL parser
 */
export function validateMeshFileContent(buffer: ArrayBuffer, filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  const bytes = new Uint8Array(buffer.slice(0, 5));

  if (ext === "obj") return true; // OBJ has no magic bytes, trust extension
  if (ext === "ply") {
    const probe = new TextDecoder().decode(bytes);
    return probe.startsWith("ply");
  }
  if (ext === "stl") {
    return true; // stlParser handles ASCII vs binary detection internally
  }
  return false;
}
