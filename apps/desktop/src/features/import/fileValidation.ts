const PHOTO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic"]);
const MESH_EXTENSIONS = new Set(["stl", "obj", "ply"]);

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
