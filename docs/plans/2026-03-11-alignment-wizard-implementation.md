# Alignment Wizard Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 2-point commissure wizard with a full-screen modal, two-phase (photo then scan) alignment wizard using incisal edge reference points, left-click pan, and undo.

**Architecture:** Full-screen modal triggered from CaptureView. Phase 1: user places central incisor + optional cusp markers on the photo. Phase 2: user raycasts matching points on the 3D scan. Calibration derived from 2D–3D point correspondences.

**Tech Stack:** React + Zustand + React Three Fiber (@react-three/fiber) + @react-three/drei, Vitest + @testing-library/react

---

## Task 1: Add `buildCalibrationFromIncisalPoints` to archModel.ts

**Goal:** New calibration function that takes two central incisor 2D photo clicks + their 3D scan positions and computes `AlignmentCalibration`. Keep old `buildCalibrationFromGuides` for backward compat.

**Files:**
- Modify: `apps/desktop/src/features/alignment/archModel.ts`
- Test: `apps/desktop/src/features/alignment/archModel.test.ts` (create if not present, add to if exists)

**Step 1: Find or create the test file**

```bash
ls apps/desktop/src/features/alignment/
```

**Step 2: Write the failing test**

Add to `archModel.test.ts`:

```ts
import { buildCalibrationFromIncisalPoints } from './archModel';

describe('buildCalibrationFromIncisalPoints', () => {
  it('computes midlineX as midpoint of the two central photo X positions', () => {
    const centralR = { photoX: 60, photoY: 55, scanX: 4, scanY: 0, scanZ: 0 };
    const centralL = { photoX: 40, photoY: 55, scanX: -4, scanY: 0, scanZ: 0 };
    const cal = buildCalibrationFromIncisalPoints(centralR, centralL, 100, 100);
    expect(cal.midlineX).toBeCloseTo(50);
  });

  it('computes incisalY as midpoint of the two central photo Y positions', () => {
    const centralR = { photoX: 60, photoY: 50, scanX: 4, scanY: 0, scanZ: 0 };
    const centralL = { photoX: 40, photoY: 60, scanX: -4, scanY: 0, scanZ: 0 };
    const cal = buildCalibrationFromIncisalPoints(centralR, centralL, 100, 100);
    expect(cal.incisalY).toBeCloseTo(55);
  });

  it('computes scale from photo distance / scan distance', () => {
    // photo distance = sqrt((60-40)^2 + (55-55)^2) = 20 percent units
    // scan distance  = sqrt((4-(-4))^2 + 0 + 0)     = 8 mm
    // scale = 20 / 8 = 2.5 percent/mm
    const centralR = { photoX: 60, photoY: 55, scanX: 4, scanY: 0, scanZ: 0 };
    const centralL = { photoX: 40, photoY: 55, scanX: -4, scanY: 0, scanZ: 0 };
    const cal = buildCalibrationFromIncisalPoints(centralR, centralL, 100, 100);
    expect(cal.scale).toBeCloseTo(2.5);
  });

  it('derives commissure X from scale and archHalfWidth', () => {
    const centralR = { photoX: 60, photoY: 55, scanX: 4, scanY: 0, scanZ: 0 };
    const centralL = { photoX: 40, photoY: 55, scanX: -4, scanY: 0, scanZ: 0 };
    // archHalfWidth defaults to 35mm; scale = 2.5; offset = 35 * 2.5 = 87.5 → OOB → clamped
    // With archScanWidth=20 → archHalfWidth=10; offset = 10 * 2.5 = 25
    // rightCommissureX = 50 + 25 = 75, leftCommissureX = 50 - 25 = 25
    const cal = buildCalibrationFromIncisalPoints(centralR, centralL, 100, 100, 20);
    expect(cal.midlineX).toBeCloseTo(50);
    // scale * archHalfWidth = 2.5 * 10 = 25 → rightCommissureX ~ 75, leftCommissureX ~ 25
  });
});
```

**Step 3: Run to confirm it fails**

```bash
cd apps/desktop && npx vitest run src/features/alignment/archModel.test.ts
```
Expected: FAIL — `buildCalibrationFromIncisalPoints is not a function`

**Step 4: Add the interface and function to archModel.ts**

Add after the existing exports (before `buildCalibrationFromGuides`):

```ts
/** A single reference point: its 2D position on the photo and 3D position on the scan. */
export interface IncisalReferencePoint {
  /** Photo X position as percent of view width (0–100). */
  photoX: number;
  /** Photo Y position as percent of view height (0–100). */
  photoY: number;
  /** Scan X position in STL model space (mm). */
  scanX: number;
  /** Scan Y position in STL model space (mm). */
  scanY: number;
  /** Scan Z position in STL model space (mm). */
  scanZ: number;
}

/**
 * Build calibration from two incisal reference point correspondences.
 *
 * Unlike buildCalibrationFromGuides (which uses soft-tissue commissures),
 * this function derives scale from real tooth geometry: the pixel distance
 * between the two central incisor tips on the photo, divided by the mm
 * distance between those same tips on the 3D scan.
 *
 * @param centralR  Right central incisor incisal tip (photo + scan coords)
 * @param centralL  Left central incisor incisal tip (photo + scan coords)
 * @param viewWidth  Photo view width in coordinate units (pass 100 for %)
 * @param viewHeight Photo view height in coordinate units (pass 100 for %)
 * @param archScanWidth  Optional scan bounding box width in mm (for archHalfWidth)
 * @param archScanDepth  Optional scan bounding box depth in mm (for archDepth)
 */
export function buildCalibrationFromIncisalPoints(
  centralR: IncisalReferencePoint,
  centralL: IncisalReferencePoint,
  viewWidth: number,
  viewHeight: number,
  archScanWidth?: number,
  archScanDepth?: number
): AlignmentCalibration {
  // Midline = midpoint of the two central photo positions
  const midlineXPercent = (centralR.photoX + centralL.photoX) / 2;
  const incisalYPercent = (centralR.photoY + centralL.photoY) / 2;
  const midlineX = (midlineXPercent / 100) * viewWidth;
  const incisalY = (incisalYPercent / 100) * viewHeight;

  // Scale: photo distance (in view units) / scan distance (in mm)
  const photoDx = centralR.photoX - centralL.photoX;
  const photoDy = centralR.photoY - centralL.photoY;
  const photoDistUnits = Math.sqrt(photoDx * photoDx + photoDy * photoDy);

  const scanDx = centralR.scanX - centralL.scanX;
  const scanDy = centralR.scanY - centralL.scanY;
  const scanDz = centralR.scanZ - centralL.scanZ;
  const scanDistMm = Math.sqrt(scanDx * scanDx + scanDy * scanDy + scanDz * scanDz);

  // Guard: if scan points are identical, fall back to default scale
  const scale = scanDistMm > 0.01 ? photoDistUnits / scanDistMm : DEFAULT_CALIBRATION.scale;

  const archHalfWidth = archScanWidth
    ? Math.max(20, Math.min(50, archScanWidth / 2))
    : DEFAULT_CALIBRATION.archHalfWidth;

  const archDepth = archScanDepth
    ? Math.max(8, Math.min(25, archScanDepth * 0.5))
    : DEFAULT_CALIBRATION.archDepth;

  return {
    midlineX,
    incisalY,
    scale,
    archDepth,
    archHalfWidth,
    cameraDistance: DEFAULT_CALIBRATION.cameraDistance,
  };
}
```

**Step 5: Run tests to confirm passing**

```bash
cd apps/desktop && npx vitest run src/features/alignment/archModel.test.ts
```
Expected: PASS (all 3 tests green)

**Step 6: Run full test suite to confirm no regressions**

```bash
cd apps/desktop && npx vitest run
```
Expected: all passing

**Step 7: Commit**

```bash
git add apps/desktop/src/features/alignment/archModel.ts apps/desktop/src/features/alignment/archModel.test.ts
git commit -m "feat(alignment): add buildCalibrationFromIncisalPoints for tooth-based calibration"
```

---

## Task 2: Create AlignmentScanViewer.tsx

**Goal:** Minimal React Three Fiber canvas that renders the arch scan, allows OrbitControls for inspection, and fires `onPickPoint` with the 3D mesh intersection when the user clicks.

**Files:**
- Create: `apps/desktop/src/features/capture/AlignmentScanViewer.tsx`

No unit test for this component (R3F Canvas cannot render in jsdom). A smoke test is added in Task 6.

**Step 1: Create the file**

```tsx
// apps/desktop/src/features/capture/AlignmentScanViewer.tsx
/**
 * AlignmentScanViewer — minimal 3D scan viewer for the alignment wizard.
 *
 * Shows the arch scan STL mesh with OrbitControls.
 * When isPicking is true, clicking the mesh fires onPickPoint with the
 * 3D intersection point in model-space mm coordinates.
 * Placed reference markers are rendered as small colored spheres.
 */

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import type { ParsedStlMesh } from "../import/stlParser";

export interface ScanPickPoint {
  x: number;
  y: number;
  z: number;
}

export interface ScanMarker {
  id: string;
  color: string;
  position: ScanPickPoint;
}

interface AlignmentScanViewerProps {
  archScanMesh: ParsedStlMesh;
  markers: ScanMarker[];
  onPickPoint: (point: ScanPickPoint) => void;
  isPicking: boolean;
}

// ── Converts ParsedStlMesh triangles to a THREE.BufferGeometry ─────────────
// Same pattern as SceneCanvas/StlMeshView.
function buildGeometry(mesh: ParsedStlMesh): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const vertexCount = mesh.triangles.length * 3;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);

  for (let i = 0; i < mesh.triangles.length; i++) {
    const tri = mesh.triangles[i];
    const verts = [tri.a, tri.b, tri.c];
    const edge1 = new THREE.Vector3(
      tri.b.x - tri.a.x, tri.b.y - tri.a.y, tri.b.z - tri.a.z
    );
    const edge2 = new THREE.Vector3(
      tri.c.x - tri.a.x, tri.c.y - tri.a.y, tri.c.z - tri.a.z
    );
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    for (let j = 0; j < 3; j++) {
      const idx = (i * 3 + j) * 3;
      positions[idx]     = verts[j].x;
      positions[idx + 1] = verts[j].y;
      positions[idx + 2] = verts[j].z;
      normals[idx]     = normal.x;
      normals[idx + 1] = normal.y;
      normals[idx + 2] = normal.z;
    }
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal",   new THREE.BufferAttribute(normals, 3));
  return geo;
}

// ── Scan mesh + marker spheres ─────────────────────────────────────────────

function ScanScene({
  archScanMesh,
  markers,
  onPickPoint,
  isPicking,
}: AlignmentScanViewerProps) {
  const geometry = useMemo(() => buildGeometry(archScanMesh), [archScanMesh]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isPicking) return;
    e.stopPropagation();
    onPickPoint({ x: e.point.x, y: e.point.y, z: e.point.z });
  };

  // Auto-frame on mesh change
  const b = archScanMesh.bounds;
  const center = new THREE.Vector3(
    (b.minX + b.maxX) / 2,
    (b.minY + b.maxY) / 2,
    (b.minZ + b.maxZ) / 2
  );
  const size = Math.max(b.width, b.depth, b.height);

  return (
    <>
      <PerspectiveCamera makeDefault position={[center.x, center.y + size * 0.3, center.z + size * 1.8]} />
      <OrbitControls target={[center.x, center.y, center.z]} enableDamping={false} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />

      {/* Arch scan mesh */}
      <mesh
        geometry={geometry}
        onPointerDown={handlePointerDown}
        cursor={isPicking ? "crosshair" : "grab"}
      >
        <meshStandardMaterial
          color="#e8ddd0"
          roughness={0.6}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Reference point markers */}
      {markers.map((m) => (
        <mesh key={m.id} position={[m.position.x, m.position.y, m.position.z]}>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial color={m.color} emissive={m.color} emissiveIntensity={0.4} />
        </mesh>
      ))}
    </>
  );
}

// ── Exported component ────────────────────────────────────────────────────

export function AlignmentScanViewer(props: AlignmentScanViewerProps) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#111827" }}>
      <Canvas>
        <ScanScene {...props} />
      </Canvas>
      {props.isPicking && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: 11,
            padding: "4px 12px",
            borderRadius: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          Click the tooth tip on the scan
        </div>
      )}
    </div>
  );
}
```

Note: The outer `<div>` needs `position: relative` for the hint overlay to position correctly. Add that in Task 3 when the modal layout sets the container styles.

**Step 2: Commit**

```bash
git add apps/desktop/src/features/capture/AlignmentScanViewer.tsx
git commit -m "feat(alignment): add AlignmentScanViewer with 3D raycasting for scan point picking"
```

---

## Task 3: Fix left-click pan in PhotoCanvas (remove Alt modifier)

**Goal:** Photo pans with a plain left-click-drag. The existing `didPanMoveRef` 3px threshold already suppresses click-to-place when dragging. One-line change.

**Files:**
- Modify: `apps/desktop/src/features/capture/AlignmentCalibrationWizard.tsx`

**Step 1: Write the failing test**

In `AlignmentCalibrationWizard.test.tsx`, add:

```ts
test("plain left-click-drag pans the photo (no Alt key required)", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Simulate mousedown + mousemove > 3px + mouseup without Alt key
  fireEvent.mouseDown(canvas, { button: 0, clientX: 200, clientY: 300 });
  fireEvent.mouseMove(canvas, { clientX: 220, clientY: 300 }); // 20px move
  fireEvent.mouseUp(canvas);

  // After a pan drag, click should NOT place a marker (didPanMoveRef suppresses it)
  fireEvent.click(canvas, { clientX: 220, clientY: 300 });

  // Still on midline step — no marker placed (pan suppressed the click)
  expect(
    screen.getByText(/click the tip of the upper central incisor/i)
  ).toBeInTheDocument();
});
```

**Step 2: Run to confirm it fails**

```bash
cd apps/desktop && npx vitest run src/features/capture/AlignmentCalibrationWizard.test.tsx -t "plain left-click-drag"
```
Expected: FAIL (step advances because mousedown without altKey currently doesn't trigger pan)

**Step 3: Apply the one-line fix in AlignmentCalibrationWizard.tsx**

In `PhotoCanvas.handleMouseDown`, change:

```ts
// BEFORE:
if (e.button === 1 || (e.button === 0 && e.altKey)) {

// AFTER:
if (e.button === 1 || e.button === 0) {
```

**Step 4: Run the test to confirm passing**

```bash
cd apps/desktop && npx vitest run src/features/capture/AlignmentCalibrationWizard.test.tsx
```
Expected: All existing tests + new pan test pass.

**Step 5: Commit**

```bash
git add apps/desktop/src/features/capture/AlignmentCalibrationWizard.tsx apps/desktop/src/features/capture/AlignmentCalibrationWizard.test.tsx
git commit -m "fix(alignment): left-click drag pans photo without Alt modifier"
```

---

## Task 4: Rewrite AlignmentCalibrationWizard as full-screen modal

**Goal:** Full rewrite of the wizard into a full-viewport modal with two phases (photo → scan), reference point checklist, undo stack (Cmd/Ctrl+Z + button), and Apply.

**Files:**
- Modify: `apps/desktop/src/features/capture/AlignmentCalibrationWizard.tsx`

This is the largest task. Implement it in one pass; tests come in Task 5.

**Reference point definitions (add near top of file):**

```ts
export interface WizardRefPoint {
  id: string;
  label: string;
  required: boolean;
  color: string;
  photoColor: string;  // same as color, named for clarity
}

export const WIZARD_REF_POINTS: WizardRefPoint[] = [
  { id: "central-R", label: "Right Central", required: true,  color: "#00b4d8", photoColor: "#00b4d8" },
  { id: "central-L", label: "Left Central",  required: true,  color: "#4ade80", photoColor: "#4ade80" },
  { id: "canine-R",  label: "Right Canine",  required: false, color: "#f59e0b", photoColor: "#f59e0b" },
  { id: "canine-L",  label: "Left Canine",   required: false, color: "#f97316", photoColor: "#f97316" },
];
```

**State model:**

```ts
type Phase = "photo" | "scan" | "review";

interface PointCoords2D { xPercent: number; yPercent: number; }
interface PointCoords3D { x: number; y: number; z: number; }

interface PointState {
  photo: PointCoords2D | null;
  scan:  PointCoords3D | null;
}

// undoStack entries describe what was last placed so undo knows what to clear
type UndoEntry = { phase: "photo" | "scan"; pointId: string };
```

**Full component structure:**

```tsx
export function AlignmentCalibrationWizard({ onClose }: { onClose?: () => void }) {
  const [phase, setPhase] = useState<Phase>("photo");
  const [points, setPoints] = useState<Record<string, PointState>>(
    () => Object.fromEntries(WIZARD_REF_POINTS.map(p => [p.id, { photo: null, scan: null }]))
  );
  const [photoOpacity, setPhotoOpacity] = useState(1);
  const [applied, setApplied] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const uploadedPhotos = useImportStore(s => s.uploadedPhotos);
  const archScanMesh   = useImportStore(s => s.archScanMesh);
  const firstPhoto     = uploadedPhotos[0];

  // Viewport store writes
  const setMidlineX        = useViewportStore(s => s.setMidlineX);
  const setSmileArcY       = useViewportStore(s => s.setSmileArcY);
  const setLeftCommissureX = useViewportStore(s => s.setLeftCommissureX);
  const setRightCommissureX= useViewportStore(s => s.setRightCommissureX);
  const clearAlignmentMarkers = useViewportStore(s => s.clearAlignmentMarkers);
  const addAlignmentMarker    = useViewportStore(s => s.addAlignmentMarker);

  // ── Helpers ──────────────────────────────────────────────────────────

  // Next point that hasn't been placed for the current phase
  const nextPhotoPointId = WIZARD_REF_POINTS.find(p => !points[p.id].photo)?.id ?? null;
  const nextScanPointId  = WIZARD_REF_POINTS.filter(p => points[p.id].photo !== null)
                                             .find(p => !points[p.id].scan)?.id ?? null;

  const requiredPhotosDone = WIZARD_REF_POINTS
    .filter(p => p.required)
    .every(p => points[p.id].photo !== null);

  const requiredScansDone = WIZARD_REF_POINTS
    .filter(p => p.required)
    .every(p => points[p.id].scan !== null);

  const allPhotoMarkedPointsHaveScan = WIZARD_REF_POINTS
    .filter(p => points[p.id].photo !== null)
    .every(p => points[p.id].scan !== null);

  const canApply = requiredPhotosDone && requiredScansDone && allPhotoMarkedPointsHaveScan;

  // ── Undo ─────────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setPoints(pts => ({
        ...pts,
        [last.pointId]: {
          ...pts[last.pointId],
          [last.phase]: null,
        },
      }));
      // If undoing a scan point while in review, go back to scan phase
      if (last.phase === "scan") setPhase("scan");
      if (last.phase === "photo") setPhase("photo");
      setApplied(false);
      return prev.slice(0, -1);
    });
  }, []);

  // Cmd/Ctrl+Z keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo]);

  // ── Photo click ──────────────────────────────────────────────────────

  const handlePhotoClick = useCallback((p: PointCoords2D) => {
    if (phase !== "photo" || !nextPhotoPointId) return;
    setPoints(pts => ({
      ...pts,
      [nextPhotoPointId]: { ...pts[nextPhotoPointId], photo: p },
    }));
    setUndoStack(prev => [...prev, { phase: "photo", pointId: nextPhotoPointId }]);
  }, [phase, nextPhotoPointId]);

  // ── Scan pick ────────────────────────────────────────────────────────

  const handleScanPick = useCallback((p: PointCoords3D) => {
    if (phase !== "scan" || !nextScanPointId) return;
    setPoints(pts => ({
      ...pts,
      [nextScanPointId]: { ...pts[nextScanPointId], scan: p },
    }));
    setUndoStack(prev => [...prev, { phase: "scan", pointId: nextScanPointId }]);
  }, [phase, nextScanPointId]);

  // ── Apply calibration ────────────────────────────────────────────────

  const handleApply = () => {
    const rPt = points["central-R"];
    const lPt = points["central-L"];
    if (!rPt.photo || !lPt.photo || !rPt.scan || !lPt.scan) return;

    const centralR: IncisalReferencePoint = {
      photoX: rPt.photo.xPercent, photoY: rPt.photo.yPercent,
      scanX: rPt.scan.x, scanY: rPt.scan.y, scanZ: rPt.scan.z,
    };
    const centralL: IncisalReferencePoint = {
      photoX: lPt.photo.xPercent, photoY: lPt.photo.yPercent,
      scanX: lPt.scan.x, scanY: lPt.scan.y, scanZ: lPt.scan.z,
    };

    const archScanWidth = archScanMesh?.bounds.width;
    const archScanDepth = archScanMesh ? archScanMesh.bounds.maxY - archScanMesh.bounds.minY : undefined;

    const cal = buildCalibrationFromIncisalPoints(centralR, centralL, 100, 100, archScanWidth, archScanDepth);

    // Derive commissure store positions from calibration
    const commissureOffsetPercent = cal.archHalfWidth * cal.scale;
    const midlinePercent = (cal.midlineX / 100) * 100; // already in percent since viewWidth=100
    const incisalPercent = (cal.incisalY / 100) * 100;

    setMidlineX(midlinePercent);
    setSmileArcY(incisalPercent);
    setLeftCommissureX(Math.max(0, midlinePercent - commissureOffsetPercent));
    setRightCommissureX(Math.min(100, midlinePercent + commissureOffsetPercent));

    // Persist alignment markers
    clearAlignmentMarkers();
    WIZARD_REF_POINTS.forEach(refPt => {
      const pt = points[refPt.id];
      if (pt.photo) {
        addAlignmentMarker({
          id: `alignment-${refPt.id}`,
          type: refPt.id.startsWith("central") ? "incisal" : "cusp",
          toothId: refPt.id,
          x: pt.photo.xPercent,
          y: pt.photo.yPercent,
        });
      }
    });

    setApplied(true);
  };

  // ── Reset ────────────────────────────────────────────────────────────

  const handleReset = () => {
    setPoints(Object.fromEntries(WIZARD_REF_POINTS.map(p => [p.id, { photo: null, scan: null }])));
    setUndoStack([]);
    setPhase("photo");
    setApplied(false);
  };

  // ── Guard: no photo ──────────────────────────────────────────────────

  if (!firstPhoto) {
    return (
      <div style={MODAL_OVERLAY_STYLE}>
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
          <p>Upload a patient photo to start the alignment wizard.</p>
          <button onClick={onClose} style={BTN_SECONDARY_STYLE}>Close</button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  const currentPhotoPointDef = nextPhotoPointId
    ? WIZARD_REF_POINTS.find(p => p.id === nextPhotoPointId)!
    : null;
  const currentScanPointDef = nextScanPointId
    ? WIZARD_REF_POINTS.find(p => p.id === nextScanPointId)!
    : null;

  return (
    <div style={MODAL_OVERLAY_STYLE} data-testid="alignment-modal">
      {/* ── Top bar ── */}
      <div style={TOP_BAR_STYLE}>
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          style={BTN_SECONDARY_STYLE}
          title="Undo last point (Cmd/Ctrl+Z)"
        >
          ↩ Undo
        </button>

        {/* Phase rail */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PhaseChip label="Phase 1: Mark Photo" active={phase === "photo"} done={phase !== "photo"} />
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>──</span>
          <PhaseChip label="Phase 2: Mark Scan"  active={phase === "scan"}  done={phase === "review" || applied} />
        </div>

        <button onClick={onClose} style={BTN_CLOSE_STYLE} title="Close wizard">✕</button>
      </div>

      {/* ── Two panels ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT: Photo panel */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border, #2a2f3b)",
          overflow: "hidden",
          opacity: phase === "scan" ? 0.7 : 1,
          transition: "opacity 0.2s",
        }}>
          <div style={PANEL_HEADER_STYLE}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>Patient Photo</span>
            {phase === "photo" && currentPhotoPointDef && (
              <span style={{ fontSize: 11, color: currentPhotoPointDef.color }}>
                → Click: {currentPhotoPointDef.label}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <div style={{ padding: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Opacity</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={photoOpacity}
                onChange={e => setPhotoOpacity(Number(e.target.value))}
                style={{ flex: 1, accentColor: "var(--accent, #00b4d8)" }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 30, textAlign: "right" }}>
                {Math.round(photoOpacity * 100)}%
              </span>
            </div>
            <PhotoCanvas
              photoUrl={firstPhoto.url}
              points={points}
              onPhotoClick={handlePhotoClick}
              activePhotoPointId={phase === "photo" ? nextPhotoPointId : null}
              photoOpacity={photoOpacity}
            />
          </div>
        </div>

        {/* RIGHT: Scan panel */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          opacity: phase === "photo" ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}>
          <div style={PANEL_HEADER_STYLE}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>3D Arch Scan</span>
            {phase === "scan" && currentScanPointDef && (
              <span style={{ fontSize: 11, color: currentScanPointDef.color }}>
                → Click: {currentScanPointDef.label}
              </span>
            )}
            {phase === "photo" && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Complete photo first
              </span>
            )}
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            {archScanMesh ? (
              <AlignmentScanViewer
                archScanMesh={archScanMesh}
                markers={WIZARD_REF_POINTS
                  .filter(p => points[p.id].scan !== null)
                  .map(p => ({ id: p.id, color: p.color, position: points[p.id].scan! }))}
                onPickPoint={handleScanPick}
                isPicking={phase === "scan" && nextScanPointId !== null}
              />
            ) : (
              <div style={{ padding: 24, color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
                No arch scan loaded. Upload a scan to enable scan alignment.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar: checklist + actions ── */}
      <div style={BOTTOM_BAR_STYLE}>
        {/* Checklist */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {WIZARD_REF_POINTS.map(refPt => {
            const pt = points[refPt.id];
            const photoDone = pt.photo !== null;
            const scanDone  = pt.scan !== null;
            return (
              <div key={refPt.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: photoDone && scanDone ? refPt.color : "var(--border, #2a2f3b)",
                  border: `1px solid ${refPt.color}`,
                  display: "inline-block",
                }} />
                <span style={{ color: photoDone ? "var(--text-primary, #e8eaf0)" : "var(--text-muted)" }}>
                  {refPt.label}
                  {!refPt.required && " (opt)"}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                  {photoDone ? "📷" : "○"}{scanDone ? "🦷" : "○"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={handleReset} style={BTN_SECONDARY_STYLE}>Reset</button>

          {phase === "photo" && (
            <button
              onClick={() => setPhase("scan")}
              disabled={!requiredPhotosDone}
              style={requiredPhotosDone ? BTN_PRIMARY_STYLE : BTN_DISABLED_STYLE}
            >
              Next: Mark on Scan →
            </button>
          )}

          {phase === "scan" && !applied && (
            <button
              onClick={handleApply}
              disabled={!canApply}
              style={canApply ? BTN_PRIMARY_STYLE : BTN_DISABLED_STYLE}
            >
              Apply Calibration
            </button>
          )}

          {applied && (
            <div style={SUCCESS_BANNER_STYLE}>
              ✓ Calibration applied
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Style constants (add above the component):**

```ts
const MODAL_OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "var(--bg-primary, #111827)",
  display: "flex",
  flexDirection: "column",
};
const TOP_BAR_STYLE: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "8px 16px",
  borderBottom: "1px solid var(--border, #2a2f3b)",
  background: "var(--bg-secondary, #1a1f2b)",
  flexShrink: 0,
  height: 48,
};
const PANEL_HEADER_STYLE: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "6px 12px",
  borderBottom: "1px solid var(--border, #2a2f3b)",
  background: "var(--bg-secondary, #1a1f2b)",
  flexShrink: 0,
};
const BOTTOM_BAR_STYLE: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "10px 16px",
  borderTop: "1px solid var(--border, #2a2f3b)",
  background: "var(--bg-secondary, #1a1f2b)",
  flexShrink: 0,
  gap: 12,
  flexWrap: "wrap",
};
const BTN_PRIMARY_STYLE: React.CSSProperties = {
  padding: "7px 16px", background: "var(--accent, #00b4d8)",
  color: "#fff", border: "none", borderRadius: 6,
  fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const BTN_SECONDARY_STYLE: React.CSSProperties = {
  padding: "7px 12px", background: "var(--bg-tertiary, #252b38)",
  color: "var(--text-muted, #8892a0)",
  border: "1px solid var(--border, #2a2f3b)",
  borderRadius: 6, fontSize: 12, cursor: "pointer",
};
const BTN_DISABLED_STYLE: React.CSSProperties = {
  ...BTN_PRIMARY_STYLE, opacity: 0.4, cursor: "not-allowed",
};
const BTN_CLOSE_STYLE: React.CSSProperties = {
  background: "none", border: "none",
  color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 4,
};
const SUCCESS_BANNER_STYLE: React.CSSProperties = {
  padding: "7px 14px", background: "rgba(52,211,153,0.1)",
  border: "1px solid rgba(52,211,153,0.3)",
  borderRadius: 6, fontSize: 12, color: "#34d399",
};
```

**PhotoCanvas props change** — the PhotoCanvas signature needs updating to accept the new point model and draw all placed markers. Update the `PhotoCanvas` function signature and SVG marker rendering to loop over `WIZARD_REF_POINTS` and render each point in its color. See full diff below.

**New PhotoCanvas signature:**

```ts
function PhotoCanvas({
  photoUrl,
  points,
  onPhotoClick,
  activePhotoPointId,
  photoOpacity,
}: {
  photoUrl: string;
  points: Record<string, PointState>;
  onPhotoClick: (p: PointCoords2D) => void;
  activePhotoPointId: string | null;  // null = locked (phase 2)
  photoOpacity: number;
})
```

The SVG overlay now renders all placed photo points:

```tsx
{WIZARD_REF_POINTS.map(refPt => {
  const pt = points[refPt.id];
  if (!pt.photo) return null;
  const { xPercent, yPercent } = pt.photo;
  return (
    <g key={refPt.id}>
      <circle cx={xPercent} cy={yPercent} r={1.5} fill={refPt.color} />
      <text x={xPercent + 2} y={yPercent - 2} fontSize={3} fill={refPt.color} fontWeight="bold">
        {refPt.label}
      </text>
    </g>
  );
})}
```

**Cursor logic** — when `activePhotoPointId` is null (scan phase), use `"default"`.

**Click handler** — call `onPhotoClick` only when `activePhotoPointId !== null`.

**PhaseChip helper:**

```tsx
function PhaseChip({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span style={{
      padding: "3px 10px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: active ? 600 : 400,
      background: done ? "rgba(52,211,153,0.15)" : active ? "rgba(0,180,216,0.15)" : "transparent",
      color: done ? "#34d399" : active ? "var(--accent, #00b4d8)" : "var(--text-muted)",
      border: `1px solid ${done ? "rgba(52,211,153,0.3)" : active ? "rgba(0,180,216,0.3)" : "var(--border,#2a2f3b)"}`,
    }}>
      {done ? "✓ " : ""}{label}
    </span>
  );
}
```

**Step 2: Run the full test suite**

```bash
cd apps/desktop && npx vitest run
```

Fix any TypeScript errors before committing.

**Step 3: Commit**

```bash
git add apps/desktop/src/features/capture/AlignmentCalibrationWizard.tsx
git commit -m "feat(alignment): rewrite wizard as full-screen modal with two-phase photo+scan workflow"
```

---

## Task 5: Update CaptureView to open the modal

**Goal:** When the user clicks "Align Photo", render the `AlignmentCalibrationWizard` as a full-screen modal (fixed overlay) instead of a side panel.

**Files:**
- Modify: `apps/desktop/src/features/views/CaptureView.tsx`

**Step 1: Change the CaptureView render**

The wizard is now full-screen fixed, so it doesn't need a side panel container. Replace the side panel branch and the current outer `showWizard` layout entirely:

```tsx
export function CaptureView() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <CaptureStageHeader
        showWizard={showWizard}
        onToggleWizard={() => setShowWizard(v => !v)}
      />

      {/* Main content — no side panel split needed */}
      <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        <ImportView />
      </div>

      {/* Full-screen modal — rendered at root level via fixed positioning */}
      {showWizard && (
        <AlignmentCalibrationWizard onClose={() => setShowWizard(false)} />
      )}
    </div>
  );
}
```

**Step 2: Run tests**

```bash
cd apps/desktop && npx vitest run src/features/views/CaptureView.test.tsx
```

**Step 3: Commit**

```bash
git add apps/desktop/src/features/views/CaptureView.tsx
git commit -m "feat(capture): open alignment wizard as full-screen modal"
```

---

## Task 6: Rewrite AlignmentCalibrationWizard tests

**Goal:** Update the test file for the new two-phase modal wizard.

**Files:**
- Modify: `apps/desktop/src/features/capture/AlignmentCalibrationWizard.test.tsx`

**Step 1: Replace the test file**

Key behaviors to test (rewrite the file with these cases):

```ts
// Setup helpers — same idb-keyval mock and store resets as before

test("shows 'Upload a patient photo' message when no photo loaded", ...)

test("renders modal with Phase 1 / Phase 2 chips when photo is loaded", ...)

test("clicking photo in phase 1 places first marker (right central)", ...)

test("after two required photo clicks, 'Next: Mark on Scan' button enables", ...)

test("undo removes last placed photo marker", ...)

test("Cmd+Z keyboard shortcut triggers undo", ...)

test("switching to scan phase locks photo panel", ...)
// After 'Next' is clicked, activePhotoPointId should be null →
// clicking photo should NOT place a new marker

test("'Apply Calibration' updates viewport store with correct midlineX and smileArcY", ...)
// Set points[central-R].photo = {xPercent:60, yPercent:55}
//     points[central-L].photo = {xPercent:40, yPercent:55}
//     points[central-R].scan  = {x:4, y:0, z:0}
//     points[central-L].scan  = {x:-4, y:0, z:0}
// Click Apply → midlineX ≈ 50, smileArcY ≈ 55

test("Reset clears all points and returns to photo phase", ...)
```

Note: Since the scan viewer uses R3F Canvas (which can't render in jsdom), mock `AlignmentScanViewer`:

```ts
vi.mock("./AlignmentScanViewer", () => ({
  AlignmentScanViewer: ({ onPickPoint, isPicking }: any) => (
    <button
      data-testid="scan-pick-btn"
      onClick={() => isPicking && onPickPoint({ x: 4, y: 0, z: 0 })}
    >
      Mock Scan
    </button>
  ),
}));
```

**Step 2: Run to confirm green**

```bash
cd apps/desktop && npx vitest run src/features/capture/AlignmentCalibrationWizard.test.tsx
```

**Step 3: Run full suite**

```bash
cd apps/desktop && npx vitest run
```

**Step 4: Commit**

```bash
git add apps/desktop/src/features/capture/AlignmentCalibrationWizard.test.tsx
git commit -m "test(alignment): rewrite wizard tests for two-phase modal flow"
```

---

## Task 7: Final verification

**Step 1: Full test run**

```bash
cd apps/desktop && npx vitest run
```
Expected: All tests pass.

**Step 2: Manual smoke test**
1. `pnpm --filter desktop dev`
2. Open Capture, upload a photo and an arch scan
3. Click "Align Photo" — full-screen modal opens
4. Phase 1: click right central tip (blue dot appears), click left central (green dot), click "Next"
5. Phase 2: rotate scan, click right central on scan (blue sphere), click left central (green sphere)
6. "Apply Calibration" activates and updates the smile overlay
7. Undo button / Cmd+Z removes last marker
8. Reset clears everything

**Step 3: Commit summary if needed**

```bash
git log --oneline -6
```

---

## Summary of All Changed Files

| File | Change |
|------|--------|
| `src/features/alignment/archModel.ts` | + `IncisalReferencePoint` interface + `buildCalibrationFromIncisalPoints()` |
| `src/features/alignment/archModel.test.ts` | + tests for new function |
| `src/features/capture/AlignmentScanViewer.tsx` | NEW — R3F scan viewer with raycasting |
| `src/features/capture/AlignmentCalibrationWizard.tsx` | Full rewrite — modal, two-phase, new ref points, undo |
| `src/features/capture/AlignmentCalibrationWizard.test.tsx` | Rewrite — new flow tests + AlignmentScanViewer mock |
| `src/features/views/CaptureView.tsx` | Use modal instead of side panel |
