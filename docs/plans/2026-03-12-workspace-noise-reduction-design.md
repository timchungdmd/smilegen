# Workspace Noise Reduction Design

**Date:** 2026-03-12

## Goal

Reduce the remaining test-suite noise around the workspace A/B rollout without changing production behavior. This pass is intentionally limited to minimal-risk cleanup: final regression verification, test-only warning reduction, and plan/doc drift checks.

## Context

The workspace redesign rollout is functionally green:

- targeted metrics tests pass
- the app test suite passes
- the full desktop suite passes
- the production build passes

The remaining noise is concentrated in two places:

1. repeated `act(...)` warnings caused by async `CaseListView` effects and direct Zustand store updates in tests
2. alignment-wizard rendering in app tests, which pulls in R3F scene elements and emits invalid tag warnings in jsdom

There is also a repeated Node warning about `--localstorage-file`, but that does not come from this repository's test scripts and is treated as runner-level noise outside the scope of this pass.

The current bundle-size warning is not part of this cleanup. It is a separate optimization task and should remain explicitly out of scope here.

## Constraints

- Minimal risk only
- No product behavior changes
- No runtime refactor of case loading or workspace state
- No large test harness rewrite
- No code-splitting or bundle optimization in this pass

## Approaches Considered

### 1. Targeted test-only cleanup

Mock noisy async surfaces in app-level tests, wrap direct store mutations in `act(...)`, and replace the alignment wizard with a lightweight mock in `App.test.tsx` so jsdom never renders the underlying scene tags.

**Pros**
- Lowest risk
- Fastest path to cleaner verification output
- Keeps production code untouched

**Cons**
- Leaves some broader test-architecture debt in place

### 2. Shared test harness cleanup

Build common test helpers for app rendering, store reset, case loading, and async synchronization.

**Pros**
- Cleaner long-term structure
- Reduces repetition across tests

**Cons**
- Touches more files
- Higher churn risk during a stabilization pass

### 3. Runtime plus test cleanup

Refactor runtime components like `CaseListView` to be easier to test, then simplify the tests around them.

**Pros**
- Best architectural end state

**Cons**
- Unnecessarily invasive for a warning-reduction pass
- Risks behavioral changes late in the rollout

## Recommendation

Use **Approach 1: targeted test-only cleanup**.

This is the best fit for the current stage of the project because it reduces warning noise while preserving the validated workspace behavior. It also keeps the final regression sweep aligned with the already-approved rollout plan instead of quietly expanding scope.

## Proposed Changes

### 1. App test noise isolation

In `/Users/timchung/Desktop/smilegen/apps/desktop/src/App.test.tsx`, replace the live `CaseListView` with a lightweight mock component. The app tests are focused on workspace shell and workflow framing, not the IndexedDB-backed case list lifecycle, so mocking that surface removes unrelated async warning spam without weakening the assertions those tests actually care about.

### 2. Capture test act hygiene

In `/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/CaptureView.test.tsx`, wrap direct store updates that trigger rerenders in `act(...)`. This keeps the tests closer to React Testing Library expectations and should eliminate the remaining low-signal warnings coming from synchronous test setup.

### 3. Alignment wizard isolation in app tests

Replace the live alignment wizard in `App.test.tsx` with a lightweight mock component. This prevents the app suite from reaching the wizard's scan viewer path, which is where the invalid tag warnings were coming from, without changing any production behavior.

### 4. Final regression and docs pass

Re-run:

- `pnpm --filter desktop test src/App.test.tsx`
- `pnpm --filter desktop test src/features/views/CaptureView.test.tsx`
- `pnpm --filter desktop test`
- `pnpm --filter desktop build`

Then update the workspace redesign docs only if file names, task sequencing, or outcome wording drifted from the implementation.

## Success Criteria

- `App.test.tsx` passes with the repeated `CaseListView`-driven warning spam removed
- `CaptureView.test.tsx` passes with reduced or eliminated `act(...)` warnings
- alignment-wizard-driven scene warnings are no longer emitted in app tests
- Full desktop tests still pass
- Production build still passes
- Existing bundle warning remains explicitly tracked as out of scope, not silently ignored

## Risks

### Risk: over-mocking app tests

If the `CaseListView` mock becomes too minimal, app tests might stop exercising shell composition realistically.

**Mitigation**

Mock only the case-list surface and keep its visible label/placeholder stable enough that the shell still renders as expected.

### Risk: test-only cleanup misses one warning source

Some warning paths may still remain after the first pass, especially runner-level noise outside the repository.

**Mitigation**

Treat this as a warning-reduction pass, verify after each targeted change, and avoid widening scope unless a warning source clearly sits in the same low-risk category.

## Out of Scope

- bundle size optimization
- code splitting
- runtime refactors in `CaseListView`
- store architecture cleanup
- generic shared testing infrastructure redesign
