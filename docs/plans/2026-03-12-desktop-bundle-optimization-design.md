# Desktop Bundle Optimization Design

**Date:** 2026-03-12

## Goal

Reduce the desktop app’s oversized production entry chunk efficiently, with minimal behavioral risk, by splitting heavy workspace surfaces out of the initial bundle.

## Context

The current desktop build passes, but Vite still reports a large main bundle:

- `dist/assets/index-*.js` around `1.5 MB`

The remaining non-repo runner warning about `--localstorage-file` is not configured in this repository and is not a good next target for an efficiency-first pass. The bundle warning is definitely repo-controlled, affects production output directly, and has a clear technical path.

## Constraints

- Optimize for efficiency
- Stay inside repo-controlled changes
- Preserve the approved Smilefy-inspired workspace behavior
- Avoid deep architectural rewrites
- Keep risk low by using existing view boundaries first

## Approaches Considered

### 1. Route-level lazy loading

Lazy-load the major workspace views and let the shell/navigation stay eager.

**Pros**
- Best balance of impact and safety
- Fits the current architecture
- Minimal behavioral change if fallbacks are well-placed

**Cons**
- Might not be enough by itself if heavy feature code is still imported eagerly below the view boundary

### 2. Manual vendor chunking

Add `manualChunks` in Vite for `three`, `@react-three/fiber`, `@react-three/drei`, and other heavy vendor groups.

**Pros**
- Straightforward
- Can reduce main chunk size without major React changes

**Cons**
- More brittle than lazy boundaries
- Can hide rather than solve eager-loading problems

### 3. Deeper feature-graph refactor

Refactor the 3D/alignment/design stack into more aggressively deferred sub-features.

**Pros**
- Highest long-term ceiling

**Cons**
- Too invasive for the current efficiency-first pass
- Higher regression risk

## Recommendation

Use **route-level lazy loading first**, then add small targeted `manualChunks` only if the build still leaves the main entry chunk too large.

This is the fastest way to improve the shipped bundle while keeping the workspace rollout stable. The current app already has strong view boundaries, so we should take advantage of them before doing any deeper split.

## Proposed Design

### 1. Keep the app shell eager

Keep these loaded in the initial bundle:

- app bootstrap
- shell layout
- header/sidebar/context chrome
- light navigation/store logic

This keeps startup predictable and avoids fragmenting the basic app frame.

### 2. Lazy-load workspace views from the layout boundary

In the workspace composition layer, lazy-load the heavy case-stage views:

- import/capture surface
- design/simulate surface
- review/validate surface
- present surface

This should be the first split because the app already routes through those boundaries naturally.

### 3. Add small loading fallbacks

Each lazy workspace surface should render a compact clinical loading state inside the content area rather than flashing a blank screen. The fallback should feel native to the app shell and not interrupt navigation context.

### 4. Evaluate whether heavier internals still need splitting

If the main bundle remains too large after view-level splits, defer selected heavy feature internals next:

- alignment wizard
- 3D viewport path
- design viewport/editor path

Only split further if the build evidence shows the top-level lazy loading is not enough.

### 5. Add targeted Vite manual chunking only if needed

If the entry chunk still remains too large, add explicit `manualChunks` for:

- `three`
- `@react-three/fiber`
- `@react-three/drei`

This should be a follow-on optimization, not the first move.

If build evidence then shows that the remaining oversized asset is a single intentional vendor chunk from `three` itself, prefer setting an explicit `chunkSizeWarningLimit` that matches the measured desktop bundle shape rather than forcing a riskier feature rewrite just to satisfy Vite's generic warning threshold.

## Success Criteria

- the main production entry chunk becomes materially smaller
- the app still opens and navigates through `Import -> Align -> Design -> Review -> Present`
- tests remain green
- build remains green
- no regression in workspace framing or stage routing

## Risks

### Risk: first-open loading delay

Lazy loading can introduce the first noticeable delay when opening a heavy stage.

**Mitigation**

Use small, intentional fallbacks inside the workspace content region and keep the shell persistent.

### Risk: mounted-view assumptions break

The workspace currently keeps views mounted once rendered. A careless lazy boundary could change when stateful surfaces first mount.

**Mitigation**

Split only at existing route/view boundaries first, and verify stage transitions explicitly after the change.

### Risk: bundle doesn’t shrink enough

If heavy imports are still pulled into the base graph, route-level splitting may not be sufficient.

**Mitigation**

Measure after each split step and only then decide whether internal lazy loading or Vite chunk rules are necessary.

## Out of Scope

- runner-level `--localstorage-file` investigation
- general test harness redesign
- large-scale architecture refactor of 3D/design internals
- unrelated UI changes
