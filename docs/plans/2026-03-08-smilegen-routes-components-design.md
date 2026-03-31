# SmileGen Routes and Components Design

**Date:** 2026-03-08
**Status:** Detailed design
**Depends on:** [2026-03-08-smilegen-workflow-ia-design.md](/Users/timchung/Desktop/smilegen/docs/plans/2026-03-08-smilegen-workflow-ia-design.md)

## 1. Objective

Translate the workflow-first information architecture into:
- route/view contracts
- component hierarchy
- state ownership
- migration plan from the current app shell

This document is intentionally grounded in the current codebase under `apps/desktop/src`.

## 2. Current-to-Target Mapping

| Current view | Current file | Target stage | Action |
| --- | --- | --- | --- |
| `cases` | [`CaseListView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/CaseListView.tsx) | Cases | Keep and enhance |
| `import` | [`ImportView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ImportView.tsx) | Capture | Rename conceptually, split into smaller panels |
| `design` | [`DesignView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/DesignView.tsx) | Simulate and part of Plan | Split responsibilities |
| `compare` | [`CompareView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/CompareView.tsx) | Validate | Keep and grow |
| `export` | [`ExportView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ExportView.tsx) | Present and part of Collaborate | Split responsibilities |
| `settings` | [`SettingsPanel.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/settings/SettingsPanel.tsx) | Settings | Keep |

## 3. Target Route Model

This app is desktop-first and currently store-routed rather than URL-routed. The recommended target is still state-based routing first, with a route object model that could later support URL sync.

### 3.1 New route IDs

```ts
type AppRouteId =
  | "cases"
  | "overview"
  | "capture"
  | "simulate"
  | "plan"
  | "validate"
  | "collaborate"
  | "present"
  | "settings";
```

### 3.2 Route state contract

```ts
interface AppRouteState {
  activeRoute: AppRouteId;
  activeCaseId: string | null;
  activePlanStep: "stack" | "structure" | "design";
  activeValidateTab: "compare" | "review" | "measurements" | "approvals";
  activeCollaborateAudience: "team" | "expert" | "lab" | "service";
  activePresentTab: "summary" | "assets" | "report" | "handoff";
}
```

### 3.3 Why not URL routing first
- the app is already organized around mounted workspaces in [`Workspace.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)
- WebGL-heavy views benefit from stable mounted trees
- the fastest path is to evolve the existing `useViewportStore` model into a richer route store

## 4. Route-by-Route Contracts

### 4.1 Cases route

Purpose:
- portfolio entry point
- case search, filter, create, resume

Required inputs:
- saved cases
- workflow stage summary
- thumbnail/preview status

Outputs:
- set active case
- navigate to `overview`
- create new case and navigate to `capture`

Primary components:
- `CaseListView`
- `CaseSearchBar`
- `CaseFilterBar`
- `CaseCard`
- `NewCaseButton`

### 4.2 Overview route

Purpose:
- create one canonical “where am I?” screen for any case

Required inputs:
- case metadata
- readiness summary
- latest active design
- pending review items
- collaborators
- export/share status

Outputs:
- navigate to recommended next stage
- jump to specific artifact or review thread

Primary components:
- `CaseOverviewView`
- `CaseContextHeader`
- `CaseReadinessCard`
- `CaseTimeline`
- `NextActionCard`
- `CaseParticipantsCard`
- `PresentationStatusCard`

### 4.3 Capture route

Purpose:
- handle imports and readiness checks

Required inputs:
- uploaded photos
- arch scan
- tooth models
- optional imaging state
- compatibility and validation results

Outputs:
- update import store
- trigger case creation if needed
- mark readiness progress
- navigate to `simulate`

Primary components:
- existing `ImportView` becomes orchestration shell
- `PhotoImportCard`
- `ArchScanImportCard`
- `ToothLibraryImportCard`
- `OptionalImagingCard`
- `CaptureChecklistPanel`
- `CaptureQualityPanel`
- `AssetInventoryPanel`

### 4.4 Simulate route

Purpose:
- deliver fast smile proposal with minimal cognitive load

Required inputs:
- selected patient photo
- basic plan inputs
- available library collection
- current variant generation state

Outputs:
- generate design
- adjust overlay and preview
- save selected variant
- navigate to `plan` or `validate`

Primary components:
- `SimulationView`
- existing `DesignToolbar`
- existing `DesignViewport`
- `SimulationSummaryBar`
- `VariantStrip`
- `SmileMetricsPanel`
- `BeforeAfterSlider`
- `SimulationConfidencePanel`

### 4.5 Plan route

Purpose:
- support advanced planning work without exposing raw module sprawl

Subroutes:
- `plan/stack`
- `plan/structure`
- `plan/design`

Required inputs:
- imported assets
- generation result
- treatment map
- active tooth selection
- arch and library controls

Outputs:
- align layers
- update treatment intent
- refine design geometry
- generate new version
- send to `validate`

Primary components:
- `PlanView`
- `PlanStepRail`
- `LayerManager`
- `StackWorkspace`
- `StructureWorkspace`
- `DesignWorkspace`
- `ToothInspector`
- `SmilePlanPanel`
- `LibraryPanel`
- `ArchFormEditor`
- `ShadeSelector`

### 4.6 Validate route

Purpose:
- host all formal evaluation and approval logic

Subroutes:
- `validate/compare`
- `validate/review`
- `validate/measurements`
- `validate/approvals`

Required inputs:
- variants
- annotations
- review state
- trust/confidence state
- prep/handoff status

Outputs:
- compare variants
- create comment/annotation
- approve or request revision
- mark case ready for collaboration/presentation

Primary components:
- `ValidateView`
- `VariantCompareDashboard`
- `ReviewTimeline`
- `MeasurementsPanel`
- `ApprovalSummaryCard`
- `PreparationChecklist`
- `ScanReviewPanel`

### 4.7 Collaborate route

Purpose:
- unify all non-patient collaboration

Subroutes:
- `collaborate/team`
- `collaborate/expert`
- `collaborate/lab`
- `collaborate/service`

Required inputs:
- active case
- selected artifacts
- audience type
- package options
- invite/revision state

Outputs:
- create outbound package
- request review
- log delivery
- track replies and revisions

Primary components:
- `CollaborateView`
- `AudiencePicker`
- `InvitePanel`
- `SharePayloadSelector`
- `HandoffQueue`
- `ShareAuditLog`
- reuse `casePackager.ts` as infrastructure

### 4.8 Present route

Purpose:
- own all patient-ready and doctor-ready outputs

Subroutes:
- `present/summary`
- `present/assets`
- `present/report`
- `present/handoff`

Required inputs:
- active variant
- report data
- export settings
- readiness checklist
- patient-facing assets

Outputs:
- report generation
- STL/OBJ export
- package export
- presentation-ready status

Primary components:
- `PresentView`
- `DesignSummaryCard`
- `PresentationAssetGallery`
- `ExportReadinessChecklist`
- `PatientStoryPanel`
- `DoctorHandoffPanel`
- reuse parts of `ExportView`

## 5. Component Hierarchy

### 5.1 App shell hierarchy

```text
App
└── AppShell
    ├── Header
    ├── StageSidebar
    └── Workspace
        ├── CasesRoute
        ├── OverviewRoute
        ├── CaptureRoute
        ├── SimulateRoute
        ├── PlanRoute
        ├── ValidateRoute
        ├── CollaborateRoute
        ├── PresentRoute
        └── SettingsRoute
```

### 5.2 Shared scaffolding components

New shared wrappers:
- `features/layout/CaseContextHeader.tsx`
- `features/layout/StageSidebar.tsx`
- `features/layout/StageProgressRail.tsx`
- `features/layout/StageRouteFrame.tsx`
- `features/layout/EmptyState.tsx`
- `features/layout/BlockedState.tsx`

### 5.3 Cross-cutting service components

These should not belong to just one route:
- `ArtifactTimeline`
- `ReadinessBadge`
- `CapabilityGate`
- `AnnotationComposer`
- `ApprovalBadge`
- `CaseActivityFeed`

## 6. State Ownership

### 6.1 Existing stores to preserve
- [`useCaseStore.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts)
- [`useDesignStore.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useDesignStore.ts)
- [`useImportStore.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useImportStore.ts)
- [`useViewportStore.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useViewportStore.ts)

### 6.2 Recommended store refactor

Keep existing stores, but evolve responsibilities:

#### `useViewportStore` becomes `useRouteStore`
Current issue:
- it mixes navigation, overlay controls, camera settings, and design display toggles

Target split:
- `useRouteStore`
- `useOverlayStore`
- `useWorkspaceUiStore`

#### New `useCollaborationStore`
Needed for:
- audience
- invites
- share package state
- audit log
- collaborator presence

#### New `usePresentationStore`
Needed for:
- patient-story assets
- report generation options
- presentation readiness
- handoff publish state

#### New `useReadinessStore`
Needed for:
- photo quality checks
- import completeness
- plan gating
- warnings and blockers

## 7. Data Model Extensions

### 7.1 Case model additions
Current `CaseRecord` in [`types.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/cases/types.ts) is too thin for workflow-first UX.

Recommended additions:

```ts
interface CaseReadiness {
  photosReady: boolean;
  scanReady: boolean;
  toothLibraryReady: boolean;
  imagingReady: boolean;
  capabilityWarnings: string[];
  missingItems: string[];
}

interface CollaborationState {
  teamMembers: string[];
  pendingInvites: string[];
  lastSharedAt?: string;
  lastShareAudience?: "team" | "expert" | "lab" | "service" | "patient";
}

interface PresentationState {
  reportGeneratedAt?: string;
  patientAssetsReady: boolean;
  doctorHandoffReady: boolean;
  publishedArtifacts: string[];
}
```

### 7.2 Artifact model

```ts
interface CaseArtifact {
  id: string;
  type:
    | "photo"
    | "scan"
    | "tooth_model"
    | "simulation"
    | "plan_version"
    | "review_snapshot"
    | "report"
    | "handoff_package";
  label: string;
  createdAt: string;
  version: number;
  status: "draft" | "active" | "approved" | "shared" | "archived";
}
```

This artifact model is necessary for:
- Overview timeline
- Validate history
- Collaborate payload selection
- Present asset gallery

## 8. Error and Empty State Rules

Every route needs explicit non-happy-path design.

### Cases
- no cases yet
- DB load failure

### Overview
- no active case selected

### Capture
- unsupported file
- corrupt mesh
- missing photo angles
- partial imports only

### Simulate
- cannot generate because readiness incomplete
- active photo missing

### Plan
- no generated design yet
- insufficient source assets for stack/alignment

### Validate
- no variants yet
- nothing awaiting approval

### Collaborate
- no artifact selected for sharing
- collaboration requires saved case first

### Present
- export blocked
- no approved variant selected

## 9. Migration Plan

### Phase 1
- rename current sidebar semantics only
- preserve mounted-workspace architecture
- add `overview`
- rename `import` to `capture`
- rename `export` to `present`

### Phase 2
- split `design` into `simulate` and `plan`
- split `compare` into `validate`
- introduce route substeps and new route store

### Phase 3
- add collaboration route
- add readiness and presentation stores
- connect artifact timeline and approval history

### Phase 4
- optional URL synchronization
- optional cloud-aware collaboration workflows

## 10. Acceptance Criteria

- a user can identify the current case and next action from any route
- imports and readiness checks live in one route
- rapid smile design lives in one route
- advanced planning is expressed as `Stack -> Structure -> Design`
- compare/review/approval live in one route
- sharing with team, expert, lab, and service lives in one route
- export/report/patient presentation live in one route
- current repo modules are reused wherever reasonable rather than rewritten wholesale

This document is the structural bridge between the IA design and the eventual implementation plan.
