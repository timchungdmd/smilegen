# SmileGen Competitive Product Architecture Plan

Date: 2026-03-19
Status: Proposed
Scope: Desktop app in `apps/desktop`
Positioning assumption: clinic-first smile design workstation with collaboration-capable extension path

## 1. Executive Summary

SmileGen already contains the beginnings of a credible smile design workstation:

- local-first case persistence
- photo import and photo-overlay editing
- 3D arch scan import and rendering
- landmark-based alignment
- variant generation
- tooth-level editing
- basic esthetic metrics
- basic export and presentation

But the current product is still a prototype-grade composition of good subsystems rather than a commercially coherent smile design platform.

Relative to SmileFy, SmileCloud, and exocad Smile Creator, SmileGen is strongest in:

- local desktop responsiveness
- editable 3D preview pipeline
- explicit workflow shell
- direct code-level extensibility

It is weakest in:

- believable chairside simulation quality
- advanced 2D/3D planning depth
- realistic presentation outputs
- collaboration and review system maturity
- manufacturing and CAD handoff fidelity
- automation sophistication

The main strategic conclusion is:

SmileGen should not try to compete as "just another smile simulation UI". To be comparable, it needs a deliberate product stack:

1. fast proposal creation
2. clinically reliable 2D/3D planning
3. structured review and presentation
4. production-grade handoff
5. optional collaboration and AI acceleration

## 2. External Reference Model

This section summarizes the market bar from current public sources.

### SmileFy

Observed strengths:

- aggressive chairside speed and same-day mockup positioning
- AI-assisted 3D smile design workflow
- direct print-ready export framing
- scanner ecosystem connectivity, including 3Shape TRIOS integration

Implication for SmileGen:

- SmileGen needs a much stronger "case to believable proposal to printable output" story, especially in the first 10 minutes of use.

Sources:

- SmileFy 3D workflow: https://smilefy.com/3d-digital-workflow/
- SmileFy TRIOS connection: https://smilefy.com/introducing-3shape-trios-connection-with-smilefy/

### SmileCloud

Observed strengths:

- case-centric workflow framing
- structured transition from quick smile design into deeper planning
- patient-facing presentation and video simulation
- collaboration surfaces like Blueprint and Passport

Implication for SmileGen:

- SmileGen needs stronger case orchestration, review, patient communication, and asynchronous artifact handling, not only better design controls.

Sources:

- Blueprint: https://learn.smilecloud.com/en/article/what-is-blueprint
- Video simulation: https://learn.smilecloud.com/en/article/video-simulation-step-by-step
- Passport: https://learn.smilecloud.com/en/article/what-is-smilecloud-passport

### exocad Smile Creator

Observed strengths:

- integrated 2D/3D planning inside a production CAD environment
- photo-to-3D registration
- prosthetic feasibility emphasis
- library-backed anatomy editing and downstream CAD continuity

Implication for SmileGen:

- SmileGen needs a more rigorous bridge from visual smile design to restoration-feasible geometry and manufacturing handoff.

Sources:

- Smile Creator: https://shop.exocad.com/us_en/smile-design.html
- ChairsideCAD overview: https://exocad.com/de/unsere-produkte/chairsidecad

## 3. Repo-Based Capability Inventory

### 3.1 Photo Workflows

Current support:

- photo upload and local asset management in `useImportStore` and `ImportPanel`
- photo overlay editing surface in `PhotoOverlay`
- overlay guides and alignment marker systems in `useOverlayStore` and overlay components
- landmark-based photo/scan alignment in `useAlignmentStore`, `PhotoOverlay`, and `photoAlignment`
- photo-driven presentation before/after slider scaffolding in `PresentView` and `PresentationMode`

Evidence:

- `apps/desktop/src/store/useImportStore.ts`
- `apps/desktop/src/features/views/ImportPanel.tsx`
- `apps/desktop/src/features/overlay/PhotoOverlay.tsx`
- `apps/desktop/src/store/useAlignmentStore.ts`
- `apps/desktop/src/features/alignment/photoAlignment.ts`
- `apps/desktop/src/features/views/PresentView.tsx`

Missing or weak:

- no calibrated photo capture workflow or image quality scoring
- no multi-photo synchronized design workflow
- no clinically convincing rendered "after" generation pipeline
- no photo segmentation/compositing pipeline beyond basic landmark service hooks
- no artifact timeline of photo revisions or snapshots

### 3.2 3D Scan Workflows

Current support:

- STL/OBJ/PLY parsing and import
- persistent 3D preview
- camera presets, controls, framing, and scan picking
- active-variant overlay on top of scan
- landmark placement on scan for alignment

Evidence:

- `apps/desktop/src/features/import/meshParser.ts`
- `apps/desktop/src/features/import/stlParser.ts`
- `apps/desktop/src/features/viewer/SceneCanvas.tsx`
- `apps/desktop/src/features/viewer/movement/*`

Missing or weak:

- no true 2D/3D registration pipeline with confidence scoring
- no occlusion-aware mixed photo/scan composition
- no prep-aware scan workflow
- no sectional analysis, cross-sections, or distance heatmaps
- no full upper/lower occlusion workflow
- no bite/jaw relation modeling

### 3.3 Diagnostic Analysis

Current support:

- simple smile metrics based on tooth width/height and symmetry
- facial landmark detection service hook
- trust/readiness summary at variant level

Evidence:

- `apps/desktop/src/features/analysis/smileMetrics.ts`
- `apps/desktop/src/features/analysis/SmileMetricsPanel.tsx`
- `apps/desktop/src/services/visionClient.ts`
- `apps/desktop/src/features/trust/trustEngine.ts`

Missing or weak:

- no integrated facial analysis workspace
- no incisal edge, gingival zenith, cant, or lip-dynamics diagnostics
- no cephalometric or CBCT-aware analysis
- no treatment-driven clinical measurements tied to approval rules
- no diagnostic confidence model that flows into review and export gates

### 3.4 Tooth Libraries and Design Engine

Current support:

- bundled morphology collections with dimensional metadata
- per-tooth dimension editing
- arch-form editing
- multi-variant generation
- use of uploaded tooth meshes and library collections

Evidence:

- `apps/desktop/src/features/library/bundledLibrary.ts`
- `apps/desktop/src/features/library/LibraryPanel.tsx`
- `apps/desktop/src/features/engine/designEngine.ts`
- `apps/desktop/src/features/alignment/ArchFormEditor.tsx`
- `apps/desktop/src/store/useDesignStore.ts`

Missing or weak:

- library breadth is small and metadata-only by market standards
- no premium anatomy families, age/gender/material presets, or brand-aware libraries
- no sculpting-grade tooth surface editing
- no contact, embrasure, or emergence-profile logic beyond simple geometry
- no restorative feasibility engine

### 3.5 Proposal, Review, and Presentation

Current support:

- review stage with comparisons, measurements, notes, and approvals scaffold
- patient presentation mode
- image export and HTML report export
- variant strip and treatment summary

Evidence:

- `apps/desktop/src/features/views/ValidateView.tsx`
- `apps/desktop/src/features/views/PresentView.tsx`
- `apps/desktop/src/features/present/PresentationMode.tsx`
- `apps/desktop/src/features/export/reportGenerator.ts`

Missing or weak:

- presentation currently reuses the same source photo for before and after
- no photorealistic rendering pipeline
- no storyboard/video generation comparable to SmileCloud
- no patient consent, acceptance, or proposal-signoff workflow
- no doctor-facing formal review package with clinically structured findings

### 3.6 Case Management

Current support:

- local case CRUD using IndexedDB
- auto-save
- case list and open/delete workflows
- workflow state transitions

Evidence:

- `apps/desktop/src/store/useCaseStore.ts`
- `apps/desktop/src/services/caseDb.ts`
- `apps/desktop/src/store/autoSave.ts`
- `apps/desktop/src/features/views/CaseListView.tsx`
- `apps/desktop/src/features/workflow/workflowState.ts`

Missing or weak:

- no patient demographics, appointment context, or metadata richness
- no case artifact timeline
- no version graph or milestone snapshots
- no audit trail for decisions and approvals
- no role model or multi-user ownership

### 3.7 Export and Manufacturing Handoff

Current support:

- STL and OBJ export
- binary STL serialization
- `.smilegen` package export
- crown and veneer synthesis service hooks

Evidence:

- `apps/desktop/src/features/export/exportService.ts`
- `apps/desktop/src/features/export/binaryStl.ts`
- `apps/desktop/src/features/collaboration/casePackager.ts`
- `apps/desktop/src/services/meshSynthesisClient.ts`
- `apps/desktop/src/features/views/ExportView.tsx`

Missing or weak:

- no robust manufacturing handoff contract
- no CAD partner workflow, margin validation, or lab prescription package
- `.smilegen` package is metadata-oriented rather than production-grade binary packaging
- synthesis is service-wired but not integrated into a clinical decision flow
- no true wax-up / mockup / shell manufacturing pipeline orchestration

### 3.8 Collaboration

Current support:

- annotation types exist
- audience-framed collaboration shell exists
- package export supports a local share concept

Evidence:

- `apps/desktop/src/features/collaboration/annotationTypes.ts`
- `apps/desktop/src/features/views/CollaborateView.tsx`
- `apps/desktop/src/features/collaboration/casePackager.ts`

Missing or weak:

- no real shared comments system
- no cloud sync or shared workspaces
- no tasking, mentions, review requests, or threaded discussion
- no patient portal or secure share link mechanism

### 3.9 Automation and AI

Current support:

- facial landmark detection service integration
- generated variants from rule-driven engine
- mesh synthesis service integration

Evidence:

- `apps/desktop/src/services/visionClient.ts`
- `apps/desktop/src/features/engine/designEngine.ts`
- `apps/desktop/src/services/meshSynthesisClient.ts`

Missing or weak:

- no AI-assisted case setup agent
- no automated design critique or recommendation engine
- no simulation renderer
- no approval assistant
- no automated presentation/story generation

## 4. Architectural Assessment

### Strengths

- Good local-first foundation using Zustand plus IndexedDB
- Clear separation between import, design, review, and present routes
- Useful viewer foundation with React Three Fiber
- Several subsystems already have tests
- New landmark alignment system is simpler than the removed wizard approach

### Core Architectural Problems

#### 1. Product state is fragmented across many peer stores

The app has multiple useful stores, but there is no strong domain aggregate for a case workspace. Cross-store orchestration is manual and brittle.

Evidence:

- `apps/desktop/src/store/useDesignStore.ts`
- `apps/desktop/src/store/useImportStore.ts`
- `apps/desktop/src/store/useCaseStore.ts`
- `apps/desktop/src/store/useViewportStore.ts`

#### 2. Workflow shell is ahead of the domain model

The UI now expresses a cleaner workflow than the underlying persisted case model can actually support. The route system feels more mature than the artifact/version/review data model.

Evidence:

- `apps/desktop/src/features/layout/Workspace.tsx`
- `apps/desktop/src/features/workflow/stageContracts.ts`
- `apps/desktop/src/features/cases/types.ts`

#### 3. There is still prototype-grade overlap and legacy surface area

The codebase contains both current-stage workflow surfaces and legacy compatibility layers. This increases cognitive load and slows architectural convergence.

Evidence:

- `apps/desktop/src/store/useNavigationStore.ts`
- `apps/desktop/src/features/views/PlanView.tsx`
- `apps/desktop/src/features/views/ImportView.tsx`
- `apps/desktop/src/features/preview/DesignPreviewPanel.tsx`

#### 4. Output realism is not yet tied to geometry and photo composition

The product can manipulate geometry and show photos, but it does not yet have a serious simulation compositor or presentation renderer. That is a core competitive gap, not polish.

Evidence:

- `apps/desktop/src/features/views/PresentView.tsx`
- `apps/desktop/src/features/present/PresentationMode.tsx`
- `apps/desktop/src/services/visionClient.ts`

## 5. Strategic Direction

Recommended direction:

Build SmileGen as a clinic-first design workstation with a staged maturity model:

### Phase A: Chairside Proposal Engine

Goal:

- produce a believable, fast, patient-facing proposal from photo + scan with minimal setup

Why:

- this is the fastest path to visible product value and the closest competitive opening against SmileFy and SmileCloud

### Phase B: Clinical Planning Workspace

Goal:

- turn the proposal into a reviewable, editable, clinically reliable 2D/3D plan

Why:

- this is where SmileGen can outperform lighter web tools through desktop depth and local responsiveness

### Phase C: Production and Collaboration Layer

Goal:

- connect the design artifact to doctor approval, lab handoff, and external sharing

Why:

- without this, the app remains a demo tool instead of an operational product

## 6. Target Architecture

### 6.1 Domain Model

Introduce a stronger case workspace aggregate:

- `CaseWorkspace`
- `CaseAssets`
- `AlignmentSession`
- `DesignSession`
- `ReviewSession`
- `PresentationArtifact`
- `ManufacturingPackage`

Practical effect:

- stores can still be Zustand-based, but they should map to domain slices with explicit ownership and event flow rather than ad hoc cross-calls.

### 6.2 Rendering Stack

Separate three concerns clearly:

- geometric design scene
- photo composition scene
- presentation render pipeline

Today these are partially mixed across `SceneCanvas`, `PhotoOverlay`, and presentation components. They should share data, not implementation.

### 6.3 Artifact and Versioning Layer

Add first-class entities for:

- source assets
- generated variants
- approved design snapshot
- patient presentation snapshot
- manufacturing export package

This is required for review, auditability, and collaboration.

### 6.4 Service Boundary

Formalize external services into a real application service layer:

- vision service
- mesh synthesis service
- future simulation render service
- future collaboration/sync service

Current service hooks exist, but they are narrow wrappers rather than part of a product architecture.

## 7. Improvement Plan

### Track 1: Product Cohesion

1. Collapse remaining legacy route and compatibility surfaces.
2. Make `Import -> Design -> Review -> Present` the only primary workflow.
3. Add first-class case milestones and artifact history.

### Track 2: Proposal Quality

1. Build a real before/after compositor.
2. Add photo quality checks and guided capture readiness.
3. Improve 2D/3D registration confidence and error feedback.
4. Add patient-ready snapshots and named proposal versions.

### Track 3: Clinical Planning

1. Expand diagnostic measurements beyond current smile metrics.
2. Add sectional 3D inspection tools and restorative feasibility checks.
3. Deepen library strategy with richer anatomy families and selection logic.
4. Add design constraints that prevent visually nice but clinically weak outputs.

### Track 4: Review and Presentation

1. Replace scaffold review notes with a real review model.
2. Build approval states tied to evidence and measurements.
3. Add patient presentation templates, doctor summary templates, and export presets.
4. Add video or animated proposal generation after still-image quality is strong.

### Track 5: Manufacturing and Collaboration

1. Upgrade package export to include binary assets and reproducible manifests.
2. Add lab-oriented handoff packages and prescription metadata.
3. Introduce asynchronous share workflows only after artifact integrity is strong.

## 8. Phased Roadmap

### Phase 1: Product Core Stabilization

Outcome:

- one workflow
- one case model
- no major legacy ambiguity

Key work:

- remove/retire overlapping legacy views
- introduce artifact/version model
- tighten stage contracts to real business state

### Phase 2: Believable Proposal System

Outcome:

- fast proposal that users can actually present

Key work:

- upgraded photo compositor
- alignment quality UX
- proposal snapshots
- patient-safe presentation assets

### Phase 3: Clinical Planning Depth

Outcome:

- product becomes defensible against lightweight smile-design competitors

Key work:

- advanced analysis
- better libraries
- richer per-tooth planning logic
- design constraints and review rules

### Phase 4: Production Handoff

Outcome:

- design is transferable, inspectable, and manufacturable

Key work:

- manufacturing package model
- lab exports
- synthesis workflow integration
- approval-to-export gate hardening

### Phase 5: Collaboration and AI Acceleration

Outcome:

- system scales beyond single-operator local use

Key work:

- shared review model
- secure sharing
- patient portal concepts
- AI planning assistants

## 9. Gap Matrix

| Capability Area | Current State | Competitive Level | Gap |
| --- | --- | --- | --- |
| Photo workflow | Good prototype | Strong commercial | High |
| 3D scan workflow | Good prototype | Advanced planning tool | High |
| Alignment | Promising | Needs confidence and quality tooling | Medium |
| Diagnostic analysis | Basic | Clinical-grade | High |
| Tooth libraries | Basic | Premium curated system | High |
| Design editing | Functional | Needs restorative intelligence | High |
| Review workflow | Scaffolded | Structured and auditable | High |
| Presentation | Scaffolded | Patient-convincing | High |
| Case management | Basic local | Operational product | Medium |
| Export/handoff | Functional prototype | Production-grade | High |
| Collaboration | Minimal | Major market differentiator | High |
| AI/automation | Early hooks | Strategic differentiator | High |

## 10. Recommended Next Build Order

If only one roadmap is funded, build in this order:

1. proposal realism and artifact versioning
2. stronger diagnostics and design constraints
3. production handoff packages
4. collaboration and patient communication

Reason:

- this order maximizes commercial usefulness while keeping the architecture aligned with how cases actually progress.

