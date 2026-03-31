# Desktop Bundle Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the oversized desktop production entry bundle by lazily loading heavy workspace surfaces first, then applying targeted Vite chunking only if build evidence says it is needed.

**Architecture:** Keep the app shell eager and split at the existing workspace view boundary so heavy case-stage surfaces do not all ship in the base chunk. Measure after each split; only introduce `manualChunks` if route-level lazy loading does not shrink the main entry chunk enough. If a final oversized asset remains because of an intentional monolithic vendor package like `three`, document that evidence and set an explicit `chunkSizeWarningLimit` instead of forcing a higher-risk refactor.

**Tech Stack:** React 19, Vite 6, Vitest, React Testing Library, TypeScript, Zustand

---

### Task 1: Add A Build-Size Regression Test Surface

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`

**Step 1: Write the failing test**

Add a test in `apps/desktop/src/App.test.tsx` that proves the workspace still renders a stable loading/fallback shell while lazy views resolve.

Example:

```tsx
test("workspace keeps shell chrome visible while lazy content resolves", async () => {
  render(<App />);
  expect(screen.getByText("SmileGen")).toBeInTheDocument();
  expect(screen.getByTestId("workspace-loading-fallback")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: FAIL because no explicit workspace fallback exists yet.

**Step 3: Write minimal implementation**

Update `apps/desktop/src/features/layout/Workspace.tsx` to include a lightweight, testable fallback container for lazy workspace content.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/App.test.tsx apps/desktop/src/features/layout/Workspace.tsx
git commit -m "feat: add workspace lazy-loading fallback"
```

### Task 2: Lazy-Load Major Workspace Views

**Files:**
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Modify if needed: `apps/desktop/src/features/views/CaptureView.tsx`
- Modify if needed: `apps/desktop/src/features/views/SimulateView.tsx`
- Modify if needed: `apps/desktop/src/features/views/ValidateView.tsx`
- Modify if needed: `apps/desktop/src/features/views/PresentView.tsx`
- Test: `apps/desktop/src/App.test.tsx`

**Step 1: Write the failing test**

Expand `apps/desktop/src/App.test.tsx` with assertions that navigation still works across the five workflow stages after the workspace switches to lazy imports.

Example:

```tsx
test("lazy workspace navigation still reaches canonical workflow stages", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Align" }));
  await screen.findByText(/^Align$/);
  fireEvent.click(screen.getByRole("button", { name: "Design" }));
  await screen.findByText(/^Design$/);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: FAIL because the existing workspace does not yet use lazy-loading boundaries and fallback-aware assertions.

**Step 3: Write minimal implementation**

Update `apps/desktop/src/features/layout/Workspace.tsx` to:

- import heavy workspace views with `React.lazy`
- wrap the workspace content region in `Suspense`
- keep the shell and workflow rail eager
- preserve canonical stage routing behavior

Do not add deeper feature splits yet.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test src/App.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/layout/Workspace.tsx apps/desktop/src/App.test.tsx apps/desktop/src/features/views/CaptureView.tsx apps/desktop/src/features/views/SimulateView.tsx apps/desktop/src/features/views/ValidateView.tsx apps/desktop/src/features/views/PresentView.tsx
git commit -m "feat: lazy-load desktop workspace views"
```

### Task 3: Measure Build Impact And Add Manual Chunks Only If Needed

**Files:**
- Modify if needed: `apps/desktop/vite.config.ts`

**Step 1: Run the build after Task 2**

Run: `pnpm --filter desktop build`
Expected: PASS with updated chunk output to inspect.

**Step 2: Decide based on build evidence**

If the main `index-*.js` chunk is still unacceptably large, prepare a minimal Vite split for heavy 3D vendor code.

Example shape:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        three: ["three", "@react-three/fiber", "@react-three/drei"],
      },
    },
  },
}
```

**Step 3: Write minimal implementation if needed**

Update `apps/desktop/vite.config.ts` with only the smallest targeted `manualChunks` set justified by the build output. If the remaining warning is then isolated to a known single vendor chunk from `three`, add a narrowly justified `chunkSizeWarningLimit` that reflects the measured desktop bundle profile.

**Step 4: Run build to verify improvement**

Run: `pnpm --filter desktop build`
Expected: PASS with the main chunk reduced further than the post-lazy-load baseline.

**Step 5: Commit**

```bash
git add apps/desktop/vite.config.ts
git commit -m "build: split heavy 3d vendor chunks"
```

Skip this commit if build evidence shows manual chunking is unnecessary.

### Task 4: Final Regression Sweep And Docs Drift Check

**Files:**
- Modify if needed: `docs/plans/2026-03-12-desktop-bundle-optimization-design.md`
- Modify if needed: `docs/plans/2026-03-12-desktop-bundle-optimization-implementation.md`
- Modify if needed: `docs/plans/2026-03-12-smilefy-inspired-workspace-ab-design.md`
- Modify if needed: `docs/plans/2026-03-12-smilefy-inspired-workspace-ab-implementation.md`

**Step 1: Run targeted regression checks**

Run:

```bash
pnpm --filter desktop test src/App.test.tsx
pnpm --filter desktop test src/features/views/CaptureView.test.tsx
```

Expected: PASS

**Step 2: Run the full desktop suite**

Run: `pnpm --filter desktop test`
Expected: PASS

**Step 3: Run the production build**

Run: `pnpm --filter desktop build`
Expected: PASS with improved chunk output relative to the original `~1.5 MB` entry chunk

**Step 4: Update docs only if needed**

Document whether the optimization stopped at lazy loading or also required `manualChunks`.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-12-desktop-bundle-optimization-design.md docs/plans/2026-03-12-desktop-bundle-optimization-implementation.md docs/plans/2026-03-12-smilefy-inspired-workspace-ab-design.md docs/plans/2026-03-12-smilefy-inspired-workspace-ab-implementation.md
git commit -m "docs: finalize desktop bundle optimization plan"
```
