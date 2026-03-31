# Route Contract Regression Repair Implementation Plan

**Goal:** Restore `overview` and `collaborate` as real distinct workspace routes without undoing the recent bundle optimization.

**Architecture:** Fix the regression at the workspace composition boundary by restoring one-to-one lazy route rendering, then add route-identity tests that prove the affected screens render the correct content. If route helpers still collapse explicit destinations or send `align` to the wrong surface, apply the smallest helper change needed to preserve `overview` and `collaborate` while keeping `align` on the capture/alignment workspace.

**Tech Stack:** React 19, Vite 6, Vitest, React Testing Library, TypeScript, Zustand

---

### Task 1: Restore Distinct Lazy Route Components

**Files:**
- Modify: `apps/desktop/src/features/layout/Workspace.tsx`
- Modify if needed: `apps/desktop/src/store/useViewportStore.ts`

**Steps:**
1. Add lazy imports for `OverviewView` and `CollaborateView`.
2. Update the lazy route map so:
   - `overview` renders `OverviewView`
   - `collaborate` renders `CollaborateView`
3. If route helpers still collapse those screens, update `getWorkspaceRouteForView()` so:
   - explicit `overview` stays `overview`
   - explicit `collaborate` stays `collaborate`
   - primary `align` routes to `capture`
4. Keep the existing mounted-once and `Suspense` behavior unchanged for all lazy routes.

**Verification:**
- `pnpm --filter desktop test src/App.test.tsx`

---

### Task 2: Add Route-Identity Regression Coverage

**Files:**
- Modify: `apps/desktop/src/App.test.tsx`

**Steps:**
1. Add a test that `activeView: "overview"` renders overview-specific content.
2. Add a test that case-opening behavior still lands on overview content.
3. Add a test that `activeView: "collaborate"` renders collaborate-specific content.
4. Add a test that `activeView: "present"` still renders present-specific content.
5. Keep the existing lazy fallback/navigation tests intact.

**Verification:**
- `pnpm --filter desktop test src/App.test.tsx`

---

### Task 3: Run Full Regression And Build Verification

**Files:**
- No new code changes expected unless verification exposes drift

**Steps:**
1. Run targeted app tests.
2. Run the full desktop suite.
3. Run the desktop production build.
4. Confirm the build still keeps the reduced entry chunk and passes cleanly.

**Verification:**
- `pnpm --filter desktop test src/App.test.tsx`
- `pnpm --filter desktop test`
- `pnpm --filter desktop build`

---

### Task 4: Final Doc Drift Check

**Files:**
- Modify if needed: `docs/plans/2026-03-12-route-contract-regression-repair-design.md`
- Modify if needed: `docs/plans/2026-03-12-route-contract-regression-repair-implementation.md`

**Steps:**
1. Confirm the implemented fix matches the design.
2. Update wording only if execution differs from the planned route repair.

**Verification:**
- `git diff -- docs/plans/2026-03-12-route-contract-regression-repair-design.md docs/plans/2026-03-12-route-contract-regression-repair-implementation.md`
