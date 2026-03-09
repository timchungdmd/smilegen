import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ViewId = "import" | "design" | "compare" | "export" | "cases" | "settings";
export type DesignTab = "3d" | "photo";

export type AlignmentMarkerType = "incisal" | "cusp";

export interface AlignmentMarker {
  id: string;
  type: AlignmentMarkerType;
  /** Tooth number (Universal) this marker corresponds to, e.g. "8", "6" */
  toothId: string;
  /** X position as percent of photo width (0-100) */
  x: number;
  /** Y position as percent of photo height (0-100) */
  y: number;
}

// ─── State and actions interfaces ────────────────────────────────────────────

interface ViewportState {
  // Navigation
  activeView: ViewId;

  // Overlay toggles
  showOverlay: boolean;
  overlayOpacity: number;
  showSmileArc: boolean;
  showMidline: boolean;
  showGingivalLine: boolean;

  // Overlay guide positions
  midlineX: number;
  smileArcY: number;
  gingivalLineY: number;

  // Commissure guides
  leftCommissureX: number;
  rightCommissureX: number;

  // Photo viewport
  photoZoom: number;
  photoPanX: number;
  photoPanY: number;

  // Alignment markers
  alignmentMarkers: AlignmentMarker[];

  // Arch camera
  cameraDistance: number;

  // Active library collection
  activeCollectionId: string | null;

  // Design view tab
  designTab: DesignTab;
}

interface ViewportActions {
  setActiveView: (view: ViewId) => void;
  setShowOverlay: (show: boolean) => void;
  setOverlayOpacity: (opacity: number) => void;
  setShowSmileArc: (show: boolean) => void;
  setShowMidline: (show: boolean) => void;
  setShowGingivalLine: (show: boolean) => void;
  setMidlineX: (x: number) => void;
  setSmileArcY: (y: number) => void;
  setGingivalLineY: (y: number) => void;
  setLeftCommissureX: (x: number) => void;
  setRightCommissureX: (x: number) => void;
  setPhotoZoom: (zoom: number) => void;
  setPhotoPan: (x: number, y: number) => void;
  addAlignmentMarker: (marker: AlignmentMarker) => void;
  updateAlignmentMarker: (id: string, updates: Partial<Pick<AlignmentMarker, "x" | "y">>) => void;
  removeAlignmentMarker: (id: string) => void;
  clearAlignmentMarkers: () => void;
  setCameraDistance: (distance: number) => void;
  setActiveCollectionId: (id: string | null) => void;
  setDesignTab: (tab: DesignTab) => void;
  resetViewport: () => void;
}

export type ViewportStore = ViewportState & ViewportActions;

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_VIEWPORT_STATE: ViewportState = {
  activeView: "import",

  showOverlay: false,
  overlayOpacity: 0.7,
  showSmileArc: true,
  showMidline: true,
  showGingivalLine: false,

  midlineX: 50,
  smileArcY: 60,
  gingivalLineY: 30,

  leftCommissureX: 25,
  rightCommissureX: 75,

  photoZoom: 1,
  photoPanX: 0,
  photoPanY: 0,

  alignmentMarkers: [],

  cameraDistance: 200,

  activeCollectionId: null,

  designTab: "3d",
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useViewportStore = create<ViewportStore>()((set) => ({
  ...INITIAL_VIEWPORT_STATE,

  setActiveView: (view) => set({ activeView: view }),
  setShowOverlay: (show) => set({ showOverlay: show }),
  setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),
  setShowSmileArc: (show) => set({ showSmileArc: show }),
  setShowMidline: (show) => set({ showMidline: show }),
  setShowGingivalLine: (show) => set({ showGingivalLine: show }),
  setMidlineX: (x) => set({ midlineX: x }),
  setSmileArcY: (y) => set({ smileArcY: y }),
  setGingivalLineY: (y) => set({ gingivalLineY: y }),
  setLeftCommissureX: (x) => set({ leftCommissureX: x }),
  setRightCommissureX: (x) => set({ rightCommissureX: x }),
  setPhotoZoom: (zoom) => set({ photoZoom: Math.max(0.25, Math.min(5, zoom)) }),
  setPhotoPan: (x, y) => set({ photoPanX: x, photoPanY: y }),

  addAlignmentMarker: (marker) =>
    set((s) => ({ alignmentMarkers: [...s.alignmentMarkers, marker] })),

  updateAlignmentMarker: (id, updates) =>
    set((s) => ({
      alignmentMarkers: s.alignmentMarkers.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  removeAlignmentMarker: (id) =>
    set((s) => ({ alignmentMarkers: s.alignmentMarkers.filter((m) => m.id !== id) })),

  clearAlignmentMarkers: () => set({ alignmentMarkers: [] }),

  setCameraDistance: (distance) => set({ cameraDistance: distance }),
  setActiveCollectionId: (id) => set({ activeCollectionId: id }),
  setDesignTab: (tab) => set({ designTab: tab }),

  resetViewport: () => set(INITIAL_VIEWPORT_STATE),
}));
