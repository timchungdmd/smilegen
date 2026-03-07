# Smile Consultation STL Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a macOS-first desktop app that imports photos and arch scans, creates a guided smile plan, generates planning-grade premolar-to-premolar veneer and crown STL proposals, and exports the results locally.

**Architecture:** Use a Tauri desktop shell with a React and TypeScript workflow UI, backed by SQLite for local case data. Keep geometric processing in a native engine boundary so scan import, tooth mapping, restorative generation, and STL validation remain isolated from the UI and portable to future platforms.

**Tech Stack:** Tauri, React, TypeScript, Vite, Rust, SQLite, Three.js, OpenCV, native mesh libraries behind Rust FFI

---

### Task 1: Scaffold the desktop workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/styles.css`
- Create: `apps/desktop/src/features/cases/CaseList.tsx`
- Create: `apps/desktop/src/features/layout/Shell.tsx`
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/vite.config.ts`

**Step 1: Write the failing test**

Create `apps/desktop/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders case workspace shell", () => {
  render(<App />);
  expect(screen.getByText("Smile Consultation")).toBeInTheDocument();
  expect(screen.getByText("Create case")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test App.test.tsx`
Expected: FAIL because the app and test setup do not exist yet.

**Step 3: Write minimal implementation**

Create a minimal Tauri plus React shell that renders a left navigation panel, an empty case list, and a primary `Create case` action.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test App.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml apps/desktop
git commit -m "feat: scaffold desktop consultation app"
```

### Task 2: Define persistent case and asset models

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

test("creates a case with local asset buckets and draft design version", () => {
  const draft = createEmptyCase("Consult 001");
  expect(draft.title).toBe("Consult 001");
  expect(draft.assets).toEqual([]);
  expect(draft.activeDesignVersionId).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test caseStore.test.ts`
Expected: FAIL because the store and types do not exist.

**Step 3: Write minimal implementation**

Add TypeScript domain types for `Case`, `Asset`, `SmilePlan`, `ToothDesign`, and `ExportPackage`. Add a first-pass SQLite schema and a store helper that creates in-memory draft cases before persistence.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test caseStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/cases apps/desktop/src/features/database
git commit -m "feat: define case and asset persistence models"
```

### Task 3: Build photo and STL import workflow

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

test("accepts one arch stl, one frontal photo, and optional tooth library stls", () => {
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

Implement file classification and validation rules:
- require at least one photo
- require one arch STL
- allow zero or more tooth library STLs
- reject unsupported extensions and duplicate arch scans

Add a simple import panel UI.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test importService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/import apps/desktop/src/App.tsx
git commit -m "feat: add consultation asset import flow"
```

### Task 4: Implement guided smile-plan state

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

test("creates a premolar-to-premolar smile plan with guided controls", () => {
  const plan = createDefaultSmilePlan();
  expect(plan.workingRange).toBe("premolar_to_premolar");
  expect(plan.selectedTeeth.length).toBeGreaterThan(0);
  expect(plan.controls.incisalCurve).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test smilePlanStore.test.ts`
Expected: FAIL because smile-plan state has not been created.

**Step 3: Write minimal implementation**

Create the typed smile-plan state and a guided control panel for:
- midline
- global width and length
- incisal curve
- symmetry mode
- tooth selection
- treatment type by tooth

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test smilePlanStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/smile-plan apps/desktop/src/App.tsx
git commit -m "feat: add guided smile planning state"
```

### Task 5: Define the native engine contract

**Files:**
- Create: `apps/desktop/src/features/engine/engineTypes.ts`
- Create: `apps/desktop/src/features/engine/engineClient.ts`
- Create: `apps/desktop/src/features/engine/engineClient.test.ts`
- Create: `apps/desktop/src-tauri/src/commands.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/engine/engineClient.test.ts`:

```ts
import { createGenerationRequest } from "./engineClient";

test("serializes smile-plan intent into a native generation request", () => {
  const request = createGenerationRequest({
    selectedTeeth: ["6", "7", "8", "9", "10", "11"],
    treatmentMap: { "8": "veneer", "9": "crown" },
  });
  expect(request.teeth[0].toothId).toBe("6");
  expect(request.teeth.find((item) => item.toothId === "9")?.treatmentType).toBe("crown");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test engineClient.test.ts`
Expected: FAIL because the engine contract does not exist.

**Step 3: Write minimal implementation**

Define a stable JSON command schema for:
- arch orientation
- tooth mapping
- smile-plan targets
- proposal generation
- validation
- export

Stub the Rust commands to echo deterministic placeholder responses so the UI can integrate before the geometry engine is ready.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test engineClient.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/engine apps/desktop/src-tauri/src
git commit -m "feat: define native design engine contract"
```

### Task 6: Add scan review and tooth-mapping checkpoints

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

Build a review panel that shows arch orientation status, tooth numbering confidence, and a manual confirm flow when confidence is below threshold.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test toothMappingStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/review apps/desktop/src/features/viewer apps/desktop/src/App.tsx
git commit -m "feat: add scan review and tooth mapping confirmation"
```

### Task 7: Implement proposal-generation orchestration

**Files:**
- Create: `apps/desktop/src/features/generation/generationStore.ts`
- Create: `apps/desktop/src/features/generation/generationStore.test.ts`
- Create: `apps/desktop/src/features/generation/GenerationPanel.tsx`
- Modify: `apps/desktop/src/features/engine/engineClient.ts`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Write the failing test**

Create `apps/desktop/src/features/generation/generationStore.test.ts`:

```ts
import { canGenerateDesign } from "./generationStore";

test("requires imports, smile plan, and mapping confirmation before generation", () => {
  expect(
    canGenerateDesign({
      hasPhotos: true,
      hasArchScan: true,
      hasSmilePlan: true,
      mappingConfirmed: false,
    }),
  ).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop test generationStore.test.ts`
Expected: FAIL because generation orchestration has not been written.

**Step 3: Write minimal implementation**

Create the orchestration state that enables proposal generation only when prerequisites are satisfied. Add a generation panel that submits the request to the native engine and records the response.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test generationStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/generation apps/desktop/src/features/engine/engineClient.ts apps/desktop/src/App.tsx
git commit -m "feat: orchestrate restorative proposal generation"
```

### Task 8: Add export packaging and validation reporting

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

Add an export panel that blocks export when validation warnings are marked fatal.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop test exportService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/features/export apps/desktop/src/App.tsx
git commit -m "feat: add export packaging and validation reporting"
```

### Task 9: Create the native geometry engine skeleton

**Files:**
- Create: `native/engine/Cargo.toml`
- Create: `native/engine/src/lib.rs`
- Create: `native/engine/src/types.rs`
- Create: `native/engine/src/orientation.rs`
- Create: `native/engine/src/segmentation.rs`
- Create: `native/engine/src/proposals.rs`
- Create: `native/engine/src/validation.rs`
- Create: `native/engine/tests/request_flow.rs`

**Step 1: Write the failing test**

Create `native/engine/tests/request_flow.rs`:

```rust
use engine::{generate_design, GenerationRequest};

#[test]
fn returns_mapping_warning_when_no_tooth_regions_are_available() {
    let request = GenerationRequest::minimal();
    let response = generate_design(request);
    assert!(response.warnings.iter().any(|w| w.code == "mapping_missing"));
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path native/engine/Cargo.toml`
Expected: FAIL because the engine crate does not exist.

**Step 3: Write minimal implementation**

Create a Rust crate with placeholder modules for orientation, segmentation, proposal synthesis, and validation. Implement a deterministic stub pipeline that returns warnings and fake mesh references until real geometry code is added.

**Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path native/engine/Cargo.toml`
Expected: PASS

**Step 5: Commit**

```bash
git add native/engine
git commit -m "feat: scaffold native geometry engine"
```

### Task 10: Add end-to-end smoke verification

**Files:**
- Create: `apps/desktop/tests/smoke/consultation-export.spec.ts`
- Create: `apps/desktop/tests/fixtures/README.md`
- Create: `apps/desktop/tests/fixtures/case-manifest.example.json`
- Modify: `apps/desktop/package.json`

**Step 1: Write the failing test**

Create `apps/desktop/tests/smoke/consultation-export.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("imports assets, builds a smile plan, and reaches export readiness", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Smile Consultation")).toBeVisible();
  await expect(page.getByText("Export")).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter desktop exec playwright test apps/desktop/tests/smoke/consultation-export.spec.ts`
Expected: FAIL because the smoke harness and routes do not exist yet.

**Step 3: Write minimal implementation**

Add a smoke harness that starts the desktop web layer in test mode and verifies the happy-path shell for consultation through export readiness.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter desktop exec playwright test apps/desktop/tests/smoke/consultation-export.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/tests apps/desktop/package.json
git commit -m "test: add consultation to export smoke coverage"
```

## Delivery Notes

- Keep the native engine contract stable while the underlying geometry algorithms evolve.
- Treat all geometry and tooth-mapping outputs as confidence-rated.
- Do not claim definitive restorative CAD support until prep-aware workflows and occlusion handling exist.
- Preserve every generated design version so exports are reproducible from stored intent.

## Execution Order

Implement tasks in order. Do not start the native geometry engine before the Tauri UI, data model, and engine contract exist. The goal of early tasks is to make the consultation workflow testable before hard mesh algorithms arrive.
