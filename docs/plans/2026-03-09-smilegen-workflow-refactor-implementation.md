# SmileGen Workflow Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the SmileGen desktop app into a workflow-first case shell with `Overview`, `Capture`, `Simulate`, `Plan`, `Validate`, `Collaborate`, and `Present`, while preserving the current local-first design engine and viewer foundations.

**Architecture:** Keep the existing mounted-workspace desktop architecture, but replace the current tool-oriented navigation and overloaded views with a route/state shell that expresses the clinical lifecycle. Reuse existing import, design, compare, export, and store modules wherever possible; add thin route orchestration, new shared context components, and incremental state extensions instead of rewriting the app from scratch.

**Tech Stack:** React 19, TypeScript, Zustand, Zundo, Three.js, Vite, Vitest, Tauri shell

---

## Phase 0: Planning and Traceability Gate

### Task 0.1: Freeze source traceability inputs

**Files:**
- Review: `docs/plans/2026-03-08-smilegen-workflow-ia-design.md`
- Review: `docs/plans/2026-03-08-smilegen-routes-components-design.md`
- Review: `docs/plans/2026-03-08-smilegen-product-prd.md`
- Review: `docs/research/2026-03-09-smilecloud-learning-center-inventory.md`
- Create: `docs/plans/2026-03-09-smilegen-workflow-refactor-implementation.md`

**Step 1: Verify route names and stage boundaries**

Read the four source docs above and confirm the implementation plan uses:
- `cases`
- `overview`
- `capture`
- `simulate`
- `plan`
- `validate`
- `collaborate`
- `present`
- `settings`

**Step 2: Record unresolved scope questions**

Create a short “Known Deferred Items” note in this plan for:
- cloud sync
- real-time collaboration
- patient-side runtime
- full CBCT processing

**Step 3: Commit planning baseline**

```bash
git add docs/plans/2026-03-08-smilegen-workflow-ia-design.md \
  docs/plans/2026-03-08-smilegen-routes-components-design.md \
  docs/plans/2026-03-08-smilegen-product-prd.md \
  docs/research/2026-03-09-smilecloud-learning-center-inventory.md \
  docs/plans/2026-03-09-smilegen-workflow-refactor-implementation.md
git commit -m "docs: add workflow refactor planning baseline"
```

## Phase 1: Route Shell and Navigation Rewrite

### Task 1.1: Introduce a route store and migrate sidebar semantics

**Files:**
- Create: `apps/desktop/src/store/useRouteStore.ts`
- Modify: `apps/desktop/src/store/useViewportStore.ts`
- Modify: `apps/desktop/src/features/layout/Sidebar.tsx`
- Modify: `apps/desktop/src/features/layout/AppShell.tsx`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Test: `apps/desktop/src/features/layout/Sidebar.test.tsx`
- Test: `apps/desktop/src/features/layout/Workspace.test.tsx`

**Step 1: Write the failing tests**

Add tests that assert:
- the sidebar renders the new stage labels
- clicking a stage updates the active route
- `Workspace` renders the correct route container for the active route

Example:

```tsx
it("shows workflow-first route labels", () => {
  render(<Sidebar activeRoute="overview" />);
  expect(screen.getByLabelText("Overview")).toBeInTheDocument();
  expect(screen.getByLabelText("Capture")).toBeInTheDocument();
  expect(screen.getByLabelText("Present")).toBeInTheDocument();
});
```

**Step 2: Run tests and confirm failure**

Run:

```bash
pnpm --filter desktop test -- --run \
  src/features/layout/Sidebar.test.tsx \
  src/features/layout/Workspace.test.tsx
```

Expected:
- FAIL because `activeRoute` store and new labels do not exist yet

**Step 3: Write the minimal route-store implementation**

Implement `useRouteStore.ts` with:
- `activeRoute`
- `activeCaseId`
- `activePlanStep`
- `activeValidateTab`
- `activeCollaborateAudience`
- `activePresentTab`
- route setters

Bridge `useViewportStore.ts` rather than deleting it immediately. Keep overlay/camera state there, but move navigation responsibility into `useRouteStore`.

**Step 4: Update shell components**

Modify:
- [`Sidebar.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Sidebar.tsx)
- [`AppShell.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/AppShell.tsx)
- [`Workspace.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx)

Use the new route IDs and keep the mounted-workspace behavior.

**Step 5: Re-run tests**

Run:

```bash
pnpm --filter desktop test -- --run \
  src/features/layout/Sidebar.test.tsx \
  src/features/layout/Workspace.test.tsx
```

Expected:
- PASS

**Step 6: Commit**

```bash
git add apps/desktop/src/store/useRouteStore.ts \
  apps/desktop/src/store/useViewportStore.ts \
  apps/desktop/src/features/layout/Sidebar.tsx \
  apps/desktop/src/features/layout/AppShell.tsx \
  apps/desktop/src/features/layout/Workspace.tsx \
  apps/desktop/src/features/layout/Sidebar.test.tsx \
  apps/desktop/src/features/layout/Workspace.test.tsx
git commit -m "feat: add workflow-first route shell"
```

## Phase 2: Shared Case Context and Overview Route

### Task 2.1: Add persistent case context header

**Files:**
- Create: `apps/desktop/src/features/layout/CaseContextHeader.tsx`
- Modify: `apps/desktop/src/features/layout/AppShell.tsx`
- Modify: `apps/desktop/src/store/useCaseStore.ts`
- Test: `apps/desktop/src/features/layout/CaseContextHeader.test.tsx`

**Step 1: Write the failing test**

Test for:
- case title
- workflow stage badge
- updated timestamp
- safe empty state when no case is selected

**Step 2: Run the targeted test**

```bash
pnpm --filter desktop test -- --run src/features/layout/CaseContextHeader.test.tsx
```

Expected:
- FAIL because component does not exist

**Step 3: Implement minimal component**

Render:
- case name
- current route/stage
- updated time
- placeholder readiness badge

Read case data from `useCaseStore`.

**Step 4: Integrate into shell**

Place `CaseContextHeader` above all non-`cases` routes in `AppShell.tsx` or route frame wrapper.

**Step 5: Re-run the targeted test**

```bash
pnpm --filter desktop test -- --run src/features/layout/CaseContextHeader.test.tsx
```

Expected:
- PASS

**Step 6: Commit**

```bash
git add apps/desktop/src/features/layout/CaseContextHeader.tsx \
  apps/desktop/src/features/layout/AppShell.tsx \
  apps/desktop/src/store/useCaseStore.ts \
  apps/desktop/src/features/layout/CaseContextHeader.test.tsx
git commit -m "feat: add shared case context header"
```

### Task 2.2: Create the Overview route

**Files:**
- Create: `apps/desktop/src/features/overview/CaseOverviewView.tsx`
- Create: `apps/desktop/src/features/overview/CaseTimeline.tsx`
- Create: `apps/desktop/src/features/overview/NextActionCard.tsx`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Test: `apps/desktop/src/features/overview/CaseOverviewView.test.tsx`

**Step 1: Write the failing test**

Assert that Overview shows:
- case title
- next action
- at least one readiness summary area

**Step 2: Run the test**

```bash
pnpm --filter desktop test -- --run src/features/overview/CaseOverviewView.test.tsx
```

Expected:
- FAIL

**Step 3: Implement minimal Overview route**

Display:
- summary cards
- placeholder timeline
- recommended next action derived from current case state

**Step 4: Register the route**

Mount the new route in `Workspace.tsx` and wire sidebar navigation to it.

**Step 5: Run test and smoke suite**

```bash
pnpm --filter desktop test -- --run \
  src/features/overview/CaseOverviewView.test.tsx \
  src/features/layout/Workspace.test.tsx
```

Expected:
- PASS

**Step 6: Commit**

```bash
git add apps/desktop/src/features/overview/CaseOverviewView.tsx \
  apps/desktop/src/features/overview/CaseTimeline.tsx \
  apps/desktop/src/features/overview/NextActionCard.tsx \
  apps/desktop/src/features/layout/Workspace.tsx \
  apps/desktop/src/features/overview/CaseOverviewView.test.tsx
git commit -m "feat: add overview route"
```

## Phase 3: Capture Route and Readiness System

### Task 3.1: Introduce readiness computation

**Files:**
- Create: `apps/desktop/src/features/capture/readiness.ts`
- Create: `apps/desktop/src/features/capture/readiness.test.ts`
- Create: `apps/desktop/src/store/useReadinessStore.ts`
- Modify: `apps/desktop/src/store/useImportStore.ts`
- Modify: `apps/desktop/src/store/useCaseStore.ts`

**Step 1: Write the failing unit tests**

Cover:
- missing photos
- missing arch scan
- valid required inputs
- warning state for optional imaging

Example:

```ts
it("marks case blocked when photos are missing", () => {
  expect(computeReadiness({ photos: [], archScan: "scan.stl" }).isReady).toBe(false);
});
```

**Step 2: Run the test**

```bash
pnpm --filter desktop test -- --run src/features/capture/readiness.test.ts
```

Expected:
- FAIL

**Step 3: Implement minimal readiness logic**

Return:
- `isReady`
- `missingItems`
- `warnings`
- `qualityFlags`

**Step 4: Connect store data**

Expose readiness through `useReadinessStore` using current import-store values.

**Step 5: Re-run the test**

```bash
pnpm --filter desktop test -- --run src/features/capture/readiness.test.ts
```

Expected:
- PASS

**Step 6: Commit**

```bash
git add apps/desktop/src/features/capture/readiness.ts \
  apps/desktop/src/features/capture/readiness.test.ts \
  apps/desktop/src/store/useReadinessStore.ts \
  apps/desktop/src/store/useImportStore.ts \
  apps/desktop/src/store/useCaseStore.ts
git commit -m "feat: add capture readiness model"
```

### Task 3.2: Refactor ImportView into Capture route panels

**Files:**
- Create: `apps/desktop/src/features/capture/CaptureChecklistPanel.tsx`
- Create: `apps/desktop/src/features/capture/CaptureQualityPanel.tsx`
- Create: `apps/desktop/src/features/capture/AssetInventoryPanel.tsx`
- Modify: `apps/desktop/src/features/views/ImportView.tsx`
- Modify: `apps/desktop/src/features/views/HowToGuidePanel.tsx`
- Test: `apps/desktop/src/features/views/ImportView.test.tsx`

**Step 1: Write the failing route test**

Assert:
- readiness panels render
- import controls still work
- “next step” CTA is disabled when readiness is false

**Step 2: Run the test**

```bash
pnpm --filter desktop test -- --run src/features/views/ImportView.test.tsx
```

Expected:
- FAIL

**Step 3: Extract the panels**

Keep `ImportView` as orchestration shell, but render:
- `CaptureChecklistPanel`
- `CaptureQualityPanel`
- `AssetInventoryPanel`

**Step 4: Add navigation handoff**

Add a clear “Continue to Simulate” action when readiness passes.

**Step 5: Re-run tests**

```bash
pnpm --filter desktop test -- --run src/features/views/ImportView.test.tsx
```

Expected:
- PASS

**Step 6: Commit**

```bash
git add apps/desktop/src/features/capture/CaptureChecklistPanel.tsx \
  apps/desktop/src/features/capture/CaptureQualityPanel.tsx \
  apps/desktop/src/features/capture/AssetInventoryPanel.tsx \
  apps/desktop/src/features/views/ImportView.tsx \
  apps/desktop/src/features/views/HowToGuidePanel.tsx \
  apps/desktop/src/features/views/ImportView.test.tsx
git commit -m "feat: turn import view into capture route"
```

## Phase 4: Split Design into Simulate and Plan

### Task 4.1: Introduce a thin Simulation route

**Files:**
- Create: `apps/desktop/src/features/simulate/SimulationView.tsx`
- Create: `apps/desktop/src/features/simulate/SimulationSummaryBar.tsx`
- Create: `apps/desktop/src/features/simulate/RecommendedNextStepCard.tsx`
- Modify: `apps/desktop/src/features/views/DesignView.tsx`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Test: `apps/desktop/src/features/simulate/SimulationView.test.tsx`

**Step 1: Write the failing test**

Assert:
- simulation route renders current design viewport
- summary bar renders
- next-step CTA routes to plan

**Step 2: Run the test**

```bash
pnpm --filter desktop test -- --run src/features/simulate/SimulationView.test.tsx
```

Expected:
- FAIL

**Step 3: Implement the route**

Reuse:
- `DesignToolbar`
- `DesignViewport`
- `SmileMetricsPanel`
- preview components

Keep simulation-specific orchestration light.

**Step 4: Re-run tests**

```bash
pnpm --filter desktop test -- --run src/features/simulate/SimulationView.test.tsx
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/simulate/SimulationView.tsx \
  apps/desktop/src/features/simulate/SimulationSummaryBar.tsx \
  apps/desktop/src/features/simulate/RecommendedNextStepCard.tsx \
  apps/desktop/src/features/views/DesignView.tsx \
  apps/desktop/src/features/layout/Workspace.tsx \
  apps/desktop/src/features/simulate/SimulationView.test.tsx
git commit -m "feat: add simulate route"
```

### Task 4.2: Add Plan route with substeps

**Files:**
- Create: `apps/desktop/src/features/plan/PlanView.tsx`
- Create: `apps/desktop/src/features/plan/PlanStepRail.tsx`
- Create: `apps/desktop/src/features/plan/StackWorkspace.tsx`
- Create: `apps/desktop/src/features/plan/StructureWorkspace.tsx`
- Create: `apps/desktop/src/features/plan/DesignWorkspace.tsx`
- Create: `apps/desktop/src/features/plan/LayerManager.tsx`
- Modify: `apps/desktop/src/store/useRouteStore.ts`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Test: `apps/desktop/src/features/plan/PlanView.test.tsx`

**Step 1: Write the failing test**

Assert:
- plan route shows step rail
- default step is `stack`
- changing steps swaps workspaces without unmounting shared heavy context unnecessarily

**Step 2: Run the test**

```bash
pnpm --filter desktop test -- --run src/features/plan/PlanView.test.tsx
```

Expected:
- FAIL

**Step 3: Implement route skeleton**

Use existing components where possible:
- `SceneCanvas`
- `SmilePlanPanel`
- `ToothInspector`
- `LibraryPanel`
- `ArchFormEditor`
- `ShadeSelector`

Do not overbuild the step internals initially. Make each substep a route-aware composition layer first.

**Step 4: Re-run tests**

```bash
pnpm --filter desktop test -- --run src/features/plan/PlanView.test.tsx
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/plan/PlanView.tsx \
  apps/desktop/src/features/plan/PlanStepRail.tsx \
  apps/desktop/src/features/plan/StackWorkspace.tsx \
  apps/desktop/src/features/plan/StructureWorkspace.tsx \
  apps/desktop/src/features/plan/DesignWorkspace.tsx \
  apps/desktop/src/features/plan/LayerManager.tsx \
  apps/desktop/src/store/useRouteStore.ts \
  apps/desktop/src/features/layout/Workspace.tsx \
  apps/desktop/src/features/plan/PlanView.test.tsx
git commit -m "feat: add plan route and substeps"
```

## Phase 5: Validate Route

### Task 5.1: Consolidate compare and review into Validate

**Files:**
- Create: `apps/desktop/src/features/validate/ValidateView.tsx`
- Create: `apps/desktop/src/features/validate/ReviewTimeline.tsx`
- Create: `apps/desktop/src/features/validate/ApprovalSummaryCard.tsx`
- Create: `apps/desktop/src/features/validate/MeasurementsPanel.tsx`
- Modify: `apps/desktop/src/features/views/CompareView.tsx`
- Modify: `apps/desktop/src/features/review/ScanReviewPanel.tsx`
- Modify: `apps/desktop/src/store/useRouteStore.ts`
- Test: `apps/desktop/src/features/validate/ValidateView.test.tsx`

**Step 1: Write the failing test**

Assert:
- validate route renders compare and review tabs
- approval card renders
- route can show empty states when no variants exist

**Step 2: Run the test**

```bash
pnpm --filter desktop test -- --run src/features/validate/ValidateView.test.tsx
```

Expected:
- FAIL

**Step 3: Implement Validate orchestration**

Use `CompareView` and `ScanReviewPanel` as subordinate content, not as top-level navigation destinations.

**Step 4: Re-run tests**

```bash
pnpm --filter desktop test -- --run src/features/validate/ValidateView.test.tsx
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/validate/ValidateView.tsx \
  apps/desktop/src/features/validate/ReviewTimeline.tsx \
  apps/desktop/src/features/validate/ApprovalSummaryCard.tsx \
  apps/desktop/src/features/validate/MeasurementsPanel.tsx \
  apps/desktop/src/features/views/CompareView.tsx \
  apps/desktop/src/features/review/ScanReviewPanel.tsx \
  apps/desktop/src/store/useRouteStore.ts \
  apps/desktop/src/features/validate/ValidateView.test.tsx
git commit -m "feat: add validate route"
```

## Phase 6: Collaborate and Present Split

### Task 6.1: Add collaboration route

**Files:**
- Create: `apps/desktop/src/features/collaboration/CollaborateView.tsx`
- Create: `apps/desktop/src/features/collaboration/AudiencePicker.tsx`
- Create: `apps/desktop/src/features/collaboration/InvitePanel.tsx`
- Create: `apps/desktop/src/features/collaboration/HandoffQueue.tsx`
- Create: `apps/desktop/src/store/useCollaborationStore.ts`
- Modify: `apps/desktop/src/features/collaboration/casePackager.ts`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Test: `apps/desktop/src/features/collaboration/CollaborateView.test.tsx`

**Step 1: Write the failing test**

Assert:
- audience picker renders
- selecting an audience changes route substate
- at least one package option is shown

**Step 2: Run the test**

```bash
pnpm --filter desktop test -- --run src/features/collaboration/CollaborateView.test.tsx
```

Expected:
- FAIL

**Step 3: Implement collaboration skeleton**

Start with:
- audience selection
- payload placeholder
- audit log placeholder

Do not build chat or real networking yet.

**Step 4: Re-run tests**

```bash
pnpm --filter desktop test -- --run src/features/collaboration/CollaborateView.test.tsx
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/collaboration/CollaborateView.tsx \
  apps/desktop/src/features/collaboration/AudiencePicker.tsx \
  apps/desktop/src/features/collaboration/InvitePanel.tsx \
  apps/desktop/src/features/collaboration/HandoffQueue.tsx \
  apps/desktop/src/store/useCollaborationStore.ts \
  apps/desktop/src/features/collaboration/casePackager.ts \
  apps/desktop/src/features/layout/Workspace.tsx \
  apps/desktop/src/features/collaboration/CollaborateView.test.tsx
git commit -m "feat: add collaboration route"
```

### Task 6.2: Split ExportView into Present route shell

**Files:**
- Create: `apps/desktop/src/features/present/PresentView.tsx`
- Create: `apps/desktop/src/features/present/ExportReadinessChecklist.tsx`
- Create: `apps/desktop/src/features/present/PatientStoryPanel.tsx`
- Create: `apps/desktop/src/features/present/PresentationAssetGallery.tsx`
- Create: `apps/desktop/src/store/usePresentationStore.ts`
- Modify: `apps/desktop/src/features/views/ExportView.tsx`
- Modify: `apps/desktop/src/features/export/reportGenerator.ts`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Test: `apps/desktop/src/features/present/PresentView.test.tsx`

**Step 1: Write the failing test**

Assert:
- present route renders summary, report, and handoff areas
- export readiness checklist shows
- patient story panel renders placeholder state

**Step 2: Run the test**

```bash
pnpm --filter desktop test -- --run src/features/present/PresentView.test.tsx
```

Expected:
- FAIL

**Step 3: Implement Present shell**

Reuse current `ExportView` sections, but reorganize into:
- summary
- assets
- report
- handoff

**Step 4: Re-run tests**

```bash
pnpm --filter desktop test -- --run src/features/present/PresentView.test.tsx
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/present/PresentView.tsx \
  apps/desktop/src/features/present/ExportReadinessChecklist.tsx \
  apps/desktop/src/features/present/PatientStoryPanel.tsx \
  apps/desktop/src/features/present/PresentationAssetGallery.tsx \
  apps/desktop/src/store/usePresentationStore.ts \
  apps/desktop/src/features/views/ExportView.tsx \
  apps/desktop/src/features/export/reportGenerator.ts \
  apps/desktop/src/features/layout/Workspace.tsx \
  apps/desktop/src/features/present/PresentView.test.tsx
git commit -m "feat: add present route"
```

## Phase 7: End-to-End Acceptance and Cleanup

### Task 7.1: Add route-level acceptance tests

**Files:**
- Create: `apps/desktop/src/features/layout/appWorkflowAcceptance.test.tsx`
- Modify: `apps/desktop/src/features/layout/AppShell.tsx`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`

**Step 1: Write acceptance tests**

Cover:
- create/load case and navigate to overview
- incomplete capture blocks simulate progression
- successful capture unlocks simulate
- plan route exposes `stack`, `structure`, `design`
- validate route shows compare/review
- collaborate route shows audience choices
- present route shows export/report/handoff

**Step 2: Run the acceptance test**

```bash
pnpm --filter desktop test -- --run src/features/layout/appWorkflowAcceptance.test.tsx
```

Expected:
- FAIL initially

**Step 3: Fix route wiring and empty states**

Adjust route shells until the test passes without bolting on unrelated behavior.

**Step 4: Run full desktop test suite**

```bash
pnpm --filter desktop test
```

Expected:
- PASS

**Step 5: Run production build**

```bash
pnpm --filter desktop build
```

Expected:
- successful TypeScript build and Vite build output

**Step 6: Commit**

```bash
git add apps/desktop/src/features/layout/appWorkflowAcceptance.test.tsx \
  apps/desktop/src/features/layout/AppShell.tsx \
  apps/desktop/src/features/layout/Workspace.tsx
git commit -m "test: add workflow acceptance coverage"
```

## Acceptance Test Matrix

| Scenario | Verification |
| --- | --- |
| User can switch among all workflow stages | Sidebar and workspace tests pass |
| No-case state is safe | Overview and case-context tests pass |
| Capture route blocks incomplete cases | readiness tests and ImportView route tests pass |
| Simulate route shows fast design workflow | SimulationView test passes |
| Plan route exposes three explicit substeps | PlanView test passes |
| Validate route centralizes compare/review/approval | ValidateView test passes |
| Collaborate route is audience-first | CollaborateView test passes |
| Present route centralizes export/report/handoff | PresentView test passes |
| Whole route shell remains buildable | `pnpm --filter desktop build` passes |

## Known Deferred Items

- real-time multi-user collaboration
- cloud sync and remote persistence
- full patient runtime or Passport equivalent
- true CBCT processing pipeline beyond readiness placeholders
- full service-provider workflow automation

## Execution Notes

- Execute this plan in a dedicated worktree.
- Keep each task isolated and reviewable.
- Preserve the current heavy-view mounted-workspace behavior unless a test proves it unnecessary.
- Prefer thin orchestration layers that reuse existing modules over rewriting CAD logic.
