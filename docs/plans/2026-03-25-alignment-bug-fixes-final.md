# Alignment Algorithm Bug Fixes - Final Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical bugs in the alignment algorithm that cause incorrect landmark lining up.

**Architecture:** Four focused tasks addressing dimension mismatch, camera target, landmark transforms, and optimizer improvements.

**Tech Stack:** TypeScript, React, Zustand, Three.js

---

## Critical Bugs Summary

| # | Bug | Severity | Root Cause |
|---|-----|----------|------------|
| 1 | Hardcoded image dimensions | 🔴 Critical | Solver uses 1000×750, projection uses actual view |
| 2 | Camera target mismatch | 🔴 Critical | Solver projects to origin, reports centroid as target |
| 3 | Untransformed markers | 🔴 Critical | Landmark spheres don't follow transformed mesh |
| 4 | Incomplete optimization | 🟡 Important | Only 5 DOF, missing pitch/yaw and camera X/Y |
| 5 | No learning rate decay | 🟡 Important | Can oscillate or converge slowly |
| 6 | Arbitrary principal point | 🟡 Important | `* 0.1` multiplier has no basis |

---

## Task 1: Fix Hardcoded Image Dimensions

**Problem:** `trySolveAlignment` uses hardcoded 1000×750, but actual view dimensions vary.

**Files:**
- `apps/desktop/src/store/useAlignmentStore.ts`
- `apps/desktop/src/features/overlay/PhotoOverlay.tsx`

### Step 1: Add view dimensions to store state

**In `useAlignmentStore.ts`:**

Add to `AlignmentState` interface (around line 107):
```typescript
interface AlignmentState {
  // ... existing fields
  alignmentResult: AlignmentResult | null;
  viewWidth: number;  // NEW
  viewHeight: number; // NEW
}
```

Add to `INITIAL_ALIGNMENT_STATE` (around line 158):
```typescript
const INITIAL_ALIGNMENT_STATE: AlignmentState = {
  // ... existing fields
  alignmentResult: null,
  viewWidth: 600,  // NEW - default
  viewHeight: 450, // NEW - 4:3 aspect ratio
};
```

Add action to `AlignmentActions` interface:
```typescript
interface AlignmentActions {
  // ... existing actions
  setViewDimensions: (width: number, height: number) => void;
}
```

### Step 2: Implement `setViewDimensions` action

Add to store implementation (around line 306):
```typescript
setViewDimensions: (width, height) => set((state) => {
  if (state.viewWidth === width && state.viewHeight === height) {
    return {}; // No change
  }
  const hasEnoughPairs = state.landmarks.filter(
    l => l.photoCoord && l.modelCoord
  ).length >= 3;
  return {
    viewWidth: width,
    viewHeight: height,
    alignmentResult: hasEnoughPairs 
      ? trySolveAlignment(state.landmarks, width, height) 
      : null,
  };
}),
```

### Step 3: Update `trySolveAlignment` signature

Change from:
```typescript
function trySolveAlignment(landmarks: AlignmentLandmark[]): AlignmentResult | null
```

To:
```typescript
function trySolveAlignment(
  landmarks: AlignmentLandmark[],
  viewWidth: number,
  viewHeight: number
): AlignmentResult | null {
  // ...
  const params: ProjectionParams = {
    fov: 45,
    imageWidth: viewWidth,  // CHANGED
    imageHeight: viewHeight, // CHANGED
    principalPoint: { x: 0.5, y: 0.5 },
  };
  // ...
}
```

### Step 4: Update call sites in store

Update `setPhotoLandmark` and `setModelLandmark`:
```typescript
setPhotoLandmark: (id, x, y) => set((state) => {
  const updated = updateLandmark(state.landmarks, id, { photoCoord: { x, y } });
  return {
    landmarks: updated,
    alignmentResult: trySolveAlignment(updated, state.viewWidth, state.viewHeight),
    // ...
  };
}),
```

### Step 5: Sync dimensions from PhotoOverlay

**In `PhotoOverlay.tsx`:**

Add selector and effect:
```typescript
const setViewDimensions = useAlignmentStore((s) => s.setViewDimensions);

useEffect(() => {
  setViewDimensions(viewWidth, viewHeight);
}, [viewWidth, viewHeight, setViewDimensions]);
```

### Step 6: Exclude from persistence

In `partialize`, view dimensions should NOT persist:
```typescript
partialize: (state) => ({
  // ... existing persisted fields
  // viewWidth and viewHeight intentionally EXCLUDED
}),
```

### Step 7: Test

```bash
cd apps/desktop && pnpm test src/store/__tests__/useAlignmentStore.test.ts
```

### Step 8: Commit

```bash
git add apps/desktop/src/store/useAlignmentStore.ts apps/desktop/src/features/overlay/PhotoOverlay.tsx
git commit -m "fix(alignment): use actual view dimensions in solver"
```

---

## Task 2: Fix Camera Target Consistency

**Problem:** Solver projects with camera looking at origin, but reports centroid as target.

**Files:**
- `apps/desktop/src/features/alignment/alignmentSolver.ts`

### Step 1: Add `cameraTarget` parameter to `computeTotalError`

Update function signature (line 206):
```typescript
function computeTotalError(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number }, // NEW
  params: ProjectionParams
): number
```

Update body (line 220):
```typescript
// BEFORE:
const projected = project3Dto2D(
  transformed,
  cameraPos,
  { x: 0, y: 0, z: 0 },  // REMOVE
  { x: 0, y: 1, z: 0 },
  params
);

// AFTER:
const projected = project3Dto2D(
  transformed,
  cameraPos,
  cameraTarget,  // USE PARAMETER
  { x: 0, y: 1, z: 0 },
  params
);
```

### Step 2: Add `cameraTarget` to `computeLandmarkErrors`

Update function signature (line 309):
```typescript
function computeLandmarkErrors(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number }, // NEW
  params: ProjectionParams
): Map<string, number>
```

Update body (line 322):
```typescript
const projected = project3Dto2D(
  transformed,
  cameraPos,
  cameraTarget,  // USE PARAMETER
  { x: 0, y: 1, z: 0 },
  params
);
```

### Step 3: Add `cameraTarget` to `refineAlignment`

Update function signature (line 161):
```typescript
function refineAlignment(
  correspondences: LandmarkCorrespondence[],
  params: ProjectionParams,
  initialTransform: AlignmentTransform3D,
  initialCameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number }, // NEW
  config: SolverConfig
)
```

### Step 4: Add `cameraTarget` to `computeGradients`

Update signature and all `computeTotalError` calls.

### Step 5: Update all call sites

In `solveAlignment` (around lines 62-92):
```typescript
const result = refineAlignment(
  correspondences,
  projectionParams,
  { /* transform */ },
  initialCameraPos,
  centroid,  // NEW - pass centroid
  cfg
);

// ...

const landmarkErrors = computeLandmarkErrors(
  correspondences,
  bestTransform,
  bestCameraPos,
  centroid,  // NEW - pass centroid
  projectionParams
);
```

### Step 6: Test

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/alignmentSolver.test.ts
```

### Step 7: Commit

```bash
git add apps/desktop/src/features/alignment/alignmentSolver.ts
git commit -m "fix(alignment): use centroid as camera target consistently"
```

---

## Task 3: Apply Transform to 3D Landmark Markers

**Problem:** Landmark spheres don't follow the transformed mesh.

**Files:**
- `apps/desktop/src/features/viewer/SceneCanvas.tsx`

### Step 1: Add transform helper function

Add before `StlMeshView` component (around line 240):
```typescript
function applyLandmarkTransform(
  point: { x: number; y: number; z: number },
  center: THREE.Vector3,
  transform: AlignmentTransform3D | undefined
): [number, number, number] {
  if (!transform) {
    return [point.x - center.x, point.y - center.y, point.z - center.z];
  }
  
  const { scale, rotateX, rotateY, rotateZ, translateX, translateY, translateZ } = transform;
  
  // 1. Center offset
  const centered = new THREE.Vector3(
    point.x - center.x,
    point.y - center.y,
    point.z - center.z
  );
  
  // 2. Apply scale
  const scaled = centered.clone().multiplyScalar(scale);
  
  // 3. Apply rotation
  const euler = new THREE.Euler(rotateX, rotateY, rotateZ, 'XYZ');
  const rotated = scaled.clone().applyEuler(euler);
  
  // 4. Apply translation (accounting for center offset)
  return [
    rotated.x + translateX,
    rotated.y + translateY,
    rotated.z + translateZ,
  ];
}
```

### Step 2: Add inverse transform helper

```typescript
function inverseLandmarkTransform(
  worldPoint: THREE.Vector3,
  center: THREE.Vector3,
  transform: AlignmentTransform3D | undefined
): { x: number; y: number; z: number } {
  if (!transform) {
    return {
      x: worldPoint.x + center.x,
      y: worldPoint.y + center.y,
      z: worldPoint.z + center.z,
    };
  }
  
  const { scale, rotateX, rotateY, rotateZ, translateX, translateY, translateZ } = transform;
  
  // Inverse of translation
  const afterTranslate = new THREE.Vector3(
    worldPoint.x - translateX,
    worldPoint.y - translateY,
    worldPoint.z - translateZ
  );
  
  // Inverse of rotation
  const invEuler = new THREE.Euler(-rotateX, -rotateY, -rotateZ, 'ZYX');
  const afterRotation = afterTranslate.clone().applyEuler(invEuler);
  
  // Inverse of scale
  const afterScale = afterRotation.clone().divideScalar(scale);
  
  // Add back center offset
  return {
    x: afterScale.x + center.x,
    y: afterScale.y + center.y,
    z: afterScale.z + center.z,
  };
}
```

### Step 3: Update landmark rendering

Replace lines 381-387:
```typescript
// BEFORE:
<group key={landmark.id} position={[
  landmark.modelCoord!.x - center.x,
  landmark.modelCoord!.y - center.y,
  landmark.modelCoord!.z - center.z,
]}>

// AFTER:
<group key={landmark.id} position={
  applyLandmarkTransform(landmark.modelCoord!, center, transform)
}>
```

### Step 4: Update hover preview rendering

Replace lines 429-440:
```typescript
// BEFORE:
<mesh position={[hoverPoint.x - center.x, hoverPoint.y - center.y, hoverPoint.z - center.z]}>

// AFTER:
<mesh position={
  applyLandmarkTransform(
    { x: hoverPoint.x, y: hoverPoint.y, z: hoverPoint.z },
    center,
    transform
  )
}>
```

### Step 5: Update pick handlers

**onPointerDown (line 329):**
```typescript
onPointerDown={(event) => {
  if (!pickEnabled || !onPickPoint) return;
  event.stopPropagation();
  const modelCoord = inverseLandmarkTransform(event.point, center, transform);
  onPickPoint(modelCoord);
}}
```

**onPointerMove drag handler (line 338):**
```typescript
onPointerMove={(event) => {
  if (draggingLandmarkId && setModelLandmark) {
    const modelCoord = inverseLandmarkTransform(event.point, center, transform);
    setModelLandmark(draggingLandmarkId, modelCoord.x, modelCoord.y, modelCoord.z);
  } else if (pickEnabled && activeLandmarkId) {
    setHoverPoint(event.point.clone());
  } else {
    setHoverPoint(null);
  }
}}
```

### Step 6: Get transform in StlMeshView

Add selector:
```typescript
const alignmentResult = useAlignmentStore((s) => s.alignmentResult);
const transform = alignmentResult?.transform;
```

### Step 7: Test manually

```bash
cd apps/desktop && pnpm dev
```

Verify:
1. Landmarks stay on correct surface points when mesh is transformed
2. Picking new landmarks works correctly
3. Dragging landmarks works correctly
4. Hover preview follows transformed surface

### Step 8: Commit

```bash
git add apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "fix(alignment): apply transform to 3D landmark markers"
```

---

## Task 4: Improve Optimizer (9 DOF + Decay + Principal Point)

**Problems:**
- Only 5 DOF optimized
- No learning rate decay
- Arbitrary principal point multiplier

**Files:**
- `apps/desktop/src/features/alignment/alignmentSolver.ts`
- `apps/desktop/src/features/alignment/projection.ts`

### Step 1: Fix principal point in projection.ts

**In `project3Dto2D` function:**

Remove the arbitrary multiplier and use THREE.js `setViewOffset`:

```typescript
export function project3Dto2D(
  point: { x: number; y: number; z: number },
  cameraPosition: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  cameraUp: { x: number; y: number; z: number },
  params: ProjectionParams
): { x: number; y: number; depth: number } {
  const camera = new THREE.PerspectiveCamera(
    params.fov,
    params.imageWidth / params.imageHeight,
    0.1,
    10000
  );

  camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
  camera.lookAt(new THREE.Vector3(cameraTarget.x, cameraTarget.y, cameraTarget.z));
  
  // Apply principal point offset via THREE.js view offset
  const ppOffsetX = (params.principalPoint.x - 0.5) * params.imageWidth;
  const ppOffsetY = (params.principalPoint.y - 0.5) * params.imageHeight;
  camera.setViewOffset(
    params.imageWidth,
    params.imageHeight,
    ppOffsetX,
    ppOffsetY,
    params.imageWidth,
    params.imageHeight
  );
  
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const vector = new THREE.Vector3(point.x, point.y, point.z);
  vector.project(camera);

  const ndcX = (vector.x + 1) / 2;
  const ndcY = (1 - vector.y) / 2;

  return {
    x: Math.max(0, Math.min(1, ndcX)),
    y: Math.max(0, Math.min(1, ndcY)),
    depth: vector.z,
  };
}
```

### Step 2: Update SolverConfig interface

Add learning rate decay and parameter bounds:

```typescript
interface SolverConfig {
  maxIterations: number;
  convergenceThreshold: number;
  learningRate: number;
  scaleRange: [number, number];
  // NEW: Learning rate decay
  decayRate: number;
  decaySteps: number;
  minLearningRate: number;
  // NEW: Parameter bounds
  rotationRange: [number, number];
  translationRange: [number, number];
}

const DEFAULT_CONFIG: SolverConfig = {
  maxIterations: 100,
  convergenceThreshold: 0.001,
  learningRate: 0.01,
  scaleRange: [0.7, 1.3],
  decayRate: 0.95,
  decaySteps: 10,
  minLearningRate: 0.0001,
  rotationRange: [-0.5, 0.5],
  translationRange: [-50, 50],
};
```

### Step 3: Expand gradients to 9 DOF

Add new gradient interface and compute function:

```typescript
interface Gradients9DOF {
  dScale: number;
  dRotateX: number;
  dRotateY: number;
  dRotateZ: number;
  dTranslateX: number;
  dTranslateY: number;
  dTranslateZ: number;
  dCameraX: number;
  dCameraY: number;
  dCameraZ: number;
}

const EPSILONS = {
  scale: 0.001,
  rotate: 0.001,
  translate: 0.01,
  camera: 0.1,
};

function computeGradients9DOF(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  params: ProjectionParams
): Gradients9DOF {
  const baseError = computeTotalError(correspondences, transform, cameraPos, cameraTarget, params);
  
  const gradientForParam = (param: keyof AlignmentTransform3D, epsilon: number): number => {
    const modified = { ...transform, [param]: transform[param] + epsilon };
    return (computeTotalError(correspondences, modified, cameraPos, cameraTarget, params) - baseError) / epsilon;
  };
  
  return {
    dScale: gradientForParam('scale', EPSILONS.scale),
    dRotateX: gradientForParam('rotateX', EPSILONS.rotate),
    dRotateY: gradientForParam('rotateY', EPSILONS.rotate),
    dRotateZ: gradientForParam('rotateZ', EPSILONS.rotate),
    dTranslateX: gradientForParam('translateX', EPSILONS.translate),
    dTranslateY: gradientForParam('translateY', EPSILONS.translate),
    dTranslateZ: gradientForParam('translateZ', EPSILONS.translate),
    dCameraX: (computeTotalError(correspondences, transform, { ...cameraPos, x: cameraPos.x + EPSILONS.camera }, cameraTarget, params) - baseError) / EPSILONS.camera,
    dCameraY: (computeTotalError(correspondences, transform, { ...cameraPos, y: cameraPos.y + EPSILONS.camera }, cameraTarget, params) - baseError) / EPSILONS.camera,
    dCameraZ: (computeTotalError(correspondences, transform, { ...cameraPos, z: cameraPos.z + EPSILONS.camera }, cameraTarget, params) - baseError) / EPSILONS.camera,
  };
}
```

### Step 4: Update refinement loop with decay

```typescript
function refineAlignment(
  correspondences: LandmarkCorrespondence[],
  params: ProjectionParams,
  initialTransform: AlignmentTransform3D,
  initialCameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  config: SolverConfig
): { transform: AlignmentTransform3D; cameraPos: { x: number; y: number; z: number }; error: number } {
  let transform = { ...initialTransform };
  let cameraPos = { ...initialCameraPos };
  let prevError = computeTotalError(correspondences, transform, cameraPos, cameraTarget, params);
  
  const baseLearningRate = config.learningRate;
  
  for (let iter = 0; iter < config.maxIterations; iter++) {
    // Exponential decay
    const decayFactor = Math.pow(config.decayRate, Math.floor(iter / config.decaySteps));
    const learningRate = Math.max(config.minLearningRate, baseLearningRate * decayFactor);
    
    const gradients = computeGradients9DOF(correspondences, transform, cameraPos, cameraTarget, params);
    
    // Apply gradients
    transform.scale -= gradients.dScale * learningRate;
    transform.rotateX -= gradients.dRotateX * learningRate;
    transform.rotateY -= gradients.dRotateY * learningRate;
    transform.rotateZ -= gradients.dRotateZ * learningRate;
    transform.translateX -= gradients.dTranslateX * learningRate;
    transform.translateY -= gradients.dTranslateY * learningRate;
    transform.translateZ -= gradients.dTranslateZ * learningRate;
    cameraPos.x -= gradients.dCameraX * learningRate;
    cameraPos.y -= gradients.dCameraY * learningRate;
    cameraPos.z -= gradients.dCameraZ * learningRate;
    
    // Enforce bounds
    transform = enforceBounds(transform, config);
    
    const error = computeTotalError(correspondences, transform, cameraPos, cameraTarget, params);
    
    if (Math.abs(prevError - error) < config.convergenceThreshold) {
      break;
    }
    prevError = error;
  }
  
  return { transform, cameraPos, error: prevError };
}
```

### Step 5: Add bounds enforcement

```typescript
function enforceBounds(
  transform: AlignmentTransform3D,
  config: SolverConfig
): AlignmentTransform3D {
  return {
    scale: Math.max(config.scaleRange[0], Math.min(config.scaleRange[1], transform.scale)),
    rotateX: Math.max(config.rotationRange[0], Math.min(config.rotationRange[1], transform.rotateX)),
    rotateY: Math.max(config.rotationRange[0], Math.min(config.rotationRange[1], transform.rotateY)),
    rotateZ: Math.max(config.rotationRange[0], Math.min(config.rotationRange[1], transform.rotateZ)),
    translateX: Math.max(config.translationRange[0], Math.min(config.translationRange[1], transform.translateX)),
    translateY: Math.max(config.translationRange[0], Math.min(config.translationRange[1], transform.translateY)),
    translateZ: Math.max(config.translationRange[0], Math.min(config.translationRange[1], transform.translateZ)),
  };
}
```

### Step 6: Test

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/
cd apps/desktop && pnpm tsc --noEmit
```

### Step 7: Commit

```bash
git add apps/desktop/src/features/alignment/alignmentSolver.ts apps/desktop/src/features/alignment/projection.ts
git commit -m "feat(alignment): expand to 9 DOF with learning rate decay"
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
```

**Manual test checklist:**
1. Load case with scan and photo
2. Place 3+ landmarks
3. Verify alignment looks correct
4. Check landmarks follow mesh in 3D view
5. Drag landmarks and verify real-time update
6. Test with different aspect ratio photos
7. Verify scale is correct (measure tooth width in photo vs scan)

---

## Summary

| Task | Files Modified | Lines Changed |
|------|----------------|---------------|
| 1 | useAlignmentStore.ts, PhotoOverlay.tsx | ~50 |
| 2 | alignmentSolver.ts | ~30 |
| 3 | SceneCanvas.tsx | ~60 |
| 4 | alignmentSolver.ts, projection.ts | ~100 |

**Total estimated changes:** ~240 lines across 5 files
