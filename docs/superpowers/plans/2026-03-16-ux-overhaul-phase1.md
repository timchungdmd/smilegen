# UX Overhaul Phase 1: Structural + Quick Wins

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant navigation layers, fix WCAG contrast, fix ARIA accessibility. Zero new features — subtract and fix.

**Architecture:** Delete the CaseContextBar and workflow rail, simplify AppShell from 3-row to 2-row grid, relocate "New Case" to Header, update CSS variables for contrast compliance, add ARIA roles to sidebar/workspace.

**Tech Stack:** React, CSS custom properties, Zustand stores, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-smilegen-ux-overhaul-design.md` (Phase 1)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Delete | `src/features/layout/CaseContextBar.tsx` | Redundant case context bar |
| Modify | `src/features/layout/AppShell.tsx:9,86-88,95` | Remove CaseContextBar import/render, simplify grid |
| Modify | `src/features/layout/Workspace.tsx:175-224` | Remove workflow rail, update gridRow |
| Modify | `src/features/layout/Header.tsx` | Add "New Case" button |
| Modify | `src/features/layout/Sidebar.tsx:143-144` | Add ARIA tablist role |
| Modify | `src/styles.css:21,30-31,1569` | Update contrast variables + sidebar grid-row |
| Modify | `src/App.test.tsx` | Remove CaseContextBar tests + workflow rail tests |
| Modify | `src/features/views/CaptureView.test.tsx` | Update tests if they reference workflow rail |

All paths relative to `apps/desktop/`.

---

## Chunk 1: Remove Redundant Navigation

### Task 1: Delete CaseContextBar and simplify AppShell grid

**Files:**
- Delete: `src/features/layout/CaseContextBar.tsx`
- Modify: `src/features/layout/AppShell.tsx:9,86-88,95`

- [ ] **Step 1: Remove CaseContextBar import and rendering from AppShell**

In `src/features/layout/AppShell.tsx`, remove line 9:
```typescript
import { CaseContextBar } from "./CaseContextBar";
```

Remove line 95:
```tsx
<CaseContextBar />
```

- [ ] **Step 2: Simplify the AppShell grid from 3 rows to 2 rows**

In `src/features/layout/AppShell.tsx`, change the grid style (line 86):

Before:
```typescript
gridTemplateRows: "var(--header-height) auto 1fr",
```

After:
```typescript
gridTemplateRows: "var(--header-height) 1fr",
```

- [ ] **Step 3: Update sidebar grid-row in CSS**

In `src/styles.css`, line 1569, the `.app-sidebar` class has `grid-row: 3`. Change to match the new 2-row grid:

```css
/* Before */
grid-row: 3;
/* After */
grid-row: 2;
```

- [ ] **Step 4: Remove CaseContextBar tests from App.test.tsx**

In `src/App.test.tsx`, remove:
- Line 18: `import { CaseContextBar } from "./features/layout/CaseContextBar";`
- The test "case context breadcrumb stays visible..." (around lines 483-499)
- The test "case context title returns to Import..." (around lines 501-517)

These tests render `<CaseContextBar />` directly and will fail once the file is deleted.

- [ ] **Step 5: Delete the CaseContextBar file**

Delete: `src/features/layout/CaseContextBar.tsx`

- [ ] **Step 6: Run TypeScript check**

Run: `cd apps/desktop && npx tsc --noEmit`
Expected: Clean. No other file imports CaseContextBar (only AppShell and App.test.tsx did, both now updated).

- [ ] **Step 7: Commit**

```bash
git add -A apps/desktop/src/features/layout/CaseContextBar.tsx apps/desktop/src/features/layout/AppShell.tsx apps/desktop/src/App.test.tsx apps/desktop/src/styles.css
git commit -m "refactor(layout): remove CaseContextBar, simplify AppShell to 2-row grid"
```

---

### Task 2: Remove workflow rail from Workspace

**Files:**
- Modify: `src/features/layout/Workspace.tsx:175-224`

- [ ] **Step 1: Remove the case-workflow-rail JSX block**

In `src/features/layout/Workspace.tsx`, delete the entire conditional block (lines 186-224):

```tsx
{activeStage && (
  <div
    data-testid="case-workflow-rail"
    ...
  >
    {CASE_WORKFLOW_STAGES.map((stage) => { ... })}
  </div>
)}
```

Also remove the unused `activeStage` variable (line 127):
```typescript
const activeStage = getCaseWorkflowStage(activeView);
```

And the `CASE_WORKFLOW_STAGES` constant (lines 80-86):
```typescript
const CASE_WORKFLOW_STAGES: { id: CaseWorkflowStage; label: string }[] = [
  { id: "import", label: "Import" },
  ...
];
```

And the `CaseWorkflowStage` import from `useViewportStore` (line 9):
```typescript
import type { CaseWorkflowStage, ViewId } from "../../store/useViewportStore";
```
Change to:
```typescript
import type { ViewId } from "../../store/useViewportStore";
```

Keep `getCaseWorkflowStage` in `useViewportStore.ts` — it is used by `Header.tsx`, `Sidebar.tsx`, `SimulateView.tsx`, and `CaptureView.tsx`. Only remove it from the Workspace.tsx import statement if Workspace no longer uses it after deleting the rail.

- [ ] **Step 2: Update Workspace gridRow**

In the `<main>` element style (line 178), change:
```typescript
gridRow: 3,
```
to:
```typescript
gridRow: 2,
```

- [ ] **Step 3: Run TypeScript check**

Run: `cd apps/desktop && npx tsc --noEmit`
Expected: Clean. If `getCaseWorkflowStage` is imported elsewhere, leave it in `useViewportStore.ts`.

- [ ] **Step 4: Run tests**

Run: `cd apps/desktop && npx vitest run`
Expected: Some tests may reference `case-workflow-rail` by testid. Note which fail.

- [ ] **Step 5: Fix any failing tests**

Tests in `src/App.test.tsx` that reference the workflow rail need updating:
- Delete the test "renders the collapsed case workflow rail..." (queries `getByTestId("case-workflow-rail")`)
- Remove any assertions in other tests that check for `case-workflow-rail` by testid
- Keep assertions that test sidebar navigation (those still work)

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/features/layout/Workspace.tsx apps/desktop/src/App.test.tsx
git commit -m "refactor(layout): remove workflow rail from workspace, sidebar is sole nav"
```

---

### Task 3: Move "New Case" button to Header

**Files:**
- Modify: `src/features/layout/Header.tsx`

- [ ] **Step 1: Read Header.tsx to find the right insertion point**

Read `src/features/layout/Header.tsx` to identify:
- Where the right-side action buttons are (undo/redo, generate, export)
- What stores/hooks are already imported
- Where to add the "New Case" button

- [ ] **Step 2: Add the "New Case" button to Header's action zone**

Import `useCaseStore` if not already imported. Add the button before the Undo/Redo group:

```tsx
<button
  onClick={() => {
    if (
      window.confirm(
        `Start a new case? Unsaved changes will be lost.`
      )
    ) {
      useCaseStore.getState().newCase();
    }
  }}
  style={{
    padding: "4px 10px",
    background: "transparent",
    border: "1px solid var(--border, #2a2f3b)",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 11,
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
  }}
  title="Discard current case and start fresh"
>
  New Case
</button>
```

Note: Uses `window.confirm()` as interim — Phase 4d replaces with a styled dialog.

- [ ] **Step 3: Run TypeScript check and visual verification**

Run: `cd apps/desktop && npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/features/layout/Header.tsx
git commit -m "feat(header): relocate New Case action from deleted CaseContextBar"
```

---

## Chunk 2: WCAG Contrast + ARIA

### Task 4: Fix WCAG contrast variables

**Files:**
- Modify: `src/styles.css:21,30-31`

- [ ] **Step 1: Update CSS variables**

In `src/styles.css`, make these changes:

Line 31 — change `--text-muted`:
```css
/* Before */
--text-muted: #484f58;
/* After */
--text-muted: #6b7280;
```

Line 30 — change `--text-secondary`:
```css
/* Before */
--text-secondary: #8b949e;
/* After */
--text-secondary: #94a0ad;
```

Line 21 — change `--success`:
```css
/* Before */
--success: #06d6a0;
/* After */
--success: #10b981;
```

Line 22 — update `--success-dim` to match:
```css
/* Before */
--success-dim: rgba(6, 214, 160, 0.12);
/* After */
--success-dim: rgba(16, 185, 129, 0.12);
```

- [ ] **Step 2: Add light theme accent override**

In the `[data-theme="light"]` block (around line 66), add:
```css
--accent: #0085b5;
```

- [ ] **Step 3: Run tests to catch any snapshot or visual regressions**

Run: `cd apps/desktop && npx vitest run`
Expected: All pass. CSS variable changes don't typically break tests unless there are snapshot tests.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/styles.css
git commit -m "fix(a11y): update contrast variables to meet WCAG AA 4.5:1 ratio"
```

---

### Task 5: Fix ARIA roles on Sidebar and Workspace

**Note:** The spec's 1e item mentions adding `:focus-visible` outlines. These already exist in `styles.css` (lines 121-130) — no CSS changes needed. This task only covers the ARIA role fixes.

**Files:**
- Modify: `src/features/layout/Sidebar.tsx:143-144`
- Modify: `src/features/layout/Workspace.tsx`

- [ ] **Step 1: Add role="tablist" to Sidebar container**

In `src/features/layout/Sidebar.tsx`, the sidebar uses an `<aside>` element (line 143). The NavButtons already have `role="tab"` (line 54). Add `role="tablist"` and `aria-label` to the aside:

```tsx
<aside
  role="tablist"
  aria-label="Workflow stages"
  className={...}
  style={...}
>
```

- [ ] **Step 2: Add aria-controls to NavButtons**

Each NavButton with `role="tab"` should point to the workspace panel. Add `aria-controls="workspace-panel"`:

```tsx
<button
  role="tab"
  aria-label={item.label}
  aria-current={isActive ? "page" : undefined}
  aria-controls="workspace-panel"
  onClick={onClick}
  ...
>
```

- [ ] **Step 3: Add role="tabpanel" and id to Workspace main**

In `src/features/layout/Workspace.tsx`, add to the `<main>` element:

```tsx
<main
  id="workspace-panel"
  role="tabpanel"
  style={{...}}
>
```

- [ ] **Step 4: Run TypeScript check**

Run: `cd apps/desktop && npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 5: Run tests**

Run: `cd apps/desktop && npx vitest run`
Expected: All pass. Tests querying by role may need updates if they relied on the absence of these roles.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/features/layout/Sidebar.tsx apps/desktop/src/features/layout/Workspace.tsx
git commit -m "fix(a11y): add ARIA tablist/tabpanel roles to sidebar and workspace"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full test suite**

Run: `cd apps/desktop && npx vitest run`
Expected: All tests pass (except the pre-existing toothMatcher test which is unrelated).

- [ ] **Step 2: Run TypeScript check**

Run: `cd apps/desktop && npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 3: Run production build**

Run: `cd apps/desktop && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Visual smoke test**

Start dev server: `cd apps/desktop && npx vite`
Verify in browser:
- [ ] Sidebar navigation works (clicking Import/Align/Design/Review/Present switches views)
- [ ] No workflow rail pills visible at top of workspace
- [ ] No CaseContextBar visible between header and workspace
- [ ] "New Case" button visible in header
- [ ] Muted text is visibly lighter than before (contrast improvement)
- [ ] Success green is slightly less neon
- [ ] Tab key shows focus outlines on sidebar buttons

- [ ] **Step 5: Commit any remaining fixes**

If smoke testing revealed issues, fix and commit.
