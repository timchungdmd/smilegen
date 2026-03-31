# Landmark Preview Alignment Design

**Date:** 2026-03-19  
**Status:** Approved

## Problem

The current photo-to-scan alignment system is split across multiple unfinished paths:

- A legacy `showPhotoIn3D` flow in `SceneCanvas.tsx`
- A persisted `scanReferencePoints` / calibration model in `useAlignmentStore.ts`
- A full-screen `AlignmentCalibrationWizard.tsx`
- A newer but stale `AlignmentWizard.tsx` path

This creates two problems:

1. The right-side `3D Scan Preview` does not act as the primary alignment surface.
2. Alignment state is fragmented across old guide-based calibration, photo-in-3D camera fitting, and partial landmark workflows.

The requested behavior is to align real 3D scan geometry to the photo overlay viewport using matched landmarks, while keeping the scan fully 3D instead of flattening it into a fake 2D object.

## Goals

1. Use the existing photo overlay viewport as the 2D landmark placement surface.
2. Use the persistent right-side `3D Scan Preview` as the 3D landmark placement surface.
3. Keep the scan navigable as a true 3D object during landmark placement.
4. Solve alignment from matched landmark pairs rather than old commissure/guide calibration.
5. Remove every old alignment system that conflicts with this workflow.
6. Keep zoom and navigation available so the user can approximate landmarks accurately.

## Non-Goals

1. No fake 2D projection mode for the scan.
2. No separate modal wizard as the primary alignment workflow.
3. No automatic landmark detection as a dependency for the first implementation.
4. No support for maintaining both old and new alignment models.

## Chosen Approach

Use a single landmark-driven alignment model shared by two surfaces:

- `PhotoOverlay.tsx` owns 2D landmark placement on the patient photo.
- The right-side `3D Scan Preview` in `Workspace.tsx` + `SceneCanvas.tsx` owns 3D landmark placement on the scan.

The user places named landmarks on both subjects. Once enough landmark pairs exist, the system computes a best-fit camera pose for the scan preview. That pose becomes the alignment result displayed in the persistent preview, while the photo overlay remains the reference surface for visual comparison.

This keeps the scan truly 3D, matches the current workspace layout, and avoids inventing a second alignment UI.

## Landmark Model

Use one source of truth in `useAlignmentStore.ts`.

```ts
type AlignmentLandmarkId =
  | "midline"
  | "left-central"
  | "right-central"
  | "left-canine"
  | "right-canine";

interface AlignmentLandmarkPair {
  id: AlignmentLandmarkId;
  label: string;
  color: string;
  required: boolean;
  photoCoord: { x: number; y: number } | null; // normalized 0..1
  modelCoord: { x: number; y: number; z: number } | null; // STL/model space mm
}
```

Required solve threshold:

- Minimum: 3 completed pairs
- Preferred: 4 or 5 completed pairs

The store also keeps:

- `activeSurface: "photo" | "scan" | null`
- `activeLandmarkId: AlignmentLandmarkId | null`
- `isAlignmentMode: boolean`
- `solvedView: PhotoAlignedView | null`
- `lastSolveError: number | null`

## User Workflow

### Enter alignment mode

The Design stage exposes a dedicated alignment toggle from the photo overlay and/or preview header controls.

When enabled:

- The photo overlay shows landmark chips and photo placement controls.
- The right-side preview shows matching landmark chips and scan placement controls.
- The active landmark is shared across both surfaces.

### Place photo landmarks

In `PhotoOverlay.tsx`:

- Clicking the photo places the active landmark's `photoCoord`.
- Photo zoom/pan remains available.
- Existing tooth dragging must not interfere while alignment mode is active.

### Place scan landmarks

In `SceneCanvas.tsx`:

- Clicking the scan mesh while scan-pick mode is active raycasts and stores `modelCoord`.
- Trackball controls remain available when not actively picking or via an explicit pick/navigate toggle.
- 3D markers render on the mesh for all placed scan landmarks.

### Solve alignment

When the minimum number of matched pairs exists:

- Compute a best-fit preview pose using the landmark solver in `photoAlignment.ts`.
- Apply the solved camera pose to the persistent `3D Scan Preview`.
- Keep a manual "Re-solve" action available after edits.

## Camera / Solve Strategy

Retain the existing multi-point pose fitting direction from `photoAlignment.ts`, but make it the only alignment mechanism.

Changes:

1. Remove dependency on `ScanReferencePoints` and central-only calibration.
2. Accept generic named landmark pairs from the new store.
3. Keep the existing best-fit pose search/refinement approach because it already supports multiple 2D/3D correspondences.
4. Return both solved pose and solve error so the UI can indicate alignment quality.

This is lower risk than inventing a new rigid transform system because the codebase already contains tested pose-fitting behavior for multi-point correspondences.

## UI Changes

### Photo overlay

`PhotoOverlay.tsx` gains:

- Alignment mode banner / toolbar
- Landmark list with active selection
- Click-to-place photo landmarks
- Rendered 2D landmark markers
- Disable tooth drag and old guide manipulation while alignment mode is active

### 3D Scan Preview

`Workspace.tsx` and `SceneCanvas.tsx` gain:

- Alignment controls in the `3D Scan Preview` header
- Scan pick / navigate toggle
- Landmark status chips
- 3D landmark marker rendering
- "Solve" / "Reset alignment" actions

### Preview behavior

The preview remains a normal 3D viewer:

- Rotate, pan, zoom still work
- Solved alignment updates camera pose, not mesh flattening
- User can temporarily move away, then snap back to solved alignment

## Deletion List

The new system replaces, not extends, the old alignment model.

Remove or retire:

- `showPhotoIn3D` behavior as the alignment driver
- `scanReferencePoints` state and related actions
- measurement-based scaling state if it is only used by old alignment
- `AlignmentCalibrationWizard.tsx`
- `AlignmentScanViewer.tsx` if its logic is fully absorbed by `SceneCanvas.tsx`
- stale `AlignmentWizard.tsx` and `features/alignment/store/useAlignmentWizardStore.ts`
- old auto-enable logic in `useViewportStore.ts` tied to `scanReferencePoints`
- context menu actions and UI labels that reference the old photo-aligned view

## Critique Of The Initial Plan

### Risk 1: Extending two stores would preserve state drift

If the new landmark workflow were added beside the old calibration state, `SceneCanvas`, `PhotoOverlay`, and the workspace shell would each be able to read different alignment truth. That would make bugs hard to reason about.

Revision:

- Keep exactly one alignment store and migrate consumers to it.

### Risk 2: Forcing strict pick mode would make scan placement slow

If rotation were disabled during scan landmark placement, users would have trouble locating cusp tips and central edges precisely.

Revision:

- Keep scan navigation intact and separate it from point placement with a clear mode or modifier.

### Risk 3: Solving automatically on every click may create jitter

Constant camera re-solving after each partial edit can feel unstable and visually noisy.

Revision:

- Solve only when enough matched pairs exist and prefer an explicit `Solve` action, with optional auto-solve once the interaction is stable.

### Risk 4: Photo overlay interaction conflicts

`PhotoOverlay.tsx` already supports dragging teeth, guides, markers, panning, and zooming. Adding landmark placement without mode gating would produce accidental edits.

Revision:

- Alignment mode must suspend old photo alignment gestures and tooth movement on the overlay surface.

## Research Notes From Codebase

1. `Workspace.tsx` already provides the persistent right-side preview shell. No new layout container is needed.
2. `SceneCanvas.tsx` already contains camera animation, raycast-capable mesh rendering, and photo-aligned pose logic that can be repurposed.
3. `photoAlignment.ts` already has a multi-point fitting path that is a better foundation than the old guide-derived calibration functions.
4. `useViewportStore.ts` currently auto-enables old alignment behavior when entering Design, which must be removed with the legacy state.
5. `AlignmentWizard.tsx` appears stale against the current import store contract and should not be used as a base.

## Testing Strategy

1. Unit test the new landmark-to-pose solver input path in `photoAlignment.test.ts`.
2. Add store tests for landmark placement, completion counts, solve readiness, and reset behavior.
3. Add component tests for:
   - photo landmark placement in `PhotoOverlay`
   - alignment controls in preview header
   - mode switching between navigate and pick
4. Remove or rewrite legacy alignment wizard tests that no longer reflect shipped behavior.

## Final Design Summary

The final design is a direct replacement of the old alignment system with a single landmark-based workflow:

- Photo landmarks are placed in the photo overlay viewport.
- Matching 3D landmarks are placed in the persistent right-side scan preview.
- The scan remains fully 3D and navigable.
- The alignment result is a solved preview camera pose derived from matched landmark pairs.
- Old guide-based and wizard-based alignment code is removed to prevent split behavior.
