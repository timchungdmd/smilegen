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
