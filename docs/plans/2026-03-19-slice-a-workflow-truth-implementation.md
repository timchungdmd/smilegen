# Slice A Implementation Plan: Workflow Truth + Artifact Schema

Date: 2026-03-19
Status: In progress
Execution package source: `2026-03-19-competitive-product-execution-package-v2.md`

## Goal

Implement the smallest useful slice of the V2 roadmap that makes the shipped workflow more truthful and reduces future architectural drift.

## Scope

### In scope

1. Add a canonical `handoff` workflow stage.
2. Stop normalizing `collaborate` and `export` into `present`.
3. Update stage contracts to reflect setup, alignment, review, presentation, and handoff semantics more accurately.
4. Add explicit alignment completion/readiness helpers.
5. Draft code-facing case artifact types and persist baseline artifact state.
6. Update tests that currently codify the old alias behavior.

### Out of scope

1. Full collaboration product design
2. Real proposal rendering
3. Full persistence migration of binary assets
4. Full retirement of `useViewportStore`

## File Targets

### Workflow and navigation

- `apps/desktop/src/store/useNavigationStore.ts`
- `apps/desktop/src/features/layout/Sidebar.tsx`
- `apps/desktop/src/features/layout/Header.tsx`
- `apps/desktop/src/features/layout/Workspace.tsx`
- `apps/desktop/src/features/workflow/stageContracts.ts`
- `apps/desktop/src/store/useWorkflowStore.ts`
- `apps/desktop/src/features/shortcuts/useKeyboardShortcuts.ts`
- `apps/desktop/src/features/experiments/workspaceMetrics.ts`
- `apps/desktop/src/features/views/CaseListView.tsx`

### Presentation and handoff

- `apps/desktop/src/features/views/PresentView.tsx`
- `apps/desktop/src/features/views/ExportView.tsx`
- `apps/desktop/src/features/views/CollaborateView.tsx`

### Alignment readiness

- `apps/desktop/src/store/useAlignmentStore.ts`

### Case artifact schema

- `apps/desktop/src/features/cases/types.ts`
- `apps/desktop/src/features/cases/caseStore.ts`
- `apps/desktop/src/features/cases/caseValidators.ts`
- `apps/desktop/src/store/useCaseStore.ts`
- `apps/desktop/src/services/caseDb.ts`

### Verification

- `apps/desktop/src/App.test.tsx`
- `apps/desktop/src/features/cases/caseStore.test.ts`
- `apps/desktop/src/features/cases/caseValidators.test.ts`

## Task Breakdown

1. Introduce `handoff` as a first-class view and workflow stage.
2. Repoint legacy `collaborate` and `export` aliases to `handoff`.
3. Update sidebar, header, and workspace routing to render the new stage.
4. Add alignment completion helpers and use them in stage readiness.
5. Add code-facing artifact schema types to `CaseRecord`.
6. Persist baseline artifact metadata through `SavedCase`.
7. Update `Present` CTAs so team/lab actions route to `handoff`.
8. Rewrite tests to validate the new truthful workflow.

## Acceptance Criteria

1. `present` and `handoff` are distinct runtime destinations.
2. Workflow stage normalization no longer maps `collaborate` to `present`.
3. Design readiness requires setup assets and completed alignment.
4. Case types and persistence can represent baseline artifact metadata.
5. Existing tests pass after the migration, with new assertions for `handoff` and alignment readiness.
