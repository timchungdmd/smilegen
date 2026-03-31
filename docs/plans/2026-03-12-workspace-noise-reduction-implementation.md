# Workspace Noise Reduction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce remaining workspace rollout test noise with minimal-risk, test-only cleanup while preserving current behavior and verification coverage.

**Architecture:** Keep the product runtime unchanged and isolate the warning cleanup to targeted tests and test mocks. Remove app-test warning sources by mocking `CaseListView`, replace the live alignment wizard in `App.test.tsx` with a lightweight stub so jsdom does not render the underlying scene tags, and add `act(...)` around direct store-driven rerenders in `CaptureView` tests.

**Tech Stack:** React, Vitest, React Testing Library, Zustand, Vite

---

### Task 1: Silence App-Level Case List Warning Spam

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`

**Step 1: Write the failing expectation**

Add or adjust a focused assertion in `apps/desktop/src/App.test.tsx` so the app shell still proves the cases surface is mounted through a lightweight mock instead of the live async list loader.

Example:

```tsx
vi.mock("./features/views/CaseListView", () => ({
  CaseListView: () => <div data-testid="mock-case-list">Cases Mock</div>,
}));

test("renders the app shell without depending on live case loading", () => {
  render(<App />);
  expect(screen.getByTestId("mock-case-list")).toBeInTheDocument();
});
```

**Step 2: Run test to verify the current warning-prone path**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS with existing warning noise still present before the mock is finalized.

**Step 3: Write minimal implementation**

Update `apps/desktop/src/App.test.tsx` to:

- mock `./features/views/CaseListView`
- keep the mock lightweight and stable
- avoid changing the product code
- preserve existing app-shell assertions

**Step 4: Run test to verify warning reduction and passing assertions**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS with the repeated `CaseListView` `act(...)` warnings removed or substantially reduced.

**Step 5: Commit**

```bash
git add apps/desktop/src/App.test.tsx
git commit -m "test: isolate app shell from case list warning noise"
```

### Task 2: Add `act(...)` Hygiene To Capture View Tests

**Files:**
- Modify: `apps/desktop/src/features/views/CaptureView.test.tsx`

**Step 1: Write the failing cleanup target**

Identify the direct store-update tests that trigger rerenders without `act(...)` and annotate the expected safer interaction flow.

Example:

```tsx
await act(async () => {
  useImportStore.setState({
    uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
  });
});
```

**Step 2: Run the targeted test file**

Run: `pnpm --filter desktop test src/features/views/CaptureView.test.tsx`
Expected: PASS with current `act(...)` warnings still present before cleanup.

**Step 3: Write minimal implementation**

Update `apps/desktop/src/features/views/CaptureView.test.tsx` to:

- import `act` where needed
- wrap direct Zustand state transitions that immediately affect rendered output
- avoid changing production code
- keep test intent unchanged

**Step 4: Run test to verify it passes more cleanly**

Run: `pnpm --filter desktop test src/features/views/CaptureView.test.tsx`
Expected: PASS with reduced or eliminated store-driven `act(...)` warnings.

**Step 5: Commit**

```bash
git add apps/desktop/src/features/views/CaptureView.test.tsx
git commit -m "test: wrap capture view store updates in act"
```

### Task 3: Isolate Alignment Wizard Warning Output

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`

**Step 1: Write the failing cleanup target**

Document the current warning source in the alignment-wizard render path and define the replacement mock shape.

Example:

```tsx
vi.mock("./features/capture/AlignmentCalibrationWizard", () => ({
  AlignmentCalibrationWizard: () => (
    <div data-testid="mock-alignment-wizard">Alignment Wizard Mock</div>
  ),
}));
```

**Step 2: Run the app test file**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS with wizard-driven scene warnings still present before cleanup.

**Step 3: Write minimal implementation**

Refine the test mocks in `apps/desktop/src/App.test.tsx` so:

- the alignment wizard is replaced with a simple DOM stub
- jsdom no longer renders the wizard's scan-viewer scene path
- behavior assertions stay unchanged

**Step 4: Run test to verify clean passing output**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS without the alignment-wizard scene warnings.

**Step 5: Commit**

```bash
git add apps/desktop/src/App.test.tsx
git commit -m "test: isolate alignment wizard warning noise"
```

### Task 4: Final Regression Sweep And Docs Drift Check

**Files:**
- Modify if needed: `docs/plans/2026-03-12-smilefy-inspired-workspace-ab-design.md`
- Modify if needed: `docs/plans/2026-03-12-smilefy-inspired-workspace-ab-implementation.md`
- Modify if needed: `docs/plans/2026-03-12-workspace-noise-reduction-design.md`

**Step 1: Run targeted regression checks**

Run:

```bash
pnpm --filter desktop test src/App.test.tsx
pnpm --filter desktop test src/features/views/CaptureView.test.tsx
```

Expected: PASS with repository-level warning output reduced compared with the pre-cleanup state.

**Step 2: Run the full desktop suite**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 3: Run the production build**

Run: `pnpm --filter desktop build`
Expected: PASS with the existing bundle-size warning still present. The runner-level `--localstorage-file` warning may still appear and is out of repo scope.

**Step 4: Update docs only if needed**

If implementation wording drifted, update only the relevant plan/design docs so they reflect the finished cleanup scope accurately.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-12-smilefy-inspired-workspace-ab-design.md docs/plans/2026-03-12-smilefy-inspired-workspace-ab-implementation.md docs/plans/2026-03-12-workspace-noise-reduction-design.md docs/plans/2026-03-12-workspace-noise-reduction-implementation.md
git commit -m "docs: finalize workspace noise reduction plan"
```
