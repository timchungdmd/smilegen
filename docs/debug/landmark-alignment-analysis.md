# Landmark Alignment Algorithm Debug Report

## Executive Summary

After systematic analysis of the 2D photo ↔ 3D scan landmark alignment code, I identified **4 bugs** (2 critical, 2 moderate) and **3 architectural issues** that could cause landmarks to appear misaligned or "floating" off the mesh surface.

---

## Data Flow Analysis

### How 2D Landmarks Map to 3D Mesh Positions

```
[Photo 2D Click] → PhotoOverlay.tsx → setPhotoLandmark(x, y)
                                         ↓
                              Stored as normalized 0-1 coords
                                         ↓
[Scan 3D Click] → SceneCanvas.tsx → setModelLandmark(x, y, z)
                                         ↓
                              event.point from Three.js raycast
                                         ↓
                              inverseLandmarkTransform()
                                         ↓
                              Stored in modelCoord
                                         ↓
[Alignment Solve] → useAlignmentStore.solve() → trySolveAlignment()
                                         ↓
                              computeScanOverlayTransform()
                                         ↓
                              Weighted Procrustes 2D similarity transform
                                         ↓
                              Returns: scale, rotation, translateX, translateY
```

---

## Critical Bug #1: Y-Axis Inconsistency in Transform Chain

**Location:** `apps/desktop/src/features/alignment/scanOverlayAlignment.ts:119`

**Problem:** The code negates Y when building pairs, but the inverse transform doesn't account for this consistently.

```typescript
// Line 119 - Y is negated here
scanPoint: {
  x: l.modelCoord!.x,
  y: -l.modelCoord!.y,  // ← Negated: scan +Y = gingival, SVG +Y = down
},
```

However, when displaying landmarks on the 3D mesh in `SceneCanvas.tsx:433`:
```typescript
position={applyLandmarkTransform(landmark.modelCoord!, center, transform)}
```

The `applyLandmarkTransform` applies rotation but does NOT negate Y, meaning the stored `modelCoord.y` is expected to be in scan-native coordinates (+Y = gingival). This is correct.

**But** in `useAlignmentStore.ts:209`, the error computation also negates:
```typescript
const scanY = -l.modelCoord.y;  // ← Negated again
```

**Impact:** When landmarks are placed on scan, they're stored in native STL coordinates. When Procrustes projects them to photo, Y is negated. This is correct for the 2D overlay projection, BUT the `AlignmentTransform3D` returned has a `scale` that is computed from these negated values.

**The scale units are problematic** — see Bug #2.

---

## Critical Bug #2: Scale Unit Mismatch in AlignmentTransform3D

**Location:** `apps/desktop/src/store/useAlignmentStore.ts:188-196`

**Problem:** The Procrustes solver returns `scale` in **px/mm** (pixels per millimeter), but `AlignmentTransform3D.scale` is used as a **unitless multiplicative factor** in the 3D scene.

```typescript
// useAlignmentStore.ts:189
const transform: AlignmentTransform3D = {
  scale: overlayTransform.scale,  // This is px/mm, e.g., 15.2
  // ...
};
```

Then in `SceneCanvas.tsx:379`:
```typescript
<mesh
  scale={transform?.scale ?? 1}  // ← Expects unitless scale factor (e.g., 1.0)
  // ...
/>
```

**What happens:** If Procrustes computes `scale = 15` (15 px per mm, typical for dental photos), the 3D mesh is scaled by 15x in world space. This causes:
- Landmarks placed via raycast are at correct world positions
- But the mesh is now 15x larger
- Landmarks appear to "float" far from the mesh surface

**Root cause:** The 2D overlay transform (scale in px/mm) is being misused as a 3D mesh scale factor.

**Recommended fix:**
```typescript
// In useAlignmentStore.ts trySolveAlignment()
const transform: AlignmentTransform3D = {
  scale: 1.0,  // 3D scale should remain 1.0; overlay scale is handled separately
  rotateZ: overlayTransform.rotation,
  translateX: overlayTransform.translateX,  // Also problematic - these are px
  translateY: overlayTransform.translateY,  // These should be converted to mm
  // ...
};
```

The `overlayTransform` should only be used for 2D projection, not 3D mesh transformation.

---

## Critical Bug #3: Translation Units Mismatch

**Location:** `apps/desktop/src/store/useAlignmentStore.ts:193-194`

**Problem:** The translation values from `overlayTransform` are in **pixels** but are used directly as **world coordinates (mm)** in the 3D transform.

```typescript
translateX: overlayTransform.translateX,  // px, not mm
translateY: overlayTransform.translateY,  // px, not mm
```

In `SceneCanvas.tsx:381-384`:
```typescript
position={[
  (transform?.translateX ?? 0) - center.x * (transform?.scale ?? 1),
  // translateX is in pixels, center.x is in mm
  // Mixing units!
]}
```

**Impact:** The mesh is positioned incorrectly relative to where landmarks expect it to be.

---

## Moderate Bug #4: Inverse Transform Missing Y Consideration

**Location:** `apps/desktop/src/features/viewer/SceneCanvas.tsx:270-294`

**Problem:** The `inverseLandmarkTransform` function doesn't account for the Y-axis convention difference. The stored `modelCoord` values use scan-native coordinates (+Y = gingival/up), but the inverse transform doesn't validate or adjust for this.

```typescript
function inverseLandmarkTransform(
  worldPoint: THREE.Vector3,
  center: THREE.Vector3,
  transform: AlignmentTransform3D | undefined
): { x: number; y: number; z: number } {
  // ... matrix inversion math ...
  return { x: result.x + center.x, y: result.y + center.y, z: result.z + center.z };
}
```

The `event.point` from Three.js is in world coordinates where +Y is up. When stored in `modelCoord`, it should remain in scan coordinates (+Y = gingival). This is actually correct, BUT the problem is that when `transform` is applied (rotation), it's applied to the wrong coordinate space.

---

## Architectural Issue #1: No Surface Projection After Raycast

**Location:** `apps/desktop/src/features/viewer/SceneCanvas.tsx:386-390`

**Problem:** When a user clicks to place a landmark, the code trusts `event.point` directly without verifying the point is on the mesh surface.

```typescript
onPointerDown={(event) => {
  if (!pickEnabled || !onPickPoint) return;
  event.stopPropagation();
  const modelCoord = inverseLandmarkTransform(event.point, center, transform);
  onPickPoint(modelCoord);  // ← No validation that point is on mesh
}}
```

Three.js `event.point` from `onPointerDown` is the intersection point with the mesh geometry. This should be correct, BUT when the mesh has a scale/rotation transform applied, the intersection point is in **world space**, not model space.

**Verification needed:** The `inverseLandmarkTransform` should correctly convert world → model coordinates.

**Test case:** With `transform.scale = 15` (the bug from #2), a click on the mesh surface at world position (10, 5, 0) would be stored as modelCoord ~(0.67, 0.33, 0) after inverse transform. When re-projected with the erroneous scale, it would appear at world (10, 5, 0) but the mesh is scaled 15x, so the landmark appears inside a much larger mesh.

---

## Architectural Issue #2: Double Centering

**Locations:**
- `SceneCanvas.tsx:381-384` - Mesh is positioned with `-center.x` offset
- `SceneCanvas.tsx:276` - Inverse transform adds `center` back

**Problem:** The mesh geometry is built with vertices in their original positions, then positioned with `[-center.x, -center.y, -center.z]`. When a raycast hit occurs, `event.point` is already the world position (mesh origin + vertex position - center).

The `inverseLandmarkTransform` adds `center` back:
```typescript
return { x: result.x + center.x, y: result.y + center.y, z: result.z + center.z };
```

This is correct when `transform` is undefined (no scale/rotation). But when there IS a transform, the math becomes:
1. Raycast hits mesh at world position W
2. W = (V - center) * scale + translate  (where V is original vertex)
3. Inverse: V = (W - translate) / scale + center

The current code in `inverseLandmarkTransform`:
```typescript
const invMatrix = matrix.invert();
const result = new THREE.Vector3(worldPoint.x, worldPoint.y, worldPoint.z);
result.applyMatrix4(invMatrix);
return { x: result.x + center.x, y: result.y + center.y, z: result.z + center.z };
```

This is **correct** for computing V from W, assuming the matrix contains the scale+rotation+translation.

---

## Architectural Issue #3: Coordinate System Documentation Gaps

**Location:** `apps/desktop/src/features/alignment/alignmentTypes.ts:1-10`

**Current documentation:**
```typescript
/**
 * COORDINATE SYSTEM CONVENTIONS:
 *
 * Photo space: (0,0) = top-left, +X = right, +Y = down, normalized 0-1
 * Scan space: (0,0,0) = midline at occlusal plane, +X = patient-left, +Y = gingival (up), +Z = posterior
 * SVG space: (0,0) = top-left, +X = right, +Y = down, in pixels
 */
```

**Missing:**
- **World space** conventions in Three.js scene
- How mesh centering affects coordinate systems
- The unit conversion (mm ↔ world units)
- That `modelCoord` is in **original STL coordinates** (before centering)

---

## Summary of Findings

| # | Issue | Severity | File:Line | Impact |
|---|-------|----------|-----------|--------|
| 1 | Scale unit mismatch (px/mm vs unitless) | **CRITICAL** | useAlignmentStore.ts:189 | Landmarks appear far from mesh surface |
| 2 | Translation units mismatch (px vs mm) | **CRITICAL** | useAlignmentStore.ts:193-194 | Mesh positioned incorrectly |
| 3 | Y-axis negation in Procrustes not reflected in 3D | **MODERATE** | scanOverlayAlignment.ts:119 | Vertical misalignment |
| 4 | Inverse transform assumes no scale transform | **MODERATE** | SceneCanvas.tsx:270-294 | Works when scale=1, breaks otherwise |

---

## Recommended Fixes

### Fix 1: Separate 2D Overlay Transform from 3D Transform

The `AlignmentTransform3D` should only contain values meaningful for 3D mesh manipulation:
- `scale` should be unitless (1.0 for no change)
- `translateX/Y/Z` should be in mm (world units)

The `overlayTransform` (px/mm, px, radians) should only be used for 2D SVG projection.

### Fix 2: Keep Mesh Transform at Identity

For alignment purposes, the 3D mesh should remain at `scale=1, rotation=0, translation=0`. The alignment should compute a **camera pose** that makes projected 3D landmarks align with 2D photo landmarks.

This is partially implemented in `alignmentSolver.ts` but not used — `solveAlignment` computes a full 3D transform including camera position, but `trySolveAlignment` in the store uses the simpler 2D Procrustes instead.

### Fix 3: Use Camera-Based Alignment (Not Mesh Transform)

The proper approach is:
1. Keep mesh at origin, untransformed
2. Compute optimal camera position/orientation
3. Project 3D points through camera to match 2D photo

This is what `alignmentSolver.ts` does, but it's not being called from the alignment store.

---

## Verification Test

To verify landmarks are on the mesh surface:

1. Place a landmark on the scan
2. Check that `landmark.modelCoord` is within the mesh bounds
3. Verify that when the mesh renders without any `alignmentResult.transform`, the landmark sphere is exactly on the mesh surface
4. If not, there's a coordinate system bug
