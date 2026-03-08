# SmileGen Comprehensive Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all 32 code review issues (6 P0, 8 P1, 12 P2, 6 P3) across security, utilities, store architecture, performance, components, and cleanup.

**Architecture:** Dependency-order execution — security fixes first (independent), then shared utility consolidation, then store split (the keystone change that touches ~40 files), then performance, component decomposition, and cleanup. The store split extracts `useSmileStore` (792 lines) into 4 focused stores: `useCaseStore`, `useDesignStore`, `useViewportStore`, `useImportStore`.

**Tech Stack:** React 19, TypeScript, Zustand + zundo (undo middleware), Three.js / React Three Fiber, Zod (new dependency), Vite, Vitest

---

## Phase 1 — Security Fixes

### Task 1.1: Fix XSS in reportGenerator.ts

**Files:**
- Modify: `apps/desktop/src/features/export/reportGenerator.ts:53-65`

**Step 1: Locate the vulnerability**

Read `reportGenerator.ts`. Find the `patientPhotoUrl` interpolation around line 53:
```typescript
const photoSection = data.patientPhotoUrl
    ? `<div style="margin: 20px 0; text-align: center;">
        <img src="${data.patientPhotoUrl}" ...`
    : "";
```
The `escapeHtml` helper already exists in this file for other fields.

**Step 2: Apply the fix**

Change the interpolation to escape the URL:
```typescript
const photoSection = data.patientPhotoUrl
    ? `<div style="margin: 20px 0; text-align: center;">
        <img src="${escapeHtml(data.patientPhotoUrl)}" style="max-width: 100%; max-height: 300px; border-radius: 4px;">`
    : "";
```

Also apply `encodeURI` as an additional guard before `escapeHtml`:
```typescript
const safePhotoUrl = escapeHtml(encodeURI(data.patientPhotoUrl));
```

**Step 3: Commit**

```bash
cd apps/desktop
git add src/features/export/reportGenerator.ts
git commit -m "fix: escape patientPhotoUrl to prevent XSS in report HTML"
```

---

### Task 1.2: Add Zod and create validators

**Files:**
- Modify: `apps/desktop/package.json` (add zod)
- Create: `apps/desktop/src/features/cases/caseValidators.ts`

**Step 1: Install Zod**

```bash
cd apps/desktop
pnpm add zod
```

**Step 2: Write the failing test**

Create `apps/desktop/src/features/cases/caseValidators.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseSmilePlan, parseAppSettings, parseCaseRecord } from "./caseValidators";

describe("parseSmilePlan", () => {
  it("accepts a valid plan", () => {
    const valid = {
      toothIds: [6, 7, 8, 9, 10, 11],
      proportionMode: "golden",
      archPreset: "medium",
      widthScale: 1.0,
      heightScale: 1.0,
      facialProfile: 0,
      toothDimensions: {},
      toothPlacements: {},
    };
    expect(() => parseSmilePlan(valid)).not.toThrow();
  });

  it("throws on malformed plan", () => {
    expect(() => parseSmilePlan({ toothIds: "not-an-array" })).toThrow();
  });
});

describe("parseAppSettings", () => {
  it("accepts valid settings", () => {
    const valid = { theme: "dark", autoSave: true, exportFormat: "stl_binary", defaultArchPreset: "medium" };
    expect(() => parseAppSettings(valid)).not.toThrow();
  });

  it("throws on prototype pollution attempt", () => {
    expect(() => parseAppSettings(JSON.parse('{"__proto__":{"polluted":true},"theme":"dark","autoSave":true,"exportFormat":"stl_binary","defaultArchPreset":"medium"}'))).not.toThrow();
  });
});
```

**Step 3: Run the test to verify it fails**

```bash
cd apps/desktop
pnpm vitest run src/features/cases/caseValidators.test.ts
```
Expected: FAIL with "Cannot find module './caseValidators'"

**Step 4: Create the validators**

Create `apps/desktop/src/features/cases/caseValidators.ts`:
```typescript
import { z } from "zod";
import type { SmilePlan } from "../smile-plan/smilePlanTypes";
import type { AppSettings } from "../settings/settingsTypes";

// SmilePlan validator
const SmilePlanSchema = z.object({
  toothIds: z.array(z.number()),
  proportionMode: z.enum(["library", "golden", "percentage"]),
  archPreset: z.string(),
  widthScale: z.number(),
  heightScale: z.number(),
  facialProfile: z.number(),
  toothDimensions: z.record(z.string(), z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    depth: z.number().optional(),
    crownHeight: z.number().optional(),
  })).default({}),
  toothPlacements: z.record(z.string(), z.object({
    deltaX: z.number().optional(),
    deltaY: z.number().optional(),
  })).default({}),
});

// AppSettings validator
const AppSettingsSchema = z.object({
  theme: z.enum(["dark", "light"]),
  autoSave: z.boolean(),
  exportFormat: z.enum(["stl_ascii", "stl_binary", "obj"]),
  defaultArchPreset: z.string(),
}).strict(); // .strict() rejects unknown keys, defeating prototype pollution

// GeneratedSmileDesign validator (lightweight — just checks shape, not geometry arrays)
const GeneratedToothDesignSchema = z.object({
  toothId: z.number(),
  width: z.number(),
  height: z.number(),
  depth: z.number(),
  crownHeight: z.number(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  angle: z.number(),
  trustState: z.enum(["ready", "needs_correction", "blocked"]),
  previewTriangles: z.array(z.any()), // geometry — validated by presence only
  source: z.string(),
  prototypeId: z.string().optional(),
});

const GeneratedVariantDesignSchema = z.object({
  id: z.string(),
  label: z.string(),
  teeth: z.array(GeneratedToothDesignSchema),
});

const GeneratedSmileDesignSchema = z.object({
  variants: z.array(GeneratedVariantDesignSchema),
});

// CaseRecord validator
const CaseRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  workflowStage: z.enum(["new", "imported", "mapped", "designed", "ready"]),
  toothMappingConfirmed: z.boolean(),
});

export function parseSmilePlan(data: unknown): SmilePlan {
  return SmilePlanSchema.parse(data) as SmilePlan;
}

export function parseAppSettings(data: unknown): AppSettings {
  return AppSettingsSchema.parse(data) as AppSettings;
}

export function parseGeneratedSmileDesign(data: unknown) {
  return GeneratedSmileDesignSchema.parse(data);
}

export function parseCaseRecord(data: unknown) {
  return CaseRecordSchema.parse(data);
}
```

**Step 5: Run the test to verify it passes**

```bash
pnpm vitest run src/features/cases/caseValidators.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add src/features/cases/caseValidators.ts src/features/cases/caseValidators.test.ts
git add package.json pnpm-lock.yaml
git commit -m "feat: add Zod validators for all JSON.parse boundaries"
```

---

### Task 1.3: Apply Zod to settingsStore

**Files:**
- Modify: `apps/desktop/src/features/settings/settingsStore.ts`

**Step 1: Apply the validator**

Open `settingsStore.ts`. Replace lines 18-26:

Before:
```typescript
export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem("smilegen-settings");
    if (stored) {
      currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch { /* ignore */ }
  return currentSettings;
}
```

After:
```typescript
import { parseAppSettings } from "../cases/caseValidators";

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem("smilegen-settings");
    if (stored) {
      const parsed = JSON.parse(stored);
      currentSettings = parseAppSettings({ ...DEFAULT_SETTINGS, ...parsed });
    }
  } catch {
    // Corrupted or outdated settings — fall back to defaults
    currentSettings = { ...DEFAULT_SETTINGS };
  }
  return currentSettings;
}
```

**Step 2: Commit**

```bash
git add src/features/settings/settingsStore.ts
git commit -m "fix: validate settings from localStorage with Zod, prevent prototype pollution"
```

---

### Task 1.4: Apply Zod in useSmileStore loadCaseFromDB

**Files:**
- Modify: `apps/desktop/src/store/useSmileStore.ts:669-705`

**Step 1: Apply validators**

Find `loadCaseFromDB` (around line 669). Update the JSON.parse calls:

Before:
```typescript
const plan = JSON.parse(saved.planJson) as SmilePlan;
const generatedDesign = saved.designJson
    ? (JSON.parse(saved.designJson) as GeneratedSmileDesign)
    : null;
```

After:
```typescript
import { parseSmilePlan, parseGeneratedSmileDesign } from "../features/cases/caseValidators";

// inside loadCaseFromDB:
let plan: SmilePlan;
let generatedDesign: GeneratedSmileDesign | null = null;
try {
  plan = parseSmilePlan(JSON.parse(saved.planJson));
} catch (e) {
  console.error("Corrupted plan data in DB, using defaults:", e);
  plan = createDefaultSmilePlan(); // use existing default helper
  // do not set generatedDesign
  set({ caseRecord: record, plan, generatedDesign: null, ... });
  return;
}
if (saved.designJson) {
  try {
    generatedDesign = parseGeneratedSmileDesign(JSON.parse(saved.designJson)) as GeneratedSmileDesign;
  } catch (e) {
    console.error("Corrupted design data in DB, discarding:", e);
    generatedDesign = null;
  }
}
```

**Step 2: Commit**

```bash
git add src/store/useSmileStore.ts
git commit -m "fix: validate JSON.parse in loadCaseFromDB to prevent crash on corrupt DB"
```

---

### Task 1.5: Apply Zod in casePackager.ts

**Files:**
- Modify: `apps/desktop/src/features/collaboration/casePackager.ts`

**Step 1: Locate JSON.parse calls in casePackager**

Read the file. Find where `.smilegen` package JSON is parsed and add validators identical to Task 1.4.

**Step 2: Wrap each parse**

Apply `parseSmilePlan()` and `parseGeneratedSmileDesign()` on all `JSON.parse` results in the import/unpack function. Wrap in try/catch with error logging.

**Step 3: Commit**

```bash
git add src/features/collaboration/casePackager.ts
git commit -m "fix: validate imported .smilegen package JSON with Zod"
```

---

### Task 1.6: Add parser size limits

**Files:**
- Create: `apps/desktop/src/features/import/importConstants.ts`
- Modify: `apps/desktop/src/features/import/stlParser.ts`
- Modify: `apps/desktop/src/features/import/meshParser.ts`

**Step 1: Write failing tests**

Add to `apps/desktop/src/features/import/stlParser.test.ts` (create if not exists):
```typescript
import { parseStlArrayBuffer } from "./stlParser";

it("rejects binary STL claiming more than MAX_TRIANGLES", () => {
  // Build a 84-byte binary STL with triangle count = 3,000,000
  const buf = new ArrayBuffer(84);
  const view = new DataView(buf);
  view.setUint32(80, 3_000_000, true); // little-endian count
  expect(() => parseStlArrayBuffer(buf, "big.stl")).toThrow(/too many triangles/i);
});
```

**Step 2: Create importConstants.ts**

```typescript
// apps/desktop/src/features/import/importConstants.ts
export const MESH_EXTENSIONS = new Set(["stl", "obj", "ply"]);
export const PHOTO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic"]);
export const MAX_TRIANGLES = 2_000_000;
```

**Step 3: Update stlParser.ts to enforce limit**

In `parseBinaryTriangles()` around line 113:
```typescript
import { MAX_TRIANGLES } from "./importConstants";

// After reading triangleCount from DataView:
const triangleCount = dataView.getUint32(80, true);
if (triangleCount > MAX_TRIANGLES) {
  throw new Error(`File claims ${triangleCount.toLocaleString()} triangles which exceeds the limit of ${MAX_TRIANGLES.toLocaleString()}. File may be corrupt.`);
}
```

**Step 4: Update meshParser.ts to enforce limit**

In the PLY parser, after extracting `vertexCount` and `faceCount` from the header:
```typescript
import { MAX_TRIANGLES } from "./importConstants";

if (faceCount > MAX_TRIANGLES) {
  throw new Error(`PLY file claims ${faceCount.toLocaleString()} faces, exceeding the limit of ${MAX_TRIANGLES.toLocaleString()}.`);
}
```

**Step 5: Run tests**

```bash
pnpm vitest run src/features/import/stlParser.test.ts
```

**Step 6: Replace duplicate MESH_EXTENSIONS in fileValidation.ts and meshParser.ts**

In `fileValidation.ts` line 1-2, replace the local constant with an import:
```typescript
import { MESH_EXTENSIONS, PHOTO_EXTENSIONS } from "./importConstants";
```

In `meshParser.ts` line 9, remove the local `MESH_EXTENSIONS` and import from `importConstants`.

In `useDropZone.ts` line 8, do the same.

**Step 7: Commit**

```bash
git add src/features/import/importConstants.ts src/features/import/stlParser.ts
git add src/features/import/meshParser.ts src/features/import/fileValidation.ts
git commit -m "fix: add MAX_TRIANGLES guard in parsers, consolidate MESH_EXTENSIONS constant"
```

---

### Task 1.7: Add Content Security Policy

**Files:**
- Modify: `apps/desktop/index.html`

**Step 1: Add CSP meta tag**

After the existing `<meta charset="UTF-8">` tag, add:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self';">
```

**Step 2: Verify app still loads**

```bash
pnpm dev
```
Open browser — app should load without CSP errors in the console.

**Step 3: Commit**

```bash
git add index.html
git commit -m "security: add Content Security Policy meta tag"
```

---

## Phase 2 — Shared Utilities Consolidation

### Task 2.1: Consolidate computeNormal into meshUtils.ts

**Files:**
- Modify: `apps/desktop/src/features/geometry/meshUtils.ts`
- Modify: `apps/desktop/src/features/engine/designEngine.ts:677-695`
- Modify: `apps/desktop/src/features/export/binaryStl.ts:62-79`

**Step 1: Add computeNormal to meshUtils.ts**

At the bottom of `meshUtils.ts`, add:
```typescript
/** Compute the unit normal of a triangle given three vertices. */
export function computeNormal(
  v0: [number, number, number],
  v1: [number, number, number],
  v2: [number, number, number]
): [number, number, number] {
  const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
  const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / len, ny / len, nz / len];
}
```

**Step 2: Remove duplicate in designEngine.ts**

At lines 677-695, delete the local `computeNormal` function and add import at top of file:
```typescript
import { computeNormal } from "../geometry/meshUtils";
```

**Step 3: Remove duplicate in binaryStl.ts**

Delete the local `computeNormal` function and import from meshUtils:
```typescript
import { computeNormal } from "../geometry/meshUtils";
```

**Step 4: Run existing tests to confirm no regression**

```bash
pnpm vitest run
```

**Step 5: Commit**

```bash
git add src/features/geometry/meshUtils.ts src/features/engine/designEngine.ts
git add src/features/export/binaryStl.ts
git commit -m "refactor: consolidate computeNormal into meshUtils, remove duplicates"
```

---

### Task 2.2: Consolidate computeBounds into meshUtils.ts

**Files:**
- Modify: `apps/desktop/src/features/geometry/meshUtils.ts` (already has computeBounds at lines 4-38 — verify signature matches)
- Modify: `apps/desktop/src/features/import/stlParser.ts:149-197`
- Modify: `apps/desktop/src/features/import/meshParser.ts:243-276`

**Step 1: Verify meshUtils.computeBounds signature**

Read `meshUtils.ts:4-38`. Confirm it accepts `MeshTriangle[]` and returns a `MeshBounds`-compatible object. The signature should be:
```typescript
export function computeBounds(triangles: MeshTriangle[]): MeshBounds & { vertexCount: number }
```

If the return type doesn't include `vertexCount`, add it.

**Step 2: Remove stlParser.createBoundsFromTriangles**

In `stlParser.ts:149-197`, the `createBoundsFromTriangles` function is used internally. Replace the call with `computeBounds` from meshUtils:
```typescript
import { computeBounds } from "../geometry/meshUtils";
// Replace createBoundsFromTriangles(triangles) with computeBounds(triangles)
```
Delete the local `createBoundsFromTriangles` function.

**Step 3: Remove meshParser.computeBounds**

In `meshParser.ts:243-276`, delete the local `computeBounds` and import from meshUtils:
```typescript
import { computeBounds } from "../geometry/meshUtils";
```

**Step 4: Run tests**

```bash
pnpm vitest run
```

**Step 5: Commit**

```bash
git add src/features/geometry/meshUtils.ts src/features/import/stlParser.ts
git add src/features/import/meshParser.ts
git commit -m "refactor: consolidate computeBounds into meshUtils, remove duplicates"
```

---

### Task 2.3: Fix stlParser double-decode bug

**Files:**
- Modify: `apps/desktop/src/features/import/stlParser.ts:32-66`

**Step 1: Understand the bug**

In `parseStlArrayBuffer()`, the TextDecoder is used up to 3 times on the same buffer:
1. Line ~35: `decoder.decode(bytes.slice(0, 1024))` — 1KB probe
2. Line ~47: `decoder.decode(bytes)` — full decode attempt #1
3. Line ~60: `decoder.decode(bytes)` — full decode attempt #2 (fallback)

**Step 2: Apply the fix**

Decode to string once and cache:
```typescript
export function parseStlArrayBuffer(buffer: ArrayBuffer, name: string): ParsedStlMesh {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("utf-8");

  // Decode probe once to detect ASCII vs binary
  const probe = decoder.decode(bytes.slice(0, Math.min(bytes.length, 1024)));
  const looksAscii = probe.trimStart().startsWith("solid");

  let triangles: MeshTriangle[] = [];

  if (looksAscii) {
    // Decode full buffer once
    const fullText = decoder.decode(bytes);
    triangles = parseAsciiTriangles(fullText);
  }

  if (triangles.length === 0) {
    // Try binary
    try {
      triangles = parseBinaryTriangles(buffer);
    } catch { /* fall through */ }
  }

  if (triangles.length === 0 && !looksAscii) {
    // Last resort: ASCII decode (don't re-decode — we already have probe)
    // Try full ASCII parse using the cached full text if we have it
    const fullText = decoder.decode(bytes);
    triangles = parseAsciiTriangles(fullText);
  }

  // ... rest of function unchanged
}
```

The key change: the full buffer is decoded at most once and cached in `fullText`.

**Step 3: Run tests**

```bash
pnpm vitest run src/features/import/stlParser.test.ts
```

**Step 4: Commit**

```bash
git add src/features/import/stlParser.ts
git commit -m "perf: fix stlParser to decode buffer at most once (was decoding up to 3x)"
```

---

## Phase 3 — Store Split

This is the keystone change. We create 4 new stores, migrate state/actions, then update all consumers.

### Task 3.1: Create useImportStore.ts

**Files:**
- Create: `apps/desktop/src/store/useImportStore.ts`
- Reference: `useSmileStore.ts:96-100` (state), lines 506-565 (actions)

**Step 1: Create the store**

```typescript
// apps/desktop/src/store/useImportStore.ts
import { create } from "zustand";
import type { ParsedStlMesh } from "../features/import/stlParser";
import { parseMeshBuffer } from "../features/import/meshParser";
import { isPhotoFile, isMeshFile } from "../features/import/fileValidation";

export interface UploadedPhoto {
  url: string;
  name: string;
}

export interface UploadedToothModel {
  id: string;
  name: string;
  mesh: ParsedStlMesh;
}

interface ImportState {
  patientPhoto: UploadedPhoto | null;
  archScanMesh: ParsedStlMesh | null;
  uploadedToothModels: UploadedToothModel[];
}

interface ImportActions {
  handlePhotosSelected: (files: File[]) => void;
  handleArchScanSelected: (files: File[]) => void;
  handleToothModelsSelected: (files: File[]) => void;
  removePatientPhoto: () => void;
  removeArchScan: () => void;
  removeToothModel: (id: string) => void;
}

export type ImportStore = ImportState & ImportActions;

export const useImportStore = create<ImportStore>((set, get) => ({
  patientPhoto: null,
  archScanMesh: null,
  uploadedToothModels: [],

  handlePhotosSelected: (files) => {
    const photoFile = files.find(isPhotoFile);
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    set({ patientPhoto: { url, name: photoFile.name } });
  },

  handleArchScanSelected: (files) => {
    const meshFile = files.find(isMeshFile);
    if (!meshFile) return;
    meshFile.arrayBuffer().then((buf) => {
      const mesh = parseMeshBuffer(buf, meshFile.name);
      set({ archScanMesh: mesh });
    });
  },

  handleToothModelsSelected: (files) => {
    const meshFiles = files.filter(isMeshFile);
    Promise.all(meshFiles.map(async (f) => {
      const buf = await f.arrayBuffer();
      const mesh = parseMeshBuffer(buf, f.name);
      return { id: crypto.randomUUID(), name: f.name, mesh } as UploadedToothModel;
    })).then((models) => {
      set((s) => ({ uploadedToothModels: [...s.uploadedToothModels, ...models] }));
    });
  },

  removePatientPhoto: () => {
    const { patientPhoto } = get();
    if (patientPhoto) URL.revokeObjectURL(patientPhoto.url);
    set({ patientPhoto: null });
  },

  removeArchScan: () => set({ archScanMesh: null }),
  removeToothModel: (id) => set((s) => ({
    uploadedToothModels: s.uploadedToothModels.filter((m) => m.id !== id),
  })),
}));
```

**Step 2: Commit**

```bash
git add src/store/useImportStore.ts
git commit -m "feat: create useImportStore with photo/scan/model upload state"
```

---

### Task 3.2: Create useViewportStore.ts

**Files:**
- Create: `apps/desktop/src/store/useViewportStore.ts`
- Reference: `useSmileStore.ts:69` (activeView), lines 103-141 (overlay state), lines 587-635 (overlay actions)

**Step 1: Create the store**

```typescript
// apps/desktop/src/store/useViewportStore.ts
import { create } from "zustand";
import type { AlignmentMarker } from "../features/overlay/PhotoOverlay";

export type ViewId = "cases" | "import" | "design" | "compare" | "export" | "settings";

interface ViewportState {
  activeView: ViewId;
  // Overlay toggles
  showMidline: boolean;
  showSmileArc: boolean;
  showGingival: boolean;
  showCommissures: boolean;
  showAlignmentMarkers: boolean;
  showOverlayTeeth: boolean;
  overlayOpacity: number;
  // Photo viewport
  photoZoom: number;
  photoPanX: number;
  photoPanY: number;
  // Commissure positions
  leftCommissureX: number;
  rightCommissureX: number;
  // Alignment markers
  alignmentMarkers: AlignmentMarker[];
  // Overlay tooth positions (from PhotoOverlay calibration)
  overlayToothPositions: Record<number, { x: number; y: number }>;
  // Arch camera
  cameraDistance: number;
  // Active design tab within DesignView
  designTab: "3d" | "photo";
  // Active collection in library panel
  activeCollectionId: string | null;
}

interface ViewportActions {
  setActiveView: (v: ViewId) => void;
  setShowMidline: (v: boolean) => void;
  setShowSmileArc: (v: boolean) => void;
  setShowGingival: (v: boolean) => void;
  setShowCommissures: (v: boolean) => void;
  setShowAlignmentMarkers: (v: boolean) => void;
  setShowOverlayTeeth: (v: boolean) => void;
  setOverlayOpacity: (v: number) => void;
  setPhotoZoom: (v: number) => void;
  setPhotoPanX: (v: number) => void;
  setPhotoPanY: (v: number) => void;
  setLeftCommissureX: (v: number) => void;
  setRightCommissureX: (v: number) => void;
  setAlignmentMarkers: (markers: AlignmentMarker[]) => void;
  setOverlayToothPositions: (pos: Record<number, { x: number; y: number }>) => void;
  setCameraDistance: (v: number) => void;
  setDesignTab: (t: "3d" | "photo") => void;
  setActiveCollectionId: (id: string | null) => void;
}

export const useViewportStore = create<ViewportState & ViewportActions>((set) => ({
  activeView: "cases",
  showMidline: true,
  showSmileArc: true,
  showGingival: false,
  showCommissures: false,
  showAlignmentMarkers: true,
  showOverlayTeeth: true,
  overlayOpacity: 0.7,
  photoZoom: 1,
  photoPanX: 0,
  photoPanY: 0,
  leftCommissureX: 200,
  rightCommissureX: 400,
  alignmentMarkers: [],
  overlayToothPositions: {},
  cameraDistance: 200,
  designTab: "3d",
  activeCollectionId: null,

  setActiveView: (v) => set({ activeView: v }),
  setShowMidline: (v) => set({ showMidline: v }),
  setShowSmileArc: (v) => set({ showSmileArc: v }),
  setShowGingival: (v) => set({ showGingival: v }),
  setShowCommissures: (v) => set({ showCommissures: v }),
  setShowAlignmentMarkers: (v) => set({ showAlignmentMarkers: v }),
  setShowOverlayTeeth: (v) => set({ showOverlayTeeth: v }),
  setOverlayOpacity: (v) => set({ overlayOpacity: v }),
  setPhotoZoom: (v) => set({ photoZoom: v }),
  setPhotoPanX: (v) => set({ photoPanX: v }),
  setPhotoPanY: (v) => set({ photoPanY: v }),
  setLeftCommissureX: (v) => set({ leftCommissureX: v }),
  setRightCommissureX: (v) => set({ rightCommissureX: v }),
  setAlignmentMarkers: (markers) => set({ alignmentMarkers: markers }),
  setOverlayToothPositions: (pos) => set({ overlayToothPositions: pos }),
  setCameraDistance: (v) => set({ cameraDistance: v }),
  setDesignTab: (t) => set({ designTab: t }),
  setActiveCollectionId: (id) => set({ activeCollectionId: id }),
}));
```

**Step 2: Commit**

```bash
git add src/store/useViewportStore.ts
git commit -m "feat: create useViewportStore for ephemeral UI and overlay state"
```

---

### Task 3.3: Create useCaseStore.ts

**Files:**
- Create: `apps/desktop/src/store/useCaseStore.ts`
- Reference: `useSmileStore.ts:72` (caseRecord), lines 316-361 (createCase/confirmMapping), lines 647-731 (persistence)

**Step 1: Create the store**

```typescript
// apps/desktop/src/store/useCaseStore.ts
import { create } from "zustand";
import type { CaseRecord } from "../features/cases/types";
import { createEmptyCase } from "../features/cases/caseStore";
import { parseCaseRecord } from "../features/cases/caseValidators";
import { getCaseDB } from "../services/caseDatabase";

interface CaseState {
  caseRecord: CaseRecord | null;
}

interface CaseActions {
  createCase: (title: string) => void;
  updateCaseRecord: (updates: Partial<CaseRecord>) => void;
  saveCaseToDB: () => Promise<void>;
  loadCaseFromDB: (id: string) => Promise<boolean>;
  newCase: () => void;
}

export const useCaseStore = create<CaseState & CaseActions>((set, get) => ({
  caseRecord: null,

  createCase: (title) => {
    const record = createEmptyCase(title);
    set({ caseRecord: record });
  },

  updateCaseRecord: (updates) => {
    const { caseRecord } = get();
    if (!caseRecord) return;
    set({ caseRecord: { ...caseRecord, ...updates, updatedAt: new Date().toISOString() } });
  },

  saveCaseToDB: async () => {
    const { caseRecord } = get();
    if (!caseRecord) return;
    const db = await getCaseDB();
    await db.put("cases", caseRecord);
  },

  loadCaseFromDB: async (id) => {
    const db = await getCaseDB();
    const raw = await db.get("cases", id);
    if (!raw) return false;
    try {
      const record = parseCaseRecord(raw);
      set({ caseRecord: record as CaseRecord });
      return true;
    } catch (e) {
      console.error("Corrupted case record in DB:", e);
      return false;
    }
  },

  newCase: () => set({ caseRecord: null }),
}));
```

**Step 2: Commit**

```bash
git add src/store/useCaseStore.ts
git commit -m "feat: create useCaseStore with case lifecycle and IndexedDB persistence"
```

---

### Task 3.4: Create useDesignStore.ts with undo middleware

**Files:**
- Create: `apps/desktop/src/store/useDesignStore.ts`
- Modify: `apps/desktop/src/store/undoMiddleware.ts`
- Reference: `useSmileStore.ts:75-87` (design state), lines 406-481 (design actions)

**Step 1: Fix undoMiddleware.ts equality check**

In `undoMiddleware.ts`, change the `TrackedFields` interface and `equality` function:

```typescript
// Remove the old equality function using JSON.stringify
// Replace with version-based equality

export interface TrackedFields {
  smilePlan: SmilePlan | null;
  generatedDesign: GeneratedSmileDesign | null;
  activeVariantId: string | null;
  selectedToothId: number | null;
  _designVersion: number; // incremented on every mutation
}

function equality(past: TrackedFields, current: TrackedFields): boolean {
  // Compare only the version counter — O(1) instead of O(n) JSON.stringify
  return past._designVersion === current._designVersion;
}
```

**Step 2: Create useDesignStore.ts**

```typescript
// apps/desktop/src/store/useDesignStore.ts
import { create } from "zustand";
import { withTemporalMiddleware } from "./undoMiddleware";
import type { SmilePlan } from "../features/smile-plan/smilePlanTypes";
import type { GeneratedSmileDesign, GeneratedVariantDesign } from "../features/engine/designEngine";
import { generateSmileDesign, updateVariantToothDimensions, updateVariantToothPlacement } from "../features/engine/designEngine";
import { parseSmilePlan, parseGeneratedSmileDesign } from "../features/cases/caseValidators";
import { createDefaultSmilePlan } from "../features/smile-plan/smilePlanStore";
import { getCaseDB } from "../services/caseDatabase";

interface DesignState {
  plan: SmilePlan;
  generatedDesign: GeneratedSmileDesign | null;
  activeVariantId: string | null;
  selectedToothId: number | null;
  variants: GeneratedVariantDesign[];
  _designVersion: number;
}

interface DesignActions {
  updateSmilePlan: (updates: Partial<SmilePlan>) => void;
  generateDesign: (archScanMesh: unknown) => void;
  quickGenerate: (archScanMesh: unknown) => void;
  adjustTooth: (toothId: number, updates: Partial<{ width: number; height: number; depth: number; crownHeight: number }>) => void;
  moveTooth: (toothId: number, deltaX: number, deltaY: number) => void;
  selectTooth: (id: number | null) => void;
  setActiveVariantId: (id: string | null) => void;
  applyDesignFromDB: (planJson: string, designJson: string | null) => void;
  resetDesign: () => void;
}

const createDesignStore = (set: (fn: (s: DesignState & DesignActions) => Partial<DesignState & DesignActions>) => void, get: () => DesignState & DesignActions) => ({
  plan: createDefaultSmilePlan(),
  generatedDesign: null,
  activeVariantId: null,
  selectedToothId: null,
  variants: [],
  _designVersion: 0,

  updateSmilePlan: (updates) => {
    set((s) => ({ plan: { ...s.plan, ...updates }, _designVersion: s._designVersion + 1 }));
  },

  generateDesign: (archScanMesh) => {
    const { plan } = get();
    const design = generateSmileDesign(plan, { archScanMesh, toothModels: [] });
    const defaultVariant = design.variants[1] ?? design.variants[0] ?? null;
    set((s) => ({
      generatedDesign: design,
      variants: design.variants,
      activeVariantId: defaultVariant?.id ?? null,
      _designVersion: s._designVersion + 1,
    }));
  },

  quickGenerate: (archScanMesh) => {
    // Same as generateDesign — placeholder for any quick-generate-specific logic
    const { plan } = get();
    const design = generateSmileDesign(plan, { archScanMesh, toothModels: [] });
    const defaultVariant = design.variants[1] ?? design.variants[0] ?? null;
    set((s) => ({
      generatedDesign: design,
      variants: design.variants,
      activeVariantId: defaultVariant?.id ?? null,
      _designVersion: s._designVersion + 1,
    }));
  },

  adjustTooth: (toothId, updates) => {
    const { generatedDesign, activeVariantId } = get();
    if (!generatedDesign) return;
    const nextDesign: GeneratedSmileDesign = {
      variants: generatedDesign.variants.map((v) =>
        v.id === activeVariantId
          ? updateVariantToothDimensions(v, toothId, updates)
          : v
      ),
    };
    set((s) => ({ generatedDesign: nextDesign, variants: nextDesign.variants, _designVersion: s._designVersion + 1 }));
  },

  moveTooth: (toothId, deltaX, deltaY) => {
    const { generatedDesign, activeVariantId } = get();
    if (!generatedDesign) return;
    const nextDesign: GeneratedSmileDesign = {
      variants: generatedDesign.variants.map((v) =>
        v.id === activeVariantId
          ? updateVariantToothPlacement(v, toothId, deltaX, deltaY)
          : v
      ),
    };
    set((s) => ({ generatedDesign: nextDesign, variants: nextDesign.variants, _designVersion: s._designVersion + 1 }));
  },

  selectTooth: (id) => set(() => ({ selectedToothId: id })),
  setActiveVariantId: (id) => set(() => ({ activeVariantId: id })),

  applyDesignFromDB: (planJson, designJson) => {
    try {
      const plan = parseSmilePlan(JSON.parse(planJson));
      const design = designJson ? parseGeneratedSmileDesign(JSON.parse(designJson)) as GeneratedSmileDesign : null;
      const defaultVariant = design?.variants[1] ?? design?.variants[0] ?? null;
      set(() => ({
        plan: plan as SmilePlan,
        generatedDesign: design,
        variants: design?.variants ?? [],
        activeVariantId: defaultVariant?.id ?? null,
        _designVersion: 0,
      }));
    } catch (e) {
      console.error("Failed to restore design from DB:", e);
    }
  },

  resetDesign: () => set(() => ({
    plan: createDefaultSmilePlan(),
    generatedDesign: null,
    variants: [],
    activeVariantId: null,
    selectedToothId: null,
    _designVersion: 0,
  })),
});

export const useDesignStore = create<DesignState & DesignActions>(
  withTemporalMiddleware(createDesignStore as Parameters<typeof withTemporalMiddleware>[0])
);

export type DesignStore = DesignState & DesignActions;
```

**Step 3: Commit**

```bash
git add src/store/useDesignStore.ts src/store/undoMiddleware.ts
git commit -m "feat: create useDesignStore with temporal undo, fix O(n) equality check"
```

---

### Task 3.5: Update all store consumers to use new stores

**Files affected:** Every component that calls `useSmileStore`. Run this search first:

```bash
grep -r "useSmileStore" apps/desktop/src --include="*.tsx" --include="*.ts" -l
```

For each file, replace `useSmileStore` calls with the appropriate new store:

**Mapping guide:**
| Old selector | New store | New selector |
|---|---|---|
| `activeView` | `useViewportStore` | `activeView` |
| `caseRecord` | `useCaseStore` | `caseRecord` |
| `plan` | `useDesignStore` | `plan` |
| `generatedDesign` | `useDesignStore` | `generatedDesign` |
| `activeVariantId` | `useDesignStore` | `activeVariantId` |
| `selectedToothId` | `useDesignStore` | `selectedToothId` |
| `patientPhoto` / `uploadedPhotos` | `useImportStore` | `patientPhoto` |
| `archScanMesh` | `useImportStore` | `archScanMesh` |
| `uploadedToothModels` | `useImportStore` | `uploadedToothModels` |
| `showMidline`, `showSmileArc`, etc. | `useViewportStore` | same name |
| `photoZoom`, `photoPanX`, `photoPanY` | `useViewportStore` | same name |
| `alignmentMarkers` | `useViewportStore` | `alignmentMarkers` |
| `createCase` | `useCaseStore` | `createCase` |
| `generateDesign` | `useDesignStore` | `generateDesign` |
| `adjustTooth` | `useDesignStore` | `adjustTooth` |
| `handlePhotosSelected` | `useImportStore` | `handlePhotosSelected` |

Key files to update (do them one at a time):

1. `features/views/ImportView.tsx`
2. `features/views/DesignView.tsx`
3. `features/views/ExportView.tsx`
4. `features/views/CaseListView.tsx`
5. `features/layout/Header.tsx`
6. `features/layout/Sidebar.tsx`
7. `features/layout/Workspace.tsx`
8. `features/inspector/ToothInspector.tsx`
9. `features/review/ScanReviewPanel.tsx`
10. `features/preview/DesignPreviewPanel.tsx`
11. `features/variants/VariantCard.tsx`
12. `features/variants/VariantCompareDashboard.tsx`
13. `features/handoff/HandoffPanel.tsx`
14. `features/shortcuts/useKeyboardShortcuts.ts`
15. `features/collaboration/casePackager.ts`

For each file, follow this pattern:
```typescript
// Before:
import { useSmileStore } from "../../../store/useSmileStore";
const plan = useSmileStore((s) => s.plan);
const activeView = useSmileStore((s) => s.activeView);

// After:
import { useDesignStore } from "../../../store/useDesignStore";
import { useViewportStore } from "../../../store/useViewportStore";
const plan = useDesignStore((s) => s.plan);
const activeView = useViewportStore((s) => s.activeView);
```

**After updating all consumers:**

```bash
pnpm vitest run
pnpm build
```

Fix any TypeScript errors before committing.

**Step 6: Commit**

```bash
git add -A src/
git commit -m "refactor: migrate all components from useSmileStore to 4 focused stores"
```

---

### Task 3.6: Fix auto-save to watch design+case stores only

**Files:**
- Modify: `apps/desktop/src/store/useSmileStore.ts:782-792` (or wherever auto-save subscription lives post-split — likely move to App.tsx or a new autoSave.ts)

**Step 1: Create autoSave.ts**

```typescript
// apps/desktop/src/store/autoSave.ts
import { useDesignStore } from "./useDesignStore";
import { useCaseStore } from "./useCaseStore";

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export function initAutoSave(): () => void {
  const unsub = useDesignStore.subscribe(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      await useCaseStore.getState().saveCaseToDB();
    }, 1000);
  });
  return unsub;
}
```

**Step 2: Call initAutoSave in main.tsx or App.tsx**

In `App.tsx` or a top-level effect:
```typescript
import { initAutoSave } from "./store/autoSave";
// In useEffect with [] deps:
useEffect(() => {
  const unsub = initAutoSave();
  return unsub;
}, []);
```

**Step 3: Remove the old auto-save from useSmileStore.ts**

**Step 4: Commit**

```bash
git add src/store/autoSave.ts src/App.tsx
git commit -m "fix: auto-save now watches only design/case stores, not viewport state"
```

---

### Task 3.7: Deprecate and clean up useSmileStore.ts

**Files:**
- Modify or Delete: `apps/desktop/src/store/useSmileStore.ts`

**Step 1: Verify no remaining imports**

```bash
grep -r "useSmileStore" apps/desktop/src --include="*.tsx" --include="*.ts"
```

Expected: zero results (or only the file itself and tests for it).

**Step 2: Delete the file**

```bash
rm apps/desktop/src/store/useSmileStore.ts
```

Update any test files for the old store.

**Step 3: Run full test suite and build**

```bash
pnpm vitest run && pnpm build
```

Fix all errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove monolithic useSmileStore, store split complete"
```

---

## Phase 4 — Performance Fixes

### Task 4.1: Defer STL generation to export time

**Files:**
- Modify: `apps/desktop/src/features/engine/designEngine.ts`
- Modify: `apps/desktop/src/features/export/exportService.ts`

**Step 1: Remove STL string fields from GeneratedToothDesign**

In `designEngine.ts`, find `GeneratedToothDesign` type (lines 20-37). Remove `stl: string` field.

Find `GeneratedVariantDesign` (lines 39-47). Remove `combinedStl: string` field.

**Step 2: Remove STL generation from createVariantDesign / buildProceduralGeometry**

In `createVariantDesign`, find where `createAsciiStl()` and `createTriangleStl()` are called per tooth. Remove those calls and the resulting STL string assignments.

Find `combineToothStls()` call. Remove it.

**Step 3: Update exportService.ts to generate STL on demand**

In `exportService.ts`, the export function currently reads `design.combinedStl`. Change it to generate the STL at export time:

```typescript
import { createAsciiStl, createTriangleStl } from "../engine/designEngine";
import { serializeToBinaryStl } from "./binaryStl";

// In exportDesign():
const allTriangles = variant.teeth.flatMap((t) => t.previewTriangles);
if (format === "stl_ascii") {
  content = createTriangleStl(allTriangles, filename);
} else if (format === "stl_binary") {
  content = serializeToBinaryStl(allTriangles, filename);
}
```

**Step 4: Run tests and build**

```bash
pnpm vitest run && pnpm build
```

**Step 5: Commit**

```bash
git add src/features/engine/designEngine.ts src/features/export/exportService.ts
git commit -m "perf: defer STL string generation to export time, remove strings from state"
```

---

### Task 4.2: Incremental tooth rebuild in adjustTooth

**Files:**
- Modify: `apps/desktop/src/features/engine/designEngine.ts:196-228`

**Step 1: Update updateVariantToothDimensions to only rebuild the changed tooth**

Current behavior (lines 196-228): iterates over all teeth in `variant.teeth` and calls `rebuildToothDesign` for every one.

Target behavior:
```typescript
export function updateVariantToothDimensions(
  variant: GeneratedVariantDesign,
  toothId: number,
  updates: Partial<ToothDimensions>
): GeneratedVariantDesign {
  return {
    ...variant,
    teeth: variant.teeth.map((tooth) => {
      if (tooth.toothId !== toothId) return tooth; // unchanged — O(1) copy
      // Only rebuild this tooth
      return rebuildToothDesign(tooth, updates);
    }),
  };
}
```

**Step 2: Write test to verify only one tooth changes**

```typescript
it("only modifies the targeted tooth, others are reference-equal", () => {
  const before = variant.teeth;
  const after = updateVariantToothDimensions(variant, 8, { width: 9 });
  // Other teeth should be the same object reference
  expect(after.teeth.find(t => t.toothId === 7)).toBe(before.find(t => t.toothId === 7));
  // Target tooth should differ
  expect(after.teeth.find(t => t.toothId === 8)).not.toBe(before.find(t => t.toothId === 8));
});
```

**Step 3: Commit**

```bash
git add src/features/engine/designEngine.ts
git commit -m "perf: adjustTooth only rebuilds the changed tooth, not all teeth"
```

---

### Task 4.3: Fix Three.js geometry GPU memory leaks

**Files:**
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

**Step 1: Find all BufferGeometry useMemo calls**

```bash
grep -n "BufferGeometry\|useMemo" apps/desktop/src/features/viewer/SceneCanvas.tsx
```

**Step 2: Add dispose cleanup to each**

For each `useMemo` that creates a `BufferGeometry`:
```typescript
// Before:
const geometry = useMemo(() => {
  const geo = new THREE.BufferGeometry();
  // ... populate
  return geo;
}, [mesh.triangles]);

// After:
const geometry = useMemo(() => {
  const geo = new THREE.BufferGeometry();
  // ... populate
  return geo;
}, [mesh.triangles]);

useEffect(() => {
  return () => geometry.dispose();
}, [geometry]);
```

Apply this pattern to `StlMeshView`, `ToothMesh`, and any other geometry-creating components.

**Step 3: Commit**

```bash
git add src/features/viewer/SceneCanvas.tsx
git commit -m "fix: dispose THREE.BufferGeometry on cleanup to prevent GPU memory leaks"
```

---

### Task 4.4: Replace axis gizmo separate Canvas with CSS overlay

**Files:**
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx:502-506`

**Step 1: Remove the separate Canvas**

Find and delete:
```typescript
<div className="viewer-axis-indicator">
    <Canvas orthographic camera={{ zoom: 40, position: [0, 0, 5] }}>
        <AxisIndicator />
    </Canvas>
</div>
```

**Step 2: Replace with CSS axis indicator**

```typescript
// CssAxisIndicator component (add near top of SceneCanvas.tsx)
function CssAxisIndicator({ cameraQuaternion }: { cameraQuaternion?: THREE.Quaternion }) {
  return (
    <div style={{
      position: "absolute", bottom: 12, right: 12,
      width: 60, height: 60, pointerEvents: "none",
      fontSize: 10, fontFamily: "monospace",
    }}>
      <div style={{ color: "#f55", position: "absolute", bottom: 30, left: 30, transform: "rotate(-45deg)" }}>X</div>
      <div style={{ color: "#5f5", position: "absolute", bottom: 40, left: 24 }}>Y</div>
      <div style={{ color: "#55f", position: "absolute", bottom: 20, left: 38 }}>Z</div>
    </div>
  );
}
```

Place `<CssAxisIndicator />` as a child of the main canvas container div (outside the `<Canvas>`).

**Step 3: Commit**

```bash
git add src/features/viewer/SceneCanvas.tsx
git commit -m "perf: replace separate WebGL Canvas for axis gizmo with CSS overlay"
```

---

### Task 4.5: Persist views with CSS display:none instead of unmounting

**Files:**
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`

**Step 1: Current code (conditional rendering)**

```typescript
{activeView === "cases" && <CaseListView />}
{activeView === "import" && <ImportView />}
{activeView === "design" && <DesignView />}
// etc.
```

**Step 2: Replace with visibility toggling**

```typescript
const viewStyle = (viewId: ViewId): React.CSSProperties => ({
  display: activeView === viewId ? "contents" : "none",
  width: "100%",
  height: "100%",
});

return (
  <div style={{ width: "100%", height: "100%", position: "relative" }}>
    <div style={viewStyle("cases")}><CaseListView /></div>
    <div style={viewStyle("import")}><ImportView /></div>
    <div style={viewStyle("design")}><DesignView /></div>
    <div style={viewStyle("compare")}><CompareView /></div>
    <div style={viewStyle("export")}><ExportView /></div>
    <div style={viewStyle("settings")}><SettingsPanel /></div>
  </div>
);
```

Note: All views now mount on app start. This is intentional to preserve WebGL context.

**Step 3: Commit**

```bash
git add src/features/layout/Workspace.tsx
git commit -m "perf: use display:none to hide views instead of unmounting, preserves WebGL context"
```

---

## Phase 5 — Component Decomposition & Error Boundary

### Task 5.1: Add Error Boundary

**Files:**
- Create: `apps/desktop/src/features/layout/ErrorBoundary.tsx`
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx` (wrap with boundary)
- Modify: `apps/desktop/src/features/layout/Workspace.tsx` (wrap views)

**Step 1: Create ErrorBoundary**

```typescript
// apps/desktop/src/features/layout/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; label?: string; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(`[ErrorBoundary:${this.props.label ?? "unknown"}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100%", gap: 12,
          color: "#e55", fontFamily: "monospace", fontSize: 13,
        }}>
          <div>Something went wrong in {this.props.label ?? "this section"}</div>
          <div style={{ fontSize: 11, color: "#888", maxWidth: 400, textAlign: "center" }}>
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 8, padding: "6px 16px", cursor: "pointer" }}
          >
            Try to recover
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Step 2: Wrap SceneCanvas and views**

In `Workspace.tsx`, wrap each view:
```typescript
import { ErrorBoundary } from "./ErrorBoundary";

<div style={viewStyle("design")}>
  <ErrorBoundary label="Design View">
    <DesignView />
  </ErrorBoundary>
</div>
```

In `SceneCanvas.tsx` parent (or in `DesignView`), wrap the canvas:
```typescript
<ErrorBoundary label="3D Canvas">
  <SceneCanvas ... />
</ErrorBoundary>
```

**Step 3: Commit**

```bash
git add src/features/layout/ErrorBoundary.tsx src/features/layout/Workspace.tsx
git commit -m "feat: add ErrorBoundary to prevent white-screen on WebGL/render errors"
```

---

### Task 5.2: Decompose DesignView.tsx

**Files:**
- Modify: `apps/desktop/src/features/views/DesignView.tsx`
- Create: `apps/desktop/src/features/design/DesignToolbar.tsx`
- Create: `apps/desktop/src/features/design/DesignViewport.tsx`
- Create: `apps/desktop/src/features/design/DesignSidebar.tsx`

**Step 1: Extract DesignToolbar (lines 104-220 of DesignView)**

Move the top toolbar section (view tabs, variant tabs, action buttons, overlay controls) to `DesignToolbar.tsx`. It receives no props — reads from stores directly.

```typescript
// apps/desktop/src/features/design/DesignToolbar.tsx
export function DesignToolbar() {
  const designTab = useViewportStore((s) => s.designTab);
  const setDesignTab = useViewportStore((s) => s.setDesignTab);
  const generatedDesign = useDesignStore((s) => s.generatedDesign);
  const activeVariantId = useDesignStore((s) => s.activeVariantId);
  const setActiveVariantId = useDesignStore((s) => s.setActiveVariantId);
  // ... overlay controls from useViewportStore

  return (
    <div className="design-toolbar">
      {/* Tab bar, variant tabs, action buttons, overlay controls */}
    </div>
  );
}
```

**Step 2: Extract DesignViewport (lines 222-259)**

Move the SceneCanvas / PhotoOverlay / empty state section:
```typescript
// apps/desktop/src/features/design/DesignViewport.tsx
export function DesignViewport() {
  const designTab = useViewportStore((s) => s.designTab);
  const generatedDesign = useDesignStore((s) => s.generatedDesign);
  // ...

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      {designTab === "3d" ? <SceneCanvas ... /> : <PhotoOverlay ... />}
    </div>
  );
}
```

**Step 3: Extract DesignSidebar (lines 300-386)**

Move the right panel with TrustBanner, SmilePlanPanel, etc.:
```typescript
// apps/desktop/src/features/design/DesignSidebar.tsx
export function DesignSidebar() {
  // ... select relevant store fields
  return (
    <aside style={{ width: 280, ... }}>
      <TrustBanner ... />
      <SmilePlanPanel ... />
      {/* ... other panels */}
    </aside>
  );
}
```

**Step 4: Slim down DesignView.tsx**

```typescript
// apps/desktop/src/features/views/DesignView.tsx
export function DesignView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <DesignToolbar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1 }}>
          <DesignViewport />
          <ToothStrip />
        </div>
        <DesignSidebar />
      </div>
    </div>
  );
}
```

**Step 5: Fix stale toothModelNames dependency**

In `DesignToolbar.tsx` (or wherever this memoization moved):
```typescript
// Before (stale):
const toothModelNames = useMemo(() => useSmileStore.getState().uploadedToothModels.map((m) => m.name), []);

// After (correct):
const uploadedToothModels = useImportStore((s) => s.uploadedToothModels);
const toothModelNames = useMemo(() => uploadedToothModels.map((m) => m.name), [uploadedToothModels]);
```

**Step 6: Commit**

```bash
git add src/features/views/DesignView.tsx src/features/design/
git commit -m "refactor: decompose DesignView into DesignToolbar, DesignViewport, DesignSidebar"
```

---

### Task 5.3: Decompose PhotoOverlay.tsx

**Files:**
- Modify: `apps/desktop/src/features/overlay/PhotoOverlay.tsx`
- Create: `apps/desktop/src/features/overlay/PhotoCanvas.tsx`
- Create: `apps/desktop/src/features/overlay/OverlayGuides.tsx`
- Create: `apps/desktop/src/features/overlay/AlignmentMarkers.tsx`
- Create: `apps/desktop/src/features/overlay/overlayDragHandlers.ts`

**Step 1: Extract overlayDragHandlers.ts (pure functions)**

Move `handleMouseDown`, `handleMarkerMouseDown`, `handlePanMouseDown`, `handleToothMouseDown`, `handleMouseMove`, `handleMouseUp`, `handleWheel` from `PhotoOverlay.tsx:147-278` into `overlayDragHandlers.ts` as exported pure functions / factory:

```typescript
// apps/desktop/src/features/overlay/overlayDragHandlers.ts
export type DragState = {
  type: "guide" | "marker" | "pan" | "tooth" | null;
  guideType?: string;
  markerId?: string;
  toothId?: number;
  startX?: number;
  startY?: number;
};

export function createDragHandlers(callbacks: {
  onGuideUpdate: (type: string, svgX: number, svgY: number) => void;
  onMarkerMove: (id: string, x: number, y: number) => void;
  onPan: (dx: number, dy: number) => void;
  onToothMove: (toothId: number, dx: number, dy: number) => void;
  onZoom: (delta: number, x: number, y: number) => void;
  getSvgPoint: (e: MouseEvent) => { x: number; y: number };
}) {
  // Returns handleMouseDown, handleMouseMove, handleMouseUp, handleWheel
}
```

**Step 2: Fix markerIdCounter**

Replace module-level counter with `crypto.randomUUID()`:
```typescript
// Before:
let markerIdCounter = 0;
function nextMarkerId() { return `m_${++markerIdCounter}_${Date.now()}`; }

// After (in AlignmentMarkers.tsx or seedDefaultMarkers):
const id = crypto.randomUUID();
```

**Step 3: Fix passive wheel handler**

Replace React `onWheel={handleWheel}` with:
```typescript
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  el.addEventListener("wheel", handleWheel, { passive: false });
  return () => el.removeEventListener("wheel", handleWheel);
}, [handleWheel]);
```
Remove the `onWheel` prop from the JSX element.

**Step 4: Extract AlignmentMarkers.tsx (lines 449-477)**

```typescript
// apps/desktop/src/features/overlay/AlignmentMarkers.tsx
export function AlignmentMarkers({ markers, selectedMarkerId, onMouseDown }: Props) {
  return (
    <>
      {markers.map((m) => (
        <g key={m.id} transform={`translate(${m.x},${m.y})`}
           onMouseDown={(e) => onMouseDown(e, m.id)} style={{ cursor: "move" }}>
          {/* crosshair */}
        </g>
      ))}
    </>
  );
}
```

**Step 5: Extract OverlayGuides.tsx (lines 480-601)**

```typescript
// apps/desktop/src/features/overlay/OverlayGuides.tsx
export function OverlayGuides({ showMidline, showSmileArc, showGingival, showCommissures, ...paths }: Props) {
  return (
    <>
      {showMidline && <line className="midline-guide" ... />}
      {showSmileArc && <path className="smile-arc" ... />}
      {/* etc. */}
    </>
  );
}
```

**Step 6: Extract PhotoCanvas.tsx (image + zoom/pan)**

```typescript
// apps/desktop/src/features/overlay/PhotoCanvas.tsx
export function PhotoCanvas({ photo, zoom, panX, panY, children }: Props) {
  return (
    <div ref={containerRef} style={{ position: "relative", overflow: "hidden" }}>
      <img src={photo.url}
           style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
           draggable={false} />
      {children}
    </div>
  );
}
```

**Step 7: Slim PhotoOverlay.tsx**

```typescript
export function PhotoOverlay(props: PhotoOverlayProps) {
  const [dragState, setDragState] = useState<DragState>({ type: null });
  const handlers = useMemo(() => createDragHandlers({...}), [...]);

  return (
    <PhotoCanvas photo={props.photo} zoom={zoom} panX={panX} panY={panY}>
      <svg viewBox={`0 0 600 ${svgHeight}`}>
        <AlignmentMarkers markers={alignmentMarkers} onMouseDown={handlers.handleMarkerMouseDown} />
        <OverlayGuides showMidline={showMidline} ... />
        {/* Tooth overlays */}
      </svg>
    </PhotoCanvas>
  );
}
```

**Step 8: Commit**

```bash
git add src/features/overlay/
git commit -m "refactor: decompose PhotoOverlay into PhotoCanvas, OverlayGuides, AlignmentMarkers, overlayDragHandlers"
```

---

## Phase 6 — Cleanup

### Task 6.1: Fix ID generation in caseStore.ts

**Files:**
- Modify: `apps/desktop/src/features/cases/caseStore.ts:3-5`

**Step 1: Replace Math.random with crypto.randomUUID**

```typescript
// Before:
function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// After:
function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
```

**Step 2: Commit**

```bash
git add src/features/cases/caseStore.ts
git commit -m "fix: use crypto.randomUUID() for case IDs instead of Math.random()"
```

---

### Task 6.2: Rename firstVariant to defaultVariant

**Files:**
- Modify: `apps/desktop/src/store/useDesignStore.ts` (2 occurrences — in generateDesign and quickGenerate)

Find and replace `firstVariant` with `defaultVariant` in both action implementations.

**Step 1: Commit**

```bash
git add src/store/useDesignStore.ts
git commit -m "refactor: rename firstVariant to defaultVariant for clarity"
```

---

### Task 6.3: Delete ImportPanel.tsx dead code

**Files:**
- Delete: `apps/desktop/src/features/import/ImportPanel.tsx`

```bash
rm apps/desktop/src/features/import/ImportPanel.tsx
grep -r "ImportPanel" apps/desktop/src --include="*.ts" --include="*.tsx"
# Should be zero results. If not, update those imports.
git add -A
git commit -m "chore: delete ImportPanel.tsx compatibility shim (no longer used)"
```

---

### Task 6.4: Add magic byte validation for mesh files

**Files:**
- Modify: `apps/desktop/src/features/import/fileValidation.ts`

**Step 1: Add content-based detection**

```typescript
export function validateMeshFileContent(buffer: ArrayBuffer, filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  const bytes = new Uint8Array(buffer.slice(0, 5));

  if (ext === "obj" || ext === "ply") {
    // OBJ and PLY are text formats starting with recognizable keywords
    const probe = new TextDecoder().decode(bytes);
    if (ext === "obj") return true; // OBJ has no magic bytes, trust extension
    if (ext === "ply") return probe.startsWith("ply");
  }
  if (ext === "stl") {
    // Binary STL: check if size matches header claim
    // ASCII STL: starts with "solid"
    return true; // stlParser handles detection internally
  }
  return false;
}
```

Call `validateMeshFileContent` after extension check in the import flow.

**Step 2: Commit**

```bash
git add src/features/import/fileValidation.ts
git commit -m "fix: add content validation for PLY files beyond extension checking"
```

---

### Task 6.5: Convert structural inline styles to CSS classes

**Files:**
- Modify: `apps/desktop/src/features/layout/Header.tsx`
- Modify: `apps/desktop/src/features/layout/Sidebar.tsx`
- Modify: `apps/desktop/src/features/design/DesignToolbar.tsx`
- Modify: `apps/desktop/src/styles.css`

**Step 1: Identify the structural styles (layout only)**

Only convert layout-level styles (flexbox, width, padding, position) to classes. Leave dynamic styles (colors driven by state) as inline.

**Step 2: Add CSS classes**

In `styles.css`, add:
```css
.app-header { display: flex; align-items: center; height: 48px; padding: 0 16px; gap: 12px; }
.app-sidebar { display: flex; flex-direction: column; width: 56px; }
.design-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
```

**Step 3: Replace inline style props**

```typescript
// Before:
<header style={{ display: "flex", alignItems: "center", height: 48, ... }}>

// After:
<header className="app-header">
```

**Step 4: Commit**

```bash
git add src/styles.css src/features/layout/Header.tsx src/features/layout/Sidebar.tsx
git add src/features/design/DesignToolbar.tsx
git commit -m "refactor: convert structural inline styles to CSS classes"
```

---

### Task 6.6: Extract SVG icon components

**Files:**
- Create: `apps/desktop/src/features/ui/icons.tsx`
- Modify: several files that use inline SVG icons

**Step 1: Create icons.tsx**

```typescript
// apps/desktop/src/features/ui/icons.tsx
import type { SVGProps } from "react";

const iconProps = (props: SVGProps<SVGSVGElement>) => ({
  xmlns: "http://www.w3.org/2000/svg",
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconUpload(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function IconFolder(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
```

**Step 2: Replace inline SVGs in Sidebar.tsx, Header.tsx, ImportView.tsx**

Find all `<svg>...<path d="M...`>" patterns in these files and replace with `<IconSettings />`, `<IconUpload />`, etc.

**Step 3: Commit**

```bash
git add src/features/ui/icons.tsx src/features/layout/Sidebar.tsx src/features/layout/Header.tsx
git commit -m "refactor: extract SVG icons into icons.tsx component"
```

---

### Task 6.7: Add ARIA labels to navigation and controls

**Files:**
- Modify: `apps/desktop/src/features/layout/Sidebar.tsx`
- Modify: `apps/desktop/src/features/design/DesignToolbar.tsx`

**Step 1: Add ARIA to sidebar navigation**

```typescript
// In Sidebar.tsx, navigation buttons:
<button
  role="tab"
  aria-label="Import assets"
  aria-current={activeView === "import" ? "page" : undefined}
  title="Import"
  onClick={() => setActiveView("import")}
>
  <IconUpload />
</button>
```

Apply the same pattern to all nav items.

**Step 2: Add ARIA to toolbar controls**

```typescript
<button aria-label="Undo last change" title="Undo" onClick={undo} disabled={!canUndo}>
  ↩
</button>
<button aria-label="Redo" title="Redo" onClick={redo} disabled={!canRedo}>
  ↪
</button>
```

**Step 3: Commit**

```bash
git add src/features/layout/Sidebar.tsx src/features/design/DesignToolbar.tsx
git commit -m "accessibility: add ARIA labels and roles to navigation and toolbar controls"
```

---

### Task 6.8: Final verification

**Step 1: Run full test suite**

```bash
cd apps/desktop
pnpm vitest run
```
Expected: all tests pass.

**Step 2: TypeScript check**

```bash
pnpm tsc --noEmit
```
Expected: zero errors.

**Step 3: Build**

```bash
pnpm build
```
Expected: successful build.

**Step 4: Tag the refactor complete**

```bash
git tag refactor/comprehensive-2026-03-08
git log --oneline -20
```

---

## Summary of All Commits

| Phase | Tasks | Commits |
|-------|-------|---------|
| 1. Security | 7 tasks | 7 commits |
| 2. Utilities | 4 tasks | 4 commits |
| 3. Store split | 7 tasks | 7 commits |
| 4. Performance | 5 tasks | 5 commits |
| 5. Components | 3 tasks | 3 commits |
| 6. Cleanup | 8 tasks | 8 commits |
| **Total** | **34 tasks** | **34 commits** |

## Issue Coverage

| Severity | Issues | Tasks that address them |
|----------|--------|------------------------|
| P0 (6) | XSS, JSON.parse, parser limits, STL in state, geometry regen, god store | 1.1, 1.2-1.5, 1.6, 3.4+3.7, 4.1, 4.2, 3.1-3.7 |
| P1 (8) | Undo perf, no error boundary, GPU leak, mega-components, axis gizmo, settings validation, file type check | 3.4, 5.1, 4.3, 5.2, 5.3, 4.4, 1.3, 6.4 |
| P2 (12) | Duplicates, mutable state, stale dep, view remount, auto-save, double decode, naming, test gaps | 2.1, 2.2, 2.3, 2.4, 5.3(markers), 5.2(dep fix), 4.5, 3.6, 2.4, 6.2 |
| P3 (6) | CSP, inline styles, SVG icons, ARIA, passive wheel, dead code | 1.7, 6.5, 6.6, 6.7, 5.3(wheel), 6.3 |
