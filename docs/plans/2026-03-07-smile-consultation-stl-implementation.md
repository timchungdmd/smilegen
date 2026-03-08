# Smile Consultation STL Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a macOS-first desktop app that supports assistant-prepared and doctor-approved smile consultation, generates three additive-first premolar-to-premolar veneer and crown variants from photo and scan inputs, applies hidden trust gating, and exports planning-grade STL packages locally.

**Architecture:** Use a Tauri desktop shell with a React and TypeScript workflow UI, backed by SQLite for local case data and an event log. Keep geometric processing in a native engine boundary so scan import, tooth mapping, additive-feasibility scoring, restorative generation, and STL validation remain isolated from the UI and portable to future platforms.

**Tech Stack:** Tauri, React, TypeScript, Vite, Rust, SQLite, Three.js, Playwright, OpenCV, native mesh libraries behind Rust FFI

---

### Task 1: Scaffold the desktop workspace and compare-first shell

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/styles.css`
- Create: `apps/desktop/src/features/layout/AppShell.tsx`
- Create: `apps/desktop/src/features/layout/Header.tsx`
- Create: `apps/desktop/src/features/layout/Sidebar.tsx`
- Create: `apps/desktop/src/features/layout/Workspace.tsx`
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/vite.config.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the consultation shell with compare workspace affordances", () => {
  render(<App />);
  expect(screen.getByText("Smile Consultation")).toBeInTheDocument();
  expect(screen.getByText("Cases")).toBeInTheDocument();
  expect(screen.getByText("Compare")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test App.test.tsx`
Expected: FAIL because the app and test setup do not exist yet.

**Step 3: Write minimal implementation**

Create a minimal Tauri plus React shell with:
- header
- sidebar
- main workspace
- placeholder compare area

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test App.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml apps/desktop
git commit -m "feat: scaffold compare-first desktop shell"
```

### Task 2: Define persistent models for cases, variants, workflow state, and events

**Files:**
- Create: `apps/desktop/src/features/cases/types.ts`
- Create: `apps/desktop/src/features/cases/caseStore.ts`
- Create: `apps/desktop/src/features/cases/caseStore.test.ts`
- Create: `apps/desktop/src/features/database/schema.sql`
- Create: `apps/desktop/src/features/database/migrations/001_initial_schema.sql`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/cases/caseStore.test.ts`:

```ts
import { createEmptyCase } from "./caseStore";

test("creates a case with workflow and presentation flags", () => {
  const draft = createEmptyCase("Consult 001");
  expect(draft.title).toBe("Consult 001");
  expect(draft.workflowState).toBe("draft");
  expect(draft.presentationReady).toBe(false);
  expect(draft.exportBlocked).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test caseStore.test.ts`
Expected: FAIL because the store and types do not exist.

**Step 3: Write minimal implementation**

Add domain types and initial SQLite schema for:
- Case
- Asset
- SmilePlan
- Variant
- ToothDesign
- ExportPackage
- EventLog

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test caseStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/cases apps/desktop/src/features/database
git commit -m "feat: define workflow-aware case persistence models"
```

### Task 3: Build photo and STL import workflow with quality gating

**Files:**
- Create: `apps/desktop/src/features/import/ImportPanel.tsx`
- Create: `apps/desktop/src/features/import/importService.ts`
- Create: `apps/desktop/src/features/import/importService.test.ts`
- Create: `apps/desktop/src/features/import/fileValidation.ts`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/import/importService.test.ts`:

```ts
import { validateImportSet } from "./importService";

test("accepts one arch stl, one photo, and optional tooth library stls", () => {
  const result = validateImportSet({
    photos: ["face.jpg"],
    archScan: "maxillary_scan.stl",
    toothLibrary: ["8.stl", "9.stl"],
  });
  expect(result.ok).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test importService.test.ts`
Expected: FAIL because import validation does not exist.

**Step 3: Write minimal implementation**

Implement import rules:
- require at least one photo
- require one arch STL
- allow zero or more tooth library STLs
- reject unsupported extensions and duplicate arch scans
- record quality warnings for incomplete or weak photo sets

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test importService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/import apps/desktop/src/App.tsx
git commit -m "feat: add gated asset import flow"
```

### Task 4: Implement the case workflow state machine

**Files:**
- Create: `apps/desktop/src/features/workflow/workflowState.ts`
- Create: `apps/desktop/src/features/workflow/workflowState.test.ts`
- Create: `apps/desktop/src/features/workflow/workflowSelectors.ts`
- Modify: `apps/desktop/src/features/cases/types.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/workflow/workflowState.test.ts`:

```ts
import { transitionCaseState } from "./workflowState";

test("moves imported cases to mapped only when orientation and mapping are confirmed", () => {
  const result = transitionCaseState("imported", {
    orientationConfirmed: true,
    mappingConfirmed: true,
  });
  expect(result).toBe("mapped");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test workflowState.test.ts`
Expected: FAIL because the state machine does not exist.

**Step 3: Write minimal implementation**

Implement explicit states and invalidation rules:
- draft
- imported
- mapped
- prepared
- needs_doctor_review
- doctor_approved
- exported

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test workflowState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/workflow apps/desktop/src/features/cases/types.ts
git commit -m "feat: add case workflow state machine"
```

### Task 5: Implement guided smile-plan state and additive-first defaults

**Files:**
- Create: `apps/desktop/src/features/smile-plan/smilePlanTypes.ts`
- Create: `apps/desktop/src/features/smile-plan/smilePlanStore.ts`
- Create: `apps/desktop/src/features/smile-plan/smilePlanStore.test.ts`
- Create: `apps/desktop/src/features/smile-plan/SmilePlanPanel.tsx`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/smile-plan/smilePlanStore.test.ts`:

```ts
import { createDefaultSmilePlan } from "./smilePlanStore";

test("creates a premolar-to-premolar additive-first smile plan", () => {
  const plan = createDefaultSmilePlan();
  expect(plan.workingRange).toBe("premolar_to_premolar");
  expect(plan.additiveBias).toBe("balanced");
  expect(plan.selectedTeeth.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test smilePlanStore.test.ts`
Expected: FAIL because smile-plan state has not been created.

**Step 3: Write minimal implementation**

Create typed smile-plan state and controls for:
- midline
- global width and length
- incisal curve
- symmetry mode
- tooth selection
- treatment type by tooth
- additive bias

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test smilePlanStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/smile-plan apps/desktop/src/App.tsx
git commit -m "feat: add additive-first smile plan state"
```

### Task 6: Define the native engine contract for mapping, variants, trust, and export

**Files:**
- Create: `apps/desktop/src/features/engine/engineTypes.ts`
- Create: `apps/desktop/src/features/engine/engineClient.ts`
- Create: `apps/desktop/src/features/engine/engineClient.test.ts`
- Create: `apps/desktop/src-tauri/src/commands.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/engine/engineClient.test.ts`:

```ts
import { createVariantGenerationRequest } from "./engineClient";

test("serializes smile-plan intent into a multi-variant generation request", () => {
  const request = createVariantGenerationRequest({
    selectedTeeth: ["6", "7", "8", "9", "10", "11"],
    treatmentMap: { "8": "veneer", "9": "crown" },
    additiveBias: "balanced",
  });
  expect(request.variants).toEqual(["conservative", "balanced", "enhanced"]);
  expect(request.teeth.find((item) => item.toothId === "9")?.treatmentType).toBe("crown");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test engineClient.test.ts`
Expected: FAIL because the engine contract does not exist.

**Step 3: Write minimal implementation**

Define stable JSON schemas for:
- orientation
- tooth mapping
- variant generation
- selected-tooth regeneration
- direct adjustment
- trust evaluation
- export validation

Stub Rust commands with deterministic placeholder responses.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test engineClient.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/engine apps/desktop/src-tauri/src
git commit -m "feat: define multi-variant native engine contract"
```

### Task 7: Add scan review and tooth-mapping checkpoints

**Files:**
- Create: `apps/desktop/src/features/review/ScanReviewPanel.tsx`
- Create: `apps/desktop/src/features/review/toothMappingStore.ts`
- Create: `apps/desktop/src/features/review/toothMappingStore.test.ts`
- Create: `apps/desktop/src/features/viewer/SceneCanvas.tsx`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/review/toothMappingStore.test.ts`:

```ts
import { applyMappingResult } from "./toothMappingStore";

test("flags low-confidence tooth mapping for manual confirmation", () => {
  const state = applyMappingResult({
    teeth: [{ toothId: "8", confidence: 0.42 }],
  });
  expect(state.requiresConfirmation).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test toothMappingStore.test.ts`
Expected: FAIL because the review checkpoint state does not exist.

**Step 3: Write minimal implementation**

Build a review panel that shows:
- arch orientation status
- tooth numbering confidence
- manual confirmation when confidence is below threshold

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test toothMappingStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/review apps/desktop/src/features/viewer apps/desktop/src/App.tsx
git commit -m "feat: add scan review and mapping checkpoints"
```

### Task 8: Build assistant preparation flow and handoff snapshot

**Files:**
- Create: `apps/desktop/src/features/handoff/HandoffPanel.tsx`
- Create: `apps/desktop/src/features/handoff/handoffStore.ts`
- Create: `apps/desktop/src/features/handoff/handoffStore.test.ts`
- Modify: `apps/desktop/src/features/cases/caseStore.ts`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/handoff/handoffStore.test.ts`:

```ts
import { canMarkReadyForDoctor } from "./handoffStore";

test("requires assets, mapping, and saved variants before handoff", () => {
  const result = canMarkReadyForDoctor({
    hasImports: true,
    mappingConfirmed: true,
    savedVariantCount: 3,
  });
  expect(result).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test handoffStore.test.ts`
Expected: FAIL because handoff state does not exist.

**Step 3: Write minimal implementation**

Implement assistant prep state with:
- draft treatment map
- saved variants
- ready-for-doctor snapshot
- prepared_by metadata

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test handoffStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/handoff apps/desktop/src/features/cases/caseStore.ts apps/desktop/src/App.tsx
git commit -m "feat: add assistant handoff workflow"
```

### Task 9: Implement variant generation and compare dashboard state

**Files:**
- Create: `apps/desktop/src/features/variants/variantStore.ts`
- Create: `apps/desktop/src/features/variants/variantStore.test.ts`
- Create: `apps/desktop/src/features/variants/VariantCompareDashboard.tsx`
- Create: `apps/desktop/src/features/variants/VariantCard.tsx`
- Create: `apps/desktop/src/features/variants/ToothStrip.tsx`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/variants/variantStore.test.ts`:

```ts
import { createDefaultVariants } from "./variantStore";

test("creates conservative, balanced, and enhanced variants", () => {
  const variants = createDefaultVariants();
  expect(variants.map((item) => item.label)).toEqual([
    "conservative",
    "balanced",
    "enhanced",
  ]);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test variantStore.test.ts`
Expected: FAIL because variant state does not exist.

**Step 3: Write minimal implementation**

Create the compare dashboard with:
- Current card
- three variant cards
- active variant selection
- tooth strip
- compact trust banner slot

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test variantStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/variants apps/desktop/src/App.tsx
git commit -m "feat: add variant compare dashboard"
```

### Task 10: Implement hidden trust engine state and export gating

**Files:**
- Create: `apps/desktop/src/features/trust/trustEngine.ts`
- Create: `apps/desktop/src/features/trust/trustEngine.test.ts`
- Create: `apps/desktop/src/features/trust/trustSelectors.ts`
- Create: `apps/desktop/src/features/trust/TrustBanner.tsx`
- Modify: `apps/desktop/src/features/cases/types.ts`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/trust/trustEngine.test.ts`:

```ts
import { summarizeTrustState } from "./trustEngine";

test("blocks export when any tooth is in a blocked state", () => {
  const result = summarizeTrustState([
    { toothId: "8", state: "ready" },
    { toothId: "9", state: "blocked" },
  ]);
  expect(result.exportBlocked).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test trustEngine.test.ts`
Expected: FAIL because trust evaluation does not exist.

**Step 3: Write minimal implementation**

Implement trust summaries for:
- ready
- needs_correction
- blocked

Surface only actionable badges and block export on hard failures.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test trustEngine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/trust apps/desktop/src/features/cases/types.ts apps/desktop/src/App.tsx
git commit -m "feat: add hidden trust gating"
```

### Task 11: Add selective tooth regeneration and scope toggle

**Files:**
- Create: `apps/desktop/src/features/corrections/regenerationStore.ts`
- Create: `apps/desktop/src/features/corrections/regenerationStore.test.ts`
- Create: `apps/desktop/src/features/corrections/RegenerateButton.tsx`
- Modify: `apps/desktop/src/features/engine/engineClient.ts`
- Modify: `apps/desktop/src/features/variants/ToothStrip.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/corrections/regenerationStore.test.ts`:

```ts
import { createRegenerationRequest } from "./regenerationStore";

test("defaults treatment changes to this tooth only regeneration", () => {
  const request = createRegenerationRequest({
    toothId: "8",
    scope: "tooth_only",
  });
  expect(request.scope).toBe("tooth_only");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test regenerationStore.test.ts`
Expected: FAIL because regeneration state does not exist.

**Step 3: Write minimal implementation**

Implement selected-tooth regeneration with scope choices:
- tooth_only
- refresh_variant

Default to `tooth_only`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test regenerationStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/corrections apps/desktop/src/features/engine/engineClient.ts apps/desktop/src/features/variants/ToothStrip.tsx
git commit -m "feat: add selective regeneration flow"
```

### Task 12: Add side inspector direct-adjust controls

**Files:**
- Create: `apps/desktop/src/features/inspector/ToothInspector.tsx`
- Create: `apps/desktop/src/features/inspector/inspectorStore.ts`
- Create: `apps/desktop/src/features/inspector/inspectorStore.test.ts`
- Modify: `apps/desktop/src/features/variants/VariantCompareDashboard.tsx`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/inspector/inspectorStore.test.ts`:

```ts
import { createDefaultInspectorState } from "./inspectorStore";

test("opens tooth controls without leaving compare mode", () => {
  const state = createDefaultInspectorState("8");
  expect(state.selectedToothId).toBe("8");
  expect(state.open).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test inspectorStore.test.ts`
Expected: FAIL because inspector state does not exist.

**Step 3: Write minimal implementation**

Add a side inspector with limited controls for:
- width
- length
- facial fullness
- incisal edge
- veneer/crown toggle
- apply to active variant or sync to all variants

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test inspectorStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/inspector apps/desktop/src/features/variants/VariantCompareDashboard.tsx apps/desktop/src/App.tsx
git commit -m "feat: add compare-mode tooth inspector"
```

### Task 13: Add doctor signature profiles

**Files:**
- Create: `apps/desktop/src/features/signatures/signatureTypes.ts`
- Create: `apps/desktop/src/features/signatures/signatureStore.ts`
- Create: `apps/desktop/src/features/signatures/signatureStore.test.ts`
- Create: `apps/desktop/src/features/signatures/SignatureProfilePanel.tsx`
- Modify: `apps/desktop/src/features/smile-plan/smilePlanStore.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/signatures/signatureStore.test.ts`:

```ts
import { createSignatureProfile } from "./signatureStore";

test("stores esthetic defaults without exposing safety thresholds", () => {
  const profile = createSignatureProfile("Default");
  expect(profile.name).toBe("Default");
  expect("safetyThresholds" in profile).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test signatureStore.test.ts`
Expected: FAIL because signature profiles do not exist.

**Step 3: Write minimal implementation**

Implement signature profiles for:
- width-length tendency
- smile arc intensity
- embrasure softness
- additive bias defaults
- variant spacing

Do not expose safety thresholds.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test signatureStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/signatures apps/desktop/src/features/smile-plan/smilePlanStore.ts
git commit -m "feat: add doctor signature profiles"
```

### Task 14: Add export packaging and validation reporting

**Files:**
- Create: `apps/desktop/src/features/export/exportService.ts`
- Create: `apps/desktop/src/features/export/exportService.test.ts`
- Create: `apps/desktop/src/features/export/ExportPanel.tsx`
- Create: `apps/desktop/src/features/export/manifest.ts`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/export/exportService.test.ts`:

```ts
import { summarizeExport } from "./exportService";

test("creates a manifest for per-tooth and combined stl outputs", () => {
  const manifest = summarizeExport({
    caseId: "case-1",
    outputs: ["8_veneer.stl", "9_crown.stl", "combined.stl"],
  });
  expect(manifest.outputs.length).toBe(3);
  expect(manifest.caseId).toBe("case-1");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test exportService.test.ts`
Expected: FAIL because the export service does not exist.

**Step 3: Write minimal implementation**

Implement export packaging for:
- per-tooth STL
- combined STL
- validation summary
- JSON manifest

Block export when trust or validation marks the active variant unsafe.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test exportService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/export apps/desktop/src/App.tsx
git commit -m "feat: add gated export packaging"
```

### Task 15: Create the native geometry engine skeleton

**Files:**
- Create: `native/engine/Cargo.toml`
- Create: `native/engine/src/lib.rs`
- Create: `native/engine/src/types.rs`
- Create: `native/engine/src/orientation.rs`
- Create: `native/engine/src/segmentation.rs`
- Create: `native/engine/src/variants.rs`
- Create: `native/engine/src/proposals.rs`
- Create: `native/engine/src/trust.rs`
- Create: `native/engine/src/validation.rs`
- Create: `native/engine/tests/request_flow.rs`

**Step 1: Write the failing test**

Create `native/engine/tests/request_flow.rs`:

```rust
use engine::{generate_variants, GenerationRequest};

#[test]
fn returns_blocked_state_when_mapping_is_missing() {
    let request = GenerationRequest::minimal();
    let response = generate_variants(request);
    assert!(response.trust.export_blocked);
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path native/engine/Cargo.toml`
Expected: FAIL because the engine crate does not exist.

**Step 3: Write minimal implementation**

Create a Rust crate with placeholder modules for:
- orientation
- segmentation
- variant generation
- proposal synthesis
- trust evaluation
- validation

Return deterministic stub data until real geometry code is added.

**Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path native/engine/Cargo.toml`
Expected: PASS

**Step 5: Commit**

```bash
git add native/engine
git commit -m "feat: scaffold native variant engine"
```

### Task 16: Add event logging for learning signals

**Files:**
- Create: `apps/desktop/src/features/events/eventLog.ts`
- Create: `apps/desktop/src/features/events/eventLog.test.ts`
- Modify: `apps/desktop/src/features/variants/variantStore.ts`
- Modify: `apps/desktop/src/features/corrections/regenerationStore.ts`
- Modify: `apps/desktop/src/features/inspector/inspectorStore.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/events/eventLog.test.ts`:

```ts
import { createEvent } from "./eventLog";

test("captures variant selection and correction events", () => {
  const event = createEvent("variant_selected", { variantId: "balanced" });
  expect(event.eventType).toBe("variant_selected");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test eventLog.test.ts`
Expected: FAIL because event logging does not exist.

**Step 3: Write minimal implementation**

Log:
- variant_selected
- tooth_regenerated
- tooth_adjusted
- export_blocked
- export_completed

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test eventLog.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/events apps/desktop/src/features/variants/variantStore.ts apps/desktop/src/features/corrections/regenerationStore.ts apps/desktop/src/features/inspector/inspectorStore.ts
git commit -m "feat: add workflow event logging"
```

### Task 17: Add end-to-end smoke verification for assistant prep to doctor export

**Files:**
- Create: `apps/desktop/tests/smoke/assistant-to-export.spec.ts`
- Create: `apps/desktop/tests/fixtures/README.md`
- Create: `apps/desktop/tests/fixtures/case-manifest.example.json`
- Modify: `apps/desktop/package.json`

**Step 1: Write the failing test**

Create `apps/desktop/tests/smoke/assistant-to-export.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("assistant can prepare a case and doctor can reach export readiness", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Smile Consultation")).toBeVisible();
  await expect(page.getByText("Ready for doctor")).toBeVisible();
  await expect(page.getByText("Export")).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop exec playwright test apps/desktop/tests/smoke/assistant-to-export.spec.ts`
Expected: FAIL because the smoke harness and routes do not exist yet.

**Step 3: Write minimal implementation**

Add a smoke harness that verifies:
- assistant prep entry
- saved variants
- compare dashboard handoff
- export readiness path

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop exec playwright test apps/desktop/tests/smoke/assistant-to-export.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/tests apps/desktop/package.json
git commit -m "test: add assistant-to-export smoke coverage"
```

## Delivery Notes

- Keep the native engine contract stable while the underlying geometry algorithms evolve.
- Treat all mapping, additive suitability, and geometry outputs as confidence-rated.
- Do not claim definitive restorative CAD support until prep-aware workflows and occlusion handling exist.
- Preserve every generated design and handoff snapshot so exports are reproducible from stored intent.
- Keep the compare dashboard as the primary doctor surface. Do not route routine corrections into a separate editing workflow.

## Execution Order

Implement tasks in order. Do not start the native geometry engine before the UI shell, persistence, workflow state machine, and engine contract exist. The goal of the early tasks is to make the assistant-prepared, compare-first consultation flow testable before hard mesh algorithms arrive.
