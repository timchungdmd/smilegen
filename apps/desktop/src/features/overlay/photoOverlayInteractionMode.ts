import type { AlignmentSurface } from "../../store/useAlignmentStore";
import type { DesignTab } from "../../store/useCanvasStore";

interface PhotoOverlayInteractionInput {
  designTab: DesignTab;
  isAlignmentMode: boolean;
  activeSurface: AlignmentSurface;
}

export function shouldEnablePhotoOverlayPointerEvents({
  designTab,
  isAlignmentMode,
  activeSurface,
}: PhotoOverlayInteractionInput): boolean {
  if (isAlignmentMode) {
    return activeSurface === "photo";
  }

  return designTab === "photo";
}
