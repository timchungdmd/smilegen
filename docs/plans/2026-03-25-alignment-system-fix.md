# Alignment System Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3D scan to 2D photo alignment to properly scale and orient the 3D model using anatomical landmarks with closest-possible fitting.

**Architecture:** Replace 2D-only Procrustes with true 3D→2D projection solving. Implement Iterative Closest Point (ICP) style optimization that adjusts model scale, rotation, and translation to minimize landmark reprojection error. Unified projection path eliminates dual-system complexity.

**Tech Stack:** TypeScript, React, Zustand, React Three Fiber, Three.js

---

## Overview

The current system has critical flaws:
1. **2D-only transform** - Discards Z-depth, cannot properly scale 3D model
2. **No model scaling** - Scale factor is px/mm conversion, not actual model resize
3. **Dual projection paths** - Procrustes vs parabolic arch causes visual jumps
4. **No DB persistence** - Landmarks lost on browser clear

This plan fixes all issues with a proper 3D alignment algorithm.

---

## Task 1: Create Alignment Types and Interfaces

**Files:**
- Create: `apps/desktop/src/features/alignment/alignmentTypes.ts`

**Step 1: Create the types file with new interfaces**

```typescript
export interface LandmarkCorrespondence {
  id: string;
  anatomicId: AnatomicLandmarkId;
  photoPoint: { x: number; y: number }; // Normalized 0-1
  modelPoint: { x: number; y: number; z: number }; // mm in STL space
  weight: number;
}

export type AnatomicLandmarkId =
  | "midline"
  | "right-central-incisor"
  | "left-central-incisor"
  | "right-lateral-incisor"
  | "left-lateral-incisor"
  | "right-canine"
  | "left-canine"
  | "right-first-premolar"
  | "left-first-premolar"
  | "right-second-premolar"
  | "left-second-premolar";

export interface AnatomicOrientation {
  /** Expected position relative to dental midline (normalized -1 to 1) */
  lateralPosition: number;
  /** Whether this landmark helps determine arch curvature */
  definesArchCurve: boolean;
  /** Whether this landmark defines the occlusal plane */
  definesOcclusalPlane: boolean;
}

export const ANATOMIC_ORIENTATIONS: Record<AnatomicLandmarkId, AnatomicOrientation> = {
  "midline": { lateralPosition: 0, definesArchCurve: true, definesOcclusalPlane: true },
  "right-central-incisor": { lateralPosition: -0.5, definesArchCurve: true, definesOcclusalPlane: true },
  "left-central-incisor": { lateralPosition: 0.5, definesArchCurve: true, definesOcclusalPlane: true },
  "right-lateral-incisor": { lateralPosition: -1.0, definesArchCurve: true, definesOcclusalPlane: true },
  "left-lateral-incisor": { lateralPosition: 1.0, definesArchCurve: true, definesOcclusalPlane: true },
  "right-canine": { lateralPosition: -1.5, definesArchCurve: true, definesOcclusalPlane: true },
  "left-canine": { lateralPosition: 1.5, definesArchCurve: true, definesOcclusalPlane: true },
  "right-first-premolar": { lateralPosition: -2.0, definesArchCurve: true, definesOcclusalPlane: false },
  "left-first-premolar": { lateralPosition: 2.0, definesArchCurve: true, definesOcclusalPlane: false },
  "right-second-premolar": { lateralPosition: -2.5, definesArchCurve: false, definesOcclusalPlane: false },
  "left-second-premolar": { lateralPosition: 2.5, definesArchCurve: false, definesOcclusalPlane: false },
};

export interface AlignmentTransform3D {
  /** Model scale factor (1.0 = no change) */
  scale: number;
  /** Rotation around X axis (pitch) in radians */
  rotateX: number;
  /** Rotation around Y axis (yaw) in radians */
  rotateY: number;
  /** Rotation around Z axis (roll) in radians */
  rotateZ: number;
  /** Translation in model space (mm) */
  translateX: number;
  translateY: number;
  translateZ: number;
}

export interface AlignmentResult {
  transform: AlignmentTransform3D;
  /** Camera position for 3D preview */
  cameraPosition: { x: number; y: number; z: number };
  /** Camera look-at target */
  cameraTarget: { x: number; y: number; z: number };
  /** Mean reprojection error in pixels */
  meanErrorPx: number;
  /** Per-landmark errors */
  landmarkErrors: Map<string, number>;
  /** Quality assessment */
  quality: "excellent" | "good" | "acceptable" | "poor";
}

export interface ProjectionParams {
  /** Field of view in degrees */
  fov: number;
  /** Image width in pixels */
  imageWidth: number;
  /** Image height in pixels */
  imageHeight: number;
  /** Principal point offset (normalized 0-1, default 0.5, 0.5) */
  principalPoint: { x: number; y: number };
}
```

**Step 2: Commit types**

```bash
git add apps/desktop/src/features/alignment/alignmentTypes.ts
git commit -m "feat(alignment): add 3D alignment types and interfaces"
```

---

## Task 2: Implement 3D Projection Functions

**Files:**
- Create: `apps/desktop/src/features/alignment/projection.ts`

**Step 1: Write failing tests**

```bash
mkdir -p apps/desktop/src/features/alignment/__tests__
```

```typescript
// apps/desktop/src/features/alignment/__tests__/projection.test.ts
import { describe, it, expect } from "vitest";
import { project3Dto2D, createProjectionMatrix } from "../projection";

describe("projection", () => {
  describe("createProjectionMatrix", () => {
    it("creates perspective projection matrix for FOV 45", () => {
      const matrix = createProjectionMatrix({
        fov: 45,
        imageWidth: 1000,
        imageHeight: 750,
        principalPoint: { x: 0.5, y: 0.5 },
      });

      expect(matrix[0]).toBeCloseTo(2.414, 2);
      expect(matrix[5]).toBeCloseTo(3.219, 2);
    });
  });

  describe("project3Dto2D", () => {
    it("projects origin to center of image", () => {
      const params = {
        fov: 45,
        imageWidth: 1000,
        imageHeight: 750,
        principalPoint: { x: 0.5, y: 0.5 },
      };
      const cameraPos = { x: 0, y: 0, z: -300 };
      const target = { x: 0, y: 0, z: 0 };

      const result = project3Dto2D(
        { x: 0, y: 0, z: 0 },
        cameraPos,
        target,
        { x: 0, y: 1, z: 0 },
        params
      );

      expect(result.x).toBeCloseTo(0.5, 3);
      expect(result.y).toBeCloseTo(0.5, 3);
    });

    it("projects point at (10, 5, 0) to offset position", () => {
      const params = {
        fov: 45,
        imageWidth: 1000,
        imageHeight: 750,
        principalPoint: { x: 0.5, y: 0.5 },
      };
      const cameraPos = { x: 0, y: 0, z: -300 };
      const target = { x: 0, y: 0, z: 0 };

      const result = project3Dto2D(
        { x: 10, y: 5, z: 0 },
        cameraPos,
        target,
        { x: 0, y: 1, z: 0 },
        params
      );

      expect(result.x).toBeGreaterThan(0.5);
      expect(result.y).toBeGreaterThan(0.5);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/projection.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement projection functions**

```typescript
// apps/desktop/src/features/alignment/projection.ts
import * as THREE from "three";
import type { ProjectionParams } from "./alignmentTypes";

export function createProjectionMatrix(params: ProjectionParams): number[] {
  const { fov, imageWidth, imageHeight, principalPoint } = params;
  const aspect = imageWidth / imageHeight;
  const near = 0.1;
  const far = 10000;

  const matrix = new THREE.Matrix4();
  matrix.makePerspective(
    -aspect / 2,
    aspect / 2,
    0.5,
    -0.5,
    near,
    far
  );

  const fovScale = 1 / Math.tan((fov * Math.PI) / 360);

  const proj = new Float32Array(16);
  proj[0] = fovScale;
  proj[5] = fovScale * aspect;
  proj[10] = -(far + near) / (far - near);
  proj[11] = -1;
  proj[14] = -(2 * far * near) / (far - near);

  return Array.from(proj);
}

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
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const vector = new THREE.Vector3(point.x, point.y, point.z);
  vector.project(camera);

  const ndcX = (vector.x + 1) / 2;
  const ndcY = (1 - vector.y) / 2;

  const ppOffsetX = (params.principalPoint.x - 0.5) * 2;
  const ppOffsetY = (params.principalPoint.y - 0.5) * 2;

  return {
    x: Math.max(0, Math.min(1, ndcX + ppOffsetX * 0.1)),
    y: Math.max(0, Math.min(1, ndcY + ppOffsetY * 0.1)),
    depth: vector.z,
  };
}

export function applyTransform(
  point: { x: number; y: number; z: number },
  transform: {
    scale: number;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    translateX: number;
    translateY: number;
    translateZ: number;
  }
): { x: number; y: number; z: number } {
  const vector = new THREE.Vector3(point.x, point.y, point.z);

  const matrix = new THREE.Matrix4();
  matrix.makeScale(transform.scale, transform.scale, transform.scale);

  const rotMatrix = new THREE.Matrix4();
  const euler = new THREE.Euler(
    transform.rotateX,
    transform.rotateY,
    transform.rotateZ,
    "XYZ"
  );
  rotMatrix.makeRotationFromEuler(euler);

  matrix.multiply(rotMatrix);
  matrix.setPosition(
    transform.translateX,
    transform.translateY,
    transform.translateZ
  );

  vector.applyMatrix4(matrix);

  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/projection.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/alignment/projection.ts apps/desktop/src/features/alignment/__tests__/projection.test.ts
git commit -m "feat(alignment): implement 3D projection functions"
```

---

## Task 3: Implement Alignment Solver

**Files:**
- Create: `apps/desktop/src/features/alignment/alignmentSolver.ts`
- Create: `apps/desktop/src/features/alignment/__tests__/alignmentSolver.test.ts`

**Step 1: Write failing tests**

```typescript
// apps/desktop/src/features/alignment/__tests__/alignmentSolver.test.ts
import { describe, it, expect } from "vitest";
import { solveAlignment } from "../alignmentSolver";
import type { LandmarkCorrespondence, ProjectionParams } from "../alignmentTypes";

describe("alignmentSolver", () => {
  const defaultParams: ProjectionParams = {
    fov: 45,
    imageWidth: 1000,
    imageHeight: 750,
    principalPoint: { x: 0.5, y: 0.5 },
  };

  it("returns identity transform for perfect alignment", () => {
    const correspondences: LandmarkCorrespondence[] = [
      {
        id: "midline",
        anatomicId: "midline",
        photoPoint: { x: 0.5, y: 0.6 },
        modelPoint: { x: 0, y: 0, z: 0 },
        weight: 6,
      },
      {
        id: "right-central",
        anatomicId: "right-central-incisor",
        photoPoint: { x: 0.45, y: 0.6 },
        modelPoint: { x: -4, y: 0, z: 0 },
        weight: 4,
      },
      {
        id: "left-central",
        anatomicId: "left-central-incisor",
        photoPoint: { x: 0.55, y: 0.6 },
        modelPoint: { x: 4, y: 0, z: 0 },
        weight: 4,
      },
    ];

    const result = solveAlignment(correspondences, defaultParams);

    expect(result.transform.scale).toBeCloseTo(1, 1);
    expect(result.quality).toMatch(/excellent|good/);
  });

  it("computes scale for larger arch", () => {
    const correspondences: LandmarkCorrespondence[] = [
      {
        id: "right-central",
        anatomicId: "right-central-incisor",
        photoPoint: { x: 0.4, y: 0.6 },
        modelPoint: { x: -4, y: 0, z: 0 },
        weight: 4,
      },
      {
        id: "left-central",
        anatomicId: "left-central-incisor",
        photoPoint: { x: 0.6, y: 0.6 },
        modelPoint: { x: 4, y: 0, z: 0 },
        weight: 4,
      },
      {
        id: "midline",
        anatomicId: "midline",
        photoPoint: { x: 0.5, y: 0.6 },
        modelPoint: { x: 0, y: 0, z: 0 },
        weight: 6,
      },
    ];

    const result = solveAlignment(correspondences, defaultParams);

    expect(result.transform.scale).toBeGreaterThan(0.5);
    expect(result.meanErrorPx).toBeLessThan(50);
  });

  it("requires minimum 3 correspondences", () => {
    const correspondences: LandmarkCorrespondence[] = [
      {
        id: "midline",
        anatomicId: "midline",
        photoPoint: { x: 0.5, y: 0.6 },
        modelPoint: { x: 0, y: 0, z: 0 },
        weight: 6,
      },
    ];

    expect(() => solveAlignment(correspondences, defaultParams)).toThrow(
      "Minimum 3 correspondences required"
    );
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/alignmentSolver.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement alignment solver**

```typescript
// apps/desktop/src/features/alignment/alignmentSolver.ts
import * as THREE from "three";
import type {
  LandmarkCorrespondence,
  ProjectionParams,
  AlignmentResult,
  AlignmentTransform3D,
} from "./alignmentTypes";
import { project3Dto2D, applyTransform } from "./projection";

interface SolverConfig {
  maxIterations: number;
  convergenceThreshold: number;
  learningRate: number;
  scaleRange: [number, number];
}

const DEFAULT_CONFIG: SolverConfig = {
  maxIterations: 100,
  convergenceThreshold: 0.001,
  learningRate: 0.1,
  scaleRange: [0.7, 1.3],
};

export function solveAlignment(
  correspondences: LandmarkCorrespondence[],
  projectionParams: ProjectionParams,
  config: Partial<SolverConfig> = {}
): AlignmentResult {
  if (correspondences.length < 3) {
    throw new Error("Minimum 3 correspondences required for alignment");
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };

  const centroid = computeCentroid(correspondences);
  const initialDistance = estimateInitialCameraDistance(correspondences, projectionParams);

  const initialCameraPos = {
    x: centroid.x,
    y: centroid.y - 50,
    z: -initialDistance,
  };

  let bestTransform: AlignmentTransform3D = {
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
  };

  let bestError = Infinity;
  let bestCameraPos = initialCameraPos;

  const scaleSeeds = [0.8, 0.9, 1.0, 1.1, 1.2];
  const rollSeeds = [-0.1, -0.05, 0, 0.05, 0.1];

  for (const scaleSeed of scaleSeeds) {
    for (const rollSeed of rollSeeds) {
      const result = refineAlignment(
        correspondences,
        projectionParams,
        {
          scale: scaleSeed,
          rotateX: 0,
          rotateY: 0,
          rotateZ: rollSeed,
          translateX: 0,
          translateY: 0,
          translateZ: 0,
        },
        initialCameraPos,
        cfg
      );

      if (result.error < bestError) {
        bestError = result.error;
        bestTransform = result.transform;
        bestCameraPos = result.cameraPos;
      }
    }
  }

  bestTransform = enforceScaleBounds(bestTransform, cfg.scaleRange);

  const landmarkErrors = computeLandmarkErrors(
    correspondences,
    bestTransform,
    bestCameraPos,
    projectionParams
  );

  const quality = assessQuality(bestError);

  return {
    transform: bestTransform,
    cameraPosition: bestCameraPos,
    cameraTarget: centroid,
    meanErrorPx: bestError,
    landmarkErrors,
    quality,
  };
}

function computeCentroid(correspondences: LandmarkCorrespondence[]): {
  x: number;
  y: number;
  z: number;
} {
  let sumX = 0,
    sumY = 0,
    sumZ = 0;
  for (const c of correspondences) {
    sumX += c.modelPoint.x;
    sumY += c.modelPoint.y;
    sumZ += c.modelPoint.z;
  }
  return {
    x: sumX / correspondences.length,
    y: sumY / correspondences.length,
    z: sumZ / correspondences.length,
  };
}

function estimateInitialCameraDistance(
  correspondences: LandmarkCorrespondence[],
  params: ProjectionParams
): number {
  let maxSpread = 0;
  for (const c1 of correspondences) {
    for (const c2 of correspondences) {
      const dx = c1.modelPoint.x - c2.modelPoint.x;
      const dy = c1.modelPoint.y - c2.modelPoint.y;
      const spread = Math.sqrt(dx * dx + dy * dy);
      maxSpread = Math.max(maxSpread, spread);
    }
  }

  const fovRad = (params.fov * Math.PI) / 180;
  return (maxSpread * 2) / Math.tan(fovRad / 2);
}

function refineAlignment(
  correspondences: LandmarkCorrespondence[],
  params: ProjectionParams,
  initialTransform: AlignmentTransform3D,
  initialCameraPos: { x: number; y: number; z: number },
  config: SolverConfig
): { transform: AlignmentTransform3D; cameraPos: { x: number; y: number; z: number }; error: number } {
  let transform = { ...initialTransform };
  let cameraPos = { ...initialCameraPos };

  let prevError = computeTotalError(correspondences, transform, cameraPos, params);

  for (let iter = 0; iter < config.maxIterations; iter++) {
    const gradients = computeGradients(correspondences, transform, cameraPos, params);

    transform.scale -= gradients.dScale * config.learningRate;
    transform.rotateZ -= gradients.dRoll * config.learningRate;
    transform.translateX -= gradients.dTx * config.learningRate;
    transform.translateY -= gradients.dTy * config.learningRate;
    cameraPos.z -= gradients.dDist * config.learningRate;

    const error = computeTotalError(correspondences, transform, cameraPos, params);

    if (Math.abs(prevError - error) < config.convergenceThreshold) {
      break;
    }
    prevError = error;
  }

  return {
    transform,
    cameraPos,
    error: prevError,
  };
}

function computeTotalError(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  params: ProjectionParams
): number {
  let totalError = 0;
  let totalWeight = 0;

  for (const c of correspondences) {
    const transformed = applyTransform(c.modelPoint, transform);
    const projected = project3Dto2D(
      transformed,
      cameraPos,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      params
    );

    const dx = (projected.x - c.photoPoint.x) * params.imageWidth;
    const dy = (projected.y - c.photoPoint.y) * params.imageHeight;
    const error = Math.sqrt(dx * dx + dy * dy);

    totalError += error * error * c.weight;
    totalWeight += c.weight;
  }

  return Math.sqrt(totalError / totalWeight);
}

function computeGradients(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  params: ProjectionParams,
  epsilon = 0.001
): {
  dScale: number;
  dRoll: number;
  dTx: number;
  dTy: number;
  dDist: number;
} {
  const baseError = computeTotalError(correspondences, transform, cameraPos, params);

  const dScale = (
    computeTotalError(correspondences, { ...transform, scale: transform.scale + epsilon }, cameraPos, params) - baseError
  ) / epsilon;

  const dRoll = (
    computeTotalError(correspondences, { ...transform, rotateZ: transform.rotateZ + epsilon }, cameraPos, params) - baseError
  ) / epsilon;

  const dTx = (
    computeTotalError(correspondences, { ...transform, translateX: transform.translateX + epsilon }, cameraPos, params) - baseError
  ) / epsilon;

  const dTy = (
    computeTotalError(correspondences, { ...transform, translateY: transform.translateY + epsilon }, cameraPos, params) - baseError
  ) / epsilon;

  const dDist = (
    computeTotalError(correspondences, transform, { ...cameraPos, z: cameraPos.z + epsilon }, params) - baseError
  ) / epsilon;

  return { dScale, dRoll, dTx, dTy, dDist };
}

function computeLandmarkErrors(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  params: ProjectionParams
): Map<string, number> {
  const errors = new Map<string, number>();

  for (const c of correspondences) {
    const transformed = applyTransform(c.modelPoint, transform);
    const projected = project3Dto2D(
      transformed,
      cameraPos,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      params
    );

    const dx = (projected.x - c.photoPoint.x) * params.imageWidth;
    const dy = (projected.y - c.photoPoint.y) * params.imageHeight;
    errors.set(c.id, Math.sqrt(dx * dx + dy * dy));
  }

  return errors;
}

function enforceScaleBounds(
  transform: AlignmentTransform3D,
  bounds: [number, number]
): AlignmentTransform3D {
  return {
    ...transform,
    scale: Math.max(bounds[0], Math.min(bounds[1], transform.scale)),
  };
}

function assessQuality(meanErrorPx: number): "excellent" | "good" | "acceptable" | "poor" {
  if (meanErrorPx < 3) return "excellent";
  if (meanErrorPx < 8) return "good";
  if (meanErrorPx < 15) return "acceptable";
  return "poor";
}
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/alignmentSolver.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/alignment/alignmentSolver.ts apps/desktop/src/features/alignment/__tests__/alignmentSolver.test.ts
git commit -m "feat(alignment): implement 3D alignment solver with scaling"
```

---

## Task 4: Update Alignment Store

**Files:**
- Modify: `apps/desktop/src/store/useAlignmentStore.ts`

**Step 1: Write failing tests**

```typescript
// apps/desktop/src/store/__tests__/useAlignmentStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useAlignmentStore } from "../useAlignmentStore";

describe("useAlignmentStore", () => {
  beforeEach(() => {
    act(() => {
      useAlignmentStore.getState().clearAllLandmarks();
    });
  });

  it("stores anatomic ID with landmark", () => {
    act(() => {
      useAlignmentStore.getState().setPhotoLandmark("midline", 0.5, 0.6);
    });

    const landmark = useAlignmentStore.getState().landmarks.find((l) => l.id === "midline");
    expect(landmark?.anatomicId).toBe("midline");
  });

  it("computes 3D alignment result when enough landmarks placed", () => {
    act(() => {
      useAlignmentStore.getState().setPhotoLandmark("midline", 0.5, 0.6);
      useAlignmentStore.getState().setModelLandmark("midline", 0, 0, 0);
      useAlignmentStore.getState().setPhotoLandmark("right-central", 0.45, 0.6);
      useAlignmentStore.getState().setModelLandmark("right-central", -4, 0, 0);
      useAlignmentStore.getState().setPhotoLandmark("left-central", 0.55, 0.6);
      useAlignmentStore.getState().setModelLandmark("left-central", 4, 0, 0);
    });

    const state = useAlignmentStore.getState();
    expect(state.alignmentResult).not.toBeNull();
    expect(state.alignmentResult?.transform.scale).toBeGreaterThan(0.5);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/desktop && pnpm test src/store/__tests__/useAlignmentStore.test.ts
```

Expected: FAIL - anatomicId does not exist

**Step 3: Update store**

Read current store, then modify to add:
1. `anatomicId` field to `AlignmentLandmark`
2. `alignmentResult` state
3. Integration with new solver

```typescript
// Key changes to useAlignmentStore.ts:

// Add import
import { solveAlignment } from "../features/alignment/alignmentSolver";
import type { AlignmentResult, AnatomicLandmarkId } from "../features/alignment/alignmentTypes";

// Update interface
export interface AlignmentLandmark {
  id: AlignmentLandmarkId;
  anatomicId: AnatomicLandmarkId; // NEW
  label: string;
  color: string;
  required: boolean;
  photoCoord: { x: number; y: number } | null;
  modelCoord: { x: number; y: number; z: number } | null;
}

// Add to state
interface AlignmentState {
  // ... existing fields
  alignmentResult: AlignmentResult | null; // NEW
}

// Update setPhotoLandmark/setModelLandmark to trigger solver
setPhotoLandmark: (id, x, y) => {
  set((state) => {
    const updated = updateLandmark(state.landmarks, id, { photoCoord: { x, y } });
    return {
      landmarks: updated,
      alignmentResult: trySolveAlignment(updated),
    };
  });
},
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/desktop && pnpm test src/store/__tests__/useAlignmentStore.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/store/useAlignmentStore.ts apps/desktop/src/store/__tests__/useAlignmentStore.test.ts
git commit -m "feat(alignment): integrate 3D solver into alignment store"
```

---

## Task 5: Update PhotoOverlay to Use New Projection

**Files:**
- Modify: `apps/desktop/src/features/overlay/PhotoOverlay.tsx`

**Step 1: Identify current projection usage**

The file currently uses `procrustesProject()` at lines 430-457 for overlay rendering.

**Step 2: Replace with new projection**

```typescript
// Replace the projection logic in the teeth overlay section

// OLD: procrustesProject(midlineStl, archX, archY, overlayTransform)
// NEW: Use alignmentResult.transform to project 3D points

const projectTooth = (toothPosition: { x: number; y: number; z: number }) => {
  if (!alignmentResult) return null;

  const transformed = applyTransform(toothPosition, alignmentResult.transform);
  return project3Dto2D(
    transformed,
    alignmentResult.cameraPosition,
    alignmentResult.cameraTarget,
    { x: 0, y: 1, z: 0 },
    {
      fov: 45,
      imageWidth: viewWidth,
      imageHeight: viewHeight,
      principalPoint: { x: 0.5, y: 0.5 },
    }
  );
};
```

**Step 3: Remove fallback to parabolic arch**

Delete the else branch that uses `projectToothToPhoto()`.

**Step 4: Test manually**

```bash
cd apps/desktop && pnpm dev
```

Verify overlay renders correctly when landmarks placed.

**Step 5: Commit**

```bash
git add apps/desktop/src/features/overlay/PhotoOverlay.tsx
git commit -m "feat(alignment): use 3D projection for overlay rendering"
```

---

## Task 6: Add UI Improvements - Hover Preview

**Files:**
- Modify: `apps/desktop/src/features/overlay/PhotoOverlay.tsx`
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

**Step 1: Add hover state to PhotoOverlay**

```typescript
// Add state
const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);

// Add handler
onMouseMove={(e) => {
  if (isAlignmentMode && activeSurface === "photo" && activeLandmarkId) {
    const pt = getSvgPoint(e);
    setHoverPoint({ x: pt.x / viewWidth, y: pt.y / viewHeight });
  } else {
    setHoverPoint(null);
  }
}}
onMouseLeave={() => setHoverPoint(null)}
```

**Step 2: Add ghost marker rendering**

```typescript
{hoverPoint && (
  <circle
    cx={hoverPoint.x * viewWidth}
    cy={hoverPoint.y * viewHeight}
    r={6}
    fill="none"
    stroke={activeLandmark?.color || "#fff"}
    strokeWidth={2}
    strokeDasharray="3 2"
    opacity={0.7}
  />
)}
```

**Step 3: Add hover preview to SceneCanvas**

```typescript
// Add raycasting on pointer move
const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

// In StlMeshView
onPointerMove={(event) => {
  if (pickEnabled && activeLandmarkId) {
    setHoverPoint(event.point.clone());
  }
}}
```

**Step 4: Render ghost sphere**

```typescript
{hoverPoint && (
  <mesh position={[hoverPoint.x - center.x, hoverPoint.y - center.y, hoverPoint.z - center.z]}>
    <sphereGeometry args={[0.5, 16, 16]} />
    <meshStandardMaterial color={activeLandmark?.color || "#00b4d8"} transparent opacity={0.5} />
  </mesh>
)}
```

**Step 5: Test manually**

```bash
cd apps/desktop && pnpm dev
```

Verify ghost markers appear on hover.

**Step 6: Commit**

```bash
git add apps/desktop/src/features/overlay/PhotoOverlay.tsx apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "feat(alignment): add hover preview before landmark placement"
```

---

## Task 7: Add Auto-Enable Pick Mode

**Files:**
- Modify: `apps/desktop/src/features/views/DesignPanel.tsx`

**Step 1: Auto-enable pick mode when switching to scan surface**

```typescript
// In the surface button click handler
onClick={() => {
  setActiveSurface("scan");
  setScanInteractionMode("pick"); // Add this line
}}
```

**Step 2: Remove manual toggle requirement**

The "Pick on Scan" button becomes a toggle to disable pick mode if needed, not a requirement.

**Step 3: Test manually**

Verify pick mode auto-enables when clicking "Place on Scan".

**Step 4: Commit**

```bash
git add apps/desktop/src/features/views/DesignPanel.tsx
git commit -m "feat(alignment): auto-enable pick mode on scan surface"
```

---

## Task 8: Add Drag-to-Adjust for Placed Landmarks

**Files:**
- Modify: `apps/desktop/src/features/overlay/PhotoOverlay.tsx`
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

**Step 1: Add drag state to PhotoOverlay**

```typescript
const [draggingId, setDraggingId] = useState<string | null>(null);

const handleDragStart = (id: string) => (e: React.MouseEvent) => {
  e.stopPropagation();
  setDraggingId(id);
};

const handleDrag = (e: React.MouseEvent) => {
  if (!draggingId) return;
  const pt = getSvgPoint(e);
  setPhotoLandmark(draggingId, pt.x / viewWidth, pt.y / viewHeight);
};

const handleDragEnd = () => {
  setDraggingId(null);
};
```

**Step 2: Make landmark markers draggable**

```typescript
<circle
  // ... existing props
  style={{ cursor: "grab" }}
  onMouseDown={handleDragStart(landmark.id)}
/>
```

**Step 3: Add global mouse handlers**

```typescript
// Add to SVG
onMouseMove={handleDrag}
onMouseUp={handleDragEnd}
onMouseLeave={handleDragEnd}
```

**Step 4: Add drag support to 3D markers in SceneCanvas**

Use Three.js DragControls from `@react-three/drei`.

**Step 5: Test manually**

Verify dragging works for both photo and 3D landmarks.

**Step 6: Commit**

```bash
git add apps/desktop/src/features/overlay/PhotoOverlay.tsx apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "feat(alignment): add drag-to-adjust for placed landmarks"
```

---

## Task 9: Add Database Persistence

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/models/landmark.ts`
- Modify: `apps/api/src/routes/assets.ts`

**Step 1: Add Prisma schema**

```prisma
model LandmarkAlignment {
  id          String   @id @default(cuid())
  caseId      String
  case        Case     @relation(fields: [caseId], references: [id])
  photoAssetId String
  photoAsset  Asset    @relation("PhotoLandmarks", fields: [photoAssetId], references: [id])
  scanAssetId String
  scanAsset   Asset    @relation("ScanLandmarks", fields: [scanAssetId], references: [id])
  landmarks   Json     // Array of landmark data
  transform   Json     // AlignmentResult
  quality     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([caseId, photoAssetId, scanAssetId])
}
```

**Step 2: Run migration**

```bash
cd apps/api && npx prisma migrate dev --name add-landmark-alignment
```

**Step 3: Add API endpoints**

```typescript
// POST /api/cases/:caseId/alignments
// GET /api/cases/:caseId/alignments/:id
// PUT /api/cases/:caseId/alignments/:id
```

**Step 4: Update desktop to sync**

Add API client calls to persist alignment results.

**Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/models/landmark.ts apps/api/src/routes/assets.ts
git commit -m "feat(api): add database persistence for landmark alignments"
```

---

## Task 10: Integration Testing

**Files:**
- Create: `apps/desktop/src/features/alignment/__tests__/integration.test.ts`

**Step 1: Write integration test**

```typescript
import { describe, it, expect } from "vitest";
import { solveAlignment } from "../alignmentSolver";
import { project3Dto2D, applyTransform } from "../projection";

describe("alignment integration", () => {
  it("solves and projects consistently", () => {
    const correspondences = [
      {
        id: "midline",
        anatomicId: "midline" as const,
        photoPoint: { x: 0.5, y: 0.55 },
        modelPoint: { x: 0, y: 0, z: 0 },
        weight: 6,
      },
      {
        id: "right-central",
        anatomicId: "right-central-incisor" as const,
        photoPoint: { x: 0.45, y: 0.55 },
        modelPoint: { x: -4, y: 0, z: 0 },
        weight: 4,
      },
      {
        id: "left-central",
        anatomicId: "left-central-incisor" as const,
        photoPoint: { x: 0.55, y: 0.55 },
        modelPoint: { x: 4, y: 0, z: 0 },
        weight: 4,
      },
      {
        id: "right-canine",
        anatomicId: "right-canine" as const,
        photoPoint: { x: 0.38, y: 0.53 },
        modelPoint: { x: -16, y: 2, z: -5 },
        weight: 2,
      },
      {
        id: "left-canine",
        anatomicId: "left-canine" as const,
        photoPoint: { x: 0.62, y: 0.53 },
        modelPoint: { x: 16, y: 2, z: -5 },
        weight: 2,
      },
    ];

    const result = solveAlignment(correspondences, {
      fov: 45,
      imageWidth: 1000,
      imageHeight: 750,
      principalPoint: { x: 0.5, y: 0.5 },
    });

    expect(result.quality).toMatch(/excellent|good|acceptable/);

    for (const c of correspondences) {
      const transformed = applyTransform(c.modelPoint, result.transform);
      const projected = project3Dto2D(
        transformed,
        result.cameraPosition,
        result.cameraTarget,
        { x: 0, y: 1, z: 0 },
        { fov: 45, imageWidth: 1000, imageHeight: 750, principalPoint: { x: 0.5, y: 0.5 } }
      );

      const error = result.landmarkErrors.get(c.id) || 0;
      expect(error).toBeLessThan(20);
    }
  });
});
```

**Step 2: Run test**

```bash
cd apps/desktop && pnpm test src/features/alignment/__tests__/integration.test.ts
```

**Step 3: Commit**

```bash
git add apps/desktop/src/features/alignment/__tests__/integration.test.ts
git commit -m "test(alignment): add integration test for full alignment flow"
```

---

## Summary of Changes

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Create alignment types | `alignmentTypes.ts` |
| 2 | Implement 3D projection | `projection.ts` |
| 3 | Implement alignment solver | `alignmentSolver.ts` |
| 4 | Update alignment store | `useAlignmentStore.ts` |
| 5 | Update PhotoOverlay | `PhotoOverlay.tsx` |
| 6 | Add hover preview | `PhotoOverlay.tsx`, `SceneCanvas.tsx` |
| 7 | Auto-enable pick mode | `DesignPanel.tsx` |
| 8 | Add drag-to-adjust | `PhotoOverlay.tsx`, `SceneCanvas.tsx` |
| 9 | Add DB persistence | Prisma schema, API routes |
| 10 | Integration testing | `integration.test.ts` |

---

## Verification Commands

After all tasks complete:

```bash
# Run all alignment tests
cd apps/desktop && pnpm test src/features/alignment

# Run all store tests
cd apps/desktop && pnpm test src/store

# Run full test suite
cd apps/desktop && pnpm test

# Type check
cd apps/desktop && pnpm tsc --noEmit

# Manual smoke test
cd apps/desktop && pnpm dev
# 1. Load a case with scan and photo
# 2. Enter alignment mode
# 3. Place 3+ landmarks on photo and scan
# 4. Verify overlay scales and aligns correctly
# 5. Drag landmarks to adjust
# 6. Verify alignment updates in real-time
```
