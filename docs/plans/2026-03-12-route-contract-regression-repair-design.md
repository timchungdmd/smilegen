# Route Contract Regression Repair Design

**Date:** 2026-03-12

## Goal

Repair the route regressions introduced during desktop bundle optimization while preserving the lazy-loading and bundle-size improvements.

## Problem

The recent workspace lazy-loading pass broke route identity in two places:

- `overview` now renders the wrong screen (`CaptureView` instead of `OverviewView`)
- `collaborate` now renders the wrong screen (`PresentView` instead of `CollaborateView`)

Those substitutions conflict with the rest of the app, which still treats both as real destinations:

- opening a case lands on `overview`
- the case context breadcrumb routes to `overview`
- workflow contracts still define `collaborate` as a distinct stage surface

## Constraints

- Keep the recent bundle win
- Avoid broad workflow-model refactors
- Preserve current store semantics unless a real inconsistency requires change
- Add regression coverage for route identity, not just navigation mechanics

## Approaches Considered

### 1. Restore distinct lazy routes

Restore `OverviewView` and `CollaborateView` as separate lazily loaded workspace routes.

**Pros**
- Lowest risk
- Preserves existing navigation contracts
- Keeps bundle optimization structure intact

**Cons**
- Leaves the broader stage-vs-route model slightly complex

### 2. Hybrid restore with canonical-stage remap

Restore the views, but also rework stage semantics so `overview` and `collaborate` become explicitly secondary surfaces behind the 5-stage rail.

**Pros**
- Cleaner long-term model

**Cons**
- Higher regression risk
- Touches more files and semantics than needed for a bugfix

### 3. Full route contract refactor

Refactor store helpers, layout, metrics, and tests to fully separate workflow stages from workspace screens.

**Pros**
- Best architecture

**Cons**
- Too large for the current repair

## Recommendation

Use **restore distinct lazy routes**.

This fixes the regressions at the workspace composition boundary, where they were introduced, without reopening the product-model discussion or undoing the bundle improvements.

## Design

### 1. Restore one-to-one workspace route rendering

`Workspace.tsx` should lazily render the real component for each explicit workspace route:

- `overview -> OverviewView`
- `capture -> CaptureView`
- `simulate -> SimulateView`
- `plan -> PlanView`
- `validate -> ValidateView`
- `present -> PresentView`
- `collaborate -> CollaborateView`

### 2. Keep store helpers stable unless a true mismatch appears

`useViewportStore.ts` should remain unchanged unless implementation reveals a true mismatch.

The intended contract is:

- explicit `overview` resolves to `overview`
- `align` canonically resolves to the alignment-capable `capture` surface
- `design` canonically resolves to `simulate`
- `review` canonically resolves to `validate`
- `present` canonically resolves to `present`
- explicit `collaborate` remains a distinct route

If the existing helper implementation prevents that behavior, a narrow helper update is in scope for this repair.

### 3. Add route-identity regression tests

The test suite should verify:

- `overview` renders overview-specific content
- opening a case still lands on overview content
- `collaborate` renders collaborate-specific content
- `present` still renders present-specific content
- lazy workspace fallback behavior still works

### 4. Preserve the bundle optimization

The repair must not remove:

- route-level lazy loading
- current chunk splitting for the 3D stack
- the explicit `chunkSizeWarningLimit` used for the known `three` vendor chunk

## Success Criteria

- `overview` again shows `OverviewView`
- `collaborate` again shows `CollaborateView`
- existing workflow navigation still works
- lazy fallback behavior still works
- desktop tests pass
- desktop build passes
- bundle improvements remain intact

## Risks

### Risk: test coverage still proves mechanics instead of identity

If tests only click through tabs and wait for lazy content to settle, route substitutions can slip through again.

**Mitigation**

Add assertions for route-specific content, not just active view state.

### Risk: accidental store-level refactor expands scope

Changing helper semantics now could create new regressions unrelated to the bug.

**Mitigation**

Confine the repair to workspace rendering and focused regression tests.

## Out of Scope

- redesigning the 5-stage case model
- removing `overview` or `collaborate` as product destinations
- replacing the current bundle threshold strategy
- investigating the external `--localstorage-file` warning
