# Alignment Algorithm Bug Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical bugs in the alignment algorithm that cause incorrect landmark lining up.

**Architecture:** Three focused fixes addressing dimension mismatch, camera target consistency, and landmark marker transforms.

**Tech Stack:** TypeScript, React, Zustand, Three.js

---

## Bug Summary

| # | Bug | Severity | Impact |
|---|-----|----------|--------|
| 1 | Hardcoded image dimensions in solver | 🔴 Critical | Scale errors - solver optimizes wrong coordinate space |
| 2 | Camera target hardcoded to origin | 🔴 Critical | Rendering misalignment - camera looks at wrong point |
| 3 | Landmark markers not transformed | 🔴 Critical | Visual inconsistency - markers don't follow mesh |
| 4 | Only 5 DOF optimized | 🟡 Important | Pitch/yaw never adjusted |
| 5 | Principal point offset arbitrary | 🟡 Important | May affect accuracy |
| 6 | No learning rate decay | 🟡 Important | Convergence issues |

---

## Task 1: Fix Hardcoded Image Dimensions

**Problem:** Solver uses hardcoded 1000×750, but projection uses actual view dimensions.

**Files:**
- Modify: `apps/desktop/src/store/useAlignmentStore.ts`
- Modify: `apps/desktop/src/features/overlay/PhotoOverlay.tsx`

### Step 1: Pass view dimensions to solver

**In `useAlignmentStore.ts`:**

The `trySolveAlignment` function needs to accept view dimensions as parameters.

```typescript
// Current (line 164-190):
function trySolveAlignment(landmarks: AlignmentLandmark[]): AlignmentResult | null {
  // ...
  const params: ProjectionParams = {
    fov: 45,
    imageWidth: 1000,  // ❌ HARDCODED
    imageHeight: 750,  // ❌ HARDCODED
    principalPoint: { x: 0.5, y: 0.5 },
  };
  // ...
}

// Fix:
function trySolveAlignment(
  landmarks: AlignmentLandmark[],
  viewWidth: number,
  viewHeight: number
): AlignmentResult | null {
  // ...
  const params: ProjectionParams = {
    fov: 45,
    imageWidth: viewWidth,  // ✅ Use actual
    imageHeight: viewHeight, // ✅ Use actual
    principalPoint: { x: 0.5, y: 0.5 },
  };
  // ...
}
```

### Step 2: Update store to track view dimensions

Add state for view dimensions:

```typescript
// Add to AlignmentState interface
interface AlignmentState {
  // ... existing fields
  viewWidth: number;
  viewHeight: number;
}

// Add to INITIAL_ALIGNMENT_STATE
const INITIAL_ALIGNMENT_STATE: AlignmentState = {
  // ... existing
  viewWidth: 600,
  viewHeight: 450,
};

// Add action
interface AlignmentActions {
  // ... existing
  setViewDimensions: (width: number, height: number) => void;
}

// Implement action
setViewDimensions: (width, height) => set({ 
  viewWidth: width, 
  viewHeight: height 
}),
```

### Step 3: Update PhotoOverlay to set dimensions

```typescript
// In PhotoOverlay.tsx, add effect to sync dimensions
useEffect(() => {
  setViewDimensions(viewWidth, viewHeight);
}, [viewWidth, viewHeight, setViewDimensions]);
```

### Step 4: Update trySolveAlignment calls

```typescript
// Update setPhotoLandmark and setModelLandmark
setPhotoLandmark: (id, x, y) =>
  set((state) => {
    const updated = updateLandmark(state.landmarks, id, { photoCoord: { x, y } });
    return {
      landmarks: updated,
      alignmentResult: trySolveAlignment(updated, state.viewWidth, state.viewHeight),
      // ...
    };
  }),
```

### Step 5: Test

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/
cd apps/desktop && pnpm tsc --noEmit
```

### Step 6: Commit

```bash
git add apps/desktop/src/store/useAlignmentStore.ts apps/desktop/src/features/overlay/PhotoOverlay.tsx
git commit -m "fix(alignment): use actual view dimensions in solver"
```

---

## Task 2: Fix Camera Target Consistency

**Problem:** Solver projects with camera looking at origin, but reports centroid as target.

**Files:**
- Modify: `apps/desktop/src/features/alignment/alignmentSolver.ts`

### Step 1: Use centroid as camera target in projection

**In `alignmentSolver.ts`:**

```typescript
// Current (lines 220-222):
const projected = project3Dto2D(
  transformed,
  cameraPos,
  { x: 0, y: 0, z: 0 },  // ❌ WRONG
  { x: 0, y: 1, z: 0 },
  params
);

// Fix:
const projected = project3Dto2D(
  transformed,
  cameraPos,
  centroid,  // ✅ Use centroid
  { x: 0, y: 1, z: 0 },
  params
);
```

### Step 2: Update camera position initialization

The camera should be positioned relative to centroid:

```typescript
// Current (lines 48-52):
const initialCameraPos = {
  x: centroid.x,
  y: centroid.y - 50,
  z: -initialDistance,
};

// This is already correct - camera is positioned relative to centroid
// But verify that camera looks at centroid (which we fix in step 1)
```

### Step 3: Verify gradient computation uses correct target

```typescript
// In computeGradients (line 227), ensure project3Dto2D uses centroid
const dScale = (
  computeTotalError(correspondences, { ...transform, scale: transform.scale + epsilon }, cameraPos, params) - baseError
) / epsilon;

// computeTotalError should pass centroid to project3Dto2D
// We need to add centroid as parameter to these functions
```

### Step 4: Refactor to pass centroid through

Add centroid parameter to helper functions:

```typescript
// Update computeTotalError signature
function computeTotalError(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  centroid: { x: number; y: number; z: number },  // ADD
  params: ProjectionParams
): number {
  // ...
  const projected = project3Dto2D(
    transformed,
    cameraPos,
    centroid,  // USE
    { x: 0, y: 1, z: 0 },
    params
  );
  // ...
}
```

### Step 5: Update all call sites

```typescript
// In refineAlignment
const prevError = computeTotalError(correspondences, transform, cameraPos, centroid, params);

// In computeGradients
const baseError = computeTotalError(correspondences, transform, cameraPos, centroid, params);
```

### Step 6: Test

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/alignmentSolver.test.ts
cd apps/desktop && pnpm test src/features/alignment/__tests__/integration.test.ts
```

### Step 7: Commit

```bash
git add apps/desktop/src/features/alignment/alignmentSolver.ts
git commit -m "fix(alignment): use centroid as camera target in solver"
```

---

## Task 3: Apply Transform to 3D Landmark Markers

**Problem:** Landmark spheres in SceneCanvas don't use the alignment transform.

**Files:**
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

### Step 1: Import applyTransform

```typescript
// Add to imports
import { applyTransform } from "../alignment/projection";
```

### Step 2: Get alignment result in StlMeshView

```typescript
// In StlMeshView component, get alignmentResult
const alignmentResult = useAlignmentStore((s) => s.alignmentResult);
```

### Step 3: Apply transform to landmark positions

```typescript
// Current (lines 383-387):
{landmarks
  .filter((landmark) => landmark.modelCoord)
  .map((landmark) => {
    const visual = getScanLandmarkVisualState(landmark, activeLandmarkId);
    return (
      <group key={landmark.id} position={[
        landmark.modelCoord!.x - center.x,
        landmark.modelCoord!.y - center.y,
        landmark.modelCoord!.z - center.z,
      ]}>
        {/* ... spheres ... */}
      </group>
    );
  })}

// Fix:
{landmarks
  .filter((landmark) => landmark.modelCoord)
  .map((landmark) => {
    const visual = getScanLandmarkVisualState(landmark, activeLandmarkId);
    
    // Apply transform if alignment exists
    const rawPos = landmark.modelCoord!;
    const pos = alignmentResult?.transform
      ? applyTransform(rawPos, alignmentResult.transform)
      : rawPos;
    
    // Account for mesh centering and scale
    const scale = alignmentResult?.transform.scale ?? 1;
    
    return (
      <group key={landmark.id} position={[
        pos.x - center.x * scale,
        pos.y - center.y * scale,
        pos.z - center.z * scale,
      ]}>
        {/* ... spheres ... */}
      </group>
    );
  })}
```

### Step 4: Test visually

```bash
cd apps/desktop && pnpm dev
```

Verify:
1. Place landmarks on scan
2. Check that landmarks stay in correct position relative to mesh
3. When alignment is solved, markers should follow the transformed mesh

### Step 5: Commit

```bash
git add apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "fix(alignment): apply transform to 3D landmark markers"
```

---

## Task 4: Add Learning Rate Decay

**Problem:** Constant learning rate can cause oscillation or slow convergence.

**Files:**
- Modify: `apps/desktop/src/features/alignment/alignmentSolver.ts`

### Step 1: Add decay to refineAlignment

```typescript
// In refineAlignment function (line 175-202)
for (let iter = 0; iter < config.maxIterations; iter++) {
  // Add decay
  const decayRate = 0.02;
  const effectiveLearningRate = config.learningRate * Math.exp(-iter * decayRate);
  
  const gradients = computeGradients(correspondences, transform, cameraPos, centroid, params);

  transform.scale -= gradients.dScale * effectiveLearningRate;
  transform.rotateZ -= gradients.dRoll * effectiveLearningRate;
  transform.translateX -= gradients.dTx * effectiveLearningRate;
  transform.translateY -= gradients.dTy * effectiveLearningRate;
  cameraPos.z -= gradients.dDist * effectiveLearningRate;
  
  // ... rest of loop
}
```

### Step 2: Test convergence

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/alignmentSolver.test.ts
```

### Step 3: Commit

```bash
git add apps/desktop/src/features/alignment/alignmentSolver.ts
git commit -m "fix(alignment): add learning rate decay for better convergence"
```

---

## Task 5: Expand DOF Optimization

**Problem:** Only 5 DOF optimized; pitch, yaw, and camera X/Y never adjusted.

**Files:**
- Modify: `apps/desktop/src/features/alignment/alignmentSolver.ts`

### Step 1: Add pitch and yaw to gradient computation

```typescript
// In computeGradients, add:
const dPitch = (
  computeTotalError(correspondences, { ...transform, rotateX: transform.rotateX + epsilon }, cameraPos, centroid, params) - baseError
) / epsilon;

const dYaw = (
  computeTotalError(correspondences, { ...transform, rotateY: transform.rotateY + epsilon }, cameraPos, centroid, params) - baseError
) / epsilon;

const dCamX = (
  computeTotalError(correspondences, transform, { ...cameraPos, x: cameraPos.x + epsilon }, centroid, params) - baseError
) / epsilon;

const dCamY = (
  computeTotalError(correspondences, transform, { ...cameraPos, y: cameraPos.y + epsilon }, centroid, params) - baseError
) / epsilon;

return { dScale, dRoll, dPitch, dYaw, dTx, dTy, dDist, dCamX, dCamY };
```

### Step 2: Update refineAlignment to use new gradients

```typescript
// Add to gradient descent loop
transform.rotateX -= gradients.dPitch * effectiveLearningRate;
transform.rotateY -= gradients.dYaw * effectiveLearningRate;
cameraPos.x -= gradients.dCamX * effectiveLearningRate;
cameraPos.y -= gradients.dCamY * effectiveLearningRate;
```

### Step 3: Expand grid search

```typescript
// Add pitch and yaw seeds (lines 57-77)
const pitchSeeds = [-0.05, 0, 0.05];
const yawSeeds = [-0.05, 0, 0.05];

// Now: 5 scale × 5 roll × 3 pitch × 3 yaw = 225 seeds
// Consider reducing iterations or using smarter seeding
```

### Step 4: Test

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/
```

### Step 5: Commit

```bash
git add apps/desktop/src/features/alignment/alignmentSolver.ts
git commit -m "feat(alignment): expand optimization to 9 DOF"
```

---

## Task 6: Fix Principal Point Offset

**Problem:** Arbitrary `* 0.1` multiplier on principal point offset.

**Files:**
- Modify: `apps/desktop/src/features/alignment/projection.ts`

### Step 1: Remove arbitrary multiplier

```typescript
// Current (lines 48-49):
x: Math.max(0, Math.min(1, ndcX + ppOffsetX * 0.1)),
y: Math.max(0, Math.min(1, ndcY + ppOffsetY * 0.1)),

// Fix - remove arbitrary scaling:
x: Math.max(0, Math.min(1, ndcX + ppOffsetX)),
y: Math.max(0, Math.min(1, ndcY + ppOffsetY)),
```

### Step 2: Document principal point usage

Add comment explaining what principal point represents:
```typescript
// Principal point offset shifts the optical center.
// Normalized 0-1 where (0.5, 0.5) is image center.
// Values other than (0.5, 0.5) indicate lens offset or crop.
```

### Step 3: Test

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/projection.test.ts
```

### Step 4: Commit

```bash
git add apps/desktop/src/features/alignment/projection.ts
git commit -m "fix(alignment): remove arbitrary principal point scaling"
```

---

## Verification

After all fixes:

```bash
# Run all alignment tests
cd apps/desktop && pnpm test src/features/alignment/__tests__/

# Type check
cd apps/desktop && pnpm tsc --noEmit

# Manual verification
cd apps/desktop && pnpm dev
# 1. Load case with scan and photo
# 2. Place 3+ landmarks
# 3. Verify alignment looks correct
# 4. Drag landmarks and verify real-time update
# 5. Check landmark markers follow mesh in 3D view
```

---

## Summary of Fixes

| Task | Bug | Fix |
|------|-----|-----|
| 1 | Dimension mismatch | Pass actual view dimensions to solver |
| 2 | Camera target wrong | Use centroid consistently |
| 3 | Markers not transformed | Apply transform to landmark positions |
| 4 | No learning rate decay | Add exponential decay |
| 5 | Only 5 DOF optimized | Expand to 9 DOF |
| 6 | Arbitrary principal point | Remove arbitrary scaling |
