# Landmark Alignment Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical bugs causing landmarks to not line up between photo and scan in the dental smile design application.

**Architecture:** Fix coordinate transformations, API field mapping, and null checks. The fixes address Y-axis inversion, API response field mismatch, and scale handling issues.

**Tech Stack:** TypeScript, React, Zustand, Python FastAPI

---

## Task 1: Fix API Field Name Mismatch (P0)

**Files:**
- Modify: `apps/desktop/src/services/visionClient.ts:7-16, 93`

**Problem:** Server returns `interpupillaryLine: {leftX, leftY, rightX, rightY}` but client expects `{x1, y1, x2, y2}`. This causes undefined values.

**Step 1: Update RawLandmarkResponse interface**

Change lines 7-16:

```typescript
interface RawLandmarkResponse {
  midlineX: number;
  landmarks: { x: number; y: number; z?: number }[];
  interpupillaryLine: { leftX: number; leftY: number; rightX: number; rightY: number };
  lipContour: {
    outer: { x: number; y: number; z?: number }[];
    inner: { x: number; y: number; z?: number }[];
  };
  mouthMaskBbox: { xMin: number; yMin: number; xMax: number; yMax: number };
}
```

**Step 2: Add field mapping in detectLandmarks**

Replace line 93:

```typescript
interpupillaryLine: data.interpupillaryLine
  ? { x1: data.interpupillaryLine.leftX, y1: data.interpupillaryLine.leftY, x2: data.interpupillaryLine.rightX, y2: data.interpupillaryLine.rightY }
  : { x1: 0, y1: 0.5, x2: 1, y2: 0.5 },
```

**Step 3: Verify fix**

Run: `pnpm --filter @smilegen/desktop typecheck`

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add apps/desktop/src/services/visionClient.ts
git commit -m "fix: map interpupillaryLine field names from server to client"
```

---

## Task 2: Fix Null Check Crash in normalizeScanOrientation (P0)

**Files:**
- Modify: `apps/desktop/src/features/alignment/scanOverlayAlignment.ts:74-89`

**Problem:** `photoCoord` uses non-null assertion but it's not guaranteed to exist. If `modelCoord` exists but `photoCoord` is null, this crashes.

**Step 1: Add explicit photoCoord check**

Replace lines 74-89:

```typescript
if (!rc?.modelCoord || !lc?.modelCoord) {
  return { normalized: landmarks, wasFlipCorrected: false };
}

if (!rc?.photoCoord || !lc?.photoCoord) {
  return { normalized: landmarks, wasFlipCorrected: false };
}

// Right-central should have smaller X than left-central in BOTH systems
// Photo: right is on viewer's left (smaller X)
// Scan: right is on patient's right (negative X, i.e., smaller than left's positive X)

// Check if scan has correct orientation: right-central.x < left-central.x
const scanCorrect = rc.modelCoord.x < lc.modelCoord.x;

// Check if photo has correct orientation: right-central.x < left-central.x
const photoCorrect = rc.photoCoord.x < lc.photoCoord.x;

// If orientations don't match, flip the scan
const needsFlip = scanCorrect !== photoCorrect;
```

**Step 2: Verify fix**

Run: `pnpm --filter @smilegen/desktop typecheck`

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/desktop/src/features/alignment/scanOverlayAlignment.ts
git commit -m "fix: add explicit photoCoord null check in normalizeScanOrientation"
```

---

## Task 3: Fix Scale Being Ignored in AlignmentTransform3D (P1)

**Files:**
- Modify: `apps/desktop/src/store/useAlignmentStore.ts:188-196`

**Problem:** The Procrustes solver computes `scale` (px/mm) but it's discarded when creating `AlignmentTransform3D`. This causes incorrect overlay sizing.

**Step 1: Apply scale to 3D transform**

Replace lines 188-196:

```typescript
const transform: AlignmentTransform3D = {
  scale: overlayTransform.scale, // Use computed scale (px/mm)
  rotateX: 0,
  rotateY: 0,
  rotateZ: overlayTransform.rotation,
  translateX: overlayTransform.translateX,
  translateY: overlayTransform.translateY,
  translateZ: 0,
};
```

**Step 2: Verify fix**

Run: `pnpm --filter @smilegen/desktop typecheck`

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/desktop/src/store/useAlignmentStore.ts
git commit -m "fix: apply Procrustes scale to AlignmentTransform3D"
```

---

## Task 4: Add Image Validation in Vision Service (P1)

**Files:**
- Modify: `apps/vision/src/services/landmark_detector.py:33-36`

**Problem:** No error handling for invalid images. If `image_bytes` is invalid, `cv2.imdecode` returns `None` and crashes.

**Step 1: Add image validation**

Replace lines 33-36:

```python
def detect_landmarks(image_bytes: bytes) -> Optional[LandmarkResult]:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
```

**Step 2: Verify fix**

Run: `cd apps/vision && .venv/bin/python -c "from src.services.landmark_detector import detect_landmarks; print('OK')"`

Expected: `OK`

**Step 3: Commit**

```bash
git add apps/vision/src/services/landmark_detector.py
git commit -m "fix: add image validation in detect_landmarks"
```

---

## Task 5: Run Verification Tests

**Step 1: Run desktop typecheck**

Run: `pnpm --filter @smilegen/desktop typecheck`

Expected: No errors

**Step 2: Run vision tests**

Run: `cd apps/vision && .venv/bin/pytest tests/ -v`

Expected: All tests pass

**Step 3: Final commit summary**

```bash
git status
```

---

## Summary of Changes

| Priority | Issue | File | Status |
|----------|-------|------|--------|
| P0 | API field mismatch | visionClient.ts | Fixed |
| P0 | Null check crash | scanOverlayAlignment.ts | Fixed |
| P1 | Scale ignored | useAlignmentStore.ts | Fixed |
| P1 | Image validation | landmark_detector.py | Fixed |
