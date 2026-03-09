import { create } from "zustand";

// Re-export so consumers can import from one place
export type { ViewId } from "./useSmileStore";
export type { AlignmentMarker, AlignmentMarkerType } from "./useSmileStore";

import type { ViewId } from "./useSmileStore";
import type { AlignmentMarker } from "./useSmileStore";

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
}

export type ViewportStore = ViewportState & ViewportActions;

export const useViewportStore = create<ViewportStore>((set, get) => ({
  activeView: "cases",

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
  setPhotoZoom: (zoom) => set({ photoZoom: zoom }),
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
}));
