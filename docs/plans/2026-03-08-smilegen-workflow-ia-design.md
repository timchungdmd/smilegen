# SmileGen Workflow IA and Wireframe Design

**Date:** 2026-03-08
**Status:** Approved design draft
**Scope:** Reframe SmileGen in this repo into a SmileCloud-style workflow-first desktop product
**Primary codebase target:** `apps/desktop`

## 1. Design Intent

SmileGen already has the technical beginnings of a strong dental design workstation:
- case persistence
- import pipeline
- design generation
- 2D photo overlay
- 3D viewport
- compare and export views
- review and handoff primitives

The missing piece is not another isolated feature. The missing piece is a product shell that expresses one coherent case journey.

The target experience for this repo is:

`Case -> Capture -> Simulate -> Plan -> Validate -> Collaborate -> Present`

That means the app should stop feeling like six unrelated tabs and start feeling like one structured clinical workflow.

## 2. Current Repo Baseline

### Current navigation model
Current `ViewId` values in [`useViewportStore.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useViewportStore.ts) are:
- `cases`
- `import`
- `design`
- `compare`
- `export`
- `settings`

Current workspace mounting in [`Workspace.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx) maps those views to:
- [`CaseListView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/CaseListView.tsx)
- [`ImportView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ImportView.tsx)
- [`DesignView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/DesignView.tsx)
- [`CompareView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/CompareView.tsx)
- [`ExportView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ExportView.tsx)
- [`SettingsPanel.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/settings/SettingsPanel.tsx)

### Design implication
This current shell is technically clean but semantically weak:
- `import` is really `capture`
- `design` is both `simulate` and parts of `plan`
- `compare` is really part of `validate`
- `export` is part `present`, part `handoff`

The redesign should preserve most existing feature modules while changing the workflow language and orchestration.

## 3. Information Architecture

### Primary left-rail navigation
Replace the current tool-style rail with stage navigation:

1. `Cases`
2. `Overview`
3. `Capture`
4. `Simulate`
5. `Plan`
6. `Validate`
7. `Collaborate`
8. `Present`
9. `Settings`

### Why this is correct
- `Cases` remains the portfolio and entry surface.
- `Overview` becomes the hub for any open case.
- `Capture` consolidates imports, capture guidance, readiness state, and asset management.
- `Simulate` owns the fast smile-design workflow.
- `Plan` owns the advanced planning spine and should absorb SmileCloud’s `Stack`, `Structure`, and `Design` mental model.
- `Validate` owns compare, measurements, annotations, approvals, and review state.
- `Collaborate` owns care-team, expert, lab, and service-provider handoff.
- `Present` owns report export, patient-facing assets, and handoff packaging.

## 4. Screen Inventory

### 4.1 Cases
Purpose:
- manage multiple cases
- filter by workflow stage
- resume work safely

Primary content:
- search
- filter chips
- case cards
- recent activity
- “new case” CTA

Primary existing code:
- [`CaseListView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/CaseListView.tsx)
- [`useCaseStore.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useCaseStore.ts)

### 4.2 Overview
Purpose:
- provide one stable landing page for a selected case
- reduce context loss between stages

Primary content:
- case identity header
- readiness summary
- current stage
- active design/version
- unresolved review items
- collaborator summary
- patient-share status
- recommended next action

New components required:
- `features/overview/CaseOverviewView.tsx`
- `features/overview/CaseReadinessCard.tsx`
- `features/overview/CaseTimeline.tsx`
- `features/overview/NextActionCard.tsx`
- `features/overview/CaseParticipantsCard.tsx`

### 4.3 Capture
Purpose:
- collect and validate all case inputs before design work

Primary content:
- photos
- arch scan
- tooth library inputs
- optional CBCT placeholder/input state
- capture checklist
- quality flags
- import compatibility/help

Primary existing code:
- [`ImportView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ImportView.tsx)
- [`importService.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/import/importService.ts)
- [`fileValidation.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/import/fileValidation.ts)
- [`useImportStore.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/store/useImportStore.ts)

New components required:
- `features/capture/CaptureChecklistPanel.tsx`
- `features/capture/CaptureQualityPanel.tsx`
- `features/capture/AssetInventoryPanel.tsx`
- `features/capture/DataReadinessBadge.tsx`

### 4.4 Simulate
Purpose:
- create the fast initial smile proposal
- give users immediate visual value

Primary content:
- active patient photo
- overlay controls
- fast generation CTA
- variant strip
- smile metrics
- shade starter
- before/after preview

Primary existing code:
- [`DesignView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/DesignView.tsx)
- [`DesignToolbar.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/design/DesignToolbar.tsx)
- [`DesignViewport.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/design/DesignViewport.tsx)
- [`PhotoOverlay.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/overlay/PhotoOverlay.tsx)
- [`SmileMetricsPanel.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/analysis/SmileMetricsPanel.tsx)
- [`BeforeAfterSlider.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/preview/BeforeAfterSlider.tsx)

New components required:
- `features/simulate/SimulationSummaryBar.tsx`
- `features/simulate/RecommendedNextStepCard.tsx`
- `features/simulate/SimulationConfidencePanel.tsx`

### 4.5 Plan
Purpose:
- turn a fast simulation into a structured treatment-planning workspace

Plan substeps:
1. `Stack`
2. `Structure`
3. `Design`

Primary content by substep:

`Stack`
- align portrait, scan, tooth models, and future CBCT layers
- control visibility and alignment confidence

`Structure`
- define treatment intent per tooth
- choose restoration and morphology strategy
- prepare the library/search space

`Design`
- refine geometry
- switch views
- inspect contour, heatmap, and sculpting controls

Primary existing code:
- [`SceneCanvas.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/viewer/SceneCanvas.tsx)
- [`SmilePlanPanel.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/smile-plan/SmilePlanPanel.tsx)
- [`ToothInspector.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/inspector/ToothInspector.tsx)
- [`LibraryPanel.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/library/LibraryPanel.tsx)
- [`ArchFormEditor.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/alignment/ArchFormEditor.tsx)
- [`ShadeSelector.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/color/ShadeSelector.tsx)

New components required:
- `features/plan/PlanView.tsx`
- `features/plan/PlanStepRail.tsx`
- `features/plan/StackWorkspace.tsx`
- `features/plan/StructureWorkspace.tsx`
- `features/plan/DesignWorkspace.tsx`
- `features/plan/LayerManager.tsx`
- `features/plan/AlignmentConfidenceBanner.tsx`

### 4.6 Validate
Purpose:
- consolidate all review and approval behavior into one place

Primary content:
- variant comparison
- annotations
- review comments
- measurements
- approval state
- preparation checklist

Primary existing code:
- [`CompareView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/CompareView.tsx)
- [`VariantCompareDashboard.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/variants/VariantCompareDashboard.tsx)
- [`ScanReviewPanel.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/review/ScanReviewPanel.tsx)
- [`annotationTypes.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/collaboration/annotationTypes.ts)
- [`handoffStore.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/handoff/handoffStore.ts)

New components required:
- `features/validate/ValidateView.tsx`
- `features/validate/ReviewTimeline.tsx`
- `features/validate/ApprovalSummaryCard.tsx`
- `features/validate/MeasurementsPanel.tsx`
- `features/validate/PreparationChecklist.tsx`

### 4.7 Collaborate
Purpose:
- unify all non-patient sharing and collaboration workflows

Primary content:
- care team participants
- external reviewer invites
- lab handoff
- service-provider requests
- audit log
- artifact/package sending

Primary existing code:
- [`casePackager.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/collaboration/casePackager.ts)
- collaboration annotations/types already in repo

New components required:
- `features/collaboration/CollaborateView.tsx`
- `features/collaboration/AudiencePicker.tsx`
- `features/collaboration/InvitePanel.tsx`
- `features/collaboration/HandoffQueue.tsx`
- `features/collaboration/ShareAuditLog.tsx`

### 4.8 Present
Purpose:
- package the case for export, doctor handoff, and patient-ready outputs

Primary content:
- design summary
- report generation
- STL/OBJ export
- patient-facing deliverables
- case package export
- presentation readiness state

Primary existing code:
- [`ExportView.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/views/ExportView.tsx)
- [`exportService.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/export/exportService.ts)
- [`reportGenerator.ts`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/export/reportGenerator.ts)
- [`HandoffPanel.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/handoff/HandoffPanel.tsx)

New components required:
- `features/present/PresentView.tsx`
- `features/present/PatientStoryPanel.tsx`
- `features/present/ExportReadinessChecklist.tsx`
- `features/present/PresentationAssetGallery.tsx`

## 5. Wireframe Specification

### 5.1 Global shell

```
+----------------------------------------------------------------------------------+
| Header: Case switcher | Search | Case status | Save state | User/clinic actions |
+-----------+---------------------------------------------------------------------+
| Stage rail | Main workspace                                                     |
|            |                                                                     |
| Cases      | Context header: Case title / readiness / current version / people   |
| Overview   | ------------------------------------------------------------------  |
| Capture    | Stage-specific layout                                               |
| Simulate   |                                                                     |
| Plan       |                                                                     |
| Validate   |                                                                     |
| Collaborate|                                                                     |
| Present    |                                                                     |
| Settings   |                                                                     |
+-----------+---------------------------------------------------------------------+
```

Global UI rules:
- every stage shows the same case context header
- every stage shows next-step affordance
- every stage surfaces blockers early
- every stage uses the same artifact/version identity model

### 5.2 Overview wireframe

```
+----------------------------------------------------------------------------------+
| Case title | Workflow stage badge | Last updated | Participants | Readiness score |
+--------------------------+------------------------+----------------------------+
| Next best action         | Case timeline          | Readiness                   |
| - continue simulate      | - imports              | - photos                    |
| - enter plan             | - simulation v1        | - scan                      |
| - resolve review         | - review feedback      | - mapping                   |
+--------------------------+------------------------+----------------------------+
| Current design summary   | Collaboration summary  | Patient/presentation state  |
+----------------------------------------------------------------------------------+
```

### 5.3 Capture wireframe

```
+----------------------------------------------------------------------------------+
| Capture checklist: [Photos] [Arch Scan] [Tooth Library] [Optional Imaging]       |
+------------------------------------------+---------------------------------------+
| Asset import cards                       | Readiness panel                       |
| - patient photos                         | - photo quality checks                |
| - arch scan                              | - missing angles                      |
| - tooth models                           | - scanner compatibility               |
| - optional CBCT                          | - plan availability                   |
+------------------------------------------+---------------------------------------+
| Guidance panel / how-to absorption                                               |
+----------------------------------------------------------------------------------+
```

### 5.4 Simulate wireframe

```
+----------------------------------------------------------------------------------+
| Toolbar: quick generate | regenerate | active variant | compare | next: plan       |
+------------------------------------------+---------------------------------------+
| Photo / 3D viewport                       | Right rail                            |
| - overlay controls                        | - smile metrics                       |
| - guides                                  | - confidence/trust                    |
| - before/after slider                     | - shade starter                       |
| - active photo                            | - recommended next step               |
+------------------------------------------+---------------------------------------+
| Variant strip / snapshots                                                        |
+----------------------------------------------------------------------------------+
```

### 5.5 Plan wireframe

```
+----------------------------------------------------------------------------------+
| Plan step rail: Stack | Structure | Design                                        |
+------------------+------------------------------------------+---------------------+
| Layer manager    | Main viewport / workspace               | Decision rail       |
| - portrait       | - 2D/3D sync                            | - treatment map     |
| - scan           | - alignment controls                    | - tooth inspector   |
| - tooth models   | - library controls                      | - arch form         |
| - future CBCT    | - sculpt/measure/heatmap                | - shade/library     |
+------------------+------------------------------------------+---------------------+
| Bottom strip: active version, warnings, pending tasks                             |
+----------------------------------------------------------------------------------+
```

### 5.6 Validate wireframe

```
+----------------------------------------------------------------------------------+
| Header: compare variants | approve | request changes | export snapshot            |
+------------------------------------------+---------------------------------------+
| Main compare/review area                  | Review rail                           |
| - variant A/B/C                           | - comments                            |
| - overlays                                | - measurements                        |
| - annotations                             | - unresolved findings                 |
| - prep guidance                           | - approval state                      |
+------------------------------------------+---------------------------------------+
| Review timeline                                                                  |
+----------------------------------------------------------------------------------+
```

### 5.7 Collaborate wireframe

```
+----------------------------------------------------------------------------------+
| Share intent: [Care Team] [External Expert] [Lab] [Service Provider]             |
+------------------------------------------+---------------------------------------+
| Audience panel                            | Share summary                         |
| - participants                            | - artifacts included                  |
| - permissions                             | - expiry                              |
| - message                                 | - audit trail                         |
| - package type                            | - last sent                           |
+------------------------------------------+---------------------------------------+
| Activity log / chat / request history                                             |
+----------------------------------------------------------------------------------+
```

### 5.8 Present wireframe

```
+----------------------------------------------------------------------------------+
| Header: generate report | package case | export mesh | mark presentation ready    |
+------------------------------------------+---------------------------------------+
| Presentation assets                       | Right rail                            |
| - report preview                          | - export readiness                    |
| - before/after cards                      | - case summary                        |
| - patient gallery                         | - doctor handoff                      |
| - downloadable outputs                    | - patient-share state                 |
+------------------------------------------+---------------------------------------+
| Artifact timeline / publish history                                               |
+----------------------------------------------------------------------------------+
```

## 6. Source Coverage Matrix

Expanded inventory is maintained in [2026-03-09-smilecloud-learning-center-inventory.md](/Users/timchung/Desktop/smilegen/docs/research/2026-03-09-smilecloud-learning-center-inventory.md).

This matrix is the product-facing reduction of that fuller source inventory.

### 6.1 Core workflow pages

| Source page | Primary stage | Secondary stage | SmileGen absorption |
| --- | --- | --- | --- |
| SmileCloud Learning Center | Overview | Cases | Product-wide wayfinding and help hub |
| Guide to Smile Design | Simulate | Capture | Fast proposal workflow and manual refinement |
| Get the YES - Step by Step | Simulate | Plan | Stepwise simulation and transition guidance |
| Get the YES - From Design to Story | Simulate | Present | Chairside simulation to patient story |
| What is Blueprint | Plan | Overview | Advanced planning product concept |
| Create a Blueprint | Plan | Simulate | Intent-based transition into advanced planning |
| Blueprint Technical Requirements | Plan | Capture | Readiness and compatibility gating |
| Stack | Plan | Validate | Data alignment substep |
| Structure | Plan | Validate | Tooth-level treatment intent substep |
| Design - Views | Plan | Validate | Multi-view design inspection |
| Design - Library Controls | Plan | Simulate | Linked 2D/3D control model |
| Design - 3D Controls | Plan | Validate | Heatmap, cross-section, sculpting, inspection |
| Wet or Dry View | Plan | Present | Visualization mode toggle |
| What is Signature Design? | Plan | Present | External design import path |
| Create a Signature Design | Plan | Capture | Import sequence and setup logic |
| Signature Design - Review and Controls | Validate | Plan | Shared review behaviors across imported designs |
| Visualise Selective Teeth | Validate | Plan | Focused selective-inspection behavior |
| Smilecloud Review | Validate | Collaborate | Formal review surface and evaluation logic |
| Upload and Visualize CBCT Files | Capture | Plan | Imaging ingestion and readiness gating |
| Convert and Visualize CBCT Files in 3D | Capture | Plan | Imaging conversion and 3D visualization |
| Align 3D Files | Plan | Validate | Alignment workflow for multiple 3D sources |
| Collections | Cases | Overview | Portfolio organization and case grouping |

### 6.2 Collaboration, patient, services, and settings pages

| Source page | Primary stage | Secondary stage | SmileGen absorption |
| --- | --- | --- | --- |
| Share Link - 24 Hours | Collaborate | Present | Time-limited external review share mode |
| Drop - in - Chat | Collaborate | Present | Unsupported-format handoff path |
| Team-UP | Collaborate | Overview | Persistent multi-account case collaboration |
| What is Smilecloud Passport | Present | Collaborate | Patient-facing delivery concept |
| How to Connect your Patients | Present | Collaborate | Patient-share flow and visibility rules |
| Guide for Patients | Present | Overview | Patient-side clarity, instructions, expectations |
| What is Metalab | Collaborate | Present | Service-provider request and revision loop |
| How to Order a Case on Metalab | Collaborate | Present | Case-order and request orchestration |
| Which Services does Metalab Offer? | Collaborate | Present | Service catalog and routing logic |
| Understanding Smilecloud Subscription Plans | Settings | Overview | Capability and plan-gating awareness |
| How to Add Members to Your Team | Settings | Collaborate | Team administration and invite flow |
| Joining your Smilecloud Team | Settings | Collaborate | Invite acceptance and membership onboarding |
| Upgrade, Downgrade and Cancellation | Settings | Overview | Plan lifecycle management |
| Methods of Registration and Authentication | Settings | Overview | Identity and authentication settings |
| What's New in Account | Settings | Overview | Account-surface evolution and UX deltas |
| Smilecloud iPad Photography & Simulation Guide | Capture | Simulate | Capture quality standards and readiness checks |
| iPad App Development Activity Page | Capture | Settings | Mobile capability signal and future integration |
| Release Notes | Overview | Settings | Product capability deltas and change-tracking |

### 6.3 Catalog-only public pages retained for traceability

These were visible in the public learning-center inventory and should stay in planning scope even when they were not deeply opened in this pass:
- HD Mode in Smile Design
- Adaptive Lighting
- What's New in Smile Design
- Where is Blueprint Available?
- Lock / Unlock Blueprint
- How to Create a Subscription Plan
- Partners

## 7. Design Principles

### 7.1 Intent before taxonomy
Users should choose what they want to do, not which branded tool they want to enter.

### 7.2 One case header everywhere
The app should never make the user wonder which case, version, or stage they are in.

### 7.3 Readiness before effort
The app should surface blockers before the user commits design work.

### 7.4 Review is a shared layer
Validation cannot be split into disconnected surfaces if approval state matters.

### 7.5 Sharing is audience-first
The user should start with recipient intent, then let the system configure mechanics.

## 8. Design Approval Summary

Recommended direction:
- adopt workflow-first IA
- preserve current domain modules
- re-orchestrate views around stage semantics
- add Overview, Plan, Validate, Collaborate, and Present as first-class workspace concepts
- treat SmileCloud learning-center content as a requirements corpus, not as a copy target

This document is the UX/IA design anchor for the SmileGen refactor in this repo.
