import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── State and actions ───────────────────────────────────────────────────────

interface OverlayState {
  showOverlay: boolean;
  overlayOpacity: number;
  showSmileArc: boolean;
  showMidline: boolean;
  showGingivalLine: boolean;

  // Overlay guide positions
  midlineX: number;
  smileArcY: number;
  smileArcLeftOffset: number;
  smileArcRightOffset: number;
  gingivalLineY: number;

  // Commissure guides
  leftCommissureX: number;
  rightCommissureX: number;

  // Alignment markers
  alignmentMarkers: AlignmentMarker[];
}

interface OverlayActions {
  setShowOverlay: (show: boolean) => void;
  setOverlayOpacity: (opacity: number) => void;
  setShowSmileArc: (show: boolean) => void;
  setShowMidline: (show: boolean) => void;
  setShowGingivalLine: (show: boolean) => void;
  setMidlineX: (x: number) => void;
  setSmileArcY: (y: number) => void;
  setSmileArcLeftOffset: (offset: number) => void;
  setSmileArcRightOffset: (offset: number) => void;
  setGingivalLineY: (y: number) => void;
  setLeftCommissureX: (x: number) => void;
  setRightCommissureX: (x: number) => void;
  addAlignmentMarker: (marker: AlignmentMarker) => void;
  updateAlignmentMarker: (id: string, updates: Partial<Pick<AlignmentMarker, "x" | "y">>) => void;
  removeAlignmentMarker: (id: string) => void;
  clearAlignmentMarkers: () => void;
  resetOverlay: () => void;
}

export type OverlayStore = OverlayState & OverlayActions;

const INITIAL_OVERLAY_STATE: OverlayState = {
  showOverlay: false,
  overlayOpacity: 0.7,
  showSmileArc: true,
  showMidline: true,
  showGingivalLine: false,

  midlineX: 50,
  smileArcY: 60,
  smileArcLeftOffset: 0,
  smileArcRightOffset: 0,
  gingivalLineY: 30,

  leftCommissureX: 25,
  rightCommissureX: 75,

  alignmentMarkers: [],
};

/** Keys persisted to localStorage so calibration data survives HMR / page reload. */
const PERSISTED_OVERLAY_KEYS: (keyof OverlayState)[] = [
  "alignmentMarkers",
  "overlayOpacity",
  "midlineX",
  "smileArcY",
  "smileArcLeftOffset",
  "smileArcRightOffset",
  "leftCommissureX",
  "rightCommissureX",
];

export const useOverlayStore = create<OverlayStore>()(
  persist(
    (set) => ({
      ...INITIAL_OVERLAY_STATE,

      setShowOverlay: (show) => set({ showOverlay: show }),
      setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),
      setShowSmileArc: (show) => set({ showSmileArc: show }),
      setShowMidline: (show) => set({ showMidline: show }),
      setShowGingivalLine: (show) => set({ showGingivalLine: show }),
      setMidlineX: (x) => set({ midlineX: x }),
      setSmileArcY: (y) => set({ smileArcY: y }),
      setSmileArcLeftOffset: (offset) => set({ smileArcLeftOffset: offset }),
      setSmileArcRightOffset: (offset) => set({ smileArcRightOffset: offset }),
      setGingivalLineY: (y) => set({ gingivalLineY: y }),
      setLeftCommissureX: (x) => set({ leftCommissureX: x }),
      setRightCommissureX: (x) => set({ rightCommissureX: x }),

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

      resetOverlay: () => set(INITIAL_OVERLAY_STATE),
    }),
    {
      name: "smilegen-overlay",
      partialize: (state: OverlayStore) => {
        const partial: Record<string, unknown> = {};
        for (const key of PERSISTED_OVERLAY_KEYS) {
          partial[key] = state[key];
        }
        return partial;
      },
    } as any,
  ),
);
