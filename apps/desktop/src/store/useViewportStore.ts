/**
 * useViewportStore — backward-compatibility facade.
 *
 * The monolithic viewport store has been split into four focused stores:
 *   - useNavigationStore  (activeView, navigation types/helpers)
 *   - useOverlayStore     (overlay toggles, guides, alignment markers)
 *   - useAlignmentStore   (photo-in-3D, scan reference points)
 *   - useCanvasStore      (photo zoom/pan, camera, design tab, gimbal)
 *
 * This file re-exports all types/helpers for backward compatibility
 * and provides a combined `useViewportStore` hook that merges all four
 * stores so existing `useViewportStore((s) => s.field)` calls keep working.
 *
 * New code should import from the specific stores directly.
 */

import { useNavigationStore } from "./useNavigationStore";
import { useOverlayStore } from "./useOverlayStore";
import { useAlignmentStore } from "./useAlignmentStore";
import { useCanvasStore } from "./useCanvasStore";
import { normalizeViewId } from "./useNavigationStore";

// ─── Re-export types ─────────────────────────────────────────────────────────

export type {
  ViewId,
  CaseWorkflowStage,
} from "./useNavigationStore";

export type {
  AlignmentMarkerType,
  AlignmentMarker,
} from "./useOverlayStore";

export type {
  AlignmentSurface,
  ScanInteractionMode,
  AlignmentLandmarkId,
  AlignmentLandmark,
} from "./useAlignmentStore";

export type {
  DesignTab,
  LayoutMode,
} from "./useCanvasStore";

export {
  normalizeViewId,
  getCaseWorkflowStage,
  LEGACY_VIEW_MAP,
} from "./useNavigationStore";

// Re-export the individual stores for explicit usage
export { useNavigationStore } from "./useNavigationStore";
export { useOverlayStore } from "./useOverlayStore";
export { useAlignmentStore } from "./useAlignmentStore";
export { useCanvasStore } from "./useCanvasStore";

// ─── Combined state type ─────────────────────────────────────────────────────

type CombinedState = ReturnType<typeof useNavigationStore.getState> &
  ReturnType<typeof useOverlayStore.getState> &
  ReturnType<typeof useAlignmentStore.getState> &
  ReturnType<typeof useCanvasStore.getState> & {
    resetViewport: () => void;
  };

// ─── Combined getState ───────────────────────────────────────────────────────

function enhancedSetActiveView(view: import("./useNavigationStore").ViewId): void {
  useNavigationStore.getState().setActiveView(view);
}

function getCombinedState(): CombinedState {
  return {
    ...useNavigationStore.getState(),
    ...useOverlayStore.getState(),
    ...useAlignmentStore.getState(),
    ...useCanvasStore.getState(),
    setActiveView: enhancedSetActiveView,
    resetViewport: resetAllStores,
  };
}

function resetAllStores(): void {
  useNavigationStore.getState().resetNavigation();
  useOverlayStore.getState().resetOverlay();
  useAlignmentStore.getState().resetAlignment();
  useCanvasStore.getState().resetCanvas();
}

// ─── Combined hook ───────────────────────────────────────────────────────────

/**
 * @deprecated Import from useNavigationStore, useOverlayStore, useAlignmentStore,
 * or useCanvasStore instead. This combined hook re-renders on ANY change across
 * all four stores.
 */
function useViewportStoreHook(): CombinedState;
function useViewportStoreHook<T>(selector: (state: CombinedState) => T): T;
function useViewportStoreHook<T>(selector?: (state: CombinedState) => T): T | CombinedState {
  // Subscribe to all four stores so any change triggers re-render
  const nav = useNavigationStore();
  const overlay = useOverlayStore();
  const alignment = useAlignmentStore();
  const canvas = useCanvasStore();

  const combined: CombinedState = {
    ...nav,
    ...overlay,
    ...alignment,
    ...canvas,
    // Override setActiveView to keep the auto-enable-photo-in-3D logic
    setActiveView: enhancedSetActiveView,
    resetViewport: resetAllStores,
  };

  if (selector) {
    return selector(combined);
  }
  return combined;
}

export const useViewportStore = Object.assign(useViewportStoreHook, {
  getState: getCombinedState,
  setState: (partial: Partial<CombinedState>) => {
    // Distribute state updates to the appropriate stores
    const navKeys = new Set(["activeView"]);
/**
   * Overlay state keys — owned by useOverlayStore.
   * These fields control guide positions, opacity, and alignment markers.
   * They are persisted both to localStorage (via zustand/persist) and to
   * IndexedDB (via SavedCase.overlaySettings in caseDb.ts).
   */
  const overlayKeys = new Set([
    "showOverlay", "overlayOpacity", "showSmileArc", "showMidline",
    "showGingivalLine", "midlineX", "smileArcY", "gingivalLineY",
    "smileArcLeftOffset", "smileArcRightOffset",
    "leftCommissureX", "rightCommissureX", "alignmentMarkers",
  ]);
    const alignmentKeys = new Set([
      "isAlignmentMode",
      "activeSurface",
      "activeLandmarkId",
      "scanInteractionMode",
      "landmarks",
      "solvedView",
      "lastSolveError",
    ]);
    const canvasKeys = new Set([
      "photoZoom", "photoPanX", "photoPanY", "cameraDistance",
      "activeCollectionId", "designTab", "gimbalMode", "activeGimbalAxis",
      "layoutMode", "hiddenLayers", "meshScale", "meshOpacity",
    ]);

    const navPartial: Record<string, unknown> = {};
    const overlayPartial: Record<string, unknown> = {};
    const alignmentPartial: Record<string, unknown> = {};
    const canvasPartial: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(partial)) {
      if (navKeys.has(key)) navPartial[key] = value;
      else if (overlayKeys.has(key)) overlayPartial[key] = value;
      else if (alignmentKeys.has(key)) alignmentPartial[key] = value;
      else if (canvasKeys.has(key)) canvasPartial[key] = value;
    }

    if (Object.keys(navPartial).length > 0) useNavigationStore.setState(navPartial as any);
    if (Object.keys(overlayPartial).length > 0) useOverlayStore.setState(overlayPartial as any);
    if (Object.keys(alignmentPartial).length > 0) useAlignmentStore.setState(alignmentPartial as any);
    if (Object.keys(canvasPartial).length > 0) useCanvasStore.setState(canvasPartial as any);
  },
  subscribe: (listener: (state: CombinedState) => void) => {
    const unsubs = [
      useNavigationStore.subscribe(() => listener(getCombinedState())),
      useOverlayStore.subscribe(() => listener(getCombinedState())),
      useAlignmentStore.subscribe(() => listener(getCombinedState())),
      useCanvasStore.subscribe(() => listener(getCombinedState())),
    ];
    return () => unsubs.forEach((u) => u());
  },
});

// Legacy type export
export type ViewportStore = CombinedState;
