import type { UploadedPhoto } from "../../store/useImportStore";

export function shouldRenderImportedPhotoOverlay(photo: UploadedPhoto | null): boolean {
  return photo !== null;
}
