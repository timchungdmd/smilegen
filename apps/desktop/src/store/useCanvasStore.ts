import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DesignTab = "3d" | "photo";
export type LayoutMode = "3d" | "portrait";

// ─── State and actions ───────────────────────────────────────────────────────

interface CanvasState {
  photoZoom: number;
  photoPanX: number;
  photoPanY: number;
  cameraDistance: number;
  activeCollectionId: string | null;
  designTab: DesignTab;
  gimbalMode: "translate" | "rotate" | "scale";
  activeGimbalAxis: "x" | "y" | "rotate" | null;
  layoutMode: LayoutMode;
  hiddenLayers: Set<string>;
  /** Mesh scale factor from measurement-based scaling (1 = no scaling) */
  meshScale: number;
  /** Opacity of the 3D mesh (0-1) */
  meshOpacity: number;
}

interface CanvasActions {
  setPhotoZoom: (zoom: number) => void;
  setPhotoPan: (x: number, y: number) => void;
  setCameraDistance: (distance: number) => void;
  setActiveCollectionId: (id: string | null) => void;
  setDesignTab: (tab: DesignTab) => void;
  setGimbalMode: (mode: "translate" | "rotate" | "scale") => void;
  setActiveGimbalAxis: (axis: "x" | "y" | "rotate" | null) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleLayer: (layer: string) => void;
  setMeshScale: (scale: number) => void;
  setMeshOpacity: (opacity: number) => void;
  resetCanvas: () => void;
}

export type CanvasStore = CanvasState & CanvasActions;

const INITIAL_CANVAS_STATE: CanvasState = {
  photoZoom: 1,
  photoPanX: 0,
  photoPanY: 0,
  cameraDistance: 200,
  activeCollectionId: "natural-ovoid",
  designTab: "3d",
  gimbalMode: "translate",
  activeGimbalAxis: null,
  layoutMode: "3d" as LayoutMode,
  hiddenLayers: new Set<string>(),
  meshScale: 1,
  meshOpacity: 0.9,
};

export const useCanvasStore = create<CanvasStore>()((set) => ({
  ...INITIAL_CANVAS_STATE,

  setPhotoZoom: (zoom) => set({ photoZoom: Math.max(0.25, Math.min(5, zoom)) }),
  setPhotoPan: (x, y) => set({ photoPanX: x, photoPanY: y }),
  setCameraDistance: (distance) => set({ cameraDistance: distance }),
  setActiveCollectionId: (id) => set({ activeCollectionId: id }),
  setDesignTab: (tab) => set({ designTab: tab }),
  setGimbalMode: (mode) => set({ gimbalMode: mode }),
  setActiveGimbalAxis: (axis) => set({ activeGimbalAxis: axis }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  toggleLayer: (layer) => set((s) => {
    const next = new Set(s.hiddenLayers);
    if (next.has(layer)) next.delete(layer);
    else next.add(layer);
    return { hiddenLayers: next };
  }),
  setMeshScale: (scale) => set({ meshScale: scale }),
  setMeshOpacity: (opacity) => set({ meshOpacity: Math.max(0, Math.min(1, opacity)) }),
  resetCanvas: () => set(INITIAL_CANVAS_STATE),
}));
