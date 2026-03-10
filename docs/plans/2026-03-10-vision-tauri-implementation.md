# Vision Integration + Tauri Packaging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the `apps/vision` MediaPipe service into the desktop app and package the full application into unsigned macOS `.dmg` and Windows `.msi` installers using Tauri sidecars.

**Architecture:** `visionClient.ts` calls the vision service on manual "Auto-detect" click, writing landmark results into `useViewportStore` and `useImportStore`. Both Python services are frozen with PyInstaller and managed as Tauri sidecars by `tauri-plugin-shell`. The frontend `useSidecarStore` gates the button on sidecar health status.

**Tech Stack:** TypeScript + Zustand + React (frontend), Rust + Tauri v2 + `tauri-plugin-shell` (backend), Python + FastAPI + PyInstaller (sidecars), Makefile + GitHub Actions (CI).

---

## Quick Reference

### Running Tests
```bash
cd apps/desktop && npm test
# Run a single test file:
cd apps/desktop && npm test -- visionClient
```

### Vision API Endpoints (already built, not modified)
- `POST http://localhost:8003/landmarks/detect` — FormData field `image`, returns JSON
- `POST http://localhost:8003/masks/mouth` — FormData field `image`, returns PNG blob
- `GET  http://localhost:8003/health` — returns `{"status": "ok"}`
- `GET  http://localhost:8002/health` — returns `{"status": "ok"}` (mesh service)

### API Response Shape (from `apps/vision/src/routers/landmarks.py`)
```json
{
  "landmarks": [...],
  "midlineX": 0.5,
  "interpupillaryLine": { "leftX": ..., "leftY": ..., "rightX": ..., "rightY": ... },
  "lipContour": {
    "outer": [22 points {x,y,z} normalized 0-1],
    "inner": [22 points {x,y,z} normalized 0-1]
  },
  "mouthMaskBbox": { "xMin": ..., "yMin": ..., "xMax": ..., "yMax": ... }
}
```

### Key lip contour indices (outer array):
- `outer[0]`  = lm[61] = **left commissure** (mouth corner)
- `outer[5]`  = lm[0]  = **smile arc top** (philtrum center / upper lip center)
- `outer[10]` = lm[291] = **right commissure** (mouth corner)

### Viewport store coordinate system
- Values are **percent** (0–100), not normalized (0–1)
- Vision API returns normalized (0–1) → multiply by 100 before writing to store

---

## Task 1: Install Tauri Deps + Create `tauri.conf.json`

**Files:**
- Modify: `apps/desktop/package.json`
- Create: `apps/desktop/src-tauri/tauri.conf.json`

**Step 1: Add Tauri to `package.json`**

Edit `apps/desktop/package.json`. Add `"@tauri-apps/api": "^2"` to `"dependencies"`, add `"@tauri-apps/cli": "^2"` to `"devDependencies"`, and add two scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "tauri": "tauri",
    "build:tauri": "tauri build"
  },
  "dependencies": {
    "@react-three/drei": "^10.7.7",
    "@react-three/fiber": "^9.5.0",
    "@tauri-apps/api": "^2",
    "idb-keyval": "^6.2.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.183.2",
    "zod": "^4.3.6",
    "zundo": "^2.3.0",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@types/three": "^0.183.1",
    "@vitejs/plugin-react": "^4.4.1",
    "jsdom": "^26.0.0",
    "typescript": "^5.7.3",
    "vite": "^6.1.0",
    "vitest": "^3.0.5"
  }
}
```

**Step 2: Install new dependencies**

```bash
cd apps/desktop && npm install
```

Expected: exits 0, `node_modules/@tauri-apps/api` exists.

**Step 3: Create `tauri.conf.json`**

Create `apps/desktop/src-tauri/tauri.conf.json`:

```json
{
  "productName": "SmileGen",
  "version": "0.1.0",
  "identifier": "com.smilegen.desktop",
  "build": {
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{
      "title": "SmileGen",
      "width": 1280,
      "height": 800,
      "minWidth": 1024,
      "minHeight": 680
    }]
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "msi"],
    "externalBin": ["binaries/vision-server", "binaries/mesh-server"]
  }
}
```

**Step 4: Create the binaries directory**

```bash
mkdir -p apps/desktop/src-tauri/binaries
touch apps/desktop/src-tauri/binaries/.gitkeep
```

**Step 5: Verify TypeScript build still passes**

```bash
cd apps/desktop && npm run build
```

Expected: no errors. (Full Tauri build with Rust comes in Task 7.)

**Step 6: Run tests to confirm no regressions**

```bash
cd apps/desktop && npm test
```

Expected: all existing tests pass.

**Step 7: Commit**

```bash
git add apps/desktop/package.json apps/desktop/package-lock.json \
  apps/desktop/src-tauri/tauri.conf.json \
  apps/desktop/src-tauri/binaries/.gitkeep
git commit -m "chore: install Tauri v2 deps and scaffold tauri.conf.json"
```

---

## Task 2: `visionClient.ts` — HTTP Client for Vision API

**Files:**
- Create: `apps/desktop/src/services/visionClient.ts`
- Create: `apps/desktop/src/services/visionClient.test.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/services/visionClient.test.ts`:

```ts
import { detectLandmarks, getMouthMask } from "./visionClient";

// Mock the global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Build a realistic outer lip contour (22 points):
// outer[0]  = left commissure
// outer[5]  = smile arc top (philtrum center)
// outer[10] = right commissure
function makeOuterPoints() {
  const pts = Array.from({ length: 22 }, (_, i) => ({
    x: i * 0.04,
    y: 0.5,
    z: 0,
  }));
  pts[0] = { x: 0.2, y: 0.6, z: 0 };   // left commissure
  pts[5] = { x: 0.5, y: 0.55, z: 0 };  // smile arc top
  pts[10] = { x: 0.8, y: 0.6, z: 0 };  // right commissure
  return pts;
}

function makeApiBody() {
  return {
    midlineX: 0.5,
    interpupillaryLine: { leftX: 0.35, leftY: 0.35, rightX: 0.65, rightY: 0.35 },
    lipContour: {
      outer: makeOuterPoints(),
      inner: Array.from({ length: 22 }, () => ({ x: 0.5, y: 0.58, z: 0 })),
    },
    mouthMaskBbox: { xMin: 0.2, yMin: 0.5, xMax: 0.8, yMax: 0.7 },
  };
}

beforeEach(() => mockFetch.mockReset());

describe("detectLandmarks", () => {
  it("POSTs image to /landmarks/detect and maps the result", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeApiBody(),
    });

    const result = await detectLandmarks(new Blob(["fake"], { type: "image/jpeg" }));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/landmarks/detect"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.midlineX).toBeCloseTo(0.5);
    expect(result.commissureLeft).toEqual({ x: 0.2, y: 0.6 });
    expect(result.commissureRight).toEqual({ x: 0.8, y: 0.6 });
    expect(result.smileArcY).toBeCloseTo(0.55);
    expect(result.gingivalLineY).toBeCloseTo(0.45); // smileArcY - 0.1
    expect(result.mouthMaskBbox).toEqual({ xMin: 0.2, yMin: 0.5, xMax: 0.8, yMax: 0.7 });
    expect(result.lipContour.outer).toHaveLength(22);
  });

  it("throws a user-readable message when no face detected (HTTP 422)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422 });
    await expect(detectLandmarks(new Blob(["x"]))).rejects.toThrow("No face detected");
  });

  it("throws a user-readable message on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(detectLandmarks(new Blob(["x"]))).rejects.toThrow(
      "Vision service unavailable"
    );
  });

  it("throws on other HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(detectLandmarks(new Blob(["x"]))).rejects.toThrow(
      "Vision detection failed"
    );
  });
});

describe("getMouthMask", () => {
  it("POSTs image to /masks/mouth and returns the blob", async () => {
    const pngBlob = new Blob([new Uint8Array([137, 80, 78, 71])], {
      type: "image/png",
    });
    mockFetch.mockResolvedValueOnce({ ok: true, blob: async () => pngBlob });

    const result = await getMouthMask(new Blob(["fake"]));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/masks/mouth"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toBe(pngBlob);
  });

  it("throws on HTTP error response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422 });
    await expect(getMouthMask(new Blob(["x"]))).rejects.toThrow();
  });
});
```

**Step 2: Run test — expect failure**

```bash
cd apps/desktop && npm test -- visionClient
```

Expected: `FAIL — Cannot find module './visionClient'`

**Step 3: Create `visionClient.ts`**

Create `apps/desktop/src/services/visionClient.ts`:

```ts
// apps/desktop/src/services/visionClient.ts

const VISION_API_URL =
  import.meta.env.VITE_VISION_API_URL ?? "http://localhost:8003";

export interface VisionLandmarkResult {
  /** Normalized facial midline X (0–1). Multiply × 100 for viewport store. */
  midlineX: number;
  /** Left mouth corner, normalized (0–1). */
  commissureLeft: { x: number; y: number };
  /** Right mouth corner, normalized (0–1). */
  commissureRight: { x: number; y: number };
  /** Normalized Y of upper lip center / incisal line (0–1). */
  smileArcY: number;
  /** Estimated normalized Y of gingival line, above smileArcY. */
  gingivalLineY: number;
  /** Full lip contour — all points normalized (0–1). */
  lipContour: {
    outer: { x: number; y: number }[];
    inner: { x: number; y: number }[];
  };
  mouthMaskBbox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
}

/**
 * Detect facial landmarks in a photo.
 *
 * Calls POST /landmarks/detect on the vision service.
 * Maps the raw API response to VisionLandmarkResult.
 *
 * Throws with a user-readable message on HTTP error or network failure.
 */
export async function detectLandmarks(
  imageBlob: Blob
): Promise<VisionLandmarkResult> {
  const form = new FormData();
  form.append("image", imageBlob, "photo.jpg");

  let res: Response;
  try {
    res = await fetch(`${VISION_API_URL}/landmarks/detect`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error(
      "Vision service unavailable. Make sure the vision service is running."
    );
  }

  if (res.status === 422) {
    throw new Error(
      "No face detected in the uploaded photo. Try a clearer frontal photo."
    );
  }
  if (!res.ok) {
    throw new Error(
      `Vision detection failed (${res.status}). Please try again.`
    );
  }

  const data = await res.json();

  // outer lip contour: 22 points built from UPPER_LIP_OUTER + reversed LOWER_LIP_OUTER
  // outer[0]  = lm[61]  = left commissure
  // outer[5]  = lm[0]   = philtrum center / upper lip top (smile arc reference)
  // outer[10] = lm[291] = right commissure
  const outer: { x: number; y: number; z?: number }[] = data.lipContour.outer;
  const inner: { x: number; y: number; z?: number }[] = data.lipContour.inner;

  const smileArcY = outer[5].y;

  return {
    midlineX: data.midlineX,
    commissureLeft: { x: outer[0].x, y: outer[0].y },
    commissureRight: { x: outer[10].x, y: outer[10].y },
    smileArcY,
    gingivalLineY: Math.max(0, smileArcY - 0.1),
    lipContour: {
      outer: outer.map(({ x, y }) => ({ x, y })),
      inner: inner.map(({ x, y }) => ({ x, y })),
    },
    mouthMaskBbox: data.mouthMaskBbox,
  };
}

/**
 * Generate a mouth mask PNG from a photo.
 *
 * Calls POST /masks/mouth on the vision service.
 * Returns a Blob containing the PNG mask image.
 */
export async function getMouthMask(imageBlob: Blob): Promise<Blob> {
  const form = new FormData();
  form.append("image", imageBlob, "photo.jpg");

  let res: Response;
  try {
    res = await fetch(`${VISION_API_URL}/masks/mouth`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error(
      "Vision service unavailable. Make sure the vision service is running."
    );
  }

  if (!res.ok) {
    throw new Error(
      `Mouth mask generation failed (${res.status}). Please try again.`
    );
  }

  return res.blob();
}
```

**Step 4: Run tests — expect all pass**

```bash
cd apps/desktop && npm test -- visionClient
```

Expected: `PASS` — 6 tests across 2 describe blocks.

**Step 5: Commit**

```bash
git add apps/desktop/src/services/visionClient.ts \
  apps/desktop/src/services/visionClient.test.ts
git commit -m "feat: add visionClient for landmark detection and mouth mask"
```

---

## Task 3: `useSidecarStore.ts` — Sidecar Lifecycle State

**Files:**
- Create: `apps/desktop/src/store/useSidecarStore.ts`
- Create: `apps/desktop/src/store/useSidecarStore.test.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/store/useSidecarStore.test.ts`:

```ts
import { useSidecarStore } from "./useSidecarStore";

// Reset state before each test to avoid cross-test contamination
beforeEach(() => {
  useSidecarStore.setState({ state: "starting" });
});

test("initial sidecar state is 'starting'", () => {
  expect(useSidecarStore.getState().state).toBe("starting");
});

test("setState transitions to 'ready'", () => {
  useSidecarStore.getState().setState("ready");
  expect(useSidecarStore.getState().state).toBe("ready");
});

test("setState transitions to 'unavailable'", () => {
  useSidecarStore.getState().setState("unavailable");
  expect(useSidecarStore.getState().state).toBe("unavailable");
});
```

**Step 2: Run test — expect failure**

```bash
cd apps/desktop && npm test -- useSidecarStore
```

Expected: `FAIL — Cannot find module './useSidecarStore'`

**Step 3: Create `useSidecarStore.ts`**

Create `apps/desktop/src/store/useSidecarStore.ts`:

```ts
// apps/desktop/src/store/useSidecarStore.ts
import { create } from "zustand";

export type SidecarState = "starting" | "ready" | "unavailable";

interface SidecarStore {
  state: SidecarState;
  setState: (s: SidecarState) => void;
}

export const useSidecarStore = create<SidecarStore>((set) => ({
  state: "starting",
  setState: (state) => set({ state }),
}));

// Wire Tauri events in Tauri runtime; fall back to "ready" after 30 s in dev mode.
// This IIFE runs once when the module is first imported.
(async function initSidecarListeners() {
  // Tauri v2 sets window.__TAURI_INTERNALS__ when running inside the Tauri webview
  const isTauri =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  if (isTauri) {
    try {
      // Dynamic import avoids bundling @tauri-apps/api in dev/test environments
      const { listen } = await import("@tauri-apps/api/event");
      await listen("sidecars-ready", () =>
        useSidecarStore.getState().setState("ready")
      );
      await listen("sidecars-unavailable", () =>
        useSidecarStore.getState().setState("unavailable")
      );
    } catch {
      // Tauri API failed (shouldn't happen) — mark unavailable
      useSidecarStore.getState().setState("unavailable");
    }
  } else {
    // Plain Vite dev mode: no Tauri runtime.
    // Fall back to "ready" after 30 s so the button works against a local service.
    setTimeout(() => {
      if (useSidecarStore.getState().state === "starting") {
        useSidecarStore.getState().setState("ready");
      }
    }, 30_000);
  }
})();
```

**Step 4: Run tests — expect all pass**

```bash
cd apps/desktop && npm test -- useSidecarStore
```

Expected: `PASS` — 3 tests.

**Step 5: Commit**

```bash
git add apps/desktop/src/store/useSidecarStore.ts \
  apps/desktop/src/store/useSidecarStore.test.ts
git commit -m "feat: add useSidecarStore for Tauri sidecar lifecycle state"
```

---

## Task 4: `useImportStore.ts` — Add `mouthMaskUrl` Field

**Files:**
- Modify: `apps/desktop/src/store/useImportStore.ts`
- Create: `apps/desktop/src/store/useImportStore.test.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/store/useImportStore.test.ts`:

```ts
import { useImportStore } from "./useImportStore";

beforeEach(() => {
  useImportStore.getState().clearAll();
});

test("mouthMaskUrl is null initially", () => {
  expect(useImportStore.getState().mouthMaskUrl).toBeNull();
});

test("setMouthMaskUrl stores the URL", () => {
  useImportStore.getState().setMouthMaskUrl("blob:http://localhost/abc");
  expect(useImportStore.getState().mouthMaskUrl).toBe("blob:http://localhost/abc");
});

test("clearAll revokes the object URL and clears mouthMaskUrl", () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  useImportStore.getState().setMouthMaskUrl("blob:http://localhost/xyz");
  useImportStore.getState().clearAll();
  expect(revoke).toHaveBeenCalledWith("blob:http://localhost/xyz");
  expect(useImportStore.getState().mouthMaskUrl).toBeNull();
});

test("clearAll with null mouthMaskUrl does not call revokeObjectURL for mask", () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  // No mask set, so no mask revocation should happen
  useImportStore.getState().clearAll();
  // (Photos are also empty, so revokeObjectURL shouldn't be called at all)
  expect(revoke).not.toHaveBeenCalled();
});
```

**Step 2: Run test — expect failure**

```bash
cd apps/desktop && npm test -- useImportStore
```

Expected: `FAIL — mouthMaskUrl is not a function` (or similar undefined error)

**Step 3: Edit `useImportStore.ts` — add to `ImportState` interface**

In `apps/desktop/src/store/useImportStore.ts`, add `mouthMaskUrl` to the `ImportState` interface (after `importError`):

```ts
interface ImportState {
  uploadedPhotos: UploadedPhoto[];
  archScanMesh: ParsedStlMesh | null;
  archScanName: string | undefined;
  uploadedToothModels: UploadedToothModel[];
  importError: string | null;
  mouthMaskUrl: string | null;   // ← ADD
}
```

**Step 4: Add `setMouthMaskUrl` to `ImportActions` interface**

```ts
interface ImportActions {
  handlePhotosSelected: (files: FileList | null) => void;
  handleArchScanSelected: (files: FileList | null) => Promise<void>;
  handleToothModelsSelected: (files: FileList | null) => Promise<void>;
  removePhoto: (name: string) => void;
  clearPhotos: () => void;
  clearArchScan: () => void;
  removeToothModel: (toothId: string) => void;
  clearToothModels: () => void;
  setMouthMaskUrl: (url: string | null) => void;   // ← ADD
  clearAll: () => void;
}
```

**Step 5: Add initial value and action in the `create(...)` body**

Add to the initial state object (after `importError: null`):

```ts
mouthMaskUrl: null,
```

Add the action (can go right before `clearAll`):

```ts
setMouthMaskUrl: (url) => set({ mouthMaskUrl: url }),
```

**Step 6: Update `clearAll` to revoke the mouth mask URL**

Replace the existing `clearAll`:

```ts
clearAll: () => {
  const { uploadedPhotos, mouthMaskUrl } = get();
  uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.url));
  if (mouthMaskUrl) URL.revokeObjectURL(mouthMaskUrl);
  set({
    uploadedPhotos: [],
    archScanMesh: null,
    archScanName: undefined,
    uploadedToothModels: [],
    importError: null,
    mouthMaskUrl: null,
  });
},
```

**Step 7: Run tests — expect all pass**

```bash
cd apps/desktop && npm test -- useImportStore
```

Expected: `PASS` — 4 tests.

**Step 8: Run full test suite — no regressions**

```bash
cd apps/desktop && npm test
```

Expected: all existing tests still pass.

**Step 9: Commit**

```bash
git add apps/desktop/src/store/useImportStore.ts \
  apps/desktop/src/store/useImportStore.test.ts
git commit -m "feat: add mouthMaskUrl to useImportStore with revocation on clear"
```

---

## Task 5: `CaptureView.tsx` — Auto-Detect Button

**Files:**
- Modify: `apps/desktop/src/features/views/CaptureView.tsx`

This is a UI change. No unit tests (the component renders an import view inside). Verify manually.

**Step 1: Add imports at top of `CaptureView.tsx`**

After the existing imports, add:

```ts
import { detectLandmarks, getMouthMask } from "../../services/visionClient";
import { useSidecarStore } from "../../store/useSidecarStore";
```

**Step 2: Rewrite `CaptureStageHeader`**

Replace the entire `CaptureStageHeader` function with the version below. Key additions:
- `detecting` and `detectError` state
- `sidecarState` from `useSidecarStore`
- `handleAutoDetect` — fetches blob from object URL, calls vision API, writes to stores
- "Auto-detect" button (disabled logic based on sidecar state + detecting)
- Inline error banner rendered below the header row

```tsx
function CaptureStageHeader({
  showWizard,
  onToggleWizard,
}: {
  showWizard: boolean;
  onToggleWizard: () => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const setMouthMaskUrl = useImportStore((s) => s.setMouthMaskUrl);
  const archScanName = useImportStore((s) => s.archScanName);

  const setActiveView = useViewportStore((s) => s.setActiveView);
  const setMidlineX = useViewportStore((s) => s.setMidlineX);
  const setSmileArcY = useViewportStore((s) => s.setSmileArcY);
  const setGingivalLineY = useViewportStore((s) => s.setGingivalLineY);
  const setLeftCommissureX = useViewportStore((s) => s.setLeftCommissureX);
  const setRightCommissureX = useViewportStore((s) => s.setRightCommissureX);
  const clearAlignmentMarkers = useViewportStore((s) => s.clearAlignmentMarkers);
  const addAlignmentMarker = useViewportStore((s) => s.addAlignmentMarker);

  const sidecarState = useSidecarStore((s) => s.state);

  const hasPhotos = uploadedPhotos.length > 0;
  const photoCount = uploadedPhotos.length;
  const hasScan = Boolean(archScanName);
  const isComplete = photoCount > 0 || hasScan;

  const handleAutoDetect = async () => {
    const photo = uploadedPhotos[0];
    if (!photo) return;

    setDetecting(true);
    setDetectError(null);
    try {
      // Fetch Blob from the object URL created at upload time
      const imageBlob = await fetch(photo.url).then((r) => r.blob());

      // Call vision service — both calls use the same blob
      const result = await detectLandmarks(imageBlob);
      const maskBlob = await getMouthMask(imageBlob);

      // Write landmark results to viewport store (normalized 0–1 → percent 0–100)
      setMidlineX(result.midlineX * 100);
      setSmileArcY(result.smileArcY * 100);
      setGingivalLineY(result.gingivalLineY * 100);
      setLeftCommissureX(result.commissureLeft.x * 100);
      setRightCommissureX(result.commissureRight.x * 100);

      // Replace alignment markers with detected commissures (draggable in overlay)
      clearAlignmentMarkers();
      addAlignmentMarker({
        id: "commissure-L",
        type: "cusp",
        toothId: "commissure-L",
        x: result.commissureLeft.x * 100,
        y: result.commissureLeft.y * 100,
      });
      addAlignmentMarker({
        id: "commissure-R",
        type: "cusp",
        toothId: "commissure-R",
        x: result.commissureRight.x * 100,
        y: result.commissureRight.y * 100,
      });

      // Store mouth mask for PhotoOverlay to apply as CSS mask-image
      const maskUrl = URL.createObjectURL(maskBlob);
      setMouthMaskUrl(maskUrl);
    } catch (err) {
      setDetectError(
        err instanceof Error ? err.message : "Auto-detect failed. Please try again."
      );
    } finally {
      setDetecting(false);
    }
  };

  // Button label changes based on sidecar state and detecting flag
  const autoDetectLabel =
    sidecarState === "starting"
      ? "Services loading…"
      : sidecarState === "unavailable"
      ? "Vision offline"
      : detecting
      ? "Detecting…"
      : "Auto-detect";

  const autoDetectDisabled =
    !hasPhotos || detecting || sidecarState !== "ready";

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: detectError ? "none" : "1px solid var(--border, #2a2f3b)",
          background: "var(--bg-secondary, #1a1f2b)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted, #8892a0)",
            }}
          >
            Capture
          </span>
          {photoCount > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "var(--accent, #00b4d8)",
                background: "rgba(0,180,216,0.1)",
                padding: "2px 7px",
                borderRadius: 4,
              }}
            >
              {photoCount} photo{photoCount !== 1 ? "s" : ""}
            </span>
          )}
          {hasScan && (
            <span
              style={{
                fontSize: 11,
                color: "var(--accent, #00b4d8)",
                background: "rgba(0,180,216,0.1)",
                padding: "2px 7px",
                borderRadius: 4,
              }}
            >
              Arch scan
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Auto-detect button */}
          <button
            onClick={handleAutoDetect}
            disabled={autoDetectDisabled}
            title={
              sidecarState === "unavailable"
                ? "Vision service is offline. Start the vision service to enable Auto-detect."
                : sidecarState === "starting"
                ? "Vision service is starting up…"
                : !hasPhotos
                ? "Upload a photo first"
                : "Detect facial landmarks from the first uploaded photo"
            }
            style={{
              padding: "6px 12px",
              background: "var(--bg-tertiary, #252b38)",
              color: autoDetectDisabled
                ? "var(--text-muted, #555)"
                : "var(--text-primary, #e0e6ef)",
              border: "1px solid var(--border, #2a2f3b)",
              borderRadius: 6,
              fontSize: 12,
              cursor: autoDetectDisabled ? "not-allowed" : "pointer",
              opacity: autoDetectDisabled ? 0.6 : 1,
            }}
          >
            {autoDetectLabel}
          </button>

          {/* Alignment wizard toggle */}
          {hasPhotos && (
            <button
              onClick={onToggleWizard}
              style={{
                padding: "6px 12px",
                background: showWizard
                  ? "rgba(0,180,216,0.15)"
                  : "var(--bg-tertiary, #252b38)",
                color: showWizard ? "var(--accent, #00b4d8)" : "var(--text-muted)",
                border: "1px solid",
                borderColor: showWizard
                  ? "var(--accent, #00b4d8)"
                  : "var(--border, #2a2f3b)",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Open the 2-point alignment wizard"
            >
              {showWizard ? "Hide Alignment" : "Align Photo"}
            </button>
          )}

          {isComplete && (
            <button
              onClick={() => setActiveView("simulate")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "var(--accent, #00b4d8)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Continue to Simulate
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Inline error banner — shown below header row, not in a modal */}
      {detectError && (
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(220, 53, 69, 0.1)",
            borderBottom: "1px solid var(--border, #2a2f3b)",
            borderLeft: "3px solid #dc3545",
            color: "#ff6b7a",
            fontSize: 12,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{detectError}</span>
          <button
            onClick={() => setDetectError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#ff6b7a",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
```

**Step 3: Run full test suite — expect no regressions**

```bash
cd apps/desktop && npm test
```

Expected: all tests pass.

**Step 4: Manual smoke test**

Start the vision service separately (`cd apps/vision && uvicorn src.main:app --port 8003 --reload`), then run the dev app (`cd apps/desktop && npm run dev`).

1. Upload a frontal photo
2. Wait 30 s for the 30s dev-mode timeout → button becomes "Auto-detect"
3. Click "Auto-detect" → spinner shows "Detecting…" → on success, overlay guides update
4. Check browser devtools for network calls to `/landmarks/detect` and `/masks/mouth`

**Step 5: Commit**

```bash
git add apps/desktop/src/features/views/CaptureView.tsx
git commit -m "feat: add Auto-detect button to CaptureView wired to vision service"
```

---

## Task 6: `PhotoOverlay.tsx` — Mouth Mask CSS Masking

**Files:**
- Modify: `apps/desktop/src/features/overlay/PhotoOverlay.tsx`

The mouth mask URL (a PNG blob) is applied as a CSS `mask-image` on the photo element. This limits the visible area of the photo to the mouth region when shown in SimulateView, suppressing noise from nose/chin.

**Step 1: Add `mouthMaskUrl` selector**

In `PhotoOverlay.tsx`, add this line after the existing `useImportStore` selector on line ~44:

```ts
const mouthMaskUrl = useImportStore((s) => s.mouthMaskUrl);
```

**Step 2: Apply `mask-image` to the `<img>` element**

Find the `<img src={photo.url} ...>` element (around line 373) and add the conditional mask styles:

```tsx
<img
  src={photo.url}
  alt={photo.name}
  draggable={false}
  style={{
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    userSelect: "none",
    // Apply mouth mask when available — isolates smile zone in SimulateView overlay
    ...(mouthMaskUrl
      ? {
          maskImage: `url(${mouthMaskUrl})`,
          maskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskImage: `url(${mouthMaskUrl})`,
          WebkitMaskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
        }
      : {}),
  }}
/>
```

**Step 3: Run full test suite**

```bash
cd apps/desktop && npm test
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add apps/desktop/src/features/overlay/PhotoOverlay.tsx
git commit -m "feat: apply mouth mask as CSS mask-image on PhotoOverlay when available"
```

---

## Task 7: Rust Backend — Sidecar Management

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/src/commands.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`

**Step 1: Update `Cargo.toml`**

Replace `apps/desktop/src-tauri/Cargo.toml`:

```toml
[package]
name = "desktop"
version = "0.0.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["time"] }
serde = { version = "1", features = ["derive"] }
```

**Step 2: Rewrite `commands.rs`**

Replace `apps/desktop/src-tauri/src/commands.rs`:

```rust
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

/// Holds spawned-sidecar tracking info.
/// Stored in AppState so it can be accessed for cleanup.
pub struct AppState {
    pub vision_spawned: bool,
    pub mesh_spawned: bool,
}

/// Tauri-managed wrapper — must implement Send + Sync via Mutex.
pub struct ManagedAppState(pub Mutex<AppState>);

/// Spawns both Python sidecars and starts a background health-check loop.
/// Emits "sidecars-ready" when both services answer /health,
/// or "sidecars-unavailable" after 10 × 500 ms attempts.
pub fn start_sidecars(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let shell = app.shell();

    // spawn() returns (Receiver<CommandEvent>, CommandChild).
    // We discard both — the processes continue running independently.
    // The OS will clean them up when the parent process exits.
    let _ = shell.sidecar("vision-server")?.spawn()?;
    let _ = shell.sidecar("mesh-server")?.spawn()?;

    // Mark as spawned in AppState
    let state = app.state::<ManagedAppState>();
    let mut guard = state.0.lock().unwrap();
    guard.vision_spawned = true;
    guard.mesh_spawned = true;
    drop(guard);

    // Start health-check loop in background
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        poll_until_healthy(app_handle).await;
    });

    Ok(())
}

/// Polls /health on both services up to 10 times with 500 ms intervals.
/// Emits "sidecars-ready" on success, "sidecars-unavailable" on timeout.
async fn poll_until_healthy(app: AppHandle) {
    let client = reqwest::Client::new();
    for _ in 0..10 {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        let vision_ok = client
            .get("http://localhost:8003/health")
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false);
        let mesh_ok = client
            .get("http://localhost:8002/health")
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false);
        if vision_ok && mesh_ok {
            let _ = app.emit("sidecars-ready", ());
            return;
        }
    }
    let _ = app.emit("sidecars-unavailable", ());
}

#[tauri::command]
pub fn generate_variants() -> &'static str {
    "stubbed"
}
```

**Step 3: Rewrite `main.rs`**

Replace `apps/desktop/src-tauri/src/main.rs`:

```rust
mod commands;

use commands::ManagedAppState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ManagedAppState(Mutex::new(commands::AppState {
            vision_spawned: false,
            mesh_spawned: false,
        })))
        .setup(|app| {
            commands::start_sidecars(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::generate_variants])
        .run(tauri::generate_context!())
        .expect("failed to run tauri app");
}
```

**Step 4: Run `cargo check` to verify Rust compiles**

```bash
cd apps/desktop/src-tauri && cargo check
```

Expected: `Finished` with no errors. This fetches and compiles dependencies — may take 2–5 minutes on first run.

If you see errors about `ShellExt` or spawn return type, check the `tauri-plugin-shell` v2 changelog. The API may require: `let (_rx, _child) = shell.sidecar("vision-server")?.spawn()?;` — adjust as needed.

**Step 5: Commit**

```bash
git add apps/desktop/src-tauri/Cargo.toml \
  apps/desktop/src-tauri/src/main.rs \
  apps/desktop/src-tauri/src/commands.rs
git commit -m "feat: add Tauri sidecar management with health-check event emission"
```

---

## Task 8: PyInstaller Specs + Runner Scripts

**Files:**
- Create: `apps/vision/run.py`
- Create: `apps/vision/vision-server.spec`
- Create: `apps/mesh/run.py`
- Create: `apps/mesh/mesh-server.spec`

**Step 1: Check where the vision model file lives**

```bash
find apps/vision -name "face_landmarker.task"
```

Note the path — you'll need it in the spec's `datas` list. Common location: `apps/vision/src/services/face_landmarker.task`.

**Step 2: Create the vision runner script**

Create `apps/vision/run.py`:

```python
"""
Entry point for the PyInstaller-frozen vision-server sidecar.

Imports the FastAPI `app` object directly (avoids string-based import,
which is unreliable with PyInstaller) and runs uvicorn on a fixed port.
"""
import uvicorn
from src.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8003, log_level="warning")
```

**Step 3: Create the vision PyInstaller spec**

Create `apps/vision/vision-server.spec`.
Update the `datas` path on line 12 to match what you found in Step 1.

```python
# vision-server.spec
# Run with: pyinstaller vision-server.spec --distpath ../../apps/desktop/src-tauri/binaries
# from the apps/vision/ directory.

block_cipher = None

a = Analysis(
    ["run.py"],
    pathex=["."],
    binaries=[],
    datas=[
        # Bundle the MediaPipe face landmarker model.
        # Adjust path if face_landmarker.task lives elsewhere.
        ("src/services/face_landmarker.task", "src/services"),
    ],
    hiddenimports=[
        # uvicorn modules not auto-detected by PyInstaller
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        # mediapipe auto-detection is imperfect
        "mediapipe",
        "mediapipe.tasks",
        "mediapipe.tasks.python",
        "mediapipe.tasks.python.vision",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="vision-server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```

**Step 4: Create the mesh runner script**

Create `apps/mesh/run.py`:

```python
"""
Entry point for the PyInstaller-frozen mesh-server sidecar.
"""
import uvicorn
from src.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8002, log_level="warning")
```

**Step 5: Confirm mesh `src/main.py` exists**

```bash
ls apps/mesh/src/main.py
```

Expected: file exists. If it doesn't, check the mesh service structure and update `run.py` import accordingly.

**Step 6: Create the mesh PyInstaller spec**

Create `apps/mesh/mesh-server.spec`:

```python
# mesh-server.spec
# Run with: pyinstaller mesh-server.spec --distpath ../../apps/desktop/src-tauri/binaries
# from the apps/mesh/ directory.

block_cipher = None

a = Analysis(
    ["run.py"],
    pathex=["."],
    binaries=[],
    datas=[],
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="mesh-server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```

**Step 7: Commit**

```bash
git add apps/vision/run.py apps/vision/vision-server.spec \
  apps/mesh/run.py apps/mesh/mesh-server.spec
git commit -m "chore: add PyInstaller specs and runner scripts for vision and mesh sidecars"
```

---

## Task 9: `Makefile` — Build Pipeline

**Files:**
- Create: `Makefile` (repo root — same directory as `pnpm-workspace.yaml`)

**Step 1: Create `Makefile`**

Create `/Users/timchung/Desktop/smilegen/Makefile`:

```makefile
.PHONY: freeze-vision freeze-mesh build-mac build-windows build-all

BINARIES_DIR := apps/desktop/src-tauri/binaries

# Freeze the vision FastAPI service into a self-contained binary.
# Output lands in apps/desktop/src-tauri/binaries/ for Tauri to bundle.
freeze-vision:
	cd apps/vision && pyinstaller vision-server.spec --distpath ../../$(BINARIES_DIR)

# Freeze the mesh synthesis FastAPI service.
freeze-mesh:
	cd apps/mesh && pyinstaller mesh-server.spec --distpath ../../$(BINARIES_DIR)

# Build unsigned macOS universal binary (.dmg).
# Requires: Rust target aarch64-apple-darwin + x86_64-apple-darwin installed.
# Run: rustup target add aarch64-apple-darwin x86_64-apple-darwin
build-mac: freeze-vision freeze-mesh
	cd apps/desktop && npm run build:tauri -- --target universal-apple-darwin

# Build unsigned Windows installer (.msi).
# Must be run on Windows or via cross-compilation (not supported without Wine).
build-windows: freeze-vision freeze-mesh
	cd apps/desktop && npm run build:tauri -- --target x86_64-pc-windows-msvc

build-all: build-mac build-windows
```

**Step 2: Verify make can parse the file**

```bash
make -n freeze-vision
```

Expected: prints the `cd apps/vision && pyinstaller ...` command without running it. If `make` is not installed: `brew install make` on macOS.

**Step 3: Commit**

```bash
git add Makefile
git commit -m "chore: add Makefile with PyInstaller freeze and Tauri build targets"
```

---

## Task 10: GitHub Actions CI

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Create the workflow directory if it doesn't exist**

```bash
mkdir -p .github/workflows
```

**Step 2: Create `release.yml`**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install Python deps (vision)
        run: |
          cd apps/vision
          pip install -r requirements.txt
          pip install pyinstaller

      - name: Install Python deps (mesh)
        run: |
          cd apps/mesh
          pip install -r requirements.txt
          pip install pyinstaller

      - name: Freeze Python sidecars
        run: make freeze-vision freeze-mesh

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: apps/desktop/package-lock.json

      - name: Install Node deps
        run: cd apps/desktop && npm ci

      - name: Set up Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-apple-darwin,x86_64-apple-darwin

      - name: Build macOS installer
        run: make build-mac

      - name: Upload macOS artifact
        uses: actions/upload-artifact@v4
        with:
          name: smilegen-macos
          path: apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install Python deps (vision)
        run: |
          cd apps/vision
          pip install -r requirements.txt
          pip install pyinstaller

      - name: Install Python deps (mesh)
        run: |
          cd apps/mesh
          pip install -r requirements.txt
          pip install pyinstaller

      - name: Freeze Python sidecars
        run: make freeze-vision freeze-mesh

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: apps/desktop/package-lock.json

      - name: Install Node deps
        run: cd apps/desktop && npm ci

      - name: Set up Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Build Windows installer
        run: make build-windows

      - name: Upload Windows artifact
        uses: actions/upload-artifact@v4
        with:
          name: smilegen-windows
          path: apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi
```

**Step 3: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml')); print('OK')"
```

Expected: `OK`

**Step 4: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add GitHub Actions release workflow for macOS dmg and Windows msi"
```

---

## Final Verification

**Step 1: Run the full TypeScript test suite one more time**

```bash
cd apps/desktop && npm test
```

Expected: all tests pass.

**Step 2: Verify `cargo check` still passes**

```bash
cd apps/desktop/src-tauri && cargo check
```

Expected: `Finished` — no errors.

**Step 3: Smoke test the freeze (optional, requires Python deps)**

```bash
# Only run this if you have PyInstaller and the vision deps installed locally
make freeze-vision
ls apps/desktop/src-tauri/binaries/
```

Expected: `vision-server` binary (platform-suffixed) appears in the binaries dir.

**Step 4: Final commit if anything was tweaked**

```bash
git add -p   # review any remaining changes
git commit -m "chore: vision integration + tauri packaging complete"
```

---

## Known Gotchas

| Issue | Fix |
|---|---|
| `cargo check` fails on `ShellExt` trait | Ensure `use tauri_plugin_shell::ShellExt;` is imported |
| `spawn()` return type mismatch | tauri-plugin-shell v2 returns `(Receiver<CommandEvent>, CommandChild)` — destructure with `let (_rx, _child) = ...` |
| `face_landmarker.task` not found by PyInstaller | Update `datas` path in `vision-server.spec` to match actual location |
| Mouth mask appears distorted | The PNG mask from `/masks/mouth` has the same aspect ratio as the input image — `maskSize: "100% 100%"` on a `contain`-fitted image will work correctly |
| 30 s dev timeout feels slow | Override by setting `window.__TAURI_INTERNALS__ = {}` in browser console — triggers the Tauri branch which will try (and fail) to import the API, then call `setState("unavailable")`. Or just wait. |
| `make` not found on macOS | `brew install make` |
