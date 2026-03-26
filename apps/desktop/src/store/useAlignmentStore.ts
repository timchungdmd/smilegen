import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PhotoAlignedView } from "../features/alignment/photoAlignment";
import { solveAlignment } from "../features/alignment/alignmentSolver";
import type { AlignmentResult, AnatomicLandmarkId, ProjectionParams } from "../features/alignment/alignmentTypes";

export type AlignmentSurface = "photo" | "scan";
export type ScanInteractionMode = "navigate" | "pick";

export type AlignmentLandmarkId =
  | "midline"
  | "right-central"
  | "left-central"
  | "right-lateral"
  | "left-lateral"
  | "right-canine"
  | "left-canine"
  | "right-first-premolar"
  | "left-first-premolar"
  | "right-second-premolar"
  | "left-second-premolar";

/** Solve weight by landmark ID — higher = more influence on the transform solve */
export const LANDMARK_WEIGHTS: Record<AlignmentLandmarkId, number> = {
  "midline":               6,
  "right-central":         4,
  "left-central":          4,
  "right-lateral":         2,
  "left-lateral":          2,
  "right-canine":          1,
  "left-canine":           1,
  "right-first-premolar":  1,
  "left-first-premolar":   1,
  "right-second-premolar": 1,
  "left-second-premolar":  1,
};

/**
 * Known approximate distance from the midline in mm (clinical averages).
 * Used for anatomical scale validation after Procrustes solve.
 */
export const LANDMARK_MIDLINE_DISTANCE_MM: Partial<Record<AlignmentLandmarkId, number>> = {
  "right-central":         4.0,
  "left-central":          4.0,
  "right-lateral":         9.5,
  "left-lateral":          9.5,
  "right-canine":          16.5,
  "left-canine":           16.5,
  "right-first-premolar":  23.0,
  "left-first-premolar":   23.0,
  "right-second-premolar": 28.0,
  "left-second-premolar":  28.0,
};

export interface AlignmentLandmark {
  id: AlignmentLandmarkId;
  anatomicId: AnatomicLandmarkId;
  label: string;
  color: string;
  required: boolean;
  photoCoord: { x: number; y: number } | null;
  modelCoord: { x: number; y: number; z: number } | null;
}

/**
 * Result of the 2D Procrustes / Similarity-Transform solve.
 * Transforms scan mm-space → photo SVG-space.
 */
export interface ScanOverlayTransform {
  scale: number;          // px-per-mm
  rotation: number;       // radians — tilt correction
  translateX: number;     // px in SVG viewBox space
  translateY: number;     // px in SVG viewBox space
  residualError: number;  // mean weighted reprojection error in px
  scaleValidation: "ok" | "narrow" | "wide" | "unknown";
  wasFlipCorrected: boolean; // true if scan X-axis was auto-mirrored
}

/**
 * User fine-tune adjustments applied on top of the computed ScanOverlayTransform.
 * Stored persistently so the user's refinements survive page reloads.
 */
export interface AdjustmentDelta {
  scaleFactor: number;  // multiplicative, default 1.0
  rotation: number;     // additive radians, default 0
  translateX: number;   // additive px, default 0
  translateY: number;   // additive px, default 0
}

const DEFAULT_ADJUSTMENT_DELTA: AdjustmentDelta = {
  scaleFactor: 1,
  rotation: 0,
  translateX: 0,
  translateY: 0,
};

interface AlignmentState {
  isAlignmentMode: boolean;
  activeSurface: AlignmentSurface | null;
  activeLandmarkId: AlignmentLandmarkId | null;
  scanInteractionMode: ScanInteractionMode;
  landmarks: AlignmentLandmark[];
  overlayTransform: ScanOverlayTransform | null;
  adjustmentDelta: AdjustmentDelta;
  solvedView: PhotoAlignedView | null;
  lastSolveError: number | null;
  alignmentResult: AlignmentResult | null;
}

interface AlignmentActions {
  setAlignmentMode: (enabled: boolean) => void;
  setActiveSurface: (surface: AlignmentSurface | null) => void;
  setActiveLandmark: (id: AlignmentLandmarkId | null) => void;
  setScanInteractionMode: (mode: ScanInteractionMode) => void;
  setPhotoLandmark: (id: AlignmentLandmarkId, x: number, y: number) => void;
  setModelLandmark: (id: AlignmentLandmarkId, x: number, y: number, z: number) => void;
  clearLandmark: (id: AlignmentLandmarkId) => void;
  clearAllLandmarks: () => void;
  clearSolvedView: () => void;
  setSolvedView: (view: PhotoAlignedView | null) => void;
  setOverlayTransform: (t: ScanOverlayTransform | null) => void;
  applyAdjustment: (delta: Partial<AdjustmentDelta>) => void;
  nudgeScale: (multiplier: number) => void;
  resetAdjustment: () => void;
  getCompletedPairCount: () => number;
  hasRequiredLandmarks: () => boolean;
  isAlignmentComplete: () => boolean;
  canSolve: () => boolean;
  resetAlignment: () => void;
}

export type AlignmentStoreType = AlignmentState & AlignmentActions;

const DEFAULT_LANDMARKS: AlignmentLandmark[] = [
  { id: "midline", anatomicId: "midline", label: "Midline", color: "#00b4d8", required: true, photoCoord: null, modelCoord: null },
  { id: "right-central", anatomicId: "right-central-incisor", label: "Right Central", color: "#4ade80", required: true, photoCoord: null, modelCoord: null },
  { id: "left-central", anatomicId: "left-central-incisor", label: "Left Central", color: "#f59e0b", required: true, photoCoord: null, modelCoord: null },
  { id: "right-lateral", anatomicId: "right-lateral-incisor", label: "Right Lateral", color: "#60a5fa", required: false, photoCoord: null, modelCoord: null },
  { id: "left-lateral", anatomicId: "left-lateral-incisor", label: "Left Lateral", color: "#a78bfa", required: false, photoCoord: null, modelCoord: null },
  { id: "right-canine", anatomicId: "right-canine", label: "Right Canine", color: "#f97316", required: false, photoCoord: null, modelCoord: null },
  { id: "left-canine", anatomicId: "left-canine", label: "Left Canine", color: "#c084fc", required: false, photoCoord: null, modelCoord: null },
  { id: "right-first-premolar", anatomicId: "right-first-premolar", label: "Right 1st Premolar", color: "#fb7185", required: false, photoCoord: null, modelCoord: null },
  { id: "left-first-premolar", anatomicId: "left-first-premolar", label: "Left 1st Premolar", color: "#34d399", required: false, photoCoord: null, modelCoord: null },
  { id: "right-second-premolar", anatomicId: "right-second-premolar", label: "Right 2nd Premolar", color: "#fbbf24", required: false, photoCoord: null, modelCoord: null },
  { id: "left-second-premolar", anatomicId: "left-second-premolar", label: "Left 2nd Premolar", color: "#94a3b8", required: false, photoCoord: null, modelCoord: null },
];

// Bumped version key prevents stale v2 persisted data from conflicting
const ALIGNMENT_STORAGE_KEY = "smilegen-landmark-alignment-v3";

const INITIAL_ALIGNMENT_STATE: AlignmentState = {
  isAlignmentMode: false,
  activeSurface: null,
  activeLandmarkId: null,
  scanInteractionMode: "navigate",
  landmarks: DEFAULT_LANDMARKS,
  overlayTransform: null,
  adjustmentDelta: DEFAULT_ADJUSTMENT_DELTA,
  solvedView: null,
  lastSolveError: null,
  alignmentResult: null,
};

function trySolveAlignment(landmarks: AlignmentLandmark[]): AlignmentResult | null {
  const pairs = landmarks.filter(
    (l) => l.photoCoord !== null && l.modelCoord !== null
  );
  if (pairs.length < 3) return null;

  const correspondences = pairs.map((l) => ({
    id: l.id,
    anatomicId: l.anatomicId,
    photoPoint: l.photoCoord!,
    modelPoint: l.modelCoord!,
    weight: LANDMARK_WEIGHTS[l.id] || 1,
  }));

  const params: ProjectionParams = {
    fov: 45,
    imageWidth: 1000,
    imageHeight: 750,
    principalPoint: { x: 0.5, y: 0.5 },
  };

  try {
    return solveAlignment(correspondences, params);
  } catch {
    return null;
  }
}

function cloneDefaultLandmarks(): AlignmentLandmark[] {
  return DEFAULT_LANDMARKS.map((landmark) => ({ ...landmark }));
}

function updateLandmark(
  landmarks: AlignmentLandmark[],
  id: AlignmentLandmarkId,
  updates: Partial<AlignmentLandmark>
) {
  return landmarks.map((landmark) =>
    landmark.id === id ? { ...landmark, ...updates } : landmark
  );
}

export const useAlignmentStore = create<AlignmentStoreType>()(
  persist(
    (set, get) => ({
      ...INITIAL_ALIGNMENT_STATE,
      landmarks: cloneDefaultLandmarks(),

      setAlignmentMode: (enabled) =>
        set((state) => ({
          isAlignmentMode: enabled,
          activeSurface: enabled ? state.activeSurface ?? "photo" : null,
          activeLandmarkId: enabled ? state.activeLandmarkId ?? "midline" : null,
          scanInteractionMode: enabled ? state.scanInteractionMode : "navigate",
        })),

      // P0 FIX: preserve existing scanInteractionMode when switching back to scan
      setActiveSurface: (surface) =>
        set((state) => ({
          activeSurface: surface,
          scanInteractionMode: surface === "scan" ? state.scanInteractionMode : "navigate",
        })),

      setActiveLandmark: (id) => set({ activeLandmarkId: id }),

      setScanInteractionMode: (mode) => set({ scanInteractionMode: mode }),

setPhotoLandmark: (id, x, y) => set((state) => {
  const updated = updateLandmark(state.landmarks, id, { photoCoord: { x, y } });
  return {
    landmarks: updated,
    alignmentResult: trySolveAlignment(updated),
    overlayTransform: null,
    solvedView: null,
    lastSolveError: null,
  };
}),

setModelLandmark: (id, x, y, z) => set((state) => {
  const updated = updateLandmark(state.landmarks, id, { modelCoord: { x, y, z } });
  return {
    landmarks: updated,
    alignmentResult: trySolveAlignment(updated),
    overlayTransform: null,
    solvedView: null,
    lastSolveError: null,
  };
}),

      clearLandmark: (id) =>
        set((state) => ({
          landmarks: updateLandmark(state.landmarks, id, {
            photoCoord: null,
            modelCoord: null,
          }),
          overlayTransform: null,
          solvedView: null,
          lastSolveError: null,
        })),

clearAllLandmarks: () =>
  set((state) => ({
    landmarks: state.landmarks.map((landmark) => ({
      ...landmark,
      photoCoord: null,
      modelCoord: null,
    })),
    overlayTransform: null,
    solvedView: null,
    lastSolveError: null,
    alignmentResult: null,
  })),

      clearSolvedView: () => set({ solvedView: null, lastSolveError: null }),

      setSolvedView: (view) =>
        set({
          solvedView: view,
          lastSolveError: view?.error ?? null,
        }),

      setOverlayTransform: (t) => set({ overlayTransform: t }),

      applyAdjustment: (delta) =>
        set((state) => ({
          adjustmentDelta: {
            scaleFactor: delta.scaleFactor ?? state.adjustmentDelta.scaleFactor,
            rotation:    (delta.rotation    ?? 0) + state.adjustmentDelta.rotation,
            translateX:  (delta.translateX  ?? 0) + state.adjustmentDelta.translateX,
            translateY:  (delta.translateY  ?? 0) + state.adjustmentDelta.translateY,
          },
        })),

      // Multiplicative scale nudge — used by scroll wheel so each tick compounds.
      nudgeScale: (multiplier) =>
        set((state) => ({
          adjustmentDelta: {
            ...state.adjustmentDelta,
            scaleFactor: Math.max(0.3, Math.min(3.0, state.adjustmentDelta.scaleFactor * multiplier)),
          },
        })),

      resetAdjustment: () => set({ adjustmentDelta: DEFAULT_ADJUSTMENT_DELTA }),

      getCompletedPairCount: () =>
        get().landmarks.filter(
          (landmark) => landmark.photoCoord !== null && landmark.modelCoord !== null
        ).length,

      hasRequiredLandmarks: () =>
        get().landmarks
          .filter((landmark) => landmark.required)
          .every((landmark) => landmark.photoCoord !== null && landmark.modelCoord !== null),

      // Orientation lock: 2 pairs required (can detect flip with right+left central)
      isAlignmentComplete: () =>
        get().getCompletedPairCount() >= 2 && get().hasRequiredLandmarks(),

      canSolve: () => get().getCompletedPairCount() >= 2,

      resetAlignment: () =>
        set({
          ...INITIAL_ALIGNMENT_STATE,
          landmarks: cloneDefaultLandmarks(),
          overlayTransform: null,
          adjustmentDelta: DEFAULT_ADJUSTMENT_DELTA,
        }),
    }),
    {
      name: ALIGNMENT_STORAGE_KEY,
      partialize: (state: AlignmentStoreType) => ({
        isAlignmentMode: state.isAlignmentMode,
        activeSurface: state.activeSurface,
        activeLandmarkId: state.activeLandmarkId,
        scanInteractionMode: state.scanInteractionMode,
        landmarks: state.landmarks,
        adjustmentDelta: state.adjustmentDelta,
        // NOTE: overlayTransform, solvedView, lastSolveError are intentionally
        // EXCLUDED — they are transient, computed at runtime, invalid across sessions.
      }),
    } as never,
  ),
);
