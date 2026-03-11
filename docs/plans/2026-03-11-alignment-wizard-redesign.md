# Alignment Wizard Redesign — Design Doc
**Date:** 2026-03-11
**Status:** Approved

## Problem

The current 2-step alignment wizard uses the mouth commissure (soft tissue corner of the mouth) as its second reference point. Commissures are unreliable: they vary with lip position and don't correspond to any point on the 3D scan. The wizard also lacks scan-side markers, so there is no feedback confirming the photo and scan are actually aligned.

## Goals

1. Replace commissure reference with **incisal edge reference points** (tooth-based, reproducible)
2. Require both **central incisor tips** (most anterior reference — zero Z-depth relative to all other teeth)
3. Allow optional **additional cusps** (canines, etc.) for improved accuracy
4. Show corresponding **markers on the 3D scan** so users can confirm alignment
5. Left-click-drag pans the photo (no Alt modifier required)
6. Full **undo** via Cmd/Ctrl+Z and an Undo button

## Clinical Rationale

Central incisors sit at the apex of the parabolic arch (z = 0). All other teeth curve posteriorly. This makes the two central incisor incisal tips the cleanest, most unambiguous anterior reference. Using both centrals (not just midline) gives midline position AND a real pixel-per-mm scale derived from actual scan geometry, replacing the soft-tissue commissure estimate.

---

## Architecture

### Modal Trigger
`CaptureView.tsx` — the existing "Align Photo" / "Hide Alignment" button opens a **full-viewport modal** instead of the side panel.

### New Components
| File | Purpose |
|------|---------|
| `AlignmentCalibrationWizard.tsx` | Major rewrite — full-screen modal, two-phase batched workflow, undo stack |
| `AlignmentScanViewer.tsx` | New — minimal R3F Canvas with raycasting for 3D point picking |

### Modified Files
| File | Change |
|------|--------|
| `archModel.ts` | `buildCalibrationFromGuides` updated to accept two incisal reference points instead of commissures |
| `CaptureView.tsx` | Button now opens modal (toggle state) instead of side panel |

---

## Modal Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [↩ Undo]  Phase 1: Mark Photo  ──────  Phase 2: Mark Scan  [✕]│
├──────────────────────────────┬──────────────────────────────────┤
│                              │                                  │
│   PHOTO  (left)              │   3D SCAN  (right)               │
│   Active in Phase 1          │   Active in Phase 2              │
│   scroll=zoom, drag=pan      │   OrbitControls + raycasting     │
│                              │                                  │
├──────────────────────────────┴──────────────────────────────────┤
│  ● R-Central  ● L-Central  ○ R-Canine (opt)  ○ L-Canine (opt)  │
│                              [ Next: Mark on Scan → ]           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reference Points

```ts
interface ReferencePoint {
  id: string;       // "central-R" | "central-L" | "canine-R" | "canine-L"
  label: string;    // display label
  required: boolean;
  color: string;
  photo: { xPercent: number; yPercent: number } | null;
  scan:  { x: number; y: number; z: number } | null;  // mm in STL space
}
```

**Required:** `central-R` (#00b4d8), `central-L` (#4ade80)
**Optional:** `canine-R` (#f59e0b), `canine-L` (#f97316)

---

## Workflow (Batched)

**Phase 1 — Photo:**
- Click each tooth's incisal tip on the photo in order (right central → left central → optional cusps)
- Scroll to zoom, left-click-drag to pan (3px threshold distinguishes drag from click)
- Bottom bar shows checklist; required points gated before Next

**Phase 2 — Scan:**
- Photo locked (reference only, markers visible)
- Scan viewer activates: pointer events on the STL mesh trigger raycasting
- User clicks the same points on the scan in the same order
- OrbitControls active between clicks to rotate/inspect

**Undo:**
- Global stack: `Array<{ phase: 'photo'|'scan'; pointId: string }>`
- Pops on Cmd/Ctrl+Z keydown (useEffect) and "↩ Undo" button click
- Clears the corresponding `photo` or `scan` coord on the reference point
- If undoing a Phase-2 action while in Phase 1 mode — no-op

---

## Calibration Math (Updated)

Replace commissure-based scale with incisal-edge-based scale:

```ts
// Midline = midpoint between two central photo clicks
midlineXPercent = (centralR.photo.xPercent + centralL.photo.xPercent) / 2
smileArcYPercent = (centralR.photo.yPercent + centralL.photo.yPercent) / 2

// Scale = photo distance / scan distance
photoDistPx = euclidean(centralR.photo, centralL.photo) [in % units → convert to px]
scanDistMm  = euclidean(centralR.scan, centralL.scan)   [in mm from STL space]
scale = photoDistPx / scanDistMm  // px per mm

// Commissure store values derived from scale + arch half-width
leftCommissureX  = midlineXPercent - (archHalfWidth * scale / viewWidth * 100)
rightCommissureX = midlineXPercent + (archHalfWidth * scale / viewWidth * 100)
```

Optional cusp points improve archDepth estimation (future phase).

---

## Scan Raycasting

`AlignmentScanViewer` wraps a minimal R3F `<Canvas>`:
- Renders the arch scan STL mesh (same geometry as SceneCanvas)
- OrbitControls enabled for inspection
- `onPointerDown` on the mesh → records `event.point` (THREE.Vector3 in world/model space)
- Returns `{ x, y, z }` in mm via `onPickPoint` callback prop
- Placed markers rendered as small spheres at their 3D positions

---

## Pan Change

In `PhotoCanvas.handleMouseDown`, change:
```ts
// Before:
if (e.button === 1 || (e.button === 0 && e.altKey))

// After:
if (e.button === 1 || e.button === 0)
```
The existing `didPanMoveRef` 3px threshold already distinguishes a pan drag from a click-to-place. No other changes needed for pan.

---

## Tests to Update

- `AlignmentCalibrationWizard.test.tsx` — rewrite for new multi-step flow, new reference point IDs
- `CaptureView.test.tsx` — update modal trigger assertion
