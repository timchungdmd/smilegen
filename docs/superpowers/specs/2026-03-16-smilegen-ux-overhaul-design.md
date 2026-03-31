# SmileGen UX Overhaul Design Spec

**Date:** 2026-03-16
**Status:** Draft (Rev 3 — competitive analysis revision)
**Approach:** Vertical Slices (Approach C) — four phases, each independently shippable

## Problem Statement

SmileGen's desktop dental CAD application suffers from three categories of UX issues identified through parallel analysis by UI Designer, UX Researcher, and UX Architect agents:

1. **Structural noise:** Three redundant navigation systems (sidebar, workflow rail, header stepper) compete for attention. The ViewId routing uses a confusing dual-identity system with legacy aliases.
2. **Workflow friction:** The happy path from app open to generated design takes 16-18 clicks. Hidden prerequisites (tooth library selection), no auto-navigation after generation, and a buried alignment wizard slow users down.
3. **Missing polish:** WCAG contrast failures, no keyboard shortcuts for the 3D viewport, monolithic state store causing unnecessary re-renders, and a placeholder patient presentation view.

## User Personas

- **Dentists:** Time-constrained, not tech-savvy, need quick results in 3-5 minutes between patients.
- **Dental technicians:** Detail-oriented, work with 3D scans daily, need dense controls and keyboard efficiency.
- **Treatment coordinators:** Patient communication focus, need a compelling before/after presentation for chairside use.

## Competitive Landscape

This spec was revised after analysis of exocad DentalCAD, Smilefy, and SmileCloud:

| Pattern | exocad | Smilefy | SmileCloud | SmileGen (after this overhaul) |
|---------|--------|---------|------------|-------------------------------|
| Workflow model | Wizard + Expert dual mode | Sequential 6-step wizard | Layered with mode switching | Guided sidebar + scoped shortcuts |
| Photo during 3D design | Smile Window (persistent float) | Photo-as-hero canvas | Space-bar mode toggle | Smile Window thumbnail (Phase 3) |
| Alignment | AI auto + 2-point manual | Fully AI auto | AI auto + 3-point manual | AI auto-detect primary (Phase 2) |
| Layer/visibility control | Expandable scene graph tree | Minimal | Layers panel with sliders | Layer visibility panel (Phase 3) |
| Before/after | N/A | Auto photo + video | Video via Passport app | Slider + shareable export (Phase 4) |
| Right-click context | Full context menus | N/A (touch) | N/A (touch) | 3D viewport context menu (Phase 3) |
| Collaboration | dentalshare links | Email/AirDrop | Team-Up + Passport app | Deferred (separate initiative) |

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Happy path clicks (open -> generated design) | 16-18 | 10-12 |
| Vertical space reclaimed | 0 | ~72px |
| WCAG AA text contrast compliance | ~60% | 100% |
| WebGL context crashes | Frequent | Zero |
| Time to first generated design | ~5min | <3min |
| Photo visible during 3D design | No (tab switch required) | Yes (persistent thumbnail) |

---

## Phase 1: Structural + Quick Wins

**Goal:** Remove visual noise, fix accessibility, stop WebGL crashes. Zero new features — subtract and fix.

### 1a. Remove Redundant Navigation Layers

**Delete the workflow rail** in `Workspace.tsx` (the `case-workflow-rail` div). This is a conditional row of 5 pill buttons (Import, Align, Design, Review, Present) that only renders when `activeStage` is truthy. It duplicates the sidebar navigation. The sidebar icons with their active indicator bar already communicate position in the workflow. Note: removing the rail also removes its `setActiveView(stage.id)` onClick handlers — the sidebar becomes the sole stage navigation mechanism.

**Delete `CaseContextBar.tsx`** entirely. Its case title and stage indicator duplicate information already visible in the sidebar and header.

**Relocate "New Case" action:** The CaseContextBar currently hosts the "New Case" button with a `window.confirm()` dialog. Move this button to the Header's right action zone (alongside Undo/Redo). During Phases 1-3, it retains the `window.confirm()` dialog. Phase 4d replaces it with a styled custom dialog.

**Simplify the AppShell grid** from three rows to two:
- Current: `gridTemplateRows: "var(--header-height) auto 1fr"`
- Proposed: `gridTemplateRows: "var(--header-height) 1fr"`

The Workspace moves from `gridRow: 3` to `gridRow: 2`. This reclaims approximately 72px of vertical space (32px CaseContextBar + 40px workflow rail) for the actual content area.

**Files:** `Workspace.tsx`, `AppShell.tsx`, `Header.tsx` (add New Case button), `CaseContextBar.tsx` (delete), `styles.css`

### 1b. Fix WCAG Contrast

Update CSS custom properties in `styles.css`. Contrast ratios are calculated against the most common background `--bg-primary: #0f1419`:

| Variable | Current | Proposed | Notes |
|----------|---------|----------|-------|
| `--text-muted` | `#484f58` | `#6b7280` | ~2.7:1 current; target 4.5:1 against `#0f1419` |
| `--text-secondary` | `#8b949e` | `#94a0ad` | ~4.1:1 current; bumped above 4.5:1 |
| `--success` | `#06d6a0` | `#10b981` | Less neon, more clinical |

**Important:** The proposed `--text-muted` value of `#5a6370` from the initial draft yielded only ~3.7:1 against `#0f1419`. Revised to `#6b7280` which achieves 4.6:1. Verify with a WCAG checker tool before implementation.

Light theme additions:
- `--accent` override: `#0085b5` (4.6:1 against white, maintains brand identity)

**Files:** `styles.css`

### 1c. Fix CSP

Remove the `Content-Security-Policy` meta tag from `index.html`. It blocks Vite's development runtime (React Refresh preamble) and the inline theme detection script. CSP should be applied by Tauri in production builds via its security configuration.

**Status:** Already implemented this session.

**Files:** `index.html`

### 1d. Fix WebGL Context Lost

Add a `useIsVisible` hook to `SceneCanvas.tsx` using `IntersectionObserver`. The `<Canvas>` component (and its WebGL context) only mounts when the container element is actually visible on screen. When the Workspace keep-alive pattern hides a view with `display: none`, the 3D viewer unmounts its canvas, freeing the WebGL context for the active view.

**Status:** Already implemented this session.

**Files:** `SceneCanvas.tsx`

### 1e. Add Focus-Visible Outlines

Add a global `:focus-visible` style in `styles.css`:
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Fix ARIA in `Sidebar.tsx`:
- Add `role="tablist"` to the sidebar `<nav>` container
- Add `aria-controls` pointing to the workspace panel ID
- Add `role="tabpanel"` and `id` to the Workspace root element

**Files:** `styles.css`, `Sidebar.tsx`, `Workspace.tsx`

---

## Phase 2: Import-to-Design Flow

**Goal:** Cut happy path from 18 clicks to 10-12. Make the core workflow feel guided and fast.

**Sequencing note:** Phase 2a (ViewId unification) is the largest change. It should be done as a single atomic commit to avoid inconsistent state. Phase 1's workflow rail deletion can be done before or simultaneously — both change navigation, but Phase 1 only deletes while Phase 2 renames.

### 2a. Unify ViewId System

The current system maintains two sets of IDs: workflow stage names (`import`, `align`, `design`, `review`, `present`) and workspace route names (`capture`, `overview`, `simulate`, `plan`, `validate`, `present`, `collaborate`). The `LEGACY_VIEW_MAP` maps stage names to route names, and `getWorkspaceRouteForView()` resolves them.

**Proposed:** Make workflow stage names canonical.

```typescript
export type WorkflowStageId = "import" | "align" | "design" | "review" | "present";
export type UtilityViewId = "cases" | "settings";
export type ViewId = WorkflowStageId | UtilityViewId;
```

The `LEGACY_VIEW_MAP` reverses direction — mapping old route names to canonical names for persisted state migration:

```typescript
export const LEGACY_VIEW_MAP: Record<string, ViewId> = {
  capture: "import",
  overview: "align",
  simulate: "design",
  plan: "design",
  validate: "review",
  collaborate: "present",
  compare: "review",
  export: "present",
};
```

Delete `getWorkspaceRouteForView()` and `getCaseWorkflowStage()`. Replace all call sites with direct canonical ID comparisons.

**Workspace routing refactor:** The `LAZY_WORKSPACE_ROUTES` array and `LazyWorkspaceRoute` type in `Workspace.tsx` must be updated from old route names to canonical names:
- `"capture"` -> `"import"`
- `"overview"` -> `"align"`
- `"simulate"` -> `"design"`
- `"plan"` -> `"design"` (merged — PlanView becomes a sub-panel of the design stage, not a separate route)
- `"validate"` -> `"review"`
- `"present"` -> `"present"` (unchanged)
- `"collaborate"` -> `"present"` (merged — CollaborateView features fold into PresentView)

**View component disposition:**
- `CaptureView.tsx` renders for `"import"` — no rename needed, file keeps its name
- `OverviewView.tsx` renders for `"align"` — file keeps its name
- `SimulateView.tsx` renders for `"design"` — file keeps its name
- `PlanView.tsx` — becomes a sub-tab within SimulateView, not a standalone route
- `ValidateView.tsx` renders for `"review"` — file keeps its name
- `PresentView.tsx` renders for `"present"` — file keeps its name
- `CollaborateView.tsx` — features merge into PresentView; component deprecated

The `show()` and `renderLazyRoute()` functions in Workspace.tsx use the new canonical IDs.

**Keyboard shortcuts update:** Replace all 4 current view shortcuts:

Current (`keyboardShortcuts.ts` lines 15-18):
```
key "1" -> "view:import"    (maps to legacy "capture")
key "2" -> "view:design"    (maps to legacy "simulate")
key "3" -> "view:compare"   (maps to legacy "validate")
key "4" -> "view:export"    (maps to legacy "present")
```

Proposed:
```
key "1" -> "view:import"
key "2" -> "view:align"
key "3" -> "view:design"
key "4" -> "view:review"
key "5" -> "view:present"
```

Update `useKeyboardShortcuts.ts` handler to use canonical ViewId values directly (no more legacy mapping).

**Migration note:** `activeView` is NOT persisted to localStorage (it is not in `PERSISTED_KEYS`). No migration is needed for navigation state. However, other persisted fields (`scanReferencePoints`, `alignmentMarkers`) are stored under the `smilegen-viewport` key and are unaffected by ViewId changes. The `normalizeViewId` function is retained as a safety net for any stale references.

**Files:** `useViewportStore.ts`, `Workspace.tsx` (LAZY_WORKSPACE_ROUTES, LazyWorkspaceRoute type, show(), renderLazyRoute()), `Sidebar.tsx`, `Header.tsx`, `keyboardShortcuts.ts`, `useKeyboardShortcuts.ts`, `SimulateView.tsx`, `CaptureView.tsx`, `PresentView.tsx`, and all files importing `getCaseWorkflowStage` or `getWorkspaceRouteForView`

### 2b. Auto-Navigate After Generate

When `quickGenerate()` completes in `useDesignStore`:
1. Call `useViewportStore.getState().setActiveView("design")` to navigate to the design view (note: in Phase 3 this becomes `useNavigationStore` after the store split)
2. Show a brief inline toast confirming generation: "Design generated — N variants ready"

**Performance note:** `quickGenerate()` calls `generateSmileDesign()` from `designEngine.ts` which is synchronous computation. If generation takes >100ms on complex scans, add a microtask yield with a brief "Generating..." indicator. Measure before adding complexity.

**Files:** `useDesignStore.ts`, `ImportView.tsx`

### 2c. Pre-Select Default Tooth Library

Set `activeCollectionId` to `"natural-ovoid"` as the initial value in `useViewportStore` (currently `null`). The user can still change it via the dropdown, but "Generate Smile Design" is immediately available after photo + scan upload without an extra selection step.

**Files:** `useViewportStore.ts`

### 2d. FTUX: Open HowToGuidePanel by Default

The `HowToGuidePanel` component already exists and is rendered in `ImportView.tsx` (line 120). It currently defaults to collapsed (`useState(false)`).

Change the initial state: on first launch, check `localStorage` for a `smilegen-ftux-seen` flag:
- If absent: default `isOpen` to `true`
- On first close: set the flag; default to collapsed on subsequent launches

**Files:** `HowToGuidePanel.tsx`

### 2e. Auto-Detect as Primary Alignment

When both photo and scan are uploaded:
- Show a prominent "Auto-Align" button as the primary CTA in the stage header
- The manual "Align Photo" wizard becomes "Refine Alignment" — a secondary, smaller button
- If the vision sidecar is unavailable (`sidecarState !== "ready"` from `useSidecarStore`), the manual wizard becomes primary again

The `sidecarState` field comes from `useSidecarStore` (defined in `apps/desktop/src/store/useSidecarStore.ts`), already used in `CaptureView.tsx`.

This reduces alignment from 10+ clicks (manual wizard) to 1 click (auto-detect) for the common case.

**Files:** `CaptureView.tsx`, `SimulateView.tsx`

---

## Phase 3: Design Workspace Polish

**Goal:** Make the design stage feel like a professional CAD tool — dense, efficient, keyboard-driven.

**Sub-phasing:** Phase 3 is split into two independently shippable batches:
- **Phase 3-core** (3a-3d, 3h-3i): Store split, floating controls, inspector density, keyboard shortcuts, panel resize, CSS extraction. These are foundational improvements.
- **Phase 3-enrichment** (3e-3g): Smile Window, right-click context menus, layer visibility. These are competitive feature additions that depend on 3a (store split) but are independent of 3b-3d.

### 3a. Split useViewportStore

The current store has 20+ fields mixing navigation, overlay, alignment, and canvas state. Split into four focused stores:

| Store | Fields | Persistence |
|-------|--------|-------------|
| `useNavigationStore` | `activeView` | None |
| `useOverlayStore` | Guide positions, commissures, overlay toggles, alignment markers | localStorage (case-scoped) |
| `useAlignmentStore` | `scanReferencePoints`, `showPhotoIn3D` | localStorage (case-scoped) |
| `useCanvasStore` | `photoZoom`, `photoPan`, `cameraDistance`, `gimbalMode`, `designTab`, `activeGimbalAxis`, `activeCollectionId` | None (ephemeral) |

This eliminates cross-concern re-renders. Currently, changing `photoZoom` triggers re-renders in every component subscribed to `useViewportStore`, even if they only read `activeView`.

**Also fix:** The module-level mutable `sharedCaptureUiState` object in `CaptureView.tsx` (line 34) is a React anti-pattern. Replace it with a small Zustand store or handle via refs within the always-mounted component.

**Files:** `useViewportStore.ts` (split into 4 new files in `store/`), all consuming components updated to import from the correct store, `CaptureView.tsx`

### 3b. Floating Photo Overlay Controls

When photo overlay mode is active in the 3D viewer, render a floating panel anchored to the bottom-left of the SceneCanvas:
- Opacity slider
- Midline / Smile Arc / Gingival Line toggles
- Close button

Remove overlay controls from `DesignToolbar.tsx` — both the 3D-tab controls (Photo-in-3D checkbox, opacity slider) and the photo-tab controls (Overlay/Midline/SmileArc/Gingival toggles). They all move to the floating panel which appears only when photo overlay is active. Use the existing `backdrop-filter: blur(8px)` treatment.

**Files:** `SceneCanvas.tsx` (new floating panel), `DesignToolbar.tsx` (remove overlay controls from both tabs)

### 3c. Inspector Panel Density + Collapsibility

CSS updates to `.inspector-card` in `styles.css` (currently at line 1674):
- Border-radius: 16px -> 10px (verified — current value is 16px in CSS)
- Padding: 14px -> 10px (note: currently set as inline style in `DesignSidebar.tsx`, not CSS — move to CSS class)
- Gap between cards: 12px -> 8px (also inline style in sidebar container — move to CSS class)

Collapsible sections:
- **Pinned (always expanded):** SmilePlan, ToothInspector (when a tooth is selected)
- **Collapsed by default (one-line summary):** Library, Shade, Metrics, ArchForm
- Remember collapsed state per session via `sessionStorage`

**Files:** `DesignSidebar.tsx`, `styles.css`

### 3d. Scoped Keyboard Shortcuts

Add a `scope` field to the `ShortcutBinding` interface:

```typescript
export interface ShortcutBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: string;
  scope: "global" | "design" | "import" | "review";
}
```

New design-scoped shortcuts:

| Shortcut | Action | Scope |
|----------|--------|-------|
| `W/E/R` | Translate/Rotate/Scale gimbal | `design` (canvas focused) |
| `Tab/Shift+Tab` | Cycle teeth | `design` |
| `F` | Frame selected tooth | `design` |
| `Space` | Toggle photo overlay | `design` |
| `[` / `]` | Prev/next variant | `design` |
| `?` | Show shortcut reference | `global` |
| `Escape` | Deselect / close modal | `global` |

Canvas container gets `tabIndex={0}` for focus. The `useKeyboardShortcuts` hook receives the current scope from `activeView` and only matches shortcuts in that scope plus `global`.

**Files:** `keyboardShortcuts.ts`, `useKeyboardShortcuts.ts`, `SceneCanvas.tsx`

### 3e. Smile Window (Persistent Photo Reference)

**Competitive insight:** exocad's Smile Window keeps the patient photo visible as a floating thumbnail during 3D design work. Both Smilefy and SmileCloud center the photo as the primary canvas. Our current design forces a tab switch between 3D and photo views — the designer loses photo context while manipulating teeth in 3D.

Add a persistent photo thumbnail in the 3D design view:
- Small floating window (200x150px default) anchored to the top-left of the SceneCanvas
- Shows the first uploaded patient photo
- Click to expand to a larger overlay (50% of canvas)
- Drag to reposition
- Visibility toggle in the viewer toolbar
- When photo overlay mode is active (showPhotoIn3D), the Smile Window hides since the photo is already the background

This is a lighter alternative to the full "portrait-first layout" (deferred to Phase 5) that gives designers photo context without restructuring the entire workspace.

**Files:** `SceneCanvas.tsx` (new SmileWindow component), `DesignToolbar.tsx` (visibility toggle)

### 3f. Right-Click Context Menu for 3D Viewport

**Competitive insight:** exocad uses right-click context menus throughout, which is a standard desktop CAD pattern. Our app has zero right-click support.

Add a context menu on right-click of the 3D viewport background:
- **View presets:** Front, Back, Top, Bottom, Left, Right, 3/4 (replaces the fixed preset strip)
- **Reset View**
- **Toggle Measurements** (when implemented in Phase 4b)
- **Toggle Photo Overlay**
- **Frame Selection** (if a tooth is selected)

When right-clicking on a tooth mesh:
- **Select** (if not selected)
- **Frame** (zoom to fit)
- **Properties** (scroll sidebar to ToothInspector)
- **Hide** (toggle visibility)

Implemented using a positioned `<div>` that appears at cursor position, dismissed on click-away or Escape. Uses the existing glass-blur treatment.

**Files:** `SceneCanvas.tsx` (new ContextMenu component), `styles.css`

### 3g. Layer Visibility Panel

**Competitive insight:** exocad has an expandable scene graph tree for managing visibility. SmileCloud has a Layers panel with per-tooth sliders. Our only visibility control is the photo overlay toggle.

Add a collapsible "Layers" section to the DesignSidebar:
- **Arch Scan** — visibility toggle + opacity slider
- **Design Teeth** — group toggle; expand to show per-tooth toggles
- **Arch Curve** — visibility toggle
- **Photo Overlay** — visibility toggle + opacity slider (duplicates the floating panel control for discoverability)
- **Grid** — visibility toggle

Each layer item: icon + label + eye icon toggle. When expanded (teeth), shows individual tooth rows with tooth number.

Store visibility state in `useCanvasStore` (ephemeral — resets on reload).

**Files:** `DesignSidebar.tsx` (new LayersPanel section), `useCanvasStore` (add visibility state), `SceneCanvas.tsx` (read visibility state)

### 3h. Panel Resize Handles

The DesignSidebar width (280px) and ImportView left panel (400px) become resizable via pointer-event drag handles:
- DesignSidebar: min 220px, max 400px
- Import panel: min 300px, max 500px
- Preferred widths stored in `localStorage`

Implement via a `useResizeHandle` hook using `PointerEvent` — no library dependency.

**Files:** New `useResizeHandle.ts` hook, `DesignView.tsx`, `ImportView.tsx`

### 3i. Extract Inline Styles to CSS

Move the following inline style objects to CSS classes in `styles.css`:
- AppShell grid template
- Stage header patterns (shared between CaptureStageHeader and SimulateStageHeader)
- DesignView grid layout

This enables future CSS container query breakpoints and reduces JSX noise.

**Files:** `AppShell.tsx`, `CaptureView.tsx`, `SimulateView.tsx`, `DesignView.tsx`, `styles.css`

---

## Phase 4: Review + Present

**Goal:** Make validation credible and patient presentation a wow moment.

### 4a. Before/After Slider

Replace the current side-by-side layout in `PresentView` with a single image canvas and a draggable vertical divider:
- Left of divider: original patient photo
- Right of divider: photo with design overlay composited

**Composite rendering note:** The current "After" view applies a CSS filter (`hue-rotate(10deg) brightness(1.08)`) as a placeholder — there is no real design overlay. The Before/After slider requires actual composite rendering: the "After" image must be the patient photo with the generated tooth design overlaid at the calibrated alignment position. This can use CSS `clip-path: inset()` on two stacked layers (photo + design overlay) with the divider position controlling the clip boundary. This avoids canvas compositing for better performance.

New component: `BeforeAfterSlider.tsx`

Full-bleed layout — sidebar and header recede to minimal opacity, maximizing patient-facing screen real estate.

**Files:** New `BeforeAfterSlider.tsx`, `PresentView.tsx` (major rewrite), `styles.css`

### 4b. Inline Measurements in 3D Viewport

Render floating dimension labels in the 3D scene:
- Selected tooth: width and height dimensions as HTML overlays positioned via `project()`
- Adjacent teeth: inter-tooth gap measurements
- Toggle via a "Measurements" button in the viewer toolbar (off by default)

This eliminates navigating to the Review tab just to check dimensions during design.

**Files:** `SceneCanvas.tsx`, `DesignToolbar.tsx`

### 4c. Review Checklist Gate

Before "Mark Ready for Doctor" is enabled in `ValidateView`, require:
- At least one measurement tab visited (tracked via `useState` in ValidateView)
- No unresolved collisions (collision detection is computed in `SceneCanvas.tsx` via `detectCollisions()` — expose the count via the design store or pass as a prop)
- Design has been viewed in 3D (tracked via a store flag set when the design view is visited)

**Prerequisite:** Add a `collisionCount` field to `useDesignStore` (or compute it as a derived selector from the existing collision detection logic in `SceneCanvas`). Currently `detectCollisions()` runs inside SceneCanvas's render cycle and is not exposed to other components.

Show checklist items inline with checkmarks as each is satisfied. The button stays disabled until all items are checked.

**Files:** `ValidateView.tsx`, `useDesignStore.ts` (add collision count), `SceneCanvas.tsx` (lift collision state)

### 4d. Replace window.confirm with Custom Dialog

The "New Case" destructive action uses `window.confirm()`, which looks jarring in Tauri's webview. Replace with a styled modal that:
- Matches the app's dark theme design system
- Itemizes what will be lost: "2 photos, 1 arch scan, 3 design variants"
- Has Cancel (secondary) and Discard (danger) buttons

This replaces the interim `window.confirm()` that was kept through Phases 1-3 when "New Case" moved to the Header.

**Files:** `Header.tsx`, new `ConfirmDialog.tsx` component

### 4e. Patient Presentation Mode

A dedicated fullscreen mode entered from Present view:
- Hides all clinician UI: no sidebar, toolbar, or header
- Shows: before/after slider, patient name, date, practice branding placeholder
- ESC or a floating close button exits back to normal app
- Designed for chairside monitor or secondary display

New component: `PresentationMode.tsx`

**Files:** New `PresentationMode.tsx`, `PresentView.tsx`, `styles.css`

### 4f. Shareable Before/After Export

**Competitive insight:** Smilefy auto-generates shareable before/after photos and videos. SmileCloud has the Passport app. Our current app has no way to share results outside the desktop app.

Add an "Export" action in PresentView / PresentationMode:
- **Export as PNG** — composite the before/after at the current slider position into a single image with patient name and date watermark
- **Export as side-by-side PNG** — both views stitched horizontally
- Use the Tauri `dialog.save` API to write to a user-chosen path

Video export and patient portal are deferred (too complex for this overhaul), but static image export is achievable and covers the core use case of "send something to the patient."

**Files:** `PresentView.tsx`, `PresentationMode.tsx`

### 4g. Portrait-First Mode Toggle

**Competitive insight:** Both Smilefy and SmileCloud center the patient photo as the primary workspace canvas. This is the strongest competitive pattern we're missing. While a full portrait-first layout restructure is deferred, a mode toggle is achievable.

Add a layout toggle in the Design view toolbar:
- **3D-first mode** (default, current layout): 3D canvas is primary, sidebar on right
- **Portrait-first mode**: Patient photo fills the main area with the 3D scan rendered as a smaller inset (similar to SmileCloud's Space-bar toggle). Design controls overlay the photo. The 3D inset can be expanded/collapsed.

Implementation: The DesignViewport switches its grid layout based on a `layoutMode: "3d" | "portrait"` state in `useCanvasStore`. In portrait mode, the photo overlay fills `flex: 1` and the SceneCanvas renders in a `300x200px` floating inset at bottom-right (resizable via drag handle, reusing `useResizeHandle`).

**Files:** `DesignViewport.tsx`, `DesignToolbar.tsx` (layout toggle), `useCanvasStore` (add layoutMode), `styles.css`

---

## Out of Scope

The following items were identified by the agent analyses but are explicitly deferred:

- **Responsive/mobile layout** — SmileGen is a desktop Tauri app; window resize is handled but mobile breakpoints are not needed
- **Web Worker geometry construction** — Performance optimization for large STL files (500k+ tris); defer until measured as a bottleneck
- **LOD system for tooth meshes** — Defer until arch views with 28+ teeth show measurable frame drops
- **CSS file splitting** — `styles.css` is 1724 lines but functional; split when it becomes a maintenance burden
- **A/B experiment toggle removal** — The workspace/guided variant toggle should be hidden from end users but the experiment infrastructure stays for internal use
- **Video simulation export** — Auto-generated before/after video (Smilefy-style); requires video rendering pipeline; defer to a dedicated feature initiative
- **Collaboration features** — Team-Up, shared links, patient portal (SmileCloud-style); requires backend architecture; defer to a separate initiative
- **Patient app / portal** — Dedicated patient-facing app for viewing designs; requires separate product work

## Dependencies

- Phase 1 has no dependencies and can start immediately
- Phase 2 depends on Phase 1 (CaseContextBar removal changes where the "New Case" action lives; workflow rail removal must happen before or simultaneously with ViewId unification)
- Phase 3 depends on Phase 2 (ViewId unification must complete before store split so that `useNavigationStore` uses canonical ViewId type)
- Phase 3a (store split) must complete before 3e-3g (Smile Window, context menu, layers) since they add state to `useCanvasStore`
- Phase 3e-3g can be parallelized with each other once 3a is done — they are independent of each other
- Phase 4 depends on Phase 3 (store split must complete before adding new store flags for review checklist; layer visibility state needed for portrait-first mode)
- Phase 4g (portrait-first mode) depends on Phase 3h (`useResizeHandle` hook) for the resizable 3D inset

**Cross-phase sequencing risk:** Phase 1 deletes the workflow rail's `setActiveView(stage.id)` handlers which currently call `normalizeViewId` internally. Phase 2 reverses the `LEGACY_VIEW_MAP` direction and rewrites `normalizeViewId`. If done in separate PRs, ensure Phase 1 is merged and stable before Phase 2 begins. Alternatively, Phases 1a and 2a can be combined into a single atomic commit.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| ViewId unification is a large mechanical refactor | Do as single atomic commit; use find-and-replace; test with existing localStorage data |
| `activeView` is not persisted but other ViewId references exist in code | Search all files for legacy ViewId string literals before merging |
| Store split causes import churn across many files | Mechanical refactor; provide re-exports from old path during transition |
| Before/After slider needs real composite rendering (not just CSS filter) | Use CSS `clip-path` on stacked layers; avoid canvas compositing |
| Removing CaseContextBar loses "New Case" action | Move to Header in Phase 1; interim `window.confirm()`; custom dialog in Phase 4d |
| `quickGenerate()` may freeze UI on complex scans | Measure; add microtask yield if >100ms |
| Collision count is not exposed outside SceneCanvas | Lift to design store as prerequisite for Phase 4c |
| WCAG contrast calculations may be off | Verify proposed hex values against `--bg-primary: #0f1419` with a WCAG tool before implementation |
| Smile Window may occlude important 3D content | Draggable + collapsible; hides when full photo overlay is active |
| Right-click conflicts with browser dev tools | Only in production Tauri build; dev mode keeps browser right-click |
| Portrait-first mode adds layout complexity | Implemented as a CSS grid swap, not a new component tree; shares existing panels |
| Layer visibility state grows with tooth count | Use a Set for hidden IDs; default is all-visible (empty set) |
