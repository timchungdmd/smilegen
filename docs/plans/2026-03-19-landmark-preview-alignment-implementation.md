# Landmark Preview Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the old photo-in-3D alignment system with a single landmark-based workflow that uses the photo overlay for 2D landmark placement and the persistent right-side 3D scan preview for matching 3D landmark placement.

**Architecture:** A single alignment store owns landmark pairs, active placement state, and solved preview pose. `PhotoOverlay.tsx` places 2D landmarks, `SceneCanvas.tsx` places 3D landmarks and renders scan markers, and `photoAlignment.ts` solves the best-fit camera pose from matched landmark pairs. All legacy wizard/calibration paths are removed.

**Tech Stack:** React, Zustand, React Three Fiber, Three.js, Vitest, Testing Library

---

### Task 1: Replace legacy alignment store state with landmark-pair state

**Files:**
- Modify: `apps/desktop/src/store/useAlignmentStore.ts`
- Modify: `apps/desktop/src/store/useViewportStore.ts`
- Test: `apps/desktop/src/store/useAlignmentStore.test.ts` (create if missing)

**Step 1: Write the failing store tests**

Cover:

- default landmark set exists
- setting photo landmark updates only that pair
- setting model landmark updates only that pair
- completed pair count is derived correctly
- solve readiness is `false` under 3 pairs and `true` at 3+
- reset clears solved pose and landmark coords

**Step 2: Run the targeted store test**

Run: `cd apps/desktop && npx vitest run src/store/useAlignmentStore.test.ts`

Expected: FAIL because the new alignment store API does not exist yet.

**Step 3: Rewrite `useAlignmentStore.ts`**

Implement:

- landmark pair model
- `isAlignmentMode`
- `activeSurface`
- `activeLandmarkId`
- `solvedView`
- `lastSolveError`
- actions for setting photo/model landmark coords, selecting active landmark, resetting, and storing solve results

Delete:

- `scanReferencePoints`
- `showPhotoIn3D`
- measurement/calibration fields that only support the old system
- stale wizard toggles

**Step 4: Update `useViewportStore.ts` facade**

Remove:

- auto-enable logic tied to `scanReferencePoints`
- legacy alignment key routing for removed fields

Add:

- new alignment keys routed through the facade only where still needed by legacy callers

**Step 5: Run the targeted store tests again**

Run: `cd apps/desktop && npx vitest run src/store/useAlignmentStore.test.ts`

Expected: PASS.

### Task 2: Convert photo alignment math to generic landmark-pair solving

**Files:**
- Modify: `apps/desktop/src/features/alignment/photoAlignment.ts`
- Modify: `apps/desktop/src/features/alignment/photoAlignment.test.ts`
- Modify: `apps/desktop/src/features/alignment/photoAlignmentRuntime.test.ts`

**Step 1: Write failing solver tests**

Add tests for:

- solving from 3 generic landmark pairs
- lower solve error with 4-5 landmarks than with 3 in a stable fixture
- returning `null` when fewer than 3 complete pairs are provided

**Step 2: Run the targeted solver tests**

Run: `cd apps/desktop && npx vitest run src/features/alignment/photoAlignment.test.ts src/features/alignment/photoAlignmentRuntime.test.ts`

Expected: FAIL because the solver still expects `ScanReferencePoints`.

**Step 3: Refactor `photoAlignment.ts`**

Implement:

- generic `AlignmentLandmarkPair[]` input
- helper to extract complete correspondences
- solve result with `PhotoAlignedView` plus error metric
- compatibility-free path that no longer depends on central-only reference structs

Remove:

- `computePhotoAlignedView`
- `resolvePhotoAlignedView` signatures tied to `ScanReferencePoints`

**Step 4: Run targeted tests**

Run: `cd apps/desktop && npx vitest run src/features/alignment/photoAlignment.test.ts src/features/alignment/photoAlignmentRuntime.test.ts`

Expected: PASS.

### Task 3: Add landmark placement UI to `PhotoOverlay`

**Files:**
- Modify: `apps/desktop/src/features/overlay/PhotoOverlay.tsx`
- Modify: `apps/desktop/src/features/overlay/PhotoOverlayToolbar.tsx`
- Test: `apps/desktop/src/features/overlay/PhotoOverlay.test.tsx` (create if missing)

**Step 1: Write failing component tests**

Cover:

- entering alignment mode exposes landmark UI
- clicking the photo sets the active landmark photo coordinate
- tooth drag is suppressed while alignment mode is active
- landmark markers render with expected labels/colors

**Step 2: Run the targeted component test**

Run: `cd apps/desktop && npx vitest run src/features/overlay/PhotoOverlay.test.tsx`

Expected: FAIL because the UI and event gating do not exist.

**Step 3: Implement the photo-side UI**

Add:

- alignment mode controls
- active landmark chooser
- click-to-place landmark behavior
- visible 2D markers and completion state

Gate off:

- old guide dragging while in alignment mode
- tooth movement while placing landmarks

**Step 4: Run the targeted component test**

Run: `cd apps/desktop && npx vitest run src/features/overlay/PhotoOverlay.test.tsx`

Expected: PASS.

### Task 4: Add scan landmark placement UI to the persistent preview

**Files:**
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx`
- Modify: `apps/desktop/src/features/viewer/ContextMenu.tsx`
- Test: `apps/desktop/src/features/viewer/SceneCanvas.test.tsx` (create if missing or extend existing viewer tests)

**Step 1: Write failing preview tests**

Cover:

- preview header shows alignment controls when photo and scan exist
- scan pick mode toggles independently from navigation
- placed scan landmarks render in the scene model layer
- `Solve` button enables only after 3 complete landmark pairs

**Step 2: Run the targeted tests**

Run: `cd apps/desktop && npx vitest run src/features/viewer/SceneCanvas.test.tsx`

Expected: FAIL because the new controls do not exist.

**Step 3: Implement preview-side alignment controls**

Add:

- header controls in `Workspace.tsx` or a small extracted preview-toolbar component
- pick/navigate toggle
- solve/reset actions
- solve status text

Implement in `SceneCanvas.tsx`:

- raycast-based model landmark placement
- 3D marker rendering
- camera snap back to solved pose

Remove from `SceneCanvas.tsx`:

- old `showPhotoIn3D` overlay alignment path
- old photo-aligned context menu actions
- old references to `scanReferencePoints`

**Step 4: Run targeted tests**

Run: `cd apps/desktop && npx vitest run src/features/viewer/SceneCanvas.test.tsx`

Expected: PASS.

### Task 5: Delete legacy alignment UI and stale code paths

**Files:**
- Delete: `apps/desktop/src/features/capture/AlignmentCalibrationWizard.tsx`
- Delete: `apps/desktop/src/features/capture/AlignmentCalibrationWizard.test.tsx`
- Delete: `apps/desktop/src/features/capture/AlignmentScanViewer.tsx` if no longer used
- Delete: `apps/desktop/src/features/alignment/AlignmentWizard.tsx`
- Delete: `apps/desktop/src/features/alignment/AlignmentWizardContent.tsx`
- Delete: `apps/desktop/src/features/alignment/AlignmentWizardTabs.tsx`
- Delete: `apps/desktop/src/features/alignment/store/useAlignmentWizardStore.ts`
- Delete: `apps/desktop/src/features/alignment/panels/AnalysisPanel.tsx`
- Delete: `apps/desktop/src/features/alignment/panels/LinesPanel.tsx`
- Modify: any imports/tests still referencing removed files

**Step 1: Remove legacy imports and dead routes**

Update references in:

- `App.tsx`
- `App.test.tsx`
- `CaptureView.tsx`
- any context menu or header components still mentioning the old wizard

**Step 2: Run a focused grep to find dangling references**

Run: `rg -n "AlignmentCalibrationWizard|AlignmentScanViewer|scanReferencePoints|showPhotoIn3D|AlignmentWizard|useAlignmentWizardStore" apps/desktop/src`

Expected: no references except intentionally preserved compatibility comments or replacement names.

**Step 3: Delete the dead files**

Use `apply_patch` deletions only after references are removed.

**Step 4: Run targeted app tests**

Run: `cd apps/desktop && npx vitest run src/App.test.tsx src/features/views/CaptureView.test.tsx`

Expected: PASS.

### Task 6: Integrate the new flow into the design-stage UX

**Files:**
- Modify: `apps/desktop/src/features/views/SimulateView.tsx`
- Modify: `apps/desktop/src/features/design/DesignToolbar.tsx`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Modify: `apps/desktop/src/features/views/ImportView.tsx` only if legacy alignment entry points still appear there

**Step 1: Surface the new entry points**

Make alignment discoverable from:

- photo overlay controls
- preview header controls

Remove:

- old “show photo in 3D” language
- old alignment wizard affordances

**Step 2: Validate stage flow**

Ensure:

- importing a scan no longer auto-launches old alignment state
- Design stage uses the new alignment workflow without modal interruption

**Step 3: Run focused UI tests**

Run: `cd apps/desktop && npx vitest run src/features/views/CaptureView.test.tsx src/features/views/SimulateView.tsx`

Expected: if a `SimulateView` test file does not exist, add one and run it instead.

### Task 7: Full verification and cleanup

**Files:**
- Modify only as needed for broken imports/test expectations

**Step 1: Run project-level desktop tests**

Run: `cd apps/desktop && npx vitest run`

Expected: PASS.

**Step 2: Run type/build verification if available**

Run: `cd apps/desktop && pnpm exec tsc --noEmit`

Expected: PASS.

**Step 3: Final grep for legacy alignment vocabulary**

Run: `rg -n "showPhotoIn3D|scanReferencePoints|AlignmentCalibrationWizard|buildCalibrationFromIncisalPoints|computePhotoAlignedView" apps/desktop/src`

Expected: only intentionally retained compatibility-free references remain, ideally none.

**Step 4: Review git diff**

Run: `git diff -- apps/desktop/src apps/desktop/src-tauri docs/plans`

Expected: diff shows one coherent replacement flow and no unrelated reversions.

**Step 5: Commit**

```bash
git add apps/desktop/src docs/plans
git commit -m "refactor(alignment): replace photo-in-3d with landmark preview workflow"
```
