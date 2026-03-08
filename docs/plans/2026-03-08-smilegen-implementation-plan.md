# SmileGen: Technical Implementation Plan

**Date:** March 8, 2026
**Based on:** Competitive analysis of Smilefy, SmileCloud, Exocad
**Goal:** Build SmileGen into a production-grade dental smile design platform that combines the best of all three competitors

---

## Strategic Positioning

SmileGen should combine:
- **Smilefy's speed** — photo-to-wax-up in minutes, chairside self-sufficiency
- **SmileCloud's natural aesthetics** — biometric tooth libraries from real donor patients
- **Exocad's openness** — hardware-neutral, modular architecture, expert mode

**Differentiator:** All three in one platform with local-first architecture (Tauri desktop) + optional cloud sync, plus perspective-aware 3D/2D alignment that none of the competitors expose as a user-controllable feature.

---

## Current State Assessment

### What's Built (Working)
- Import pipeline: photos, arch scan STL, tooth library STL (with ID inference)
- Design engine: procedural tooth geometry, 3 variant generation, trust state
- 3D viewer: Three.js scene with arch + teeth, orbit controls
- Photo overlay: perspective-projected teeth on patient photo, draggable guides
- Arch alignment: parabolic arch model with perspective projection
- Variant comparison: side-by-side cards, detail table, selection
- Export: per-variant STL download, design summary, doctor handoff checklist
- Workflow state machine: draft → imported → mapped → prepared → exported
- Full dark theme UI

### Critical Gaps (Prioritized)
1. **No biometric tooth library** — only hardcoded procedural dimensions
2. **No facial landmark detection** — guides are manually placed
3. **No persistence** — all state lost on refresh
4. **No undo/redo** — destructive edits
5. **No color matching** — teeth are monochrome overlays
6. **No print-ready output** — STL only, no wax-up/mockup/guide generation
7. **No real mesh deformation** — only bounding-box scaling of uploaded STLs
8. **No collaboration** — single-user only
9. **No doctor review workflow** — state machine has states but no UI
10. **No video/animated preview** — static overlay only

---

## Phase 1: Foundation & Data Layer (Week 1-2)

**Goal:** Persistence, undo/redo, and the data model needed for everything else.

### 1.1 Case Persistence with SQLite

**Why:** Every competitor persists cases. Users need to close and reopen.

**Files:**
- `src-tauri/src/db.rs` — SQLite connection via `rusqlite`
- `src-tauri/src/commands/case_commands.rs` — Tauri IPC commands
- `src/services/caseDb.ts` — TypeScript client wrapping Tauri invoke calls
- `src/store/persistenceMiddleware.ts` — Zustand middleware for auto-save

**Schema:**
```sql
CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  workflow_state TEXT NOT NULL DEFAULT 'draft',
  plan_json TEXT NOT NULL,        -- serialized SmilePlan
  design_json TEXT,               -- serialized GeneratedSmileDesign (nullable)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE case_assets (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  asset_type TEXT NOT NULL,       -- 'photo' | 'arch_scan' | 'tooth_model'
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,        -- path in app data directory
  metadata_json TEXT,             -- bounds, tooth_id, etc.
  created_at TEXT NOT NULL
);

CREATE TABLE case_variants (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  label TEXT NOT NULL,
  design_json TEXT NOT NULL,      -- serialized GeneratedVariantDesign
  is_active INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
```

**Implementation:**
- Store asset files in Tauri's `app_data_dir()/<case_id>/assets/`
- Auto-save on every state change via debounced Zustand `subscribe()`
- Load case list on app start for the CaseList view
- Tauri commands: `save_case`, `load_case`, `list_cases`, `delete_case`, `save_asset_file`, `load_asset_file`

### 1.2 Undo/Redo System

**Why:** Smilefy and Exocad both support non-destructive editing. Tooth adjustments must be reversible.

**Files:**
- `src/store/undoMiddleware.ts` — Zustand temporal middleware
- Update `useSmileStore.ts` — wrap with undo middleware

**Implementation:**
- Use `zundo` (Zustand undo middleware) or custom implementation
- Track state snapshots for: `generatedDesign`, `plan`, `activeVariantId`, `selectedToothId`
- Exclude from history: `uploadedPhotos`, `archScanMesh` (too large), overlay positions
- Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z
- Max history depth: 50 states
- Group rapid slider changes into single undo steps (debounce 300ms)

### 1.3 Case List & Management View

**Why:** SmileCloud and Exocad both have case browsers. Users need to manage multiple patients.

**Files:**
- `src/features/views/CaseListView.tsx` — Case browser with search/filter
- `src/features/cases/CaseCard.tsx` — Individual case preview card
- Update `Sidebar.tsx` — add "Cases" nav item
- Update `store/useSmileStore.ts` — add `loadCase()`, `newCase()` actions

**Design:**
- Grid of case cards showing: patient name, date, workflow state badge, thumbnail
- Search by name, filter by state
- New Case button → opens Import view
- Click case → loads full state, navigates to last active view
- Delete with confirmation

---

## Phase 2: Biometric Tooth Library (Week 3-4)

**Goal:** Replace procedural tooth shapes with anatomically accurate tooth meshes sourced from real dental anatomy — SmileCloud's core differentiator.

### 2.1 Tooth Library Format & Storage

**Why:** SmileCloud's #1 feature is "natural donor teeth" — real tooth anatomy, not generic CAD shapes. This is the single highest-impact feature for design quality.

**Files:**
- `src/features/library/toothLibraryTypes.ts` — Library data model
- `src/features/library/toothLibraryService.ts` — Load, index, search tooth shapes
- `src-tauri/src/commands/library_commands.rs` — File system access for library
- `data/tooth-library/` — Bundled default tooth library (STL files)

**Data Model:**
```typescript
interface ToothLibraryEntry {
  id: string;                    // e.g. "lib-central-incisor-001"
  toothNumber: string;           // Universal number: "8", "9", etc.
  toothName: string;             // "Central Incisor", "Lateral Incisor", etc.
  morphologyTag: string;         // "ovoid" | "square" | "triangular" | "barrel"
  sex: "male" | "female" | "unisex";
  ethnicity?: string;            // optional demographic tag
  dimensions: {
    width: number;               // mm, mesiodistal at widest
    height: number;              // mm, cervical to incisal
    depth: number;               // mm, labial to lingual
    widthHeightRatio: number;    // golden proportion reference
  };
  mesh: ParsedStlMesh;          // full 3D mesh
  thumbnail?: string;            // base64 preview image
  source: "bundled" | "imported" | "community";
}

interface ToothLibraryCollection {
  id: string;
  name: string;                  // e.g. "Natural Set A — Female, Ovoid"
  description: string;
  teeth: Record<string, ToothLibraryEntry>;  // keyed by tooth number
  compatibility: number;         // 0-1 score for how well teeth work together
}
```

**Bundled Library:**
- Ship 3 default collections (ovoid, square, triangular morphology)
- 10 teeth per collection (teeth 4-13, upper premolar-to-premolar)
- Source meshes from open dental anatomy datasets (e.g., Open Dental CAD library)
- Each tooth stored as binary STL in `data/tooth-library/<collection-id>/<tooth-number>.stl`

### 2.2 AI-Powered Tooth Shape Matching

**Why:** SmileCloud's AI acts as a "search engine for anatomy." Given design parameters, it finds the best-fitting real tooth shape.

**Files:**
- `src/features/library/toothMatcher.ts` — Shape matching algorithm
- `src/features/library/morphologyAnalyzer.ts` — Analyze arch scan to suggest morphology

**Algorithm:**
```typescript
interface MatchCriteria {
  targetWidth: number;           // from SmilePlan
  targetHeight: number;
  targetDepth: number;
  morphologyPreference?: string; // user selection or AI suggestion
  sexPreference?: string;
  archForm?: "narrow" | "average" | "wide";
}

interface MatchResult {
  entry: ToothLibraryEntry;
  score: number;                 // 0-1 match quality
  scaleFactor: {                 // how much scaling needed
    width: number;
    height: number;
    depth: number;
  };
  distortion: number;            // 0-1, lower = less distortion from scaling
}
```

**Matching Strategy:**
1. Filter by tooth number (only match central incisors to central incisors)
2. Score by dimensional proximity: `score = 1 - weightedDistance(target, candidate)`
3. Penalize large scale factors (>15% scaling reduces natural appearance)
4. Prefer same-morphology matches when user has selected a preference
5. Return top 3 matches for user selection
6. Cache match results per tooth per plan configuration

### 2.3 Library Browser UI

**Files:**
- `src/features/library/LibraryPanel.tsx` — Browse/search/filter tooth shapes
- `src/features/library/ToothPreview3D.tsx` — 3D preview of individual tooth
- `src/features/library/CollectionSelector.tsx` — Switch between collections
- Update `DesignView.tsx` — add library panel to right sidebar

**UI Design:**
- Collapsible panel in the Design view sidebar
- Collection dropdown at top
- Grid of tooth cards with 3D preview thumbnails
- Click tooth → shows 3D preview with dimensions
- "Apply to Design" button → replaces the corresponding tooth in active variant
- Filter by morphology tag, sort by match score
- Import custom tooth button → loads user STL into library

### 2.4 Update Design Engine for Library Integration

**Files:**
- Update `features/engine/designEngine.ts` — use library meshes instead of procedural shapes
- Update `store/useSmileStore.ts` — add library state and actions

**Changes:**
- `createVariantDesign()` now queries `toothMatcher.findBestMatch()` for each tooth
- If a library match exists with score > 0.7, use the library mesh (scaled)
- If no good match, fall back to procedural generation
- Store the selected library entry ID on each `GeneratedToothDesign`
- Add `selectedLibraryId?: string` to `GeneratedToothDesign` type
- Add `swapToothShape(toothId, libraryEntryId)` action to store

---

## Phase 3: Intelligent Photo Analysis (Week 5-6)

**Goal:** Automated facial landmark detection and smile analysis — what Smilefy calls "AI Analysis" and SmileCloud calls "Facial Analysis."

### 3.1 Facial Landmark Detection

**Why:** Smilefy automates smile design rule evaluation. SmileCloud auto-detects facial landmarks. Manual guide placement is the current bottleneck.

**Files:**
- `src/features/analysis/facialLandmarks.ts` — Landmark detection service
- `src/features/analysis/smileAnalysis.ts` — Smile metrics computation
- `src/features/analysis/analysisTypes.ts` — Types for landmarks and metrics

**Approach:** Use MediaPipe Face Mesh (runs in-browser via WASM/WebGL, no server needed) or TensorFlow.js FaceLandmarksDetection.

**Landmarks to Detect:**
```typescript
interface FacialLandmarks {
  // Key reference points
  pupilLeft: Point2D;
  pupilRight: Point2D;
  bipupillaryLine: Line2D;       // connects pupils — horizontal reference
  nasion: Point2D;               // bridge of nose
  subnasale: Point2D;            // base of nose
  menton: Point2D;               // bottom of chin

  // Lip landmarks
  upperLipCenter: Point2D;
  lowerLipCenter: Point2D;
  commissureLeft: Point2D;       // left corner of mouth
  commissureRight: Point2D;
  upperLipLine: Point2D[];       // curve of upper lip
  lowerLipLine: Point2D[];

  // Dental landmarks (if visible)
  teethVisible: boolean;
  teethRegion: BoundingBox;      // bounding box of visible teeth
  midlineEstimate: Line2D;       // estimated dental midline from facial midline

  // Quality metrics
  confidence: number;            // 0-1 detection confidence
  faceAngle: number;             // degrees from frontal (should be < 10°)
  isSmiling: boolean;
}
```

**Auto-Calibration from Landmarks:**
```typescript
function autoCalibrate(landmarks: FacialLandmarks, viewWidth: number, viewHeight: number): Partial<OverlayGuides> {
  return {
    midlineX: landmarks.midlineEstimate.x / viewWidth * 100,
    smileArcY: landmarks.upperLipLine.center.y / viewHeight * 100,
    gingivalLineY: landmarks.teethRegion.top / viewHeight * 100,
    // Also derive arch width estimate from inter-commissure distance
    estimatedArchWidth: distance(landmarks.commissureLeft, landmarks.commissureRight) * ARCH_WIDTH_FACTOR
  };
}
```

### 3.2 Smile Metrics Dashboard

**Why:** Smilefy evaluates "dental proportions, incisal edge positioning, and gingival contours." Clinicians expect quantified analysis.

**Files:**
- `src/features/analysis/SmileMetricsPanel.tsx` — Dashboard showing computed metrics
- Update `DesignView.tsx` — add metrics panel to sidebar

**Computed Metrics:**
```typescript
interface SmileMetrics {
  // Proportions
  centralToLateralRatio: number;      // ideal: 0.618 (golden ratio)
  lateralToCanineRatio: number;       // ideal: 0.618
  widthToHeightRatio: number;         // central incisor, ideal: 0.75-0.80
  smileWidthToFaceWidth: number;      // ideal: ~0.55

  // Alignment
  midlineDeviation: number;           // mm from facial midline
  bipupillaryToOcclusalAngle: number; // degrees, ideal: 0°
  smileArcConformity: number;         // 0-1, how well incisal edges follow lower lip

  // Gingival
  gingivalSymmetry: number;           // 0-1 score
  gingivalZenithAlignment: boolean;   // canines and centrals at same level

  // Overall
  compositeScore: number;             // 0-100 weighted score
  recommendations: string[];          // e.g. "Consider increasing lateral incisor width"
}
```

**UI:** Radial/spider chart showing how the current design scores on each dimension, with ideal ranges highlighted.

### 3.3 Smart Guide Auto-Placement

**Files:**
- Update `PhotoOverlay.tsx` — auto-place guides when landmarks are detected
- Update `store/useSmileStore.ts` — add `autoDetectLandmarks()` action

**Flow:**
1. User uploads photo → `autoDetectLandmarks()` runs in background
2. Landmarks stored in state: `facialLandmarks: FacialLandmarks | null`
3. On success, overlay guides snap to detected positions (midline, smile arc, gingival)
4. User can still manually adjust — detected positions are suggestions, not locks
5. "Reset to Detected" button restores AI-suggested positions
6. Show confidence indicator on each guide

---

## Phase 4: Advanced 3D Geometry (Week 7-9)

**Goal:** Real mesh deformation, collision detection, and functional occlusion — bridging toward Exocad-level geometry.

### 4.1 Mesh Deformation Engine

**Why:** Current system only scales meshes by bounding box. Real tooth design requires non-uniform deformation preserving surface detail.

**Files:**
- `src/features/geometry/meshDeformer.ts` — FFD (Free-Form Deformation) engine
- `src/features/geometry/latticeTypes.ts` — Deformation lattice data model
- `src/features/geometry/meshUtils.ts` — Mesh utilities (normals, smoothing, subdivision)

**Algorithm: Lattice-Based Free-Form Deformation**
```typescript
interface DeformationLattice {
  resolution: [number, number, number]; // e.g. [4, 4, 4] control points
  controlPoints: MeshVertex[];          // displaced control points
  restPoints: MeshVertex[];             // original control point positions
}

// For each mesh vertex:
// 1. Compute parametric coordinates (s, t, u) within the lattice
// 2. Apply trilinear interpolation of displaced control points
// 3. Result is the deformed vertex position

function deformMesh(mesh: ParsedStlMesh, lattice: DeformationLattice): ParsedStlMesh {
  const deformedTriangles = mesh.triangles.map(tri => ({
    a: deformVertex(tri.a, lattice),
    b: deformVertex(tri.b, lattice),
    c: deformVertex(tri.c, lattice)
  }));
  return { ...mesh, triangles: deformedTriangles, bounds: recomputeBounds(deformedTriangles) };
}
```

**Use Cases:**
- Adjust tooth width without uniformly scaling height
- Add labial contour (facial volume) without changing lingual surface
- Taper incisal edge independently from cervical area
- Respect anatomical features (cusp tips, marginal ridges) during deformation

### 4.2 Collision Detection

**Why:** Exocad checks functional occlusion. Teeth should not overlap or leave excessive gaps.

**Files:**
- `src/features/geometry/collisionDetector.ts` — AABB + GJK collision detection
- `src/features/geometry/contactAnalysis.ts` — Interproximal contact analysis

**Implementation:**
```typescript
interface CollisionResult {
  toothA: string;
  toothB: string;
  type: "overlap" | "gap" | "contact";
  distance: number;          // negative = overlap, positive = gap, ~0 = contact
  contactPoints: MeshVertex[];
}

// Fast path: AABB overlap test (bounding boxes)
// Slow path: GJK algorithm for precise mesh-mesh distance
// Target: < 16ms for full arch (10 teeth) to enable real-time feedback
```

**UI Integration:**
- Highlight overlapping teeth in red in both 3D view and tooth strip
- Show gap warnings between teeth that should be in contact
- Trust state: `blocked` if overlap > 0.5mm, `needs_correction` if gap > 0.3mm

### 4.3 Arch Form Editor

**Why:** The parabolic arch model is hardcoded. Clinicians need to adjust the arch form to match the patient.

**Files:**
- `src/features/alignment/ArchFormEditor.tsx` — Interactive arch curve editor
- Update `src/features/alignment/archModel.ts` — support custom arch curves

**Features:**
- SVG editor showing arch curve from occlusal view
- Draggable control points to reshape the arch (Bezier or NURBS)
- Presets: narrow, average, wide, custom
- Auto-fit from arch scan bounds when available
- Per-tooth position along the arch is derived from the curve
- Changes propagate to both 3D viewer and photo overlay

### 4.4 Virtual Articulator (Basic)

**Why:** Exocad's Auto Articulator module. Even a basic version adds clinical credibility.

**Files:**
- `src/features/articulation/virtualArticulator.ts` — Basic jaw motion simulation
- `src/features/articulation/ArticulatorView.tsx` — 3D animated view

**Scope (v1 — simplified):**
- Model mandibular opening/closing as rotation around condylar axis
- Show incisal guidance path during protrusion
- Detect collisions between opposing arches during simulated motion
- Display maximum intercuspation position
- No lateral excursions in v1 (too complex without real jaw motion data)

---

## Phase 5: Patient Communication & Preview (Week 10-11)

**Goal:** Smilefy's "Smile Trial" and AVA animated preview, SmileCloud's video simulation.

### 5.1 Photorealistic Smile Preview

**Why:** Smilefy's Smile Trial and Exocad's TruSmile Photo. Patient acceptance increases dramatically with realistic previews.

**Files:**
- `src/features/preview/smilePreview.ts` — Composite the designed teeth onto the patient photo
- `src/features/preview/colorMapper.ts` — Map tooth shade to realistic color/texture
- `src/features/preview/SmilePreviewPanel.tsx` — Before/after comparison UI

**Approach:**
```typescript
interface SmilePreviewConfig {
  photo: UploadedPhoto;
  variant: GeneratedVariantDesign;
  calibration: AlignmentCalibration;
  shadeGuide: ShadeSelection;     // e.g. VITA A1, A2, B1, etc.
  renderMode: "outline" | "filled" | "photorealistic";
}
```

**Rendering Pipeline:**
1. Project teeth to photo using existing `archModel.ts` perspective projection
2. For each tooth, render a 2D projection of the 3D mesh (silhouette + shading)
3. Apply shade color with gradients (lighter at incisal edge, warmer at cervical)
4. Blend translucency at incisal third (simulate enamel)
5. Apply ambient occlusion at interproximal contacts
6. Composite onto photo with perspective-correct masking
7. Use Canvas2D or WebGL for rendering

### 5.2 Shade/Color Selection

**Why:** SmileCloud includes color matching. Essential for patient communication.

**Files:**
- `src/features/color/shadeGuide.ts` — VITA shade guide data
- `src/features/color/ShadeSelector.tsx` — Visual shade picker
- Update `store/useSmileStore.ts` — add shade selection state

**VITA Classical Shades:** A1, A2, A3, A3.5, B1, B2, B3, C1, C2, D2, etc.
Each shade maps to RGB values for preview rendering.

### 5.3 Before/After Comparison

**Files:**
- `src/features/preview/BeforeAfterSlider.tsx` — Draggable split-screen comparison
- Update `DesignView.tsx` — add before/after mode to photo tab

**Features:**
- Vertical slider divides photo: left = original, right = with designed teeth
- Smooth drag interaction
- Toggle between variants while comparing
- Export as image for patient records

### 5.4 Animated Smile Video (Stretch Goal)

**Why:** Smilefy AVA and SmileCloud both offer animated previews. High patient impact.

**Files:**
- `src/features/preview/smileAnimator.ts` — Generate animated preview frames
- `src/features/preview/VideoExportPanel.tsx` — Export as video

**Approach (v1 — simplified):**
- Use the static photorealistic preview
- Animate lip opening/closing using the facial landmarks (key-frame interpolation)
- Reveal designed teeth progressively as lips open
- Export as GIF or WebM using Canvas recording API
- 2-3 second loop, 30fps

---

## Phase 6: Print-Ready Output & Manufacturing (Week 12-13)

**Goal:** Smilefy's automated 3D wax-up generation — from design to print-ready files.

### 6.1 Diagnostic Wax-Up Generation

**Why:** Smilefy generates print-ready wax-ups automatically. This is the #1 chairside time-saver.

**Files:**
- `src/features/manufacturing/waxupGenerator.ts` — Generate wax-up mesh from design
- `src/features/manufacturing/waxupTypes.ts` — Wax-up configuration types

**Output Types:**
```typescript
type WaxupType =
  | "diagnostic"         // full contour wax-up for try-in
  | "mockup_shell"       // eggshell provisional over existing teeth
  | "injectable_guide"   // guide for injectable composite technique
  | "direct_guide"       // guide for direct composite layup
  | "gingival_guide"     // soft tissue recontouring guide
  | "provisional";       // temporary crown/veneer

interface WaxupConfig {
  type: WaxupType;
  variant: GeneratedVariantDesign;
  archScan: ParsedStlMesh;
  thickness: number;             // wall thickness for shells (mm)
  offsetFromArch: number;        // clearance from existing anatomy (mm)
  includeMargin: boolean;        // include preparation margin line
  hollowInterior: boolean;       // hollow for resin saving
  supportStructures: boolean;    // add print supports
}
```

**Algorithm:**
1. For each designed tooth, compute the Boolean difference between the design mesh and the arch scan surface
2. The resulting shell is the wax-up/mockup shape
3. Add connector bridges between adjacent teeth for structural integrity
4. Hollow the interior with specified wall thickness
5. Orient for optimal 3D printing (minimize supports)
6. Export as binary STL (more compact for printing)

### 6.2 Binary STL Export

**Why:** Current export is ASCII STL (verbose). Printers prefer binary STL (10x smaller).

**Files:**
- Update `features/import/stlParser.ts` — add `serializeToBinaryStl()` function
- Update `features/engine/designEngine.ts` — option for binary output

### 6.3 Multi-Format Export

**Files:**
- `src/features/export/exportService.ts` — Multi-format export orchestrator
- Update `ExportView.tsx` — format selection UI

**Formats:**
- STL (ASCII/Binary) — universal 3D printing
- OBJ — for import into Exocad/3Shape
- PLY — with vertex colors for shade visualization
- PDF report — case summary with photos, design parameters, measurements
- PNG/JPEG — photorealistic preview images

### 6.4 Case Report PDF

**Why:** Clinical documentation. Every competitor provides case reports.

**Files:**
- `src/features/export/reportGenerator.ts` — PDF generation
- `src/features/export/ReportPreview.tsx` — Preview before export

**Contents:**
- Patient info, case title, date
- Before photo with landmarks
- Design photos (per variant) with measurements
- Tooth dimension table
- Treatment plan summary
- Shade selection
- Clinician signature block

---

## Phase 7: Collaboration & Cloud (Week 14-16)

**Goal:** SmileCloud's cloud-native collaboration features, adapted for SmileGen's local-first architecture.

### 7.1 Case Sharing (Export/Import)

**Files:**
- `src/features/collaboration/casePackager.ts` — Package case into shareable format
- `src/features/collaboration/CaseSharePanel.tsx` — Share UI

**Approach:**
- Package case into a `.smilegen` file (ZIP containing JSON metadata + asset STLs + photos)
- Import `.smilegen` files to load a shared case
- No cloud required — works via file transfer, email, cloud drives

### 7.2 Optional Cloud Sync (Future)

**Architecture Decision:** Local-first with optional sync.

- Cases stored locally in SQLite (Phase 1)
- Optional Supabase/Firebase backend for multi-device sync
- Conflict resolution: last-write-wins with version history
- Real-time collaboration via CRDTs (future scope)

### 7.3 Annotation & Comments

**Why:** SmileCloud Blueprint — shared visual reference with annotations.

**Files:**
- `src/features/collaboration/annotationStore.ts` — Annotation data model
- `src/features/collaboration/AnnotationLayer.tsx` — SVG annotation overlay

**Features:**
- Draw arrows, circles, text annotations on photo overlay
- Pin comments to specific teeth
- Annotations persist with the case
- Export annotations in the PDF report

---

## Phase 8: Expert Mode & Polish (Week 17-18)

**Goal:** Exocad's Expert Mode — power users can work non-linearly.

### 8.1 Expert Mode Toggle

**Why:** Exocad's dual workflow (wizard + expert) is a key competitive advantage.

**Files:**
- `src/features/layout/ExpertMode.tsx` — Expert mode layout
- Update `store/useSmileStore.ts` — add `expertMode: boolean`

**Expert Mode Features:**
- All panels accessible simultaneously (not gated by workflow step)
- Keyboard shortcuts for all common operations
- Quick-switch between any view without workflow validation
- Command palette (Cmd+K) for rapid navigation
- Customizable panel layout (drag to rearrange)

### 8.2 Keyboard Shortcuts

**Bindings:**
```
Cmd+Z / Cmd+Shift+Z  — Undo / Redo
Cmd+S                 — Save case
Cmd+E                 — Export active variant STL
Cmd+G                 — Generate / regenerate design
1-4                   — Switch views (Import/Design/Compare/Export)
Tab                   — Cycle selected tooth
Escape                — Deselect tooth
Space                 — Toggle overlay on/off
[  ]                  — Previous/Next variant
Cmd+K                 — Command palette
```

### 8.3 Drag-and-Drop Import

**Files:**
- `src/features/import/dropZone.ts` — Global drag-and-drop handler
- Update `AppShell.tsx` — wrap with drop zone

**Features:**
- Drop photos/STLs anywhere in the app
- Auto-detect file type and route to correct handler
- Visual drop indicator overlay
- Multi-file drop support

### 8.4 Settings Panel

**Files:**
- `src/features/settings/SettingsPanel.tsx`
- `src/features/settings/settingsStore.ts`

**Settings:**
- Theme (dark/light — currently dark only)
- Default arch parameters (depth, width, camera distance)
- Trust state thresholds (customize blocked/warning limits)
- Export preferences (STL format, filename template)
- Tooth numbering system (Universal/FDI toggle)
- Language (future i18n)

---

## Implementation Priority Matrix

| Phase | Impact | Effort | Priority |
|-------|--------|--------|----------|
| 1. Persistence & Undo | High | Medium | **P0 — Must have** |
| 2. Biometric Tooth Library | Very High | High | **P0 — Must have** |
| 3. Photo Analysis | High | High | **P1 — Should have** |
| 4. Advanced 3D Geometry | Medium | Very High | **P1 — Should have** |
| 5. Patient Preview | Very High | Medium | **P0 — Must have** |
| 6. Print-Ready Output | High | Medium | **P1 — Should have** |
| 7. Collaboration | Medium | High | **P2 — Nice to have** |
| 8. Expert Mode | Medium | Low | **P1 — Should have** |

**Recommended Build Order:** 1 → 2 → 5 → 3 → 8 → 6 → 4 → 7

Rationale: Persistence is foundational. Biometric library transforms design quality. Patient preview drives case acceptance (revenue). Photo analysis reduces friction. Expert mode is low-effort/high-UX. Print output unlocks chairside value. Advanced geometry and collaboration are longer-term differentiators.

---

## Technical Dependencies

```
Phase 1 (Persistence)
  └─ Tauri commands (Rust)
  └─ rusqlite crate
  └─ zundo (Zustand undo)

Phase 2 (Tooth Library)
  └─ Open dental STL datasets
  └─ Phase 1 (persistence for library storage)

Phase 3 (Photo Analysis)
  └─ @mediapipe/face_mesh or @tensorflow/tfjs
  └─ @mediapipe/tasks-vision WASM binaries

Phase 4 (Advanced Geometry)
  └─ Phase 2 (real meshes to deform)
  └─ three-mesh-bvh (BVH acceleration for collision)

Phase 5 (Patient Preview)
  └─ Phase 3 (landmarks for lip masking)
  └─ Canvas2D or WebGL shader

Phase 6 (Print Output)
  └─ Phase 4 (Boolean mesh operations for wax-ups)
  └─ jspdf or pdfmake (PDF generation)

Phase 7 (Collaboration)
  └─ Phase 1 (persistence layer)
  └─ jszip (case packaging)

Phase 8 (Expert Mode)
  └─ All other phases (needs features to expose)
```

---

## Architecture Decisions

### Local-First vs Cloud-First
**Decision:** Local-first (Tauri desktop) with optional cloud sync.
**Rationale:** Dental data is PHI (Protected Health Information). Local-first avoids HIPAA compliance burden for v1. Cloud sync can be added later for multi-device workflows. Aligns with Exocad's desktop model while keeping SmileCloud's collaboration as a future option.

### Rendering: Three.js vs Custom WebGL
**Decision:** Stay with Three.js / React Three Fiber.
**Rationale:** Already integrated, well-tested. Custom WebGL only needed for photorealistic preview (Phase 5), where a targeted shader is more appropriate than replacing the entire renderer.

### AI: On-Device vs Cloud
**Decision:** On-device (MediaPipe/TensorFlow.js WASM).
**Rationale:** No server dependency, works offline, HIPAA-friendly. MediaPipe Face Mesh runs at 30fps on modern hardware. Cloud AI can be added later for more advanced features (e.g., automated shade matching from photos).

### Mesh Operations: JavaScript vs WASM
**Decision:** Start with JavaScript, move hot paths to WASM if performance requires.
**Rationale:** JS is sufficient for meshes under 100K triangles (typical dental STLs are 30-80K). If collision detection or Boolean operations are too slow, compile a Rust/C++ mesh library to WASM.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tooth library quality insufficient | Medium | High | Curate carefully; allow user imports; partner with dental schools |
| MediaPipe accuracy on dental photos | Medium | Medium | Fall back to manual guides; hybrid approach (AI suggests, user confirms) |
| Mesh Boolean operations too slow in JS | High | Medium | Use simplified collision (AABB); defer precise Booleans to WASM |
| HIPAA concerns block cloud features | Low | Low | Local-first architecture avoids this for v1 |
| STL mesh quality varies wildly | High | Medium | Robust parser (already built); mesh repair pipeline |
| 3D printing compatibility issues | Medium | Medium | Test with major slicer software (Chitubox, PrusaSlicer) |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Photo-to-design time | < 3 minutes | Time from photo upload to first variant generation |
| Design-to-STL time | < 30 seconds | Time from variant selection to downloadable STL |
| Tooth shape naturalness | > 80% clinician approval | User study comparing procedural vs library shapes |
| Photo overlay accuracy | < 0.5mm avg error | Measured against physical mockup |
| Case acceptance rate | > 70% | Tracked in case workflow (prepared → doctor_approved) |
| Test coverage | > 85% | Lines covered in vitest |
| Build size | < 5MB (JS) | Vite production build |
| App startup time | < 2 seconds | Time to interactive |
