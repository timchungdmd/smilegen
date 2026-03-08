# SmileGen Comprehensive Refactor — Design

**Date:** 2026-03-08
**Scope:** All 32 issues from code review — P0 through P3
**Approach:** Dependency-order (security → utilities → store split → performance → components → cleanup)
**Store strategy:** 4 separate stores
**Component strategy:** Full decomposition of PhotoOverlay and DesignView

---

## Section 1 — Security Fixes

### 1a. XSS in reportGenerator.ts
`patientPhotoUrl` is interpolated directly into HTML without escaping. Wrap with `escapeHtml()` before interpolation (already used on other fields in this file).

### 1b. Zod validation at all JSON.parse boundaries
Add `zod` dependency. Create `src/features/cases/caseValidators.ts` with Zod schemas for:
- `CaseRecord`
- `SmilePlan`
- `GeneratedSmileDesign`
- `AppSettings`

Apply validators at:
- `useSmileStore.loadCaseFromDB` (IndexedDB load)
- `casePackager.ts` (`.smilegen` package import)
- `settingsStore.loadSettings` (localStorage)

### 1c. Parser size limits
Add `MAX_TRIANGLES = 2_000_000` constant in `importConstants.ts`. Check against this limit in:
- `stlParser.ts` — after reading binary triangle count from header
- `meshParser.ts` — after reading PLY vertex/face counts, OBJ line count estimate

Throw descriptive `Error` if exceeded.

### 1d. Settings prototype pollution
Replace `{ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }` with explicit field-by-field assignment or Zod parse in `settingsStore.loadSettings`.

### 1e. Content Security Policy
Add CSP meta tag to `index.html`:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:;">
```

---

## Section 2 — Shared Utilities Consolidation

### 2a. Geometry utilities
`features/geometry/meshUtils.ts` becomes the single source for:
- `computeNormal(v0, v1, v2): [number, number, number]` — remove duplicate implementations in `designEngine.ts` and `binaryStl.ts`
- `computeBounds(triangles): BoundingBox` — remove duplicate implementations in `stlParser.ts` and `meshParser.ts`

### 2b. Import constants
New file `features/import/importConstants.ts` exports:
- `MESH_EXTENSIONS: string[]`
- `PHOTO_EXTENSIONS: string[]`
- `MAX_TRIANGLES: number`

Remove duplicate `MESH_EXTENSIONS` definitions from `fileValidation.ts`, `meshParser.ts`, `useDropZone.ts`.

### 2c. STL double-decode fix
In `stlParser.ts`, decode buffer to string once and cache the result. Eliminate the second `decoder.decode(bytes)` call in the ASCII fallback path.

---

## Section 3 — Store Split (keystone)

### 3a. New stores

**`useCaseStore`** (`store/useCaseStore.ts`)
- State: `caseRecord`, `workflowStage`
- Actions: `saveCaseToDB`, `loadCaseFromDB`, `createNewCase`

**`useDesignStore`** (`store/useDesignStore.ts`)
- State: `smilePlan`, `generatedDesign`, `activeVariantId`
- Actions: `adjustTooth`, `applyGeneration`, `updateSmilePlan`, `setActiveVariant`
- Undo middleware applies here only
- `generatedDesign` does NOT include STL strings (deferred to export)

**`useViewportStore`** (`store/useViewportStore.ts`)
- State: `showMidline`, `showSmileArc`, `showGingival`, `photoViewport`, `alignmentMarkers`, `activeView`, `overlayToothPositions`
- Actions: all toggle/update actions for overlay visibility and viewport controls
- No undo middleware

**`useImportStore`** (`store/useImportStore.ts`)
- State: `patientPhoto`, `uploadedArchScan`, `uploadedToothModels`
- Actions: `setPatientPhoto`, `setArchScan`, `addToothModel`, `removePatientPhoto`, `removeArchScan`, `removeToothModel`

### 3b. Undo middleware perf fix
Replace JSON.stringify equality check with version counter:
```typescript
// In undoMiddleware.ts
let version = 0;
function equality(past: TrackedFields, current: TrackedFields): boolean {
  return past._version === current._version;
}
// Increment _version in every design mutation action
```

### 3c. useSmileStore deprecation
`useSmileStore.ts` becomes a re-export barrel for backwards compatibility during migration, then is deleted after all consumers are updated.

---

## Section 4 — Performance Fixes

### 4a. Defer STL generation
`designEngine.ts` stops generating ASCII STL strings during design computation. `GeneratedVariantDesign` stores only `previewTriangles` (typed arrays). STL strings are generated on-demand in `exportService.ts` at export time only.

This eliminates:
- `combinedStl` string field from state
- Per-tooth `stl` string fields from state
- `combineToothStls()` rebuild on every dimension change

### 4b. Incremental tooth rebuild
`adjustTooth` action only calls `rebuildToothDesign` for the tooth identified by `toothId`. Other teeth in the variant are copied unchanged.

### 4c. Three.js geometry dispose
Every `useMemo` creating a `THREE.BufferGeometry` gets a companion `useEffect`:
```typescript
useEffect(() => () => geometry.dispose(), [geometry]);
```
Applies to: `StlMeshView`, `ToothMesh`, and all other geometry-creating components in `SceneCanvas.tsx`.

### 4d. Axis indicator gizmo
Replace the separate `<Canvas orthographic>` in `SceneCanvas.tsx` with an HTML/CSS overlay using CSS transforms to show X/Y/Z axis arrows. Eliminates the redundant WebGL context.

### 4e. View persistence
In `Workspace.tsx`, replace conditional rendering (`activeView === "design" && <DesignView />`) with visibility toggling (`style={{ display: activeView === "design" ? "block" : "none" }}`). Preserves WebGL context and camera state across tab switches.

### 4f. Auto-save filter
The `useSmileStore.subscribe` auto-save callback is moved to subscribe on `useDesignStore` + `useCaseStore` only. Viewport state changes no longer trigger the save debounce.

---

## Section 5 — Component Decomposition & Error Boundary

### 5a. Error Boundary
New `features/layout/ErrorBoundary.tsx` (class component):
- `componentDidCatch` logs error
- Renders recovery UI: "Something went wrong — click to reload this section"
- Wraps: `SceneCanvas`, `ImportView`, `DesignView`

### 5b. DesignView decomposition

| New file | Responsibility |
|----------|---------------|
| `features/views/DesignView.tsx` | Slim orchestrator, composes sub-components |
| `features/design/DesignToolbar.tsx` | Variant buttons, undo/redo, export controls |
| `features/design/DesignViewport.tsx` | 3D canvas + 2D photo mode switcher |
| `features/design/DesignSidebar.tsx` | Right panel: plan controls, tooth inspector |

Each sub-component subscribes only to the store slices it needs.

### 5c. PhotoOverlay decomposition

| New file | Responsibility |
|----------|---------------|
| `features/overlay/PhotoOverlay.tsx` | Slim orchestrator, event routing |
| `features/overlay/PhotoCanvas.tsx` | Image rendering, zoom/pan |
| `features/overlay/OverlayGuides.tsx` | SVG midline, smile arc, gingival lines |
| `features/overlay/AlignmentMarkers.tsx` | Draggable marker rendering |
| `features/overlay/overlayDragHandlers.ts` | Drag state machine as pure functions |

Additional fixes:
- `markerIdCounter` → `crypto.randomUUID()`
- `toothModelNames` `useMemo` stale dependency → correct deps array

---

## Section 6 — Cleanup (P2/P3)

| Item | Location | Fix |
|------|----------|-----|
| Weak ID generation | `caseStore.ts` | Replace `Math.random()` with `crypto.randomUUID()` |
| Confusing variable name | `useSmileStore.ts` (2 sites) | Rename `firstVariant` → `defaultVariant` |
| Dead compatibility shim | `features/import/ImportPanel.tsx` | Delete file |
| Extension-only file validation | `fileValidation.ts` | Add magic byte check for STL/OBJ/PLY |
| Inline styles (structural) | `Header.tsx`, `Sidebar.tsx`, `DesignView` toolbar | Convert to CSS classes from `styles.css` |
| SVG icon duplication | Multiple files | Extract to `features/ui/icons.tsx` |
| Missing ARIA | `Sidebar.tsx`, `DesignToolbar.tsx` | Add `role`, `aria-label`, `aria-current` |
| Passive wheel handler | `PhotoOverlay.tsx` | Switch from React `onWheel` to `useEffect` + `addEventListener({ passive: false })` |

---

## Issue Traceability

| Severity | Count | Addressed |
|----------|-------|-----------|
| P0 | 6 | 6/6 |
| P1 | 8 | 8/8 |
| P2 | 12 | 12/12 |
| P3 | 6 | 6/6 |
| **Total** | **32** | **32/32** |
