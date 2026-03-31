# Landmark Alignment Comprehensive Fix - BigTech Implementation Plan

> **Mission:** Fix landmark alignment algorithm so 3D landmarks are placed ON mesh surface and 2D-3D alignment is correct.

---

## Executive Summary

**Root Cause Analysis:**
The core issue is a conceptual confusion between **2D overlay transforms** (used for photo-to-scan alignment) and **3D mesh transforms** (used in the Three.js scene). The `AlignmentTransform3D` interface is being misused to carry 2D Procrustes results, causing:
- Scale mismatch (px/mm vs unitless)
- Translation unit mismatch (px vs mm)
- Inconsistent Y-axis handling

**Key Insight:** The 2D overlay alignment should NOT transform the 3D mesh. Instead:
- 3D mesh remains at identity transform (scale=1, rotation=0, translation=0)
- 2D overlay uses Procrustes transform for SVG projection
- 3D landmarks are stored in original STL coordinates (no scaling applied)

---

## Pre-Implementation Nuance Check

### Question 1: Should the 3D mesh be transformed at all?
**Answer:** NO. The mesh should stay at origin with scale=1. The "alignment" is for 2D photo overlay projection, not 3D manipulation.

### Question 2: What should `AlignmentTransform3D.scale` represent?
**Answer:** For 3D scene, scale should always be 1.0 (or possibly a uniform mm→world unit conversion, which is already 1:1). The `overlayTransform.scale` (px/mm) is only for 2D projection.

### Question 3: Are landmarks stored correctly?
**Answer:** `modelCoord` stores the original STL coordinates from raycast. This is correct. The bug is that `transform.scale` is being applied when rendering, causing landmarks to appear offset from the mesh.

### Question 4: Why does the current code apply scale to the mesh?
**Answer:** Historical confusion. The original design likely tried to scale the mesh to match photo dimensions, but this is wrong—mesh stays in mm, photo overlay scales.

---

## Transaction Manifest

| Phase | Description | Files Modified | Risk Level |
|-------|-------------|----------------|------------|
| P0 | Remove mesh scale transform | SceneCanvas.tsx, useAlignmentStore.ts | High |
| P1 | Remove mesh translation transform | SceneCanvas.tsx | Medium |
| P2 | Add surface snapping validation | SceneCanvas.tsx | Low |
| P3 | Fix Y-axis consistency | scanOverlayAlignment.ts | Medium |
| P4 | Update tests | *.test.ts | Low |

---

## Phase 0: Remove Mesh Scale Transform (CRITICAL)

**Dependency:** Must be done first—other transforms depend on scale=1.

### File: `apps/desktop/src/store/useAlignmentStore.ts`

**Change 0.1:** Modify `trySolveAlignment` to set scale=1 for 3D transform.

**Lines 188-196:**
```typescript
// BEFORE:
const transform: AlignmentTransform3D = {
  scale: overlayTransform.scale, // BUG: This is px/mm, not unitless
  rotateX: 0,
  rotateY: 0,
  rotateZ: overlayTransform.rotation,
  translateX: overlayTransform.translateX, // BUG: This is in px
  translateY: overlayTransform.translateY, // BUG: This is in px
  translateZ: 0,
};

// AFTER:
const transform: AlignmentTransform3D = {
  scale: 1.0, // 3D scale is always 1.0; overlay scale is for 2D projection only
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0, // 3D rotation is NOT the same as 2D overlay rotation
  translateX: 0, // 3D translation is 0; mesh stays centered
  translateY: 0,
  translateZ: 0,
};
```

**Rationale:** The 3D mesh should not be scaled/translated. The `AlignmentTransform3D` is being misused. For alignment mode, the mesh stays at origin and the camera may move, but the mesh itself is not transformed.

### File: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

**Change 0.2:** Remove scale application in mesh positioning.

**Lines 377-385:**
```typescript
// BEFORE:
<mesh
  geometry={geometry}
  scale={transform?.scale ?? 1}
  rotation={[transform?.rotateX ?? 0, transform?.rotateY ?? 0, transform?.rotateZ ?? 0]}
  position={[
    (transform?.translateX ?? 0) - center.x * (transform?.scale ?? 1),
    (transform?.translateY ?? 0) - center.y * (transform?.scale ?? 1),
    (transform?.translateZ ?? 0) - center.z * (transform?.scale ?? 1)
  ]}
  // ...
>

// AFTER:
<mesh
  geometry={geometry}
  scale={1}
  rotation={[0, 0, 0]}
  position={[-center.x, -center.y, -center.z]}
  // ...
>
```

**Change 0.3:** Simplify `applyLandmarkTransform` for identity case.

**Lines 242-268:**
```typescript
// BEFORE: Complex transform with scale, rotation, translation

// AFTER:
function applyLandmarkTransform(
  point: { x: number; y: number; z: number },
  center: THREE.Vector3,
  transform: AlignmentTransform3D | undefined
): [number, number, number] {
  // Mesh is always centered at origin with scale=1, no rotation
  // modelCoord is stored in original STL coordinates
  // We just subtract center to convert to world space
  return [point.x - center.x, point.y - center.y, point.z - center.z];
}
```

**Change 0.4:** Simplify `inverseLandmarkTransform`.

**Lines 270-294:**
```typescript
// BEFORE: Complex matrix inversion

// AFTER:
function inverseLandmarkTransform(
  worldPoint: THREE.Vector3,
  center: THREE.Vector3,
  transform: AlignmentTransform3D | undefined
): { x: number; y: number; z: number } {
  // Convert world space back to original STL coordinates
  // Since mesh is at scale=1, no rotation, centered at origin:
  // worldPoint = modelPoint - center
  // So: modelPoint = worldPoint + center
  return { 
    x: worldPoint.x + center.x, 
    y: worldPoint.y + center.y, 
    z: worldPoint.z + center.z 
  };
}
```

---

## Phase 1: Verify Mesh Centering Logic

**Dependency:** Phase 0 must be complete.

### Validation

After Phase 0, verify:
1. Mesh renders at correct size (unchanged from import)
2. Landmarks placed via raycast appear exactly on mesh surface
3. No "floating" effect

### File: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

**Change 1.1:** Add debug logging for landmark placement (temporary).

Add after line 389 (inside `onPointerDown`):
```typescript
if (!pickEnabled || !onPickPoint) return;
event.stopPropagation();
const modelCoord = inverseLandmarkTransform(event.point, center, transform);
console.log('[SceneCanvas] Landmark placed:', {
  worldPoint: { x: event.point.x.toFixed(2), y: event.point.y.toFixed(2), z: event.point.z.toFixed(2) },
  modelCoord: { x: modelCoord.x.toFixed(2), y: modelCoord.y.toFixed(2), z: modelCoord.z.toFixed(2) },
  center: { x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2) }
});
onPickPoint(modelCoord);
```

**Remove this debug logging after verification passes.**

---

## Phase 2: Add Surface Snapping Validation (Enhancement)

**Dependency:** Phase 0 and 1 complete.

### File: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

**Change 2.1:** Add raycast validation to ensure point is on mesh surface.

**Add new function before `StlMeshView`:**
```typescript
function validatePointOnMesh(
  point: THREE.Vector3,
  geometry: THREE.BufferGeometry,
  maxDistance: number = 0.5
): boolean {
  // Check if point is within mesh bounds with tolerance
  const bbox = geometry.boundingBox;
  if (!bbox) return true; // No bounds, skip validation
  
  const tolerance = new THREE.Vector3(maxDistance, maxDistance, maxDistance);
  const expandedMin = bbox.min.clone().sub(tolerance);
  const expandedMax = bbox.max.clone().add(tolerance);
  
  return point.x >= expandedMin.x && point.x <= expandedMax.x &&
         point.y >= expandedMin.y && point.y <= expandedMax.y &&
         point.z >= expandedMin.z && point.z <= expandedMax.z;
}
```

**Change 2.2:** Use validation in `onPointerDown`.

Modify lines 386-391:
```typescript
onPointerDown={(event) => {
  if (!pickEnabled || !onPickPoint) return;
  event.stopPropagation();
  
  const modelCoord = inverseLandmarkTransform(event.point, center, transform);
  
  // Validate point is on mesh surface
  if (!validatePointOnMesh(event.point, geometry)) {
    console.warn('[SceneCanvas] Click point outside mesh bounds, ignoring');
    return;
  }
  
  onPickPoint(modelCoord);
}}
```

---

## Phase 3: Fix Y-Axis Consistency

**Dependency:** Phase 0 complete.

### Current State Analysis

The Y-axis handling is **actually correct** in most places:
- `scanOverlayAlignment.ts:119`: Negates Y when building pairs for 2D projection (correct)
- `useAlignmentStore.ts:209`: Negates Y when computing error (correct for 2D projection)

The confusion is that this Y-negation is for **2D projection only**, not for 3D rendering.

### File: `apps/desktop/src/features/alignment/alignmentTypes.ts`

**Change 3.1:** Update documentation to clarify Y-axis handling.

**Lines 1-10:**
```typescript
/**
 * COORDINATE SYSTEM CONVENTIONS:
 *
 * Photo space: (0,0) = top-left, +X = right, +Y = down, normalized 0-1
 * Scan space: (0,0,0) = midline at occlusal plane, +X = patient-left, +Y = gingival (up), +Z = posterior
 * SVG space: (0,0) = top-left, +X = right, +Y = down, in pixels
 *
 * Y-axis note: Scan Y is inverted relative to photo/SVG because dental scans use +Y = gingival (up in mouth),
 * while photos use +Y = down (screen coordinates). The 2D Procrustes solver handles this inversion internally
 * when projecting scan points to photo space. The 3D scene does NOT apply this inversion.
 *
 * 3D World space (Three.js):
 * - Mesh is centered at origin with vertices in original STL coordinates
 * - +Y = gingival (up in mouth), same as scan space
 * - modelCoord is stored in original STL coordinates (no Y inversion)
 * - Landmark spheres are positioned at modelCoord - center (world space)
 */
```

---

## Phase 4: Update Tests

**Dependency:** All previous phases complete.

### File: `apps/desktop/src/store/__tests__/useAlignmentStore.test.ts`

**Change 4.1:** Update test expectations for scale=1.

**Lines 34-36:**
```typescript
// BEFORE:
expect(state.alignmentResult?.transform.scale).toBeGreaterThan(0.5);

// AFTER:
expect(state.alignmentResult?.transform.scale).toBe(1.0); // 3D scale is always 1.0
expect(state.alignmentResult?.meanErrorPx).toBeLessThan(5); // Should have low error
```

### File: `apps/desktop/src/features/alignment/scanOverlayAlignment.test.ts`

No changes needed—these tests validate the 2D Procrustes algorithm which is correct.

---

## Phase 5: Integration Testing

### Manual Verification Checklist

1. **Import a dental scan** (STL file)
2. **Enter alignment mode**
3. **Place landmark on photo** (click on a tooth)
4. **Place landmark on scan** (click on same tooth in 3D view)
5. **Verify:** Landmark sphere appears exactly on mesh surface (not floating)
6. **Place all 5 required landmarks**
7. **Click "Align"**
8. **Verify:** Overlay shows scan aligned with photo
9. **Verify:** Residual error is reasonable (< 10px)

### Automated Test Scenarios

```typescript
describe('Landmark surface placement', () => {
  it('places landmarks on mesh surface after scale fix', () => {
    // Setup: Load a known mesh with known bounds
    // Place landmark at known position
    // Verify: landmark.modelCoord is within mesh bounds
    // Verify: applying transform positions sphere on surface
  });
});
```

---

## Validation Criteria

| Phase | Validation | Expected Outcome |
|-------|------------|------------------|
| P0 | Mesh renders | Mesh at original scale (no 15x scaling) |
| P0 | Landmarks visible | Spheres appear ON mesh surface |
| P1 | Debug logs | worldPoint + center = modelCoord |
| P2 | Out-of-bounds click | Warning logged, click ignored |
| P3 | Documentation | Clear Y-axis convention docs |
| P4 | Tests pass | All tests green |
| P5 | Manual test | Alignment works end-to-end |

---

## Rollback Strategy

### If Phase 0 causes issues:

1. Revert `useAlignmentStore.ts` to use `overlayTransform.scale`
2. Revert `SceneCanvas.tsx` mesh transform
3. Investigate: Check if other code depends on mesh scaling

### If Phase 1 shows incorrect centering:

1. Keep scale fix (Phase 0)
2. Review mesh centering logic in `stlParser.ts`
3. Verify `center` calculation in `StlMeshView`

### If overlay alignment breaks:

1. The 2D Procrustes transform (`overlayTransform`) is still computed correctly
2. Issue is in how overlay uses the transform
3. Check `PhotoOverlay.tsx` for `toSvgTransform` usage

---

## Commit Strategy

Each phase should be a separate commit:

```bash
# Phase 0
git add apps/desktop/src/store/useAlignmentStore.ts apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "fix: remove erroneous mesh scale/rotation transform in alignment mode

The 3D mesh should remain at identity transform (scale=1, no rotation).
The 2D Procrustes overlay transform is for photo projection only.

Fixes: landmarks appearing far from mesh surface"

# Phase 1 (debug logging, temporary)
git add apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "debug: add landmark placement logging for verification"

# Phase 2
git add apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "feat: add surface snapping validation for landmark placement"

# Phase 3
git add apps/desktop/src/features/alignment/alignmentTypes.ts
git commit -m "docs: clarify Y-axis handling in coordinate system conventions"

# Phase 4
git add apps/desktop/src/store/__tests__/useAlignmentStore.test.ts
git commit -m "test: update expectations for 3D scale=1.0"
```

---

## Summary of Code Changes

| File | Lines Changed | Change Type |
|------|---------------|-------------|
| `useAlignmentStore.ts` | 188-196 | Set scale=1, rotation=0, translation=0 |
| `SceneCanvas.tsx` | 377-385 | Remove mesh transform application |
| `SceneCanvas.tsx` | 242-268 | Simplify applyLandmarkTransform |
| `SceneCanvas.tsx` | 270-294 | Simplify inverseLandmarkTransform |
| `alignmentTypes.ts` | 1-10 | Update documentation |
| `useAlignmentStore.test.ts` | 34-36 | Update test expectations |

---

## Estimated Timeline

| Phase | Estimated Time |
|-------|----------------|
| P0: Remove mesh scale | 30 min |
| P1: Verify centering | 15 min |
| P2: Surface snapping | 20 min |
| P3: Y-axis docs | 10 min |
| P4: Update tests | 15 min |
| P5: Integration test | 30 min |
| **Total** | **2 hours** |

---

## Aesthetic Guidelines Compliance

- No purple colors in landmark markers (check `DEFAULT_LANDMARKS`)
- Current colors are acceptable: blue, red, green, orange, yellow, cyan
- Remove `"left-lateral": "#a855f7"` (purple) - change to `"#14b8a6"` (teal)

---

**End of Implementation Plan**
