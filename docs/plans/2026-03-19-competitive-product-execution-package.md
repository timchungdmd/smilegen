# SmileGen Competitive Product Execution Package

Date: 2026-03-19
Status: Proposed
Source plan: `docs/plans/2026-03-19-competitive-product-architecture-plan-v2.md`
Scope: `apps/desktop`
Horizon: 90 days

## 1. Intent

This package turns the V2 architecture plan into an execution-ready roadmap.

The core thesis is unchanged:

SmileGen should first become structurally capable as a case workspace, then become visually compelling, then become operationally strong for review, handoff, and collaboration.

This package is grounded in the current repo shape:

- workflow shell in [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)
- current stage contracts in [stageContracts.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/workflow/stageContracts.ts)
- compatibility facade in [useViewportStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useViewportStore.ts)
- current case persistence in [useCaseStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts) and [caseDb.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/services/caseDb.ts)
- current authoring surfaces in [SceneCanvas.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/viewer/SceneCanvas.tsx) and [PhotoOverlay.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/overlay/PhotoOverlay.tsx)
- current downstream surfaces in [ValidateView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ValidateView.tsx), [PresentView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/PresentView.tsx), and [ExportView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ExportView.tsx)

## 2. Delivery Strategy

The next 90 days should not optimize for maximum feature count. They should optimize for:

1. removing workflow ambiguity
2. making case state durable
3. converging the authoring model
4. producing one believable proposal path

That means the roadmap is deliberately front-loaded toward architecture and workflow convergence, not flashy collaboration or AI.

## 3. 90-Day Roadmap

### Days 1-30: Foundation and Workflow Truth

Primary outcome:
- one truthful workflow, one honest IA, one durable case artifact direction

Key deliverables:
- canonical workflow definition: `Case Setup -> Align -> Design -> Review -> Present -> Handoff`
- stage-contract rewrite
- `Present` and `Collaborate` separated at the product-model level
- artifact schema defined for assets, alignment, design revisions, review events, presentation snapshots, and handoff packages
- migration plan for retiring [useViewportStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useViewportStore.ts)

Repo focus:
- [stageContracts.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/workflow/stageContracts.ts)
- [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)
- [Sidebar.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Sidebar.tsx)
- [useNavigationStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useNavigationStore.ts)
- [useCaseStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts)
- [caseDb.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/services/caseDb.ts)

### Days 31-60: Unified Authoring and Proposal Backbone

Primary outcome:
- one coherent authoring workspace and one believable proposal path

Key deliverables:
- explicit alignment completion state and confidence model
- shared case scene model between photo overlay and 3D preview
- authoring-surface convergence plan executed far enough to remove the biggest split-brain behavior
- versioned proposal snapshots
- first real before/after composition pipeline

Repo focus:
- [SceneCanvas.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/viewer/SceneCanvas.tsx)
- [PhotoOverlay.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/overlay/PhotoOverlay.tsx)
- [photoAlignment.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/alignment/photoAlignment.ts)
- [useAlignmentStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useAlignmentStore.ts)
- [PresentView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/PresentView.tsx)

### Days 61-90: Review and Handoff Rigor

Primary outcome:
- SmileGen becomes operationally credible, not only visually promising

Key deliverables:
- structured review states and auditable review events
- stronger diagnostic and approval gates
- handoff package schema and lab-oriented export path
- reproducible presentation and export artifacts tied to case revisions

Repo focus:
- [ValidateView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ValidateView.tsx)
- [ExportView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ExportView.tsx)
- [reportGenerator.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/export/reportGenerator.ts)
- [casePackager.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/collaboration/casePackager.ts)
- [caseDb.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/services/caseDb.ts)

## 4. Milestones

### Milestone M1: Workflow Truth Locked

Definition:
- the runtime IA, stage contracts, and CTA behavior all describe the same workflow

Exit criteria:
- no stage label implies behavior the product does not support
- alignment has an explicit place in the workflow
- `Present` is no longer doubling as `Collaborate`
- primary workflow blockers are enforced from real business state rather than only file presence

### Milestone M2: Durable Case Artifact Platform

Definition:
- the case persists meaningful work, not just fragments of UI state

Exit criteria:
- cases persist source assets, alignment state, design revisions, and at least one downstream artifact class
- save/load round-trips preserve user work at a product level
- `.smilegen` export is artifact-inclusive and reproducible

### Milestone M3: Unified Authoring Workspace

Definition:
- photo and 3D authoring are two synchronized views over one model

Exit criteria:
- alignment completion and confidence are visible
- users can move from setup to design without hidden mode mismatches
- the biggest design/workspace split-brain behaviors are removed

### Milestone M4: Believable Proposal and Operational Review

Definition:
- SmileGen can generate a proposal worth presenting and a review worth approving

Exit criteria:
- `Present` uses differentiated outputs
- review is structured and auditable
- export/handoff outputs are tied to case revisions

## 5. Epics With Acceptance Criteria

### Epic 1: Workflow Truth and IA Convergence

Goal:
- make the shipped application tell the truth about its workflow

Current pain:
- [stageContracts.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/workflow/stageContracts.ts) only models `import/design/review/present`
- [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx) still mounts the compressed shell
- `Collaborate` is not a true first-class stage today

Acceptance criteria:
- a single canonical workflow is documented and enforced in code
- sidebar labels, blocker screens, and CTA copy match the canonical workflow
- alignment is represented as required readiness before design completion
- `Present` and `Collaborate` no longer share one semantic bucket

### Epic 2: Case Artifact and Persistence Model

Goal:
- turn the case into the primary durable unit of work

Current pain:
- [useCaseStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts) and [caseDb.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/services/caseDb.ts) persist plan/design and a few settings, not the full lifecycle

Acceptance criteria:
- source assets, alignment state, design revisions, and downstream artifacts have explicit schemas
- save/load recreates a meaningful workspace state
- the case package contains real artifacts, not mostly metadata
- artifact provenance is traceable to a case revision

### Epic 3: Authoring Workspace Convergence

Goal:
- make SmileGen feel like one design system, not a shell plus legacy viewport concepts

Current pain:
- [SceneCanvas.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/viewer/SceneCanvas.tsx) and [PhotoOverlay.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/overlay/PhotoOverlay.tsx) are each too monolithic
- [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx) and [DesignViewport.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/design/DesignViewport.tsx) show architectural overlap

Acceptance criteria:
- one dominant authoring path exists for setup and design
- alignment is visible as a sub-workflow with completion and confidence
- scene-level state is shared across photo and 3D views
- major viewer/overlay responsibilities are split into clearer modules

### Epic 4: Proposal System

Goal:
- produce outputs that are worth presenting to a patient

Current pain:
- [PresentView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/PresentView.tsx) is scaffold-grade and currently reuses the same photo source for before and after

Acceptance criteria:
- before and after are materially differentiated artifacts
- proposal snapshots are versioned and recoverable
- presentation outputs can be reproduced from saved case state
- proposal confidence and limitations are visible to the operator

### Epic 5: Review and Approval Rigor

Goal:
- move from notes and booleans to structured review

Current pain:
- [ValidateView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ValidateView.tsx) is scaffold-grade
- approval is too close to a single boolean in current state handling

Acceptance criteria:
- review has explicit states such as draft, in review, changes requested, approved
- review events and comments are persisted
- approvals require structured evidence, not just a toggle
- review outputs are tied to case revisions

### Epic 6: Handoff and Packaging

Goal:
- make the output transferable, inspectable, and trustworthy

Current pain:
- [ExportView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ExportView.tsx) and [casePackager.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/collaboration/casePackager.ts) are still prototype-grade

Acceptance criteria:
- export packages carry revisioned artifacts and manifest metadata
- lab-oriented package presets exist
- preview and manufacturing outputs are explicitly distinguished
- handoff confidence is visible before export

## 6. First Implementation Slice Recommendation

Recommended first slice:

### Slice A: Workflow Truth + Artifact Schema

Why this slice first:
- it reduces the most downstream risk
- it unblocks every later epic
- it addresses the most severe current architectural inconsistency

Scope:
- rewrite stage contracts around the canonical workflow
- separate `Present` and `Collaborate` semantics
- define the case artifact schema in documentation and code-facing types
- document the migration away from [useViewportStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useViewportStore.ts)

Files most likely involved first:
- [stageContracts.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/workflow/stageContracts.ts)
- [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)
- [Sidebar.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Sidebar.tsx)
- [useNavigationStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useNavigationStore.ts)
- [useCaseStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts)
- [caseDb.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/services/caseDb.ts)
- [apps/desktop/src/features/cases/types.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/cases/types.ts)

Definition of done for Slice A:
- workflow labels and gating are internally consistent
- the case data model has named artifact classes
- there is a documented migration plan for compatibility-facade removal
- downstream work can target a stable workflow and artifact vocabulary

## 7. Major Risks and Sequencing Constraints

### Risk 1: Shipping more UI before fixing workflow truth

Why it matters:
- every new screen or CTA can deepen the mismatch between IA and domain model

Constraint:
- do not expand top-level workflow surfaces until Milestone M1 is complete

### Risk 2: Persistence redesign without migration discipline

Why it matters:
- case save/load is already live behavior; schema changes can strand user data or create silent partial restores

Constraint:
- define artifact schema and migration strategy before widening persistence scope

### Risk 3: Viewer refactors without a shared scene contract

Why it matters:
- splitting [SceneCanvas.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/viewer/SceneCanvas.tsx) and [PhotoOverlay.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/overlay/PhotoOverlay.tsx) too early can create more divergence if the scene model is not defined first

Constraint:
- define the canonical authoring scene before major viewer decomposition

### Risk 4: Proposal realism without provenance

Why it matters:
- impressive outputs that are not traceable to saved case state will weaken trust and complicate review/handoff

Constraint:
- proposal snapshotting must be coupled to artifact versioning

### Risk 5: Collaboration too early

Why it matters:
- collaboration on weak artifacts multiplies confusion rather than value

Constraint:
- defer asynchronous sharing and external review workflows until Milestone M3 is complete

## 8. Proposed Document Set

To support execution, these docs should exist as the next layer under `docs/plans/` or `docs/project/`:

1. `docs/project/workflow-contract.md`
Defines canonical stages, readiness, completion, and blocker behavior.

2. `docs/project/case-artifact-model.md`
Defines case entities, artifact types, revision semantics, and provenance.

3. `docs/project/authoring-scene-model.md`
Defines shared state between photo overlay, 3D viewer, alignment, and presentation rendering.

4. `docs/project/presentation-and-handoff-model.md`
Defines proposal snapshot, review artifact, manufacturing package, and export semantics.

5. `docs/plans/YYYY-MM-DD-workflow-truth-and-artifact-schema-implementation.md`
The concrete implementation plan for Slice A.

## 9. Execution Recommendation

Start with Slice A immediately.

Do not begin with:
- collaboration features
- AI assistants
- advanced simulation polish
- more navigation surfaces

Begin with:
- workflow truth
- artifact schema
- persistence direction
- compatibility-facade retirement planning

That is the shortest path to a SmileGen that can realistically grow into something comparable to SmileFy, SmileCloud, and exocad rather than only resembling them at the UI layer.
