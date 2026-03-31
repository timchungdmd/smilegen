# UX Overhaul Phase 2: Import-to-Design Flow

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut happy path from 18 clicks to 10-12. Unify ViewId system, auto-navigate after generate, pre-select tooth library, improve FTUX, make auto-detect primary alignment.

**Architecture:** Canonical ViewId = workflow stage names. Legacy route names become migration aliases. Workspace routing keys change to match. Keyboard shortcuts updated to 5 stages.

**Tech Stack:** React, Zustand, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-smilegen-ux-overhaul-design.md` (Phase 2)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/store/useViewportStore.ts` | Reverse LEGACY_VIEW_MAP, simplify ViewId type, update initial state |
| Modify | `src/features/layout/Workspace.tsx` | Update LAZY_WORKSPACE_ROUTES to canonical names |
| Modify | `src/features/layout/Sidebar.tsx` | Update nav items to use canonical IDs |
| Modify | `src/features/layout/Header.tsx` | Update stage comparisons |
| Modify | `src/features/shortcuts/keyboardShortcuts.ts` | Update view shortcuts to 5 stages |
| Modify | `src/features/shortcuts/useKeyboardShortcuts.ts` | Update VIEW_ACTIONS mapping |
| Modify | `src/store/useDesignStore.ts` | Add auto-navigate after quickGenerate |
| Modify | `src/features/views/HowToGuidePanel.tsx` | FTUX open-by-default |
| Modify | `src/features/views/CaptureView.tsx` | Auto-detect as primary alignment |
| Modify | `src/features/views/SimulateView.tsx` | Auto-detect as primary alignment |
| Modify | `src/App.test.tsx` | Update test assertions for new ViewId values |
| Modify | Multiple view files | Update getCaseWorkflowStage/getWorkspaceRouteForView call sites |

All paths relative to `apps/desktop/`.

---

## Task 1: Unify ViewId system

This is a large mechanical refactor. The core change: make workflow stage names (`import`, `align`, `design`, `review`, `present`) the canonical ViewId values. Old route names (`capture`, `overview`, `simulate`, `plan`, `validate`, `collaborate`) become legacy aliases.

**Files:**
- Modify: `src/store/useViewportStore.ts`
- Modify: `src/features/layout/Workspace.tsx`
- Modify: `src/features/layout/Sidebar.tsx`
- Modify: `src/features/layout/Header.tsx`
- Modify: `src/features/shortcuts/keyboardShortcuts.ts`
- Modify: `src/features/shortcuts/useKeyboardShortcuts.ts`
- Modify: `src/App.test.tsx`
- Modify: All view files that use getCaseWorkflowStage or getWorkspaceRouteForView

### Step-by-step:

- [ ] **Step 1: Update useViewportStore.ts — ViewId type**

Simplify the ViewId type (currently line 19-35). Replace with:

```typescript
export type ViewId =
  | "cases"
  | "import"
  | "align"
  | "design"
  | "review"
  | "present"
  | "settings";
```

- [ ] **Step 2: Reverse LEGACY_VIEW_MAP**

Change the map direction (currently line 38-45). Old route names map TO canonical names:

```typescript
export const LEGACY_VIEW_MAP: Record<string, ViewId> = {
  capture: "import",
  overview: "align",
  simulate: "design",
  plan: "design",
  validate: "review",
  collaborate: "present",
  compare: "review",
  export: "present",
};
```

- [ ] **Step 3: Update normalizeViewId**

```typescript
export function normalizeViewId(id: string): ViewId {
  return (LEGACY_VIEW_MAP[id] as ViewId) ?? (id as ViewId);
}
```

- [ ] **Step 4: Simplify getCaseWorkflowStage**

Since canonical IDs now directly name the workflow stages, this becomes simpler:

```typescript
export type CaseWorkflowStage = "import" | "align" | "design" | "review" | "present";

const WORKFLOW_STAGES = new Set<string>(["import", "align", "design", "review", "present"]);

export function getCaseWorkflowStage(id: ViewId): CaseWorkflowStage | null {
  const normalized = normalizeViewId(id);
  return WORKFLOW_STAGES.has(normalized) ? (normalized as CaseWorkflowStage) : null;
}
```

- [ ] **Step 5: Delete getWorkspaceRouteForView**

This function is no longer needed — canonical IDs are the workspace routes. Delete it and fix all import sites. Search for `getWorkspaceRouteForView` across the codebase and replace:
- Any `getWorkspaceRouteForView(view)` call → just use `normalizeViewId(view)` or the view directly
- Remove the export from useViewportStore.ts

- [ ] **Step 6: Update INITIAL_VIEWPORT_STATE**

Change `activeView: "capture"` to `activeView: "import"` (line 227).

- [ ] **Step 7: Update Workspace.tsx — LAZY_WORKSPACE_ROUTES**

Change the lazy route definitions and type:

```typescript
type LazyWorkspaceRoute =
  | "import"
  | "align"
  | "design"
  | "review"
  | "present";

const LAZY_WORKSPACE_ROUTES: LazyWorkspaceRoute[] = [
  "import",
  "align",
  "design",
  "review",
  "present",
];
```

Update lazy import mappings — keep component file names but change routing keys:
```typescript
const CaptureView = lazy(...);    // renders for "import"
const OverviewView = lazy(...);   // renders for "align"
const SimulateView = lazy(...);   // renders for "design"
const ValidateView = lazy(...);   // renders for "review"
const PresentView = lazy(...);    // renders for "present"
```

Remove PlanView and CollaborateView lazy imports (merged into design and present respectively).

Update the `show()` function — it now compares against canonical IDs. The `resolved` variable should use `normalizeViewId(activeView)` instead of `getWorkspaceRouteForView(activeView)`.

Update all `renderLazyRoute()` calls to use canonical IDs:
```typescript
{renderLazyRoute("import", "Import", CaptureView)}
{renderLazyRoute("align", "Align", OverviewView)}
{renderLazyRoute("design", "Design", SimulateView)}
{renderLazyRoute("review", "Review", ValidateView)}
{renderLazyRoute("present", "Present", PresentView)}
```

- [ ] **Step 8: Update Sidebar.tsx**

The sidebar's nav items should use canonical IDs. Find the NAV_ITEMS array and ensure all items use canonical ViewId values. The `normalizeViewId` call for active state comparison should still work since both old and new IDs normalize to canonical.

- [ ] **Step 9: Update Header.tsx**

Replace any `getWorkspaceRouteForView` usage with direct canonical ID comparison. The `getCaseWorkflowStage` call (line 123) stays since it now just checks if the ID is a workflow stage.

- [ ] **Step 10: Update keyboardShortcuts.ts**

Replace view shortcuts:
```typescript
{ key: "1", description: "Import view", action: "view:import" },
{ key: "2", description: "Align view", action: "view:align" },
{ key: "3", description: "Design view", action: "view:design" },
{ key: "4", description: "Review view", action: "view:review" },
{ key: "5", description: "Present view", action: "view:present" },
```

- [ ] **Step 11: Update useKeyboardShortcuts.ts**

Replace VIEW_ACTIONS:
```typescript
const VIEW_ACTIONS: Record<string, ViewId> = {
  "view:import": "import",
  "view:align": "align",
  "view:design": "design",
  "view:review": "review",
  "view:present": "present",
};
```

- [ ] **Step 12: Fix all remaining call sites**

Search for `getWorkspaceRouteForView` across the codebase. For each:
- In view files that compare against route names (e.g., `=== "simulate"`), change to canonical name (e.g., `=== "design"`)
- In `setActiveView` calls that pass route names, change to canonical names

Key files to check: SimulateView.tsx, CaptureView.tsx, ValidateView.tsx, PresentView.tsx, ImportView.tsx

- [ ] **Step 13: Update App.test.tsx**

Any test assertions that reference old ViewId values ("capture", "simulate", "validate", etc.) must use canonical names.

- [ ] **Step 14: Run TypeScript check**

Run: `cd apps/desktop && npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 15: Run tests**

Run: `cd apps/desktop && npx vitest run`
Expected: All pass (except pre-existing toothMatcher).

- [ ] **Step 16: Commit**

```bash
git add -A apps/desktop/src/
git commit -m "refactor(nav): unify ViewId system — canonical workflow stage names"
```

---

## Task 2: Auto-navigate after Generate

**Files:**
- Modify: `src/store/useDesignStore.ts`

- [ ] **Step 1: Add auto-navigation to quickGenerate**

In `useDesignStore.ts`, after `applyGeneration(set, get)` completes in `quickGenerate()`, add:

```typescript
// Auto-navigate to design view after generation
const { setActiveView } = await import("./useViewportStore").then(m => ({ setActiveView: m.useViewportStore.getState().setActiveView }));
setActiveView("design");
```

Or simpler — import useViewportStore at the top and call inline:
```typescript
import { useViewportStore } from "./useViewportStore";
// ... inside quickGenerate, after applyGeneration:
useViewportStore.getState().setActiveView("design");
```

- [ ] **Step 2: Run TypeScript check and tests**

Run: `cd apps/desktop && npx tsc --noEmit && npx vitest run`

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/store/useDesignStore.ts
git commit -m "feat(workflow): auto-navigate to design view after generate"
```

---

## Task 3: Pre-select default tooth library

**Files:**
- Modify: `src/store/useViewportStore.ts`

- [ ] **Step 1: Change activeCollectionId default**

In INITIAL_VIEWPORT_STATE, change:
```typescript
activeCollectionId: null,
```
to:
```typescript
activeCollectionId: "natural-ovoid",
```

- [ ] **Step 2: Run tests**

Run: `cd apps/desktop && npx vitest run`

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/store/useViewportStore.ts
git commit -m "feat(workflow): pre-select natural-ovoid tooth library as default"
```

---

## Task 4: FTUX HowToGuidePanel open by default

**Files:**
- Modify: `src/features/views/HowToGuidePanel.tsx`

- [ ] **Step 1: Add FTUX localStorage check**

Replace:
```typescript
const [open, setOpen] = useState(false);
```
with:
```typescript
const [open, setOpen] = useState(() => {
  return !localStorage.getItem("smilegen-ftux-seen");
});
```

- [ ] **Step 2: Set flag on first close**

In the toggle handler, add:
```typescript
const handleToggle = () => {
  setOpen((v) => {
    if (v) {
      // Closing — mark FTUX as seen
      localStorage.setItem("smilegen-ftux-seen", "1");
    }
    return !v;
  });
};
```

Update the onClick to use `handleToggle` instead of `() => setOpen((v) => !v)`.

- [ ] **Step 3: Run tests**

Run: `cd apps/desktop && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/features/views/HowToGuidePanel.tsx
git commit -m "feat(ftux): open HowToGuidePanel by default on first launch"
```

---

## Task 5: Auto-detect as primary alignment

**Files:**
- Modify: `src/features/views/CaptureView.tsx`
- Modify: `src/features/views/SimulateView.tsx`

- [ ] **Step 1: Update CaptureView stage header**

In `CaptureStageHeader`, swap the button hierarchy:
- The "Auto-detect" button becomes the primary CTA (larger, accent-colored) when both photo and scan are available AND sidecar is ready
- The "Align Photo" wizard button becomes "Refine Alignment" — secondary style (smaller, muted border)
- If sidecar is unavailable, "Align Photo" stays primary

- [ ] **Step 2: Update SimulateView stage header**

Apply the same button hierarchy swap in `SimulateStageHeader`.

- [ ] **Step 3: Run tests**

Run: `cd apps/desktop && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/features/views/CaptureView.tsx apps/desktop/src/features/views/SimulateView.tsx
git commit -m "feat(alignment): make auto-detect primary, wizard becomes refine fallback"
```

---

## Task 6: Final Phase 2 verification

- [ ] **Step 1: Run full test suite**

Run: `cd apps/desktop && npx vitest run`

- [ ] **Step 2: Run TypeScript check**

Run: `cd apps/desktop && npx tsc --noEmit`

- [ ] **Step 3: Run production build**

Run: `cd apps/desktop && npx vite build`

- [ ] **Step 4: Verify keyboard shortcuts**

Start dev server and verify:
- Key 1 → Import view
- Key 2 → Align view
- Key 3 → Design view
- Key 4 → Review view
- Key 5 → Present view
