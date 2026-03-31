# Smilefy-Inspired Workspace A/B Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build two end-to-end workspace variants for the SmileGen desktop app that collapse redundant steps into a Smilefy-inspired case studio and support an A/B comparison between a workspace-first flow and a guided workspace flow.

**Architecture:** Keep the current app shell, stores, and feature surfaces, but reorganize the case experience around five shared jobs: `Import`, `Align`, `Design`, `Review`, and `Present`. Add a lightweight workspace-variant layer that changes framing, navigation, and guidance while reusing the same core canvases and inspector modules.

**Tech Stack:** React 19, TypeScript, Zustand, CSS variables, Vitest, Testing Library, Tauri desktop shell

---

### Task 1: Add Workspace Variant State

**Files:**
- Create: `apps/desktop/src/features/experiments/workspaceVariantStore.ts`
- Modify: `apps/desktop/src/features/layout/AppShell.tsx`
- Test: `apps/desktop/src/features/experiments/workspaceVariantStore.test.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/experiments/workspaceVariantStore.test.ts` covering:
- default variant value
- toggling between `workspace` and `guided`
- persistence behavior if needed

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test src/features/experiments/workspaceVariantStore.test.ts`
Expected: FAIL because the store does not exist yet.

**Step 3: Write minimal implementation**

Create `apps/desktop/src/features/experiments/workspaceVariantStore.ts` with:
- variant enum/type for `workspace` and `guided`
- Zustand store
- setter action

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test src/features/experiments/workspaceVariantStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/experiments/workspaceVariantStore.ts apps/desktop/src/features/experiments/workspaceVariantStore.test.ts apps/desktop/src/features/layout/AppShell.tsx
git commit -m "feat: add workspace variant state"
```

### Task 2: Restructure The Shell Around A Case Studio

**Files:**
- Modify: `apps/desktop/src/features/layout/AppShell.tsx`
- Modify: `apps/desktop/src/features/layout/Header.tsx`
- Modify: `apps/desktop/src/features/layout/Sidebar.tsx`
- Modify: `apps/desktop/src/features/layout/CaseContextBar.tsx`
- Modify: `apps/desktop/src/styles.css`
- Test: `apps/desktop/src/App.test.tsx`

**Step 1: Write the failing test**

Add assertions in `apps/desktop/src/App.test.tsx` for:
- a unified case workspace shell
- visible workspace-mode framing
- variant toggle or experiment surface in non-production/dev mode

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: FAIL because the shell still reflects the older multi-view structure.

**Step 3: Write minimal implementation**

Update layout files so the shell provides:
- left rail for case/workspace navigation
- top bar with case metadata and primary CTA
- more premium workspace proportions
- cleaner shared scaffolding for both A and B variants

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/layout/AppShell.tsx apps/desktop/src/features/layout/Header.tsx apps/desktop/src/features/layout/Sidebar.tsx apps/desktop/src/features/layout/CaseContextBar.tsx apps/desktop/src/styles.css src/App.test.tsx
git commit -m "feat: restructure shell into case studio"
```

### Task 3: Collapse Redundant Views Into Five Jobs

**Files:**
- Modify: `apps/desktop/src/store/useViewportStore.ts`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Modify: `apps/desktop/src/features/views/CaptureView.tsx`
- Modify: `apps/desktop/src/features/views/SimulateView.tsx`
- Modify: `apps/desktop/src/features/views/PlanView.tsx`
- Modify: `apps/desktop/src/features/views/ValidateView.tsx`
- Modify: `apps/desktop/src/features/views/PresentView.tsx`
- Test: `apps/desktop/src/features/views/CaptureView.test.tsx`
- Test: `apps/desktop/src/App.test.tsx`

**Step 1: Write the failing test**

Add failing coverage that verifies:
- the primary case workflow maps to `Import`, `Align`, `Design`, `Review`, `Present`
- old destinations are hidden, aliased, or absorbed
- the main workspace renders the new job framing

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test src/App.test.tsx src/features/views/CaptureView.test.tsx`
Expected: FAIL because legacy stage structure is still exposed.

**Step 3: Write minimal implementation**

Refactor navigation and workspace composition so:
- `Import` absorbs overview/capture intake behavior
- `Align` becomes the alignment-specific surface
- `Design` absorbs simulate/plan framing
- `Review` absorbs validate/compare framing
- `Present` absorbs collaborate/export actions

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test src/App.test.tsx src/features/views/CaptureView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/store/useViewportStore.ts apps/desktop/src/features/layout/Workspace.tsx apps/desktop/src/features/views/CaptureView.tsx apps/desktop/src/features/views/SimulateView.tsx apps/desktop/src/features/views/PlanView.tsx apps/desktop/src/features/views/ValidateView.tsx apps/desktop/src/features/views/PresentView.tsx src/App.test.tsx apps/desktop/src/features/views/CaptureView.test.tsx
git commit -m "feat: collapse workflow into five jobs"
```

### Task 4: Build Variant A Framing

**Files:**
- Modify: `apps/desktop/src/features/layout/Sidebar.tsx`
- Modify: `apps/desktop/src/features/layout/Header.tsx`
- Modify: `apps/desktop/src/features/views/SimulateView.tsx`
- Modify: `apps/desktop/src/features/views/PresentView.tsx`
- Modify: `apps/desktop/src/styles.css`
- Test: `apps/desktop/src/App.test.tsx`

**Step 1: Write the failing test**

Add assertions for Variant A behavior:
- free mode switching
- persistent studio framing
- minimal progress chrome

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: FAIL because no workspace-first variant exists yet.

**Step 3: Write minimal implementation**

Implement Variant A with:
- workspace-style mode tabs/rail
- persistent bottom strip when appropriate
- minimal instructional content
- emphasis on fast design iteration

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/layout/Sidebar.tsx apps/desktop/src/features/layout/Header.tsx apps/desktop/src/features/views/SimulateView.tsx apps/desktop/src/features/views/PresentView.tsx apps/desktop/src/styles.css src/App.test.tsx
git commit -m "feat: add workspace-first studio variant"
```

### Task 5: Build Variant B Framing

**Files:**
- Modify: `apps/desktop/src/features/layout/Header.tsx`
- Modify: `apps/desktop/src/features/layout/CaseContextBar.tsx`
- Modify: `apps/desktop/src/features/views/CaptureView.tsx`
- Modify: `apps/desktop/src/features/views/SimulateView.tsx`
- Modify: `apps/desktop/src/features/views/ValidateView.tsx`
- Modify: `apps/desktop/src/styles.css`
- Test: `apps/desktop/src/App.test.tsx`

**Step 1: Write the failing test**

Add assertions for Variant B behavior:
- top progress rail
- stage completion states
- single recommended next action
- de-emphasis of future stages until ready

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: FAIL because guided workspace behavior does not exist yet.

**Step 3: Write minimal implementation**

Implement Variant B with:
- progress rail
- readiness chips
- contextual next-step CTA
- guided but non-blocking stage framing

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/layout/Header.tsx apps/desktop/src/features/layout/CaseContextBar.tsx apps/desktop/src/features/views/CaptureView.tsx apps/desktop/src/features/views/SimulateView.tsx apps/desktop/src/features/views/ValidateView.tsx apps/desktop/src/styles.css src/App.test.tsx
git commit -m "feat: add guided workspace variant"
```

### Task 6: Upgrade Shared Visual System

**Files:**
- Modify: `apps/desktop/src/styles.css`
- Modify: `apps/desktop/src/features/layout/Header.tsx`
- Modify: `apps/desktop/src/features/layout/Sidebar.tsx`
- Modify: `apps/desktop/src/features/design/DesignSidebar.tsx`
- Modify: `apps/desktop/src/features/views/ImportView.tsx`
- Modify: `apps/desktop/src/features/views/PresentView.tsx`
- Test: `apps/desktop/src/App.test.tsx`

**Step 1: Write the failing test**

Add test coverage for key shared UI landmarks:
- prominent workspace shell
- right-side inspector groupings
- canvas-first hierarchy
- presence of shared status chips / action zones

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: FAIL because the shared visual system is still inconsistent.

**Step 3: Write minimal implementation**

Refine the shared visual system to match the approved design:
- calmer chrome
- stronger center-stage hierarchy
- inspector-card rhythm
- consistent status chips and action bars

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/styles.css apps/desktop/src/features/layout/Header.tsx apps/desktop/src/features/layout/Sidebar.tsx apps/desktop/src/features/design/DesignSidebar.tsx apps/desktop/src/features/views/ImportView.tsx apps/desktop/src/features/views/PresentView.tsx src/App.test.tsx
git commit -m "feat: unify smilefy-inspired visual system"
```

### Task 7: Add Experiment Measurement Hooks

**Files:**
- Create: `apps/desktop/src/features/experiments/workspaceMetrics.ts`
- Modify: `apps/desktop/src/features/layout/AppShell.tsx`
- Modify: `apps/desktop/src/features/views/CaptureView.tsx`
- Modify: `apps/desktop/src/features/views/SimulateView.tsx`
- Modify: `apps/desktop/src/features/views/ValidateView.tsx`
- Modify: `apps/desktop/src/features/views/PresentView.tsx`
- Test: `apps/desktop/src/features/experiments/workspaceMetrics.test.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/experiments/workspaceMetrics.test.ts` for:
- timing start/stop capture
- mode-switch counting
- alignment retry counting
- progression-to-present counting

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test src/features/experiments/workspaceMetrics.test.ts`
Expected: FAIL because experiment metrics helpers do not exist.

**Step 3: Write minimal implementation**

Create lightweight instrumentation helpers that capture:
- variant assignment
- timing checkpoints
- mode switches
- stage progression

Keep storage/reporting simple and local-first unless product requirements say otherwise.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test src/features/experiments/workspaceMetrics.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/experiments/workspaceMetrics.ts apps/desktop/src/features/experiments/workspaceMetrics.test.ts apps/desktop/src/features/layout/AppShell.tsx apps/desktop/src/features/views/CaptureView.tsx apps/desktop/src/features/views/SimulateView.tsx apps/desktop/src/features/views/ValidateView.tsx apps/desktop/src/features/views/PresentView.tsx
git commit -m "feat: add workspace experiment metrics"
```

### Task 8: Final Regression Sweep

**Files:**
- Modify: `docs/plans/2026-03-12-smilefy-inspired-workspace-ab-design.md`
- Modify: `docs/plans/2026-03-12-smilefy-inspired-workspace-ab-implementation.md`

**Step 1: Run targeted tests**

Run:

```bash
pnpm --filter desktop test src/App.test.tsx
pnpm --filter desktop test src/features/views/CaptureView.test.tsx
pnpm --filter desktop test src/features/alignment/photoAlignment.test.ts
```

Expected: PASS

**Step 2: Run full desktop suite**

Run:

```bash
pnpm --filter desktop test
```

Expected: PASS

**Step 3: Run production build**

Run:

```bash
pnpm --filter desktop build
```

Expected: PASS

**Step 4: Update docs if implementation drifted**

Revise the design and plan docs if names, files, or workflow details changed during implementation.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-12-smilefy-inspired-workspace-ab-design.md docs/plans/2026-03-12-smilefy-inspired-workspace-ab-implementation.md
git commit -m "docs: finalize workspace redesign plan"
```
