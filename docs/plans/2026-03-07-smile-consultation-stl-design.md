# Smile Consultation STL Design

## Summary

This document defines a macOS-first desktop application that combines chairside smile consultation with guided 3D restorative proposal generation and STL export. The product wedge is narrower than a full dental CAD suite: it focuses on premolar-to-premolar veneer and crown proposals derived from smile-planning inputs rather than definitive final-restoration authoring.

The application takes an arch scan STL, facial or intraoral photos, and optional individual tooth library STLs. It converts the approved smile plan into a structured 3D target map, synthesizes tooth proposals, constructs veneer or crown meshes, validates the meshes, and exports planning-grade STL output.

## Product Goals

- Support consultation-driven smile design from premolar to premolar.
- Generate new veneer and crown proposal STL output from the approved smile plan.
- Keep the chairside workflow guided, with high-level controls instead of full freeform CAD editing.
- Run as a local desktop app on macOS while preserving a path to future Windows support.
- Preserve enough internal structure to add full manual editing and collaboration later.

## Non-Goals For V1

- Full prep-margin editing
- Articulator and antagonist workflows
- Definitive lab-grade crown CAD guarantees
- CBCT fusion
- Multi-user cloud collaboration
- Full-arch treatment planning beyond premolar to premolar

## Recommended Product Positioning

The product should be framed as a guided esthetic restorative planner. Public SmileFy materials emphasize one-click design plus print-ready STL generation, while Smilecloud focuses more on collaboration, sharing, and external review of imported designs. The opportunity here is not to recreate every feature from either platform, but to make the local consultation-to-STL path faster and more dependable.

The safest claim for v1 is planning-grade veneer and crown proposals suitable for consultation, mockup, provisional, and lab handoff workflows. The internal architecture should still anticipate future progression toward definitive design workflows.

## Core Workflow

1. Create a case and import frontal or retracted photos.
2. Import arch scan STL and optional individual tooth library STLs.
3. Confirm arch orientation and premolar-to-premolar working range.
4. Create or adjust the smile plan using high-level esthetic controls.
5. Confirm tooth mapping and treatment selection for each tooth.
6. Generate 3D veneer or crown proposals from the smile plan.
7. Review generated meshes, warnings, and tooth selection.
8. Export per-tooth or combined STL output with a case summary.

## User Experience Principles

- Stop and request correction when geometric confidence is low.
- Keep manual intervention limited to pivotal checkpoints.
- Separate esthetic planning concepts from low-level mesh manipulation.
- Make every design version reproducible from recorded inputs and parameters.

## System Architecture

### 1. Desktop Shell

The shell should be built with Tauri so the user interface can move quickly on macOS while remaining portable to Windows later. Tauri also keeps the native geometry engine close to the desktop process model without forcing a full native UI rewrite.

Responsibilities:

- Windowing and desktop integration
- File import and export dialogs
- Preferences and future licensing hooks
- Native command bridge to the geometry engine

### 2. Case Workspace

The case workspace owns local persistence, asset indexing, design versions, and patient context. SQLite is sufficient for local-first operation.

Responsibilities:

- Patient and case metadata
- Asset records for photos and meshes
- Design version history
- Export manifest and audit trail

### 3. 2D Smile Planner

The smile planner turns photo-based planning into structured esthetic targets rather than directly into geometry. This is the bridge between consultation and 3D synthesis.

Responsibilities:

- Photo calibration
- Facial midline and smile-line alignment
- Tooth-frame targeting from premolar to premolar
- High-level controls such as width, length, curve, symmetry, and tooth selection

### 4. 3D Design Engine

The design engine converts smile-plan targets into actual tooth and restoration meshes. It should be treated as the core product IP.

Responsibilities:

- Arch orientation normalization
- Tooth segmentation and numbering
- Library-tooth fitting
- Contralateral mirroring fallback
- Parametric default tooth fallback
- Veneer shell construction
- Crown proposal construction
- Mesh validation and export

### 5. 3D Review Layer

The review layer exposes the generated geometry without pretending to be a full CAD editor in v1.

Responsibilities:

- Before and after preview
- Tooth visibility toggles
- Per-tooth enable or disable
- Warning display
- Export readiness confirmation

## Recommended Technical Stack

- Desktop shell: Tauri
- UI: React + TypeScript
- Local persistence: SQLite
- 3D viewer: Three.js or VTK.js
- Native orchestration: Rust
- Heavy geometry modules: C++ wrappers where mature mesh tooling is needed
- Vision pipeline: OpenCV plus landmark or segmentation models

This split keeps the product portable while isolating CAD and mesh complexity in a native engine.

## Core Data Model

### Case

- patient_id
- case_id
- title
- created_at
- updated_at
- active_design_version_id

### Asset

- asset_id
- case_id
- type: photo, arch_scan_stl, tooth_library_stl, export_stl, thumbnail
- local_path
- checksum
- metadata_json

### SmilePlan

- smile_plan_id
- case_id
- photo_asset_ids
- arch_scan_asset_id
- working_range
- midline
- incisal_curve
- symmetry_mode
- global_width_scale
- global_length_scale
- selected_teeth
- treatment_map

### ToothDesign

- tooth_design_id
- smile_plan_id
- tooth_id
- treatment_type
- source_region_id
- proposal_source: library, contralateral, parametric
- transform_params_json
- morph_params_json
- restoration_params_json
- warning_state_json

### ExportPackage

- export_package_id
- smile_plan_id
- output_asset_ids
- validation_report_json
- manifest_json

## Geometry Pipeline

### Stage 1: Input Normalization

- Validate STL structure and units.
- Orient the arch into a canonical coordinate frame.
- Identify or confirm the premolar-to-premolar working span.

### Stage 2: Tooth Mapping

- Segment or semi-segment each tooth region in the working range.
- Assign tooth numbers.
- Allow correction when confidence is low.

### Stage 3: Smile-Plan Target Extraction

- Convert photo planning choices into target values for tooth display, symmetry, width and height progression, and incisal curvature.
- Store these targets as structured plan data, not transient UI state.

### Stage 4: Proposal Synthesis

Each tooth proposal should come from one of three sources:

- Imported tooth library STL
- Mirrored contralateral tooth
- Parametric default tooth family

The system should then fit and morph the proposal into the arch context while satisfying the esthetic targets.

### Stage 5: Restoration Construction

For veneers:

- Generate a facial shell over the scanned tooth region.
- Enforce thickness bounds.
- Preserve reasonable insertion and shell continuity.

For crowns:

- Generate a coronal proposal anchored to the scanned target region.
- Keep v1 planning-grade unless future prep-aware tooling is added.

### Stage 6: Validation And Export

Before export, validate:

- Watertight mesh
- Self-intersections
- Severe undercut risk
- Minimum thickness constraints
- Missing segmentation confidence

Then export:

- Per-tooth STL
- Combined STL set
- Case summary manifest

## Guided Controls For V1

The clinician-facing editing model should stay high-level:

- Tooth include or exclude
- Veneer versus crown selection
- Global and per-tooth width and length bias
- Midline shift
- Incisal curve
- Symmetry mode
- Proposal source choice when auto-selection is weak

This keeps the workflow fast while leaving room for later full customization.

## Error Handling Strategy

The product should fail loudly and specifically when confidence is low or geometry is unsafe. Blocking states should include:

- Invalid or non-manifold STL input
- Arch orientation failure
- Low-confidence tooth segmentation or numbering
- Photo-to-scan mismatch too large for safe registration
- Thickness or self-intersection failures on export

Each blocking state should direct the user to a correction step. Generic failure modals should be avoided.

## Testing Strategy

Verification should focus on geometry and workflow determinism:

- Golden-case geometry fixtures for representative veneer and crown cases
- Mesh validation tests for watertightness, self-intersections, and thickness rules
- Segmentation and registration regression tests on a curated sample set
- Desktop flow tests for import, plan, generate, and export
- Performance budgets for common case sizes on target Mac hardware

## Roadmap After MVP

### Phase 2

- Technician collaboration
- Comments and version compare
- Improved tooth segmentation correction
- Better crown-generation constraints

### Phase 3

- Full manual tooth editing
- Prep-margin editing
- Antagonist and occlusion workflows
- Cloud case sync and patient sharing
- CBCT fusion

## Open Risks

- Reliable tooth segmentation on noisy real-world scans
- Robust mapping between photo-derived esthetic targets and 3D tooth regions
- Generating clinically plausible crown proposals without full CAD editing
- Meeting acceptable runtime on consumer Mac hardware

## Recommendation

Build the product as a Tauri desktop app with a React workflow UI and a native geometry engine. Keep the smile-plan model as the primary contract between consultation UX and 3D synthesis. Market the first release as guided consultation-to-STL planning for premolar-to-premolar veneers and crowns, not as a full definitive restorative CAD system.
