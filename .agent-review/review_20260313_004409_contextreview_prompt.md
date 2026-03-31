# Context Review Prompt

Review the context and referenced files for regressions, gaps, or weak assumptions.

## Context Files

- `.agent-review/context/review_20260313_004409_context.md`
- `apps/desktop/src/features/views/PresentView.tsx`
- `apps/desktop/src/store/useViewportStore.ts`
- `apps/desktop/src/features/layout/Sidebar.tsx`
- `apps/desktop/src/features/layout/CaseContextBar.tsx`
- `apps/desktop/src/store/useDesignStore.ts`
- `apps/desktop/src/store/useCaseStore.ts`
- `apps/desktop/src/features/views/CaseListView.tsx`
- `apps/desktop/src/features/capture/AlignmentCalibrationWizard.tsx`
- `apps/desktop/src/App.test.tsx`
- `apps/desktop/src/features/views/CaptureView.test.tsx`
- `apps/desktop/src/test/setup.ts`
- `apps/desktop/src/test/localStorageIsolation.test.ts`
- `apps/desktop/src/test/viteConfigSignal.test.ts`
- `apps/desktop/vite.config.ts`

## Focus Areas

- logic
- consistency
- risk
- completeness
- best_practices

## Output Requirements

- report only findings that are specific and defensible
- include file references and concise reasoning
- call out false confidence in tests if coverage is weaker than it appears
- if the reviewed changes are acceptable, say so explicitly
