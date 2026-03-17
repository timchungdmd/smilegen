import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Workflow-first navigation IDs.
 *
 * Primary case jobs:
 *   import → align → design → review → present
 *
 * Backing workspace routes kept for compatibility:
 *   capture (import/align), overview (case hub), simulate/plan (design),
 *   validate (review), present (present), collaborate (team handoff)
 *
 * Utility views:
 *   cases, settings
 */
export type ViewId =
  | "cases"
  | "import"
  | "align"
  | "design"
  | "review"
  | "present"
  | "settings";

/** Maps legacy route-based ViewId values to their canonical workflow stage names */
export const LEGACY_VIEW_MAP: Record<string, ViewId> = {
  capture: "import",
  overview: "align",
  simulate: "design",
  plan: "design",
  validate: "review",
  collaborate: "present",
  compare: "review",
  export: "present",
};

/** Normalise a ViewId, resolving any legacy alias to its canonical equivalent */
export function normalizeViewId(id: string): ViewId {
  return (LEGACY_VIEW_MAP[id] as ViewId) ?? (id as ViewId);
}

export type CaseWorkflowStage = "import" | "align" | "design" | "review" | "present";

const WORKFLOW_STAGES = new Set<string>(["import", "align", "design", "review", "present"]);

export function getCaseWorkflowStage(id: ViewId): CaseWorkflowStage | null {
  const normalized = normalizeViewId(id);
  return WORKFLOW_STAGES.has(normalized) ? (normalized as CaseWorkflowStage) : null;
}
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

/**
 * 3D/2D correspondence for one reference tooth.
 * Produced by the AlignmentCalibrationWizard and used to compute the
 * perspective-aligned camera position for photo-in-3D superimposition.
 */
export interface ScanReferencePoint {
  /** Photo X position as percent of photo width (0-100) */
  photoX: number;
  /** Photo Y position as percent of photo height (0-100) */
  photoY: number;
  /** Scan X position in STL model space (mm) */
  scanX: number;
  /** Scan Y position in STL model space (mm) */
  scanY: number;
  /** Scan Z position in STL model space (mm) */
  scanZ: number;
}

export interface ScanReferencePoints {
  centralR: ScanReferencePoint;
  centralL: ScanReferencePoint;
  additionalPoints?: ScanReferencePoint[];
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

  // Gimbal transform mode for 3D tooth manipulation
  gimbalMode: "translate" | "rotate" | "scale";

  // Photo-in-3D overlay: show patient photo as a plane in the 3D viewport
  showPhotoIn3D: boolean;

  /**
   * 3D/2D reference correspondences from the AlignmentCalibrationWizard.
   * Used to compute a perspective-aligned camera for photo-in-3D superimposition.
   * Null when the wizard has not been run yet.
   */
  scanReferencePoints: ScanReferencePoints | null;

  // Active gimbal axis for 2D manipulation (null = none or free)
  activeGimbalAxis: "x" | "y" | "rotate" | null;
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
  setGimbalMode: (mode: "translate" | "rotate" | "scale") => void;
  setActiveGimbalAxis: (axis: "x" | "y" | "rotate" | null) => void;
  setShowPhotoIn3D: (show: boolean) => void;
  setScanReferencePoints: (refs: ScanReferencePoints) => void;
  clearScanReferencePoints: () => void;
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
  gimbalMode: "translate",
  activeGimbalAxis: null,
  showPhotoIn3D: false,
  scanReferencePoints: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

/** Keys persisted to localStorage so calibration data survives HMR / page reload. */
const PERSISTED_KEYS: (keyof ViewportState)[] = [
  "scanReferencePoints",
  "alignmentMarkers",
  "midlineX",
  "smileArcY",
  "leftCommissureX",
  "rightCommissureX",
];

export const useViewportStore = create<ViewportStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_VIEWPORT_STATE,

      setActiveView: (view) => {
        const updates: Partial<ViewportState> = { activeView: view };
        // Auto-enable photo overlay when entering simulate view with calibrated reference points
        if (normalizeViewId(view) === "design" && get().scanReferencePoints) {
          updates.showPhotoIn3D = true;
        }
        set(updates);
      },
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
      setGimbalMode: (mode) => set({ gimbalMode: mode }),
      setActiveGimbalAxis: (axis) => set({ activeGimbalAxis: axis }),
      setShowPhotoIn3D: (show) => set({ showPhotoIn3D: show }),
      setScanReferencePoints: (refs) => set({ scanReferencePoints: refs }),
      clearScanReferencePoints: () => set({ scanReferencePoints: null }),

      resetViewport: () => set(INITIAL_VIEWPORT_STATE),
    }),
    {
      name: "smilegen-viewport",
      // Only persist calibration-critical data, not transient UI state
      partialize: (state: ViewportStore) => {
        const partial: Record<string, unknown> = {};
        for (const key of PERSISTED_KEYS) {
          partial[key] = state[key];
        }
        return partial;
      },
    } as any,
  ),
);
