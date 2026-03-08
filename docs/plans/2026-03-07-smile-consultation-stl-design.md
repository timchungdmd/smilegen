# Smile Consultation STL Design

## Summary

This document defines a macOS-first desktop application for guided smile consultation, additive-first restorative planning, and planning-grade STL export. The product is intentionally narrower than a full dental CAD suite: it focuses on premolar-to-premolar veneer and crown proposal generation from smile-planning inputs, with strong workflow guardrails and a presentation-first doctor experience.

The application takes an arch scan STL, facial or intraoral photos, and optional individual tooth library STLs. It turns those inputs into a structured smile plan, generates three additive-first restorative variants, routes weak teeth through targeted correction flows, and exports validated STL packages once doctor approval is complete.

## Product Priorities

1. Clinical trust
2. Chairside speed
3. Presentation quality

These priorities should guide every product decision. If a feature improves visual appeal but harms trust or slows the doctor in the room, it should be rejected.

## Product Goals

- Support consultation-driven smile design from premolar to premolar.
- Generate new veneer and crown proposal STL output from an approved smile plan.
- Bias the workflow toward additive planning and preserve tooth structure by default.
- Keep the normal editing model guided and fast, with only limited per-tooth direct adjustment.
- Support both same-visit consultation and assistant-prepared presentation workflows.
- Run locally on macOS while keeping the architecture portable to future Windows support.

## Non-Goals For V1

- Full prep-margin editing
- Antagonist and articulator workflows
- Definitive lab-grade crown CAD guarantees
- CBCT fusion
- Multi-user cloud collaboration
- Full-arch treatment planning beyond premolar to premolar
- Dedicated advanced tooth sculpting workspace

## Product Positioning

The product should be framed as a guided esthetic restorative planner rather than a full restorative CAD platform. The opportunity is not to clone SmileFy or Smilecloud feature-for-feature, but to outperform them in a narrow lane: local consultation-to-variant-to-export planning that is both fast and clinically conservative.

The safest product claim for v1 is planning-grade veneer and crown proposals suitable for consultation, provisional, mockup, and lab handoff workflows. The architecture should preserve an upgrade path toward more definitive CAD capabilities later.

## Core Product Thesis

The product should behave like a guided clinical copilot:

- fast when inputs are clean
- conservative when confidence is low
- variant-first instead of single-answer-first
- assistant-prepared and doctor-approved
- doctor-led in final treatment choice

It should not behave like opaque one-click magic.

## Primary Workflow Modes

### Live Consult Mode

This mode is optimized for same-visit presentation. The workflow is strict, linear, and fast:

1. Create case
2. Import required assets
3. Confirm orientation and mapping
4. Generate default additive variants
5. Compare variants with the patient
6. Correct only flagged or disliked teeth
7. Approve and export

### Prepared Case Mode

This mode is optimized for staff or doctor preparation ahead of presentation:

1. Assistant or doctor imports assets
2. Orientation and mapping are confirmed
3. Draft treatment map is created
4. Three variants are generated and saved
5. Case is marked ready for doctor
6. Doctor opens directly into compare mode
7. Doctor approves or adjusts and exports

## Core Workflow

1. Create a case and import photos.
2. Import an arch scan STL and optional individual tooth library STLs.
3. Confirm arch orientation and working range.
4. Confirm tooth mapping and numbering.
5. Generate a structured smile plan from esthetic controls.
6. Generate three additive-first restorative variants.
7. Surface only hard warnings or flagged teeth.
8. Let the doctor choose a variant and correct exceptions.
9. Re-run hidden trust checks after every meaningful change.
10. Export only after doctor approval and final validation.

## User Experience Principles

- Stop and request correction when geometric confidence is low.
- Keep doctors in compare mode during routine corrections.
- Hide raw confidence and scoring details unless advanced review is opened.
- Make every design snapshot reproducible from recorded inputs and parameters.
- Preserve assistant-prepared work without diluting doctor accountability.
- Present options clearly instead of recommending a single algorithmic answer.

## Signature Product Features

### Variant-First Consultation

The app should generate three additive-first variants by default:

- Conservative
- Balanced
- Enhanced

These variants should differ in esthetic intensity, not in preparation philosophy. Their main differences should be width tendency, length tendency, smile arc expression, embrasure character, and additive fullness.

### Selective Recovery

When one or two teeth are weak or unattractive, the whole case should not collapse. The doctor should be able to:

- regenerate selected teeth
- directly adjust a single tooth from a side inspector
- optionally refresh the full active variant

### Assistant-Prepared, Doctor-Approved

Assistants should be allowed to prepare presentation-ready cases:

- import assets
- confirm orientation
- confirm tooth mapping
- create an initial draft treatment map
- generate and save initial variants

Final treatment approval, blocked-tooth resolution, final variant selection, and export approval remain doctor-controlled.

## System Architecture

### 1. Desktop Shell

The shell should be built with Tauri so the user interface can move quickly on macOS while remaining portable to Windows later.

Responsibilities:

- windowing and desktop integration
- file import and export dialogs
- preferences and future licensing hooks
- native command bridge to the geometry engine

### 2. Case Workspace

The case workspace owns local persistence, asset indexing, design versions, handoff state, and export history. SQLite is sufficient for local-first operation.

Responsibilities:

- patient and case metadata
- asset records for photos and meshes
- design snapshots and export manifests
- assistant-prepared and doctor-approved state tracking
- activity log for learning and accountability

### 3. Smile Planner

The smile planner turns photo-based planning into structured esthetic targets rather than directly into geometry.

Responsibilities:

- photo calibration
- facial midline and smile-line alignment
- tooth-frame targeting from premolar to premolar
- high-level controls such as width, length, curve, symmetry, and treatment selection

### 4. Variant Engine

The variant engine converts one smile plan into multiple additive-first esthetic directions.

Responsibilities:

- generate Conservative, Balanced, and Enhanced variants
- keep variants aligned to the same case and tooth map
- support selected-tooth regeneration
- support variant-wide refresh when clinically needed

### 5. 3D Design Engine

The design engine converts smile-plan targets into tooth and restoration meshes. This is the core product IP.

Responsibilities:

- arch orientation normalization
- tooth segmentation and numbering
- library-tooth fitting
- contralateral mirroring fallback
- parametric default tooth fallback
- veneer shell construction
- crown proposal construction
- additive feasibility scoring
- mesh validation and export

### 6. Review And Export Layer

The review layer exposes the generated geometry without becoming a full CAD editor in v1.

Responsibilities:

- before and after preview
- variant compare dashboard
- tooth selection and per-tooth status
- side inspector for limited adjustments
- export readiness confirmation

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
- workflow_state
- presentation_ready
- export_blocked
- prepared_by
- doctor_approved_by

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
- additive_bias

### Variant

- variant_id
- smile_plan_id
- label: conservative, balanced, enhanced
- intensity_profile_json
- selected_for_presentation
- selected_for_export

### ToothDesign

- tooth_design_id
- variant_id
- tooth_id
- treatment_type
- source_region_id
- proposal_source: library, contralateral, parametric
- transform_params_json
- morph_params_json
- restoration_params_json
- trust_state
- warning_state_json

### ExportPackage

- export_package_id
- variant_id
- output_asset_ids
- validation_report_json
- manifest_json

### EventLog

- event_id
- case_id
- actor_role
- event_type
- payload_json
- created_at

## Case State Machine

The case should move through explicit workflow states:

- Draft
- Imported
- Mapped
- Prepared
- Needs doctor review
- Doctor approved
- Exported

### State Entry Rules

- Draft -> Imported: required photos and one arch STL exist
- Imported -> Mapped: orientation and mapping are confirmed
- Mapped -> Prepared: at least one variant set exists
- Prepared -> Needs doctor review: doctor-owned decisions remain unresolved
- Prepared -> Doctor approved: doctor explicitly approves and no hard blocks remain
- Doctor approved -> Exported: final export validation passes

### Fallback Rules

- new input assets can move the case back to Imported
- mapping changes can invalidate variants and move the case back to Mapped
- major treatment changes can move the case back to Prepared
- validation failures can move the case back to Needs doctor review

The workflow state should describe progress. Trust flags should separately describe safety.

## Geometry Pipeline

### Stage 1: Input Normalization

- validate STL structure and units
- orient the arch into a canonical coordinate frame
- identify or confirm the premolar-to-premolar working span

### Stage 2: Tooth Mapping

- segment or semi-segment each tooth region in the working range
- assign tooth numbers
- allow correction when confidence is low

### Stage 3: Smile-Plan Target Extraction

- convert photo-planning choices into target values for tooth display, symmetry, width progression, height progression, and incisal curvature
- store these targets as structured plan data

### Stage 4: Variant Generation

- derive Conservative, Balanced, and Enhanced target sets from the same smile plan
- keep all variants additive-first
- preserve the doctor’s treatment map across variants unless explicitly changed

### Stage 5: Proposal Synthesis

Each tooth proposal should come from one of three sources:

- imported tooth library STL
- mirrored contralateral tooth
- parametric default tooth family

The system should fit and morph the proposal into the arch context while satisfying esthetic targets.

### Stage 6: Restoration Construction

For veneers:

- generate a facial shell over the scanned tooth region
- enforce thickness bounds
- preserve reasonable insertion and shell continuity

For crowns:

- generate a coronal proposal anchored to the scanned target region
- keep v1 planning-grade unless future prep-aware tooling is added

### Stage 7: Validation And Export

Before export, validate:

- watertight mesh
- self-intersections
- severe undercut risk
- minimum thickness constraints
- missing segmentation confidence

Then export:

- per-tooth STL
- combined STL set
- case summary manifest

## Hidden Trust Engine

The app should run a hidden decision layer that classifies every tooth and every export into three states:

- Ready
- Needs correction
- Blocked

The trust engine should evaluate:

- input confidence
- fit confidence
- additive feasibility
- material and manufacturing feasibility
- mesh integrity

The UI should not show raw scores by default. It should translate them into workflow behavior:

- weak teeth route to regenerate selected teeth
- persistent weak teeth unlock direct adjustment
- hard-risk conditions block export

The key rule is simple: the app never silently exports a tooth it would not defend in a review panel.

## Additive Suitability Rules

The app should combine geometry and material thresholds before it advises moving away from an additive plan.

Signals should include:

- overcontour
- facial displacement
- incisal extension
- emergence-profile plausibility
- minimum material thickness
- fragile zones
- export cleanliness

The user should see the consequence, not the raw score:

- additive approved
- additive risky
- additive not recommended

## Guided Controls For V1

The clinician-facing editing model should stay high-level:

- tooth include or exclude
- veneer versus crown selection
- global and per-tooth width and length bias
- midline shift
- incisal curve
- symmetry mode
- proposal source choice when auto-selection is weak
- regenerate selected teeth

The doctor-facing direct adjustment model should be limited to:

- width
- length
- facial fullness
- incisal edge
- treatment toggle
- apply to active variant only or sync to all variants

## Variant Compare Dashboard

The compare dashboard is the center of the product.

### Layout

- top header: case identity, workflow state, compact trust status
- main compare area: Current plus Conservative, Balanced, and Enhanced variants
- persistent tooth strip: premolar-to-premolar tooth chips with treatment and warning state
- side inspector: hidden until a tooth is selected

### Interaction Model

- assistant prepares the case and saves variants
- doctor opens directly into compare mode
- doctor selects an active variant
- doctor adjusts only flagged or disliked teeth
- trust checks re-run silently after each change
- export is allowed only when no hard blocks remain

The doctor should not leave compare mode for routine corrections.

## Assistant -> Doctor Handoff

The assistant-prepared workflow should end in a presentation-ready package:

- required assets imported
- orientation confirmed
- tooth mapping confirmed
- initial treatment map drafted
- three additive variants generated and saved

When the assistant marks the case ready, the app should save a handoff snapshot. The doctor should land directly in compare mode with only unresolved clinical decisions surfaced.

## Doctor Signature Profiles

The doctor should be able to save a Signature Profile that includes:

- preferred width-to-length tendency
- smile arc intensity
- central dominance
- embrasure softness
- incisal character
- additive-bias defaults
- default tooth-library preferences
- default variant spacing
- workflow defaults for common treatments

Clinical guardrails should remain system-owned and should not be user-configurable.

## Error Handling Strategy

The product should fail loudly and specifically when confidence is low or geometry is unsafe. Blocking states should include:

- invalid or non-manifold STL input
- arch orientation failure
- low-confidence tooth segmentation or numbering
- photo-to-scan mismatch too large for safe registration
- thickness or self-intersection failures on export
- additive-unsuitable geometry exceeding hard thresholds

Each blocking state should direct the user to a correction step. Generic failure modals should be avoided.

## Learning Loop

The system should log approval and correction behavior so future versions can improve:

- selected variant
- regenerated teeth
- direct adjustments
- successful proposal sources
- common export blocks
- assistant-prepared versus doctor-adjusted cases

The product may adapt esthetic priors and proposal ordering later, but it must never silently relax safety thresholds.

## Testing Strategy

Verification should focus on geometry, workflow determinism, and operational clarity:

- golden-case geometry fixtures for representative veneer and crown cases
- mesh validation tests for watertightness, self-intersections, and thickness rules
- segmentation and registration regression tests on a curated sample set
- state-machine tests for workflow transitions and invalidation rules
- desktop flow tests for assistant prep, doctor handoff, compare mode, correction, and export
- performance budgets for common case sizes on target Mac hardware

## Non-Negotiable Quality Bar

### Clinical Trust

- no invalid STL export
- no silent export of blocked teeth
- no stale variant surviving major upstream edits
- no hidden mapping changes after regeneration

### Chairside Speed

- fast case open
- quick variant generation
- local tooth regeneration without long waits
- routine corrections without leaving compare mode

### Decision Clarity

- obvious differences between variants
- obvious blocked or flagged teeth
- obvious path from compare to approval to export

## Killer Demo Flow

1. Open an assistant-prepared case.
2. Compare Current, Conservative, Balanced, and Enhanced variants.
3. Fix one problem tooth from the side inspector.
4. Surface one blocked condition and clear it.
5. Approve and export a planning-grade STL package.

The demo should prove trust first, speed second, and presentation third.

## Roadmap After MVP

### Phase 2

- technician collaboration
- comments and version compare
- better crown-generation constraints
- stronger library-tooth reuse and ranking

### Phase 3

- full manual tooth editing
- prep-margin editing
- antagonist and occlusion workflows
- cloud case sync and patient sharing
- CBCT fusion

## Open Risks

- reliable tooth segmentation on noisy real-world scans
- robust mapping between photo-derived targets and 3D tooth regions
- clinically plausible crown proposals without full CAD editing
- fast enough local generation on consumer Mac hardware
- preventing workflow sprawl while supporting both assistant and doctor use

## Recommendation

Build the product as a Tauri desktop app with a React workflow UI and a native geometry engine. Keep the smile plan, variant system, workflow state machine, and hidden trust engine as first-class concepts. Market the first release as a local, additive-first, consultation-to-STL planner for premolar-to-premolar veneers and crowns, not as a full definitive restorative CAD platform.
