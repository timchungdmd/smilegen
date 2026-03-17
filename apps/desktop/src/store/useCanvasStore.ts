import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DesignTab = "3d" | "photo";

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
  hiddenLayers: Set<string>;
}

interface CanvasActions {
  setPhotoZoom: (zoom: number) => void;
  setPhotoPan: (x: number, y: number) => void;
  setCameraDistance: (distance: number) => void;
  setActiveCollectionId: (id: string | null) => void;
  setDesignTab: (tab: DesignTab) => void;
  setGimbalMode: (mode: "translate" | "rotate" | "scale") => void;
  setActiveGimbalAxis: (axis: "x" | "y" | "rotate" | null) => void;
  toggleLayer: (layer: string) => void;
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
  hiddenLayers: new Set<string>(),
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
  toggleLayer: (layer) => set((s) => {
    const next = new Set(s.hiddenLayers);
    if (next.has(layer)) next.delete(layer);
    else next.add(layer);
    return { hiddenLayers: next };
  }),
  resetCanvas: () => set(INITIAL_CANVAS_STATE),
}));
