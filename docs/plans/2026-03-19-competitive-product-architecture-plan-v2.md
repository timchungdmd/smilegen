# SmileGen Competitive Product Architecture Plan V2

Date: 2026-03-19
Status: Revised after self-critique
Scope: Desktop app in `apps/desktop`
Positioning assumption: clinic-first smile design workstation with review, handoff, and later collaboration

## 1. Why V1 Needed Revision

The original plan was directionally correct, but it had five problems:

1. It was too broad.
It described the right destination, but not the hard decisions needed first.

2. It was too tolerant of the current workflow shell.
The repo already shows that the shipped runtime, the intended IA, and the persisted case model are out of sync. V1 did not force that issue early enough.

3. It mixed foundational work with differentiators.
Proposal realism, collaboration, AI, and production handoff were all present, but the plan did not make the dependency chain explicit enough.

4. It did not define anti-goals.
Without explicit non-goals, the team could keep shipping isolated “cool” features while the case model remains weak.

5. It did not define the first irreversible product choice.
SmileGen cannot simultaneously behave like a lightweight 4-stage local tool and a serious case platform. It has to choose the case platform path now.

## 2. Revised Strategic Thesis

SmileGen should not try to “look comparable” first. It should become structurally capable first.

The product should be built in this order:

1. truthful workflow
2. durable case and artifact model
3. unified authoring scene
4. believable proposal outputs
5. review and handoff rigor
6. collaboration and AI acceleration

This is the key revision from V1:

Proposal quality is important, but proposal quality without a strong artifact pipeline will create impressive demos and weak clinical operations.

## 3. Hard Product Decisions

These decisions should be locked before major implementation work continues.

### Decision A: Product shape

Adopt this canonical workflow:

- `Case Setup`
- `Align`
- `Design`
- `Review`
- `Present`
- `Handoff`

Implication:
- alignment is no longer a design-side utility toggle
- presentation and collaboration are no longer conflated
- import is no longer considered complete just because files exist

### Decision B: Primary system identity

SmileGen is a case workspace, not a collection of panels.

Implication:
- runtime navigation, persistence, and workflow contracts must all describe the same journey
- the app cannot keep both “legacy compressed shell” semantics and “future case-first platform” semantics

### Decision C: Collaboration timing

Collaboration is a Phase 4+ capability, not a foundation capability.

Implication:
- do not spend early cycles on cloud sharing, guest access, or team comments until case artifacts, presentation snapshots, and handoff packages are real

### Decision D: Rendering truth

The system must distinguish:

- edit scene
- review scene
- presentation render
- manufacturing artifact

Implication:
- stop letting preview geometry and production geometry blur together
- every downstream output needs explicit provenance

## 4. V2 Assessment

### What is already strong

- Persistent right-side 3D context in [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)
- Promising local-first asset handling in [useImportStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useImportStore.ts)
- Viable variant-generation and editing foundation in [useDesignStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useDesignStore.ts) and [designEngine.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/engine/designEngine.ts)
- Improved landmark alignment foundation in [useAlignmentStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useAlignmentStore.ts) and [photoAlignment.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/alignment/photoAlignment.ts)

### What is most structurally wrong

1. Workflow truth is broken.
The intended IA, shipped routes, and stage contracts are inconsistent. See [stageContracts.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/workflow/stageContracts.ts), [Sidebar.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Sidebar.tsx), and [useNavigationStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useNavigationStore.ts).

2. The case model is too thin.
Cases do not yet own the full lifecycle of assets, alignment, review, presentation, and handoff. See [caseDb.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/services/caseDb.ts) and [useCaseStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts).

3. The design workspace is conceptually split.
The app has both a workflow shell and a more traditional design viewport model, but they are not fully converged. See [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx) and [DesignViewport.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/design/DesignViewport.tsx).

4. Review/present/handoff are still mostly representational.
They exist in the product map, but not yet in operational depth. See [ValidateView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ValidateView.tsx), [PresentView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/PresentView.tsx), and [ExportView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ExportView.tsx).

5. Too much orchestration still lives inside stores and monolith components.
See [useViewportStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useViewportStore.ts), [useDesignStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useDesignStore.ts), [SceneCanvas.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/viewer/SceneCanvas.tsx), and [PhotoOverlay.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/overlay/PhotoOverlay.tsx).

## 5. Revised Target Architecture

### 5.1 Core domain objects

- `CaseWorkspace`
- `CaseAsset`
- `AlignmentSession`
- `DesignRevision`
- `ReviewSession`
- `PresentationSnapshot`
- `ManufacturingPackage`

### 5.2 Ownership rule

UI stores should hold interaction state.
Application services should perform workflow operations.
Persistence should store durable artifacts and revision history.

This means:
- less orchestration inside Zustand stores
- more explicit use-case functions such as `completeAlignment`, `generateProposal`, `approveReview`, `buildHandoffPackage`

### 5.3 Canonical scene model

There should be one shared smile scene with:

- photo-space projection
- 3D scan-space geometry
- design teeth and library instances
- landmark and guide overlays
- calibration/alignment solution

The current overlay/viewer pair should become two views over one model, not two interacting systems.

### 5.4 Artifact model

Each case should persist:

- source assets
- derived analysis
- alignment state and solve confidence
- design revisions
- review annotations and approval events
- presentation outputs
- export and handoff outputs

## 6. Anti-Goals

Do not do these before the foundation is in place:

1. Do not add cloud collaboration first.
2. Do not add AI “assistants” before the system has durable artifact semantics.
3. Do not add more surface-level tabs without fixing workflow truth.
4. Do not ship photorealistic presentation claims if before/after provenance is weak.
5. Do not add manufacturing promises without separating preview and production geometry.

## 7. Revised Roadmap

### Phase 0: Workflow Truth

Goal:
- make runtime IA, navigation, and stage contracts tell the truth

Key work:
- choose the canonical workflow: `Case Setup -> Align -> Design -> Review -> Present -> Handoff`
- stop aliasing `Collaborate` into `Present`
- update stage contracts so design requires actual case readiness, not only a photo
- remove or retire misleading legacy route semantics

Success criteria:
- every primary stage has a single meaning
- no major CTA routes into a partially fake stage
- stage readiness matches product intent

### Phase 1: Case Artifact Platform

Goal:
- make the case durable

Key work:
- redesign case persistence around artifact records
- save assets, alignment, design revisions, review events, presentation snapshots, and handoff packages
- make `.smilegen` a real reproducible bundle, not mostly metadata

Success criteria:
- full case reload restores meaningful work state
- review and presentation outputs are reproducible
- exported packages can recreate a case with artifacts intact

### Phase 2: Unified Authoring Workspace

Goal:
- make SmileGen a coherent design instrument

Key work:
- converge workspace and design viewport models
- split `SceneCanvas` into core scene, camera, interaction, and overlays
- split `PhotoOverlay` into viewport, guides, projection, and landmarks
- promote alignment to an explicit sub-workflow with completion and confidence

Success criteria:
- one dominant design workspace
- one calibration/alignment model
- clear operator path from setup to editable design

### Phase 3: Believable Proposal System

Goal:
- produce patient-presentable outputs that are materially more convincing than today

Key work:
- real before/after compositor
- proposal versioning and snapshots
- better intake QA and alignment quality feedback
- patient-safe presentation templates

Success criteria:
- `Present` uses real differentiated outputs
- proposal artifacts are versioned and reproducible
- operator can explain confidence and limitations

### Phase 4: Review and Handoff Rigor

Goal:
- turn the app into an operational clinical tool

Key work:
- structured review states instead of boolean approval
- richer diagnostics and evidence-backed approval gates
- manufacturing package schema
- lab prescription and export presets

Success criteria:
- review is auditable
- handoff is structured
- export confidence is explicit

### Phase 5: Collaboration and AI

Goal:
- scale the stronger core

Key work:
- asynchronous review and comments
- audience-specific sharing
- AI-assisted setup and critique
- patient portal/share workflows

Success criteria:
- collaboration builds on stable artifacts
- AI acts on structured case state, not loose UI state

## 8. Revised Build Order

If only one sequence is funded, use this:

1. workflow truth
2. case artifact platform
3. unified authoring workspace
4. believable proposal system
5. review and handoff rigor
6. collaboration and AI

This is the central correction from V1.
V1 placed proposal realism too early relative to workflow and persistence. V2 makes the dependency order explicit.

## 9. Immediate Next Slice

The best next implementation slice is not “better simulation.”

It is:

1. rewrite the workflow contract
2. separate `Present` from `Collaborate`
3. define the case artifact schema
4. retire the `useViewportStore` compatibility path as a planned migration

That slice reduces the most downstream risk per unit of work.
