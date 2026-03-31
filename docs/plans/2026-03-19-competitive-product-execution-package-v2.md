# SmileGen Competitive Product Execution Package V2

Date: 2026-03-19
Status: Proposed
Plan basis: `2026-03-19-competitive-product-architecture-plan-v2.md`
Scope: `apps/desktop`

## 1. Objective

Turn the V2 architecture direction into an executable 90-day package with:

- milestone order
- epics
- acceptance criteria
- sequencing constraints
- first implementation slice

This package assumes the product direction is now fixed:

`Case Setup -> Align -> Design -> Review -> Present -> Handoff`

## 2. 90-Day Roadmap

### Days 1-21: Milestone 1, Workflow Truth

Outcome:
- the shipped runtime IA, stage contracts, and navigation all describe the same workflow

Primary epics:
- Epic 1: Canonical workflow and navigation cleanup
- Epic 2: Stage contract rewrite
- Epic 3: Present vs Handoff separation

### Days 22-45: Milestone 2, Case Artifact Platform

Outcome:
- cases become durable workspaces with recoverable artifacts, not only plan/design snapshots

Primary epics:
- Epic 4: Case artifact schema
- Epic 5: Persistence layer expansion
- Epic 6: Portable `.smilegen` package redesign

### Days 46-70: Milestone 3, Unified Authoring Workspace

Outcome:
- one coherent setup/alignment/design workspace with explicit readiness and confidence

Primary epics:
- Epic 7: Alignment as first-class workflow
- Epic 8: Workspace convergence
- Epic 9: Viewer and overlay decomposition

### Days 71-90: Milestone 4, Believable Proposal Baseline

Outcome:
- patient presentation uses real differentiated proposal artifacts and reproducible snapshots

Primary epics:
- Epic 10: Proposal snapshot pipeline
- Epic 11: Before/after compositor baseline
- Epic 12: Presentation state and provenance

## 3. Milestones

### Milestone 1: Workflow Truth

Definition:
- one canonical workflow in navigation, sidebar, stage contracts, and CTA behavior

Done when:
- no route aliases silently collapse distinct jobs like `collaborate -> present`
- stage readiness reflects actual product intent
- runtime labels, docs, and button copy agree

Repo anchors:
- [useNavigationStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useNavigationStore.ts)
- [Sidebar.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Sidebar.tsx)
- [stageContracts.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/workflow/stageContracts.ts)
- [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)

### Milestone 2: Case Artifact Platform

Definition:
- a case persists source assets, derived artifacts, and workflow outputs with reproducible reload

Done when:
- reload restores more than plan/design JSON
- review/presentation/handoff artifacts are modeled and persisted
- exported packages contain reconstructable case state

Repo anchors:
- [caseDb.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/services/caseDb.ts)
- [useCaseStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts)
- [casePackager.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/collaboration/casePackager.ts)
- [schema.sql](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/database/schema.sql)

### Milestone 3: Unified Authoring Workspace

Definition:
- setup, alignment, and design become one coherent operator flow over one shared scene model

Done when:
- alignment has explicit completion and confidence
- overlay and 3D viewer consume one canonical authoring state
- the dominant design workspace is unambiguous

Repo anchors:
- [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)
- [DesignViewport.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/design/DesignViewport.tsx)
- [PhotoOverlay.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/overlay/PhotoOverlay.tsx)
- [SceneCanvas.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/viewer/SceneCanvas.tsx)
- [useAlignmentStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useAlignmentStore.ts)

### Milestone 4: Believable Proposal Baseline

Definition:
- the Present stage renders real proposal artifacts instead of reusing the source photo as both sides of the story

Done when:
- proposal snapshots are versioned
- presentation uses real differentiated before/after assets
- exported presentation outputs carry provenance

Repo anchors:
- [PresentView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/PresentView.tsx)
- [PresentationMode.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/present/PresentationMode.tsx)
- [reportGenerator.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/export/reportGenerator.ts)

## 4. Epics

### Epic 1: Canonical Workflow and Navigation Cleanup

Goal:
- align navigation model with the chosen product workflow

Acceptance criteria:
- `ViewId` and route normalization no longer collapse distinct jobs incorrectly
- sidebar shows the real workflow structure
- workflow stage naming is stable across UI and state

Likely files:
- [useNavigationStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useNavigationStore.ts)
- [Sidebar.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Sidebar.tsx)
- [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)

### Epic 2: Stage Contract Rewrite

Goal:
- make stage readiness reflect case reality

Acceptance criteria:
- `Design` requires explicit setup/alignment readiness
- `Review` requires a generated design revision
- `Present` requires approved review artifacts
- `Handoff` becomes distinct from presentation

Likely files:
- [stageContracts.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/workflow/stageContracts.ts)
- [useWorkflowStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useWorkflowStore.ts)
- [StageBlockerScreen.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/workflow/StageBlockerScreen.tsx)

### Epic 3: Present vs Handoff Separation

Goal:
- stop conflating patient presentation with team/lab handoff

Acceptance criteria:
- `Present` is patient-facing
- `Handoff` owns exports, packages, and lab/team delivery
- no CTA routes to a fake stage

Likely files:
- [PresentView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/PresentView.tsx)
- [ExportView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ExportView.tsx)
- [CollaborateView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/CollaborateView.tsx)

### Epic 4: Case Artifact Schema

Goal:
- define the durable case model

Acceptance criteria:
- documented entities for assets, alignment session, design revisions, review events, presentation snapshots, handoff packages
- schema decisions mapped to persistence implementation
- ownership boundaries are explicit

Likely files:
- [types.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/cases/types.ts)
- [schema.sql](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/database/schema.sql)
- [caseDb.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/services/caseDb.ts)

### Epic 5: Persistence Layer Expansion

Goal:
- persist artifact-rich case state

Acceptance criteria:
- save/load covers alignment state and artifact metadata
- restoring a case recovers meaningful workflow position
- autosave does not corrupt artifact relationships

Likely files:
- [caseDb.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/services/caseDb.ts)
- [useCaseStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts)
- [autoSave.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/autoSave.ts)

### Epic 6: `.smilegen` Package Redesign

Goal:
- make package export reproducible and asset-inclusive

Acceptance criteria:
- package includes binary assets or deterministic references
- manifest is versioned
- import/export round trip is testable

Likely files:
- [casePackager.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/collaboration/casePackager.ts)
- [ExportView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ExportView.tsx)

### Epic 7: Alignment as First-Class Workflow

Goal:
- move alignment from utility mode to workflow milestone

Acceptance criteria:
- explicit alignment completion state
- explicit alignment quality/confidence state
- generation path respects alignment readiness rules

Likely files:
- [useAlignmentStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useAlignmentStore.ts)
- [photoAlignment.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/alignment/photoAlignment.ts)
- [Workspace.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)

### Epic 8: Workspace Convergence

Goal:
- converge legacy design viewport concepts and current workflow shell

Acceptance criteria:
- one dominant design workspace
- no ambiguous split between design panel and design viewport ownership
- toolbar, viewport, and preview all operate over the same model

Likely files:
- [DesignViewport.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/design/DesignViewport.tsx)
- [DesignPanel.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/DesignPanel.tsx)
- [DesignToolbar.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/design/DesignToolbar.tsx)
- [SimulateView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/SimulateView.tsx)

### Epic 9: Viewer and Overlay Decomposition

Goal:
- reduce monolith complexity in the 2D and 3D authoring surfaces

Acceptance criteria:
- `SceneCanvas` responsibilities are split into smaller layers
- `PhotoOverlay` responsibilities are split into smaller layers
- behavior is preserved with stronger ownership boundaries

Likely files:
- [SceneCanvas.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/viewer/SceneCanvas.tsx)
- [PhotoOverlay.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/overlay/PhotoOverlay.tsx)

### Epic 10: Proposal Snapshot Pipeline

Goal:
- produce versioned presentation artifacts

Acceptance criteria:
- proposal snapshots can be saved and reopened
- snapshots have provenance to design revision and source assets
- Present consumes snapshot artifacts, not ad hoc state

Likely files:
- [PresentView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/PresentView.tsx)
- [useCaseStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts)

### Epic 11: Before/After Compositor Baseline

Goal:
- create differentiated before/after outputs

Acceptance criteria:
- patient-facing before/after no longer uses the same image for both states
- compositing path is deterministic and testable
- export uses proposal artifacts

Likely files:
- [PresentView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/PresentView.tsx)
- [PresentationMode.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/present/PresentationMode.tsx)

### Epic 12: Presentation State and Provenance

Goal:
- make presentation an accountable workflow step

Acceptance criteria:
- presentation-ready state is derived from actual artifacts
- approvals and presentation outputs are linked
- stage contract is consistent with real behavior

Likely files:
- [stageContracts.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/workflow/stageContracts.ts)
- [PresentView.tsx](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/PresentView.tsx)
- [useCaseStore.ts](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts)

## 5. First Implementation Slice

Recommended first slice:

### Slice A: Workflow Truth Package

Contents:
- rewrite navigation/stage semantics
- separate `Present` and `Handoff`
- define alignment readiness rules
- draft case artifact schema alongside code-facing types

Why this first:
- it reduces ambiguity across the whole product
- it prevents more work from landing on false workflow assumptions
- it creates the prerequisite for persistence and presentation work

Concrete deliverables:
- updated workflow/navigation code
- updated stage contracts
- new handoff route or canonical placeholder
- architecture doc for case artifact schema
- tests for navigation and stage readiness

## 6. Sequencing Constraints

1. Do not build collaboration before Milestone 2.
2. Do not claim presentation realism before Milestone 4.
3. Do not harden manufacturing exports before case artifacts and review states exist.
4. Do not fully retire `useViewportStore` until Milestones 1 and 3 provide replacement ownership.
5. Do not deepen diagnostics without knowing where diagnostic artifacts persist.

## 7. Major Risks

### Risk 1: Partial migration

The repo already shows multiple partially migrated workflow concepts. Another partial migration will make the product harder to reason about.

Mitigation:
- treat Milestone 1 as a cleanup gate, not a feature pass

### Risk 2: Persistence churn

Changing the case model late will invalidate downstream work in review, presentation, and handoff.

Mitigation:
- lock the artifact schema before building those stages deeply

### Risk 3: UI-first drift

The product can easily keep shipping visible UI improvements without real case durability.

Mitigation:
- tie milestone success to saved/reloaded artifact behavior, not only screenshots

### Risk 4: Monolith drag

`SceneCanvas` and `PhotoOverlay` can become blockers for every feature if not decomposed.

Mitigation:
- begin decomposition during Milestone 3, not after proposal work

## 8. Recommended Verification Per Milestone

### Milestone 1
- navigation tests
- stage readiness tests
- CTA routing review

### Milestone 2
- save/load regression tests
- package round-trip tests
- artifact integrity tests

### Milestone 3
- alignment state tests
- component interaction tests for photo/scan authoring
- workspace flow tests

### Milestone 4
- presentation artifact generation tests
- before/after rendering assertions
- export provenance checks

## 9. What Should Not Enter This Package Yet

- cloud sync architecture
- guest links
- AI copilot surfaces
- photorealistic video generation
- advanced manufacturing automation beyond schema and handoff basics

These belong after the core workflow and artifact model are stable.
