# SmileGen Workflow-First Screen Specification

## Mission
Build SmileGen as a workflow-first desktop app that mirrors the operational logic inferred from SmileCloud’s public learning site, but expressed in SmileGen’s own product language.

The app must feel like one guided case journey:
`Cases -> Overview -> Capture -> Simulate -> Plan -> Validate -> Collaborate -> Present -> Settings`

Do not build this as a collection of disconnected tools.
Do not expose internal module names as primary navigation unless they are substeps inside a workflow stage.

## Global Rules

### Rule 1: Persistent case context
Every route except `Cases` must show:
- active case title
- workflow stage
- last updated timestamp
- readiness summary
- current artifact/version
- next recommended action

### Rule 2: Workflow-first navigation
Primary left rail must contain:
- Cases
- Overview
- Capture
- Simulate
- Plan
- Validate
- Collaborate
- Present
- Settings

Do not use this as top-level navigation:
- Import
- Design
- Compare
- Export

Those are implementation-era names and should be absorbed into workflow stages.

### Rule 3: Readiness before work
Any route that requires prerequisites must show blockers before the user attempts the action.

Examples:
- no portrait uploaded
- no arch scan uploaded
- imaging unavailable
- capability locked by plan
- hardware insufficient for advanced 3D planning

### Rule 4: Shared review model
Measurements, annotations, cross-sections, heatmap, comments, approval state, and review history must belong to one shared review system.

Do not create separate incompatible review models for:
- Simulate
- Plan
- Signature-style imported design
- Compare
- Export handoff

### Rule 5: Audience-first sharing
Sharing UI must begin with audience intent, not transport mechanics.

Audience choices:
- Care Team
- External Expert
- Lab
- Service Provider
- Patient

The system should decide whether the underlying mechanism behaves like:
- persistent collaboration
- temporary guest share
- unsupported-file handoff
- patient presentation

## Screen 1: Cases

### Purpose
Provide portfolio-level access to all cases.

### Required UI
- search input
- stage filter
- collection filter
- recent activity surface
- create case CTA
- case cards or case rows
- stage badge per case
- readiness indicator per case
- last updated time

### Required behaviors
- selecting a case opens `Overview`
- creating a case opens `Capture`
- collections act as an organizational overlay, not the main workflow shell

### Must absorb from source workflows
- case-centric work model
- collections and shared/private grouping
- ongoing case management

### Empty state
Show:
- no cases yet
- create your first case
- explain that workflow begins with capture

## Screen 2: Overview

### Purpose
Give one stable hub for the active case.

### Required UI
- persistent case header
- readiness card
- next action card
- artifact timeline
- collaborators summary
- patient/presentation summary
- latest design/version summary
- unresolved review items

### Required behaviors
- route users to the next logical workflow stage
- explain blockers in plain language
- preserve context when returning from deeper routes

### Logic
Overview should decide the recommended next action from case state:
- no imports -> go to Capture
- imports ready, no simulation -> go to Simulate
- simulation exists, no structured plan -> go to Plan
- plan exists, unresolved review -> go to Validate
- reviewed but not shared -> go to Collaborate or Present

## Screen 3: Capture

### Purpose
Collect and validate all input data.

### Required UI
- photo import card
- arch scan import card
- tooth model/library import card
- optional imaging card
- capture checklist
- quality panel
- compatibility panel
- data inventory panel
- continue CTA to Simulate

### Required behaviors
- validate portrait availability
- validate scan availability
- show optional but recommended data
- explain imaging upload path
- warn about capture quality problems
- warn when source files look incompatible
- allow import from drag/drop and browse

### UX expectations inferred from source workflows
- photo quality matters materially
- imaging upload is guided, not generic
- advanced planning should not start if capture is incomplete
- patient portrait should be treated as first-class, not an afterthought

### Continue gating
Disable `Continue to Simulate` when required assets are missing.

## Screen 4: Simulate

### Purpose
Provide the fastest chairside proposal workflow.

### Required UI
- main viewport with portrait-first presentation
- optional 3D tab
- generation toolbar
- variant strip
- before/after preview
- smile metrics panel
- simulation confidence or trust state
- realism controls placeholder
- next-step CTA to Plan
- alternate CTA to Present

### Required behaviors
- generate multiple variants
- let user select active variant
- allow direct manipulation on the portrait/design
- support immediate patient-friendly preview
- allow moving to advanced planning without losing simulation state

### UX expectations inferred from source workflows
- this must be the shortest path to visible value
- direct manipulation is primary
- side controls support, but should not dominate
- realism/display controls should be present for presentation use cases
- this route must not feel like a dense CAD workstation

## Screen 5: Plan

### Purpose
Turn a quick proposal into a structured planning workspace.

### Internal substeps
- Stack
- Structure
- Design

### Global plan UI
- substep rail
- shared viewport
- layer manager
- right-side decision rail
- version/status bar

### Subscreen: Stack
Required UI:
- layer list
- visibility toggles
- active alignment state
- alignment warnings
- compatible/incompatible source notices

Required behaviors:
- align portrait, scan, tooth models, and optional imaging
- preserve source relationships
- warn if inputs appear clinically mismatched

### Subscreen: Structure
Required UI:
- per-tooth treatment map
- tooth-state list
- add/remove/relabel actions
- morphology strategy controls
- restoration intent controls

Required behaviors:
- define what changes before geometry refinement
- keep decisions legible tooth by tooth

### Subscreen: Design
Required UI:
- design view modes
- library controls
- 3D diagnostics entry points
- sculpt/diagnostic tools
- shade and morphology support
- selected tooth inspector

Required behaviors:
- allow refinement after structure is defined
- keep diagnostics close to design, not hidden elsewhere

### UX expectations inferred from source workflows
- Plan must feel sequential, not like an undifferentiated settings wall
- `Stack -> Structure -> Design` is not optional naming; it is the workflow backbone
- advanced planning must still preserve fast access to views and diagnostics

## Screen 6: Validate

### Purpose
Centralize inspection, comparison, comments, measurements, and approvals.

### Required UI
- variant comparison tab
- review tab
- measurements tab
- approvals tab
- annotation tools
- cross-section entry point
- heatmap entry point
- review timeline
- unresolved findings list
- approval state card

### Required behaviors
- compare versions or variants side by side
- save comments and review actions to the case artifact history
- show whether a design is approved, blocked, or needs revision
- allow a return path to Simulate or Plan for changes

### UX expectations inferred from source workflows
- review is a workspace, not a modal
- review should work for both native plans and imported designs
- diagnostics belong here even if some are also available during planning

## Screen 7: Collaborate

### Purpose
Handle all non-patient external and internal collaboration.

### Required UI
- audience selector
- invite panel
- payload selector
- permissions/expiry panel
- request message editor
- audit log
- handoff queue
- service-order surface

### Required behaviors
- support care team collaboration
- support external expert review
- support lab/service-provider requests
- support unsupported-file fallback
- log what was sent, when, and to whom

### UX expectations inferred from source workflows
- channel choice should not come before audience intent
- collaboration must support persistent and temporary relationships
- service-provider requests are specialized collaboration, not a separate app

## Screen 8: Present

### Purpose
Package the case for doctor handoff and patient presentation.

### Required UI
- summary tab
- assets tab
- report tab
- handoff tab
- export readiness checklist
- patient-story panel
- presentation asset gallery
- doctor handoff panel
- report generation action
- mesh export action
- package export action

### Required behaviors
- group outputs as a narrative set, not isolated files
- support doctor-ready outputs and patient-ready outputs
- preserve interoperability exports
- warn when connecting patient delivery may expose existing case assets

### UX expectations inferred from source workflows
- Present is downstream of Simulate and Plan, not a generic export sink
- patient-facing outputs deserve their own composition space
- report generation and downstream file export must coexist cleanly

## Screen 9: Settings

### Purpose
Own plan, account, team, hardware, and capability settings.

### Required UI
- subscription or capability panel
- team management panel
- invite acceptance state
- registration/auth settings
- hardware readiness hints
- change log or release awareness panel
- partner or ecosystem awareness panel

### Required behaviors
- explain why some features are gated
- separate billing lifecycle from clinical workflow
- keep team membership and auth behavior explicit

## Non-Goals
- Do not build real-time collaboration in first pass.
- Do not build a separate patient app in first pass.
- Do not implement full cloud sync in first pass.
- Do not rebuild CAD internals unless the workflow shell requires a small adapter.

## Mandatory Acceptance Outcomes
- A user can understand current stage from anywhere.
- A user can identify the next recommended action from anywhere.
- A user cannot enter advanced planning blindly without readiness feedback.
- Simulate remains fast and visually rewarding.
- Plan exposes `Stack`, `Structure`, and `Design`.
- Validate unifies compare/review/approval.
- Collaborate starts with audience choice.
- Present groups outputs as presentation assets, not just downloads.
Document 2: Route And Component Implementation Map For Coding Agents

# SmileGen Route and Component Implementation Map

## Mission
Implement the workflow-first shell in the current `apps/desktop` codebase without rewriting the design engine, import system, or viewer stack.

Use the existing code as the implementation substrate.
Refactor orchestration first.
Refactor domain modeling second.
Do not start with visual polish.

## Existing Implementation Assets

### Existing routes/views to reuse
- `apps/desktop/src/features/views/CaseListView.tsx`
- `apps/desktop/src/features/views/ImportView.tsx`
- `apps/desktop/src/features/views/DesignView.tsx`
- `apps/desktop/src/features/views/CompareView.tsx`
- `apps/desktop/src/features/views/ExportView.tsx`

### Existing layout shell to refactor
- `apps/desktop/src/features/layout/AppShell.tsx`
- `apps/desktop/src/features/layout/Sidebar.tsx`
- `apps/desktop/src/features/layout/Workspace.tsx`
- `apps/desktop/src/features/layout/Header.tsx`

### Existing stores to reuse and reorganize
- `apps/desktop/src/store/useCaseStore.ts`
- `apps/desktop/src/store/useDesignStore.ts`
- `apps/desktop/src/store/useImportStore.ts`
- `apps/desktop/src/store/useViewportStore.ts`

### Existing domain modules to reuse
- import:
  - `features/import/*`
- design:
  - `features/design/*`
  - `features/overlay/*`
  - `features/analysis/*`
  - `features/preview/*`
- planning:
  - `features/smile-plan/*`
  - `features/library/*`
  - `features/alignment/*`
  - `features/inspector/*`
  - `features/viewer/*`
- review:
  - `features/review/*`
  - `features/variants/*`
  - `features/handoff/*`
- export:
  - `features/export/*`
- collaboration foundation:
  - `features/collaboration/*`

## Route Model

### Add this new route type
```ts
type AppRouteId =
  | "cases"
  | "overview"
  | "capture"
  | "simulate"
  | "plan"
  | "validate"
  | "collaborate"
  | "present"
  | "settings";
Add route substate
interface AppRouteState {
  activeRoute: AppRouteId;
  activeCaseId: string | null;
  activePlanStep: "stack" | "structure" | "design";
  activeValidateTab: "compare" | "review" | "measurements" | "approvals";
  activeCollaborateAudience: "team" | "expert" | "lab" | "service" | "patient";
  activePresentTab: "summary" | "assets" | "report" | "handoff";
}
Store ownership rule
useRouteStore owns route/navigation state.
useViewportStore keeps visual viewport state only.
useCaseStore owns active case and workflow-level case state.
useDesignStore owns simulation, planning, variants, trust, and annotations unless those need later splitting.
Add dedicated stores only when workflow orchestration clearly needs them.
Required New Files
Route store
apps/desktop/src/store/useRouteStore.ts
Shared layout/context
apps/desktop/src/features/layout/CaseContextHeader.tsx
apps/desktop/src/features/layout/StageRouteFrame.tsx
apps/desktop/src/features/layout/BlockedState.tsx
apps/desktop/src/features/layout/EmptyState.tsx
Overview
apps/desktop/src/features/overview/CaseOverviewView.tsx
apps/desktop/src/features/overview/CaseReadinessCard.tsx
apps/desktop/src/features/overview/CaseTimeline.tsx
apps/desktop/src/features/overview/NextActionCard.tsx
apps/desktop/src/features/overview/CaseParticipantsCard.tsx
Capture
apps/desktop/src/features/capture/readiness.ts
apps/desktop/src/features/capture/CaptureChecklistPanel.tsx
apps/desktop/src/features/capture/CaptureQualityPanel.tsx
apps/desktop/src/features/capture/AssetInventoryPanel.tsx
apps/desktop/src/store/useReadinessStore.ts
Simulate
apps/desktop/src/features/simulate/SimulationView.tsx
apps/desktop/src/features/simulate/SimulationSummaryBar.tsx
apps/desktop/src/features/simulate/SimulationConfidencePanel.tsx
apps/desktop/src/features/simulate/RecommendedNextStepCard.tsx
Plan
apps/desktop/src/features/plan/PlanView.tsx
apps/desktop/src/features/plan/PlanStepRail.tsx
apps/desktop/src/features/plan/StackWorkspace.tsx
apps/desktop/src/features/plan/StructureWorkspace.tsx
apps/desktop/src/features/plan/DesignWorkspace.tsx
apps/desktop/src/features/plan/LayerManager.tsx
apps/desktop/src/features/plan/AlignmentConfidenceBanner.tsx
Validate
apps/desktop/src/features/validate/ValidateView.tsx
apps/desktop/src/features/validate/ReviewTimeline.tsx
apps/desktop/src/features/validate/MeasurementsPanel.tsx
apps/desktop/src/features/validate/ApprovalSummaryCard.tsx
apps/desktop/src/features/validate/PreparationChecklist.tsx
Collaborate
apps/desktop/src/features/collaboration/CollaborateView.tsx
apps/desktop/src/features/collaboration/AudiencePicker.tsx
apps/desktop/src/features/collaboration/InvitePanel.tsx
apps/desktop/src/features/collaboration/HandoffQueue.tsx
apps/desktop/src/features/collaboration/ShareAuditLog.tsx
apps/desktop/src/store/useCollaborationStore.ts
Present
apps/desktop/src/features/present/PresentView.tsx
apps/desktop/src/features/present/ExportReadinessChecklist.tsx
apps/desktop/src/features/present/PatientStoryPanel.tsx
apps/desktop/src/features/present/PresentationAssetGallery.tsx
apps/desktop/src/features/present/DoctorHandoffPanel.tsx
apps/desktop/src/store/usePresentationStore.ts
Required Modifications
Layout shell
Modify:

AppShell.tsx
Sidebar.tsx
Workspace.tsx
Header.tsx
Instruction:

replace legacy nav semantics with workflow-stage semantics
keep mounted-workspace behavior
use placeholders for not-yet-built routes instead of blocking the shell rewrite
Existing views
Modify:

ImportView.tsx
DesignView.tsx
CompareView.tsx
ExportView.tsx
Instruction:

do not delete these immediately
repurpose them as underlying surfaces for:
capture
simulate
validate
present
Existing stores
Modify:

useViewportStore.ts
useCaseStore.ts
useDesignStore.ts
Instruction:

move route ownership out of useViewportStore
add derived workflow selectors to useCaseStore
keep generation and variant logic in useDesignStore
only split more state if route orchestration becomes too tangled
Route-by-Route Build Instructions
Route: Cases
Build using:

existing CaseListView.tsx
enhanced filtering and stage labeling
Must show:

case list
filters
collections overlay
create case
Must do:

open Overview on case select
open Capture on new case
Route: Overview
Build from new components only.

Must show:

case header
readiness summary
next action
artifact timeline
collaboration summary
presentation summary
Must read from:

useCaseStore
useReadinessStore
useDesignStore
future collaboration/presentation stores
Route: Capture
Build by turning ImportView.tsx into an orchestration shell.

Must keep:

photo upload
arch scan upload
tooth model upload
Must add:

readiness computation
capture checklist
quality guidance
continue gating
Route: Simulate
Build by reusing DesignView.tsx internals.

Must keep:

generation
viewport
direct manipulation
variant selection
before/after
smile metrics
Must add:

simulation summary bar
confidence surface
next-step CTA
Route: Plan
Build as a new orchestration route around existing planning-capable modules.

Must expose:

stack
structure
design
Must reuse:

SceneCanvas
SmilePlanPanel
ToothInspector
LibraryPanel
ArchFormEditor
ShadeSelector
Do not:

create a second independent design engine
duplicate planning state outside existing stores without necessity
Route: Validate
Build by wrapping existing compare and review surfaces.

Must expose:

compare
review
measurements
approvals
Must reuse:

CompareView.tsx
ScanReviewPanel.tsx
annotation infrastructure where available
Route: Collaborate
Build new route scaffolding first.

Must expose:

audience picker
payload selection
audit log
service-order placeholder
team/expert/lab/service flows
Must reuse:

casePackager.ts
Do not:

build network transport yet
Route: Present
Build by reorganizing ExportView.tsx.

Must expose:

summary
assets
report
handoff
Must keep:

mesh export
report generation
package export
Must add:

patient-story grouping
readiness checklist
presentation asset gallery
Data Model Instructions
Extend CaseRecord
Add or derive:

readiness summary
current stage
active artifact/version
collaboration summary
presentation status
Add CaseArtifact
Use this shape or equivalent:

interface CaseArtifact {
  id: string;
  type: "photo" | "scan" | "simulation" | "plan_version" | "review_snapshot" | "report" | "package";
  label: string;
  createdAt: string;
  version: number;
  status: "draft" | "active" | "approved" | "shared" | "archived";
}
Add readiness model
interface CaseReadiness {
  photosReady: boolean;
  scanReady: boolean;
  toothModelsReady: boolean;
  imagingReady: boolean;
  missingItems: string[];
  warnings: string[];
  capabilityWarnings: string[];
}
Testing Instructions
Unit tests
Add tests for:

route store
readiness computation
route-level empty states
route-level blocked states
Component tests
Add tests for:

Sidebar
Workspace route switching
CaseContextHeader
CaseOverviewView
ImportView as Capture shell
SimulationView
PlanView
ValidateView
CollaborateView
PresentView
Workflow acceptance test
Create one app-level acceptance test covering:

open app
create or select case
incomplete Capture blocks progression
valid Capture unlocks Simulate
Simulate leads to Plan
Plan exposes three substeps
Validate exposes review surfaces
Collaborate exposes audience-first choices
Present exposes export/report/handoff
Build verification
Always run:

pnpm --filter desktop test
pnpm --filter desktop build
Sequencing Instructions
Order of implementation
route shell
case context header
overview
capture readiness
simulate route
plan route
validate route
collaborate route
present route
acceptance pass
Commit discipline
Use one commit per route-scale task or smaller.
Do not mix unrelated route and domain changes in one commit.

Non-Negotiable Constraints
Preserve mounted workspaces for heavy 3D views.
Prefer route orchestration over engine rewrites.
Prefer reuse of existing modules over creating parallel feature systems.
Do not hide capability or readiness blockers.
Keep the product case-first and workflow-first.

If you want, I can next generate a third companion document:

1. a **microtask execution plan** in strict TDD format
2. or a **prompt packet** you can hand directly to coding subagents one task at a time

2

# SmileGen Workflow Refactor Prompt Packet For Coding Subagents

## Controller Instructions
Use this packet to dispatch one coding subagent per task.
Give each subagent only one task at a time.
Require TDD.
Require targeted tests before completion.
Require minimal scope.
Do not let subagents redesign the architecture.
Do not let subagents implement future tasks early.

## Global Context For Every Subagent

Project:
- `apps/desktop` inside SmileGen

Goal:
- refactor SmileGen into a workflow-first shell:
  - `cases`
  - `overview`
  - `capture`
  - `simulate`
  - `plan`
  - `validate`
  - `collaborate`
  - `present`
  - `settings`

Architectural rules:
- preserve mounted-workspace behavior
- preserve current local-first architecture
- reuse existing import/design/compare/export modules
- route orchestration first, deep feature expansion second
- do not build cloud sync
- do not build real-time collaboration
- do not build a separate patient app

Source-derived UX rules:
- case-first
- readiness before work
- simulation is the fast lane
- plan has substeps: `stack`, `structure`, `design`
- validate centralizes compare/review/approval
- collaborate is audience-first
- present centralizes report/export/patient-ready outputs

Testing baseline:
- `pnpm --filter desktop test`
- `pnpm --filter desktop build`

Subagent output format:
1. files changed
2. tests run and result
3. limitations or follow-up
4. commit SHA only if explicitly asked to commit

No subagent should commit unless the controller explicitly requests it.

---

## Prompt 1: Route Shell

You are implementing the workflow-first route shell in `apps/desktop`.

Task:
- create `apps/desktop/src/store/useRouteStore.ts`
- modify `apps/desktop/src/store/useViewportStore.ts`
- modify `apps/desktop/src/features/layout/Sidebar.tsx`
- modify `apps/desktop/src/features/layout/AppShell.tsx`
- modify `apps/desktop/src/features/layout/Workspace.tsx`
- add:
  - `apps/desktop/src/features/layout/Sidebar.test.tsx`
  - `apps/desktop/src/features/layout/Workspace.test.tsx`

Requirements:
- add route IDs:
  - `cases`
  - `overview`
  - `capture`
  - `simulate`
  - `plan`
  - `validate`
  - `collaborate`
  - `present`
  - `settings`
- move navigation ownership to `useRouteStore`
- keep `useViewportStore` for overlay/camera/photo viewport state
- preserve mounted-workspace behavior
- map current underlying views minimally:
  - existing cases -> `cases`
  - existing import -> `capture`
  - existing design -> `simulate`
  - existing compare -> `validate`
  - existing export -> `present`
  - placeholder containers for `overview`, `plan`, `collaborate`
- do not implement Overview or other later routes beyond placeholder rendering

Process:
1. write failing tests first
2. run targeted tests and verify failure
3. implement minimal solution
4. rerun targeted tests
5. do not commit

Run:
```bash
pnpm --filter desktop test -- --run src/features/layout/Sidebar.test.tsx src/features/layout/Workspace.test.tsx
Expected result:

tests pass
app still builds
Prompt 2: Shared Case Context Header
You are implementing the shared case context header for non-case routes in apps/desktop.

Task:

create apps/desktop/src/features/layout/CaseContextHeader.tsx
modify apps/desktop/src/features/layout/AppShell.tsx
modify apps/desktop/src/store/useCaseStore.ts
add apps/desktop/src/features/layout/CaseContextHeader.test.tsx
Requirements:

show:
case title
workflow stage
last updated time
readiness placeholder or summary
active artifact/version placeholder
render safely when no case is selected
display on every route except cases
keep implementation thin and route-aware
Process:

write failing test
run targeted test
implement minimal component
rerun test
do not commit
Run:

pnpm --filter desktop test -- --run src/features/layout/CaseContextHeader.test.tsx
Prompt 3: Overview Route
You are implementing the overview route in apps/desktop.

Task:

create:
apps/desktop/src/features/overview/CaseOverviewView.tsx
apps/desktop/src/features/overview/CaseReadinessCard.tsx
apps/desktop/src/features/overview/CaseTimeline.tsx
apps/desktop/src/features/overview/NextActionCard.tsx
apps/desktop/src/features/overview/CaseParticipantsCard.tsx
modify apps/desktop/src/features/layout/Workspace.tsx
add apps/desktop/src/features/overview/CaseOverviewView.test.tsx
Requirements:

Overview must show:
readiness summary
next action
timeline placeholder
collaborator summary placeholder
presentation summary placeholder
use current case state to derive the next action
support empty state when no active case exists
do not implement collaboration systems here; use placeholders where needed
Next action logic should roughly follow:

no imports -> capture
imports ready, no design -> simulate
design exists, no structured plan -> plan
review unresolved -> validate
ready to share or present -> collaborate or present
Process:

add failing tests
run targeted test
implement minimal route
rerun test
do not commit
Run:

pnpm --filter desktop test -- --run src/features/overview/CaseOverviewView.test.tsx
Prompt 4: Readiness Engine
You are implementing the readiness model for the capture route in apps/desktop.

Task:

create:
apps/desktop/src/features/capture/readiness.ts
apps/desktop/src/features/capture/readiness.test.ts
apps/desktop/src/store/useReadinessStore.ts
modify:
apps/desktop/src/store/useImportStore.ts
apps/desktop/src/store/useCaseStore.ts
Requirements:

readiness must compute:
required photos present
arch scan present
tooth model readiness
optional imaging state
missing items
warnings
capability warnings
keep it deterministic and pure where possible
do not implement real hardware detection or true billing gates yet; use structured placeholders
Process:

write failing unit tests
run targeted test
implement minimal logic
rerun test
do not commit
Run:

pnpm --filter desktop test -- --run src/features/capture/readiness.test.ts
Prompt 5: Capture Route Panels
You are turning the current import flow into the capture route shell.

Task:

create:
apps/desktop/src/features/capture/CaptureChecklistPanel.tsx
apps/desktop/src/features/capture/CaptureQualityPanel.tsx
apps/desktop/src/features/capture/AssetInventoryPanel.tsx
modify:
apps/desktop/src/features/views/ImportView.tsx
apps/desktop/src/features/views/HowToGuidePanel.tsx
add apps/desktop/src/features/views/ImportView.test.tsx
Requirements:

keep current upload functionality
add:
readiness checklist
quality guidance
asset inventory
continue CTA
disable progression when readiness is incomplete
preserve drag/drop and browse behavior
do not rename the file yet if that creates churn; route semantics matter more than filename
Process:

write failing tests
run targeted test
implement minimal route shell
rerun test
do not commit
Run:

pnpm --filter desktop test -- --run src/features/views/ImportView.test.tsx
Prompt 6: Simulate Route
You are implementing the simulate route using existing SmileGen design infrastructure.

Task:

create:
apps/desktop/src/features/simulate/SimulationView.tsx
apps/desktop/src/features/simulate/SimulationSummaryBar.tsx
apps/desktop/src/features/simulate/SimulationConfidencePanel.tsx
apps/desktop/src/features/simulate/RecommendedNextStepCard.tsx
modify:
apps/desktop/src/features/views/DesignView.tsx
apps/desktop/src/features/layout/Workspace.tsx
add apps/desktop/src/features/simulate/SimulationView.test.tsx
Requirements:

preserve:
generation
variant selection
direct manipulation
metrics
preview
present this as a fast, portrait-first route
include CTA to continue into plan
do not overload this screen with advanced planning controls
Process:

write failing tests
run targeted test
implement minimal route
rerun test
do not commit
Run:

pnpm --filter desktop test -- --run src/features/simulate/SimulationView.test.tsx
Prompt 7: Plan Route Skeleton
You are implementing the plan route and its three substeps.

Task:

create:
apps/desktop/src/features/plan/PlanView.tsx
apps/desktop/src/features/plan/PlanStepRail.tsx
apps/desktop/src/features/plan/StackWorkspace.tsx
apps/desktop/src/features/plan/StructureWorkspace.tsx
apps/desktop/src/features/plan/DesignWorkspace.tsx
apps/desktop/src/features/plan/LayerManager.tsx
apps/desktop/src/features/plan/AlignmentConfidenceBanner.tsx
modify:
apps/desktop/src/store/useRouteStore.ts
apps/desktop/src/features/layout/Workspace.tsx
add apps/desktop/src/features/plan/PlanView.test.tsx
Requirements:

expose substeps:
stack
structure
design
reuse existing modules where possible:
SceneCanvas
SmilePlanPanel
ToothInspector
LibraryPanel
ArchFormEditor
ShadeSelector
do not rewrite planning or geometry logic
keep step components as orchestration layers first
Process:

write failing tests
run targeted test
implement minimal skeleton
rerun test
do not commit
Run:

pnpm --filter desktop test -- --run src/features/plan/PlanView.test.tsx
Prompt 8: Validate Route
You are implementing the validate route.

Task:

create:
apps/desktop/src/features/validate/ValidateView.tsx
apps/desktop/src/features/validate/ReviewTimeline.tsx
apps/desktop/src/features/validate/MeasurementsPanel.tsx
apps/desktop/src/features/validate/ApprovalSummaryCard.tsx
apps/desktop/src/features/validate/PreparationChecklist.tsx
modify:
apps/desktop/src/features/views/CompareView.tsx
apps/desktop/src/features/review/ScanReviewPanel.tsx
apps/desktop/src/store/useRouteStore.ts
add apps/desktop/src/features/validate/ValidateView.test.tsx
Requirements:

tabs:
compare
review
measurements
approvals
reuse current compare/review surfaces
unify approval summary in this route
support empty state with no variants
Process:

write failing tests
run targeted test
implement minimal route
rerun test
do not commit
Run:

pnpm --filter desktop test -- --run src/features/validate/ValidateView.test.tsx
Prompt 9: Collaborate Route
You are implementing the collaborate route.

Task:

create:
apps/desktop/src/features/collaboration/CollaborateView.tsx
apps/desktop/src/features/collaboration/AudiencePicker.tsx
apps/desktop/src/features/collaboration/InvitePanel.tsx
apps/desktop/src/features/collaboration/HandoffQueue.tsx
apps/desktop/src/features/collaboration/ShareAuditLog.tsx
apps/desktop/src/store/useCollaborationStore.ts
modify:
apps/desktop/src/features/collaboration/casePackager.ts
apps/desktop/src/features/layout/Workspace.tsx
add apps/desktop/src/features/collaboration/CollaborateView.test.tsx
Requirements:

audience-first choices:
care team
external expert
lab
service provider
patient placeholder if needed
support package selection
support audit log placeholder
do not build transport/networking
reuse current packaging where possible
Process:

write failing tests
run targeted test
implement minimal route
rerun test
do not commit
Run:

pnpm --filter desktop test -- --run src/features/collaboration/CollaborateView.test.tsx
Prompt 10: Present Route
You are implementing the present route.

Task:

create:
apps/desktop/src/features/present/PresentView.tsx
apps/desktop/src/features/present/ExportReadinessChecklist.tsx
apps/desktop/src/features/present/PatientStoryPanel.tsx
apps/desktop/src/features/present/PresentationAssetGallery.tsx
apps/desktop/src/features/present/DoctorHandoffPanel.tsx
apps/desktop/src/store/usePresentationStore.ts
modify:
apps/desktop/src/features/views/ExportView.tsx
apps/desktop/src/features/export/reportGenerator.ts
apps/desktop/src/features/layout/Workspace.tsx
add apps/desktop/src/features/present/PresentView.test.tsx
Requirements:

reorganize export concerns into:
summary
assets
report
handoff
keep current export functionality
add patient-facing asset grouping
add readiness checklist
do not build a true patient app
Process:

write failing tests
run targeted test
implement minimal route
rerun test
do not commit
Run:

pnpm --filter desktop test -- --run src/features/present/PresentView.test.tsx
Prompt 11: Workflow Acceptance Pass
You are implementing the route-level acceptance coverage for the new workflow shell.

Task:

create apps/desktop/src/features/layout/appWorkflowAcceptance.test.tsx
modify any route shell files only if needed to satisfy the acceptance flow
Requirements:

cover this end-to-end path:
app opens with workflow nav
user creates or selects case
incomplete capture blocks progression
valid capture unlocks simulate
simulate leads to plan
plan exposes stack/structure/design
validate exposes compare/review/approval
collaborate exposes audience-first sharing
present exposes export/report/handoff
do not add unrelated features just to satisfy the test
prefer fixing orchestration, state wiring, and empty-state handling
Process:

write failing acceptance test
run it
patch orchestration minimally
rerun targeted acceptance test
run full test suite
run build
do not commit
Run:

pnpm --filter desktop test -- --run src/features/layout/appWorkflowAcceptance.test.tsx
pnpm --filter desktop test
pnpm --filter desktop build
Prompt 12: Final Stabilization Review
You are performing a stabilization pass after all workflow routes exist.

Task:

inspect the route shell, stores, and tests
make only low-risk cleanup improvements needed for consistency
do not redesign
Focus:

route naming consistency
blocked-state consistency
empty-state consistency
duplicated stage labels
obvious test gaps around route transitions
Verification:

pnpm --filter desktop test
pnpm --filter desktop build
Return:

low-risk issues found
fixes applied
verification results
remaining risks

If you want, I can also generate:
1. a **reviewer prompt packet** for spec-review and code-quality-review subagents
2. a **controller checklist** for managing the full subagent-driven execution loop

1


Worked for 54s
# SmileGen Workflow Refactor Reviewer Prompt Packet

## Controller Instructions
Use these prompts after each implementation task.

Review order is mandatory:
1. spec review
2. code quality review

Do not run code quality review before spec review passes.

Every reviewer must:
- stay within the task scope
- avoid inventing new requirements
- clearly separate required fixes from optional suggestions
- cite exact files
- say whether the task is approved or not approved

---

## Prompt A: Spec Review

You are the spec reviewer for a single SmileGen workflow-refactor task.

Your job:
- verify the implementation matches the assigned task exactly
- reject missing required behavior
- reject out-of-scope extra behavior if it creates new surface area not requested
- do not review style or general code quality yet unless it directly violates the task

Project context:
- `apps/desktop` in SmileGen
- this refactor is workflow-first
- target routes are:
  - `cases`
  - `overview`
  - `capture`
  - `simulate`
  - `plan`
  - `validate`
  - `collaborate`
  - `present`
  - `settings`

Global rules:
- preserve mounted-workspace behavior for heavy views
- keep local-first architecture
- reuse existing import/design/compare/export modules
- do not implement cloud sync
- do not implement real-time collaboration
- do not build a separate patient app
- do not silently widen scope beyond the assigned task

Review instructions:
1. Read the assigned task text carefully.
2. Inspect only the files relevant to the task plus nearby wiring as needed.
3. Determine:
   - what was required
   - what was implemented
   - what is missing
   - what is extra
4. Approve only if:
   - every required item is present
   - no important required behavior is missing
   - no problematic out-of-scope behavior was added
5. Ignore minor style issues unless they block spec compliance.

Output format:
- `Verdict: APPROVED` or `Verdict: NOT APPROVED`
- `Required items satisfied`
- `Missing or incorrect items`
- `Out-of-scope additions`
- `Required next actions`

Use exact file paths.

If approved, say:
- `Spec status: complete`

If not approved, say:
- `Spec status: incomplete`

### Generic spec-review checklist
- correct files created or modified
- correct route/stage names used
- required state/store ownership respected
- no skipped required tests
- no hidden divergence from task instructions
- no unrelated feature work added

---

## Prompt B: Code Quality Review

You are the code quality reviewer for a single SmileGen workflow-refactor task.

Run this review only after spec review is approved.

Your job:
- review implementation quality, maintainability, and test quality
- identify risks, regressions, brittle logic, duplication, or poor boundaries
- do not reopen product-scope debates already settled by the spec
- do not request architectural rewrites unless there is a concrete defect or strong maintainability risk

Project context:
- React 19
- TypeScript
- Zustand
- Zundo
- Three.js
- Vite
- Vitest
- mounted-workspace layout is intentional
- route orchestration should be thin
- existing import/design/compare/export modules should be reused where possible

Review priorities:
1. regressions
2. broken state ownership
3. brittle route wiring
4. weak tests
5. duplication and maintainability issues
6. naming clarity
7. minor cleanup

Focus especially on:
- route/store boundaries
- mounted-workspace preservation
- empty and blocked states
- test realism
- accidental coupling between route shell and domain logic
- reuse versus duplication

Output format:
- `Verdict: APPROVED` or `Verdict: NOT APPROVED`
- `Strengths`
- `Issues`
- `Required fixes`
- `Optional improvements`
- `Residual risks`

Use exact file paths.

Rules:
- flag only concrete issues
- separate required fixes from optional improvements
- keep comments actionable
- do not request speculative refactors

### Generic code-quality checklist
- no obvious runtime crash path
- no unsafe or inconsistent route mapping
- no route state mixed back into visual viewport state without reason
- no duplication of existing domain logic
- no fake tests that only assert implementation trivia
- empty/blocked states handled safely
- component responsibilities remain readable
- no unnecessary widening of data model in an early task

---

## Task-Specific Reviewer Addenda

### Addendum 1: Route Shell Task
Apply when reviewing the route-shell implementation.

Spec reviewer must confirm:
- `useRouteStore.ts` exists
- navigation ownership moved out of `useViewportStore`
- sidebar uses workflow-first labels
- workspace preserves mounted-workspace behavior
- current underlying route mapping is minimal and correct
- placeholders are used only where allowed

Code quality reviewer must focus on:
- route-state API shape
- whether route and viewport concerns are actually separated
- whether placeholder routes are safe
- whether tests cover navigation switching and mounted behavior

### Addendum 2: Case Context Header Task
Spec reviewer must confirm:
- header appears on non-case routes
- empty state is safe
- required case fields are shown

Code quality reviewer must focus on:
- unnecessary coupling to route internals
- duplicated case-summary logic
- brittle formatting or null-handling

### Addendum 3: Overview Route Task
Spec reviewer must confirm:
- readiness, next action, and timeline exist
- next action is derived from case state
- placeholders are used where the task allows them

Code quality reviewer must focus on:
- weak or hard-coded next-action logic
- duplicated readiness derivation
- poor empty-state behavior

### Addendum 4: Readiness Engine Task
Spec reviewer must confirm:
- readiness computes required fields
- missing-items and warnings are present
- targeted tests exist and run

Code quality reviewer must focus on:
- deterministic pure logic
- test coverage of edge cases
- overreach into billing/hardware detection that was not required

### Addendum 5: Capture Route Task
Spec reviewer must confirm:
- import flow still works
- checklist, quality, inventory, and continue gating exist
- route remains the capture shell

Code quality reviewer must focus on:
- preserving existing import behavior
- avoiding duplication between import cards and new panels
- clear gating logic

### Addendum 6: Simulate Route Task
Spec reviewer must confirm:
- route exists
- it preserves fast design workflow
- CTA to Plan exists
- advanced planning controls did not spill into Simulate

Code quality reviewer must focus on:
- whether route orchestration is thin
- whether existing design modules were reused properly
- whether route remains visually focused

### Addendum 7: Plan Route Task
Spec reviewer must confirm:
- `stack`, `structure`, `design` substeps exist
- route wiring exists
- reused planning modules are accessible through the new route

Code quality reviewer must focus on:
- whether planning logic was duplicated
- whether substeps are too tightly coupled
- whether shared viewport stability is preserved

### Addendum 8: Validate Route Task
Spec reviewer must confirm:
- compare, review, measurements, approvals all exist
- approval summary is visible
- empty state is safe

Code quality reviewer must focus on:
- whether compare and review remain coherent
- whether approval state is centralized or fragmented
- whether tests cover no-variant and normal flows

### Addendum 9: Collaborate Route Task
Spec reviewer must confirm:
- audience-first selector exists
- package/audit placeholders exist
- no networking overreach was added

Code quality reviewer must focus on:
- store design for collaboration state
- avoiding premature complexity
- reuse of case packaging logic

### Addendum 10: Present Route Task
Spec reviewer must confirm:
- summary, assets, report, handoff areas exist
- current export capability still exists
- presentation-specific grouping was added

Code quality reviewer must focus on:
- whether export logic was preserved safely
- whether presentation state is cleanly separated
- whether tests cover readiness and empty states

### Addendum 11: Workflow Acceptance Task
Spec reviewer must confirm:
- acceptance scenarios match assigned workflow
- no unrelated scope was added to satisfy tests

Code quality reviewer must focus on:
- whether acceptance test is meaningful rather than shallow
- whether it relies on fragile implementation details
- whether full test/build verification was actually run

---

## Example Controller Usage

### After implementation subagent returns
Use Prompt A with:
- full task text
- files changed
- test results
- diff or changed files

If Prompt A returns approved:
- run Prompt B with same context

If Prompt A returns not approved:
- send required fixes back to implementer
- rerun Prompt A after fixes
- only then run Prompt B

If Prompt B returns not approved:
- send only the required fixes back to implementer
- rerun Prompt B after fixes

Do not move to the next implementation task until:
- spec review says approved
- code quality review says approved
If you want, I can also generate a controller runbook that tells you exactly how to orchestrate implementer -> spec review -> quality review -> retry loops step by step.


generate a controller runbook that tells you exactly how to orchestrate implementer -> spec review -> quality review -> retry loops step by step.


# SmileGen Workflow Refactor Controller Runbook

## Purpose
This runbook tells the controller exactly how to execute the SmileGen workflow refactor using subagents in this order:

1. implementer
2. spec reviewer
3. code quality reviewer
4. retry loops until approved
5. move to next task

Use this for every task.
Do not skip steps.
Do not merge partial approvals.

---

## Core Rule

A task is complete only when all three are true:
- implementation is done
- spec review is approved
- code quality review is approved

If either reviewer rejects the task, the task is still open.

---

## Standard Execution Cycle

For each task:

1. prepare task packet
2. dispatch implementer
3. wait for implementation result
4. run spec review
5. if spec fails, send required fixes back to implementer and repeat
6. if spec passes, run code quality review
7. if quality fails, send required fixes back to implementer and repeat quality review
8. when both pass, mark task complete
9. move to next task

---

## Step 1: Prepare Task Packet

Before spawning the implementer, gather:

- exact task name
- exact files to create/modify
- exact tests to add/update
- exact route/store/component constraints
- exact command(s) the subagent must run
- scope boundaries
- things explicitly deferred

### Required packet fields
- `Task`
- `Goal`
- `Workspace root`
- `Files`
- `Requirements`
- `Non-goals`
- `Tests to run`
- `Expected result`
- `Output format`

### Example packet skeleton
```text
Task: Add workflow-first route shell
Goal: Move navigation ownership to useRouteStore and update sidebar/workspace semantics
Workspace root: /path/to/worktree

Files:
- Create: ...
- Modify: ...
- Test: ...

Requirements:
- ...
- ...

Non-goals:
- ...
- ...

Tests to run:
- pnpm --filter desktop test -- --run ...

Expected result:
- tests pass
- no unrelated files changed

Output format:
1. files changed
2. tests run and results
3. limitations
4. commit SHA only if requested
Step 2: Dispatch Implementer
Spawn one worker subagent.

Implementer instructions must include
exact task scope
“do not revert others’ edits”
“do not widen scope”
“follow TDD”
“run the targeted tests before finishing”
“do not commit unless asked”
Good controller prompt shape
Implement ONLY Task X.

Requirements:
- ...

Hard constraints:
- ...
- ...

Follow TDD:
1. write failing tests
2. run tests to verify failure
3. implement minimal code
4. rerun targeted tests

Do not commit.
Return:
1. files changed
2. tests run/results
3. limitations
Step 3: Wait For Implementer Result
When the implementer returns, inspect:

were only expected files changed?
were targeted tests actually run?
were results reported clearly?
were there blockers or open questions?
If the implementer reports blockers
Do not send to reviewers yet.

Instead:

answer the blocker clearly
re-dispatch the same implementer or send follow-up input
wait for updated implementation result
If the implementer changed out-of-scope files
Stop and inspect before proceeding.
Do not review a task that drifted.

Step 4: Run Spec Review
Spec review happens before code quality review.

Spawn one reviewer subagent with:

task text
implementation summary
changed files
test results
reviewer packet
Reviewer must answer
approved or not approved
required items satisfied
missing items
out-of-scope additions
required next actions
Spec review decision
If APPROVED: continue to code quality review
If NOT APPROVED: go to retry loop A
Retry Loop A: Spec Fix Loop
If spec review fails:

extract only the required fixes from the spec review
send them back to the implementer
tell implementer not to do extra cleanup
wait for revised implementation
rerun spec review
Repeat until spec review says approved.

Important
Do not start code quality review while spec review is still failing.

Good fix prompt
Spec review did not approve the task.

Required fixes only:
- ...
- ...
- ...

Do not widen scope.
Do not make optional improvements.
Rerun the same targeted tests after fixing.
Return updated file list and test results.
Step 5: Run Code Quality Review
Only after spec review passes.

Spawn one reviewer subagent with:

task text
changed files
test results
approved spec status
code quality reviewer packet
Reviewer must answer
approved or not approved
strengths
issues
required fixes
optional improvements
residual risks
Code quality decision
If APPROVED: task is complete
If NOT APPROVED: go to retry loop B
Retry Loop B: Quality Fix Loop
If code quality review fails:

extract only required fixes
send them back to the implementer
do not include optional suggestions unless you explicitly choose to
wait for revised implementation
rerun code quality review
Repeat until code quality review says approved.

Important
Do not rerun spec review unless the quality fix materially changed scope or behavior.

Good fix prompt
Code quality review did not approve the task.

Required fixes only:
- ...
- ...
- ...

Do not redesign the task.
Do not add unrelated cleanup.
Rerun targeted tests after fixing.
Return updated file list and test results.
Step 6: Mark Task Complete
A task is complete when:

implementer delivered scoped changes
spec reviewer approved
code quality reviewer approved
Then the controller should record:

task name
files changed
tests run
known residual risks
whether commit happened
Suggested completion note format
Task complete: [task name]

Files changed:
- ...

Tests:
- ...

Residual risks:
- none / ...

Ready for next task.
Step 7: Move To Next Task
Only after completion.

Then repeat the same cycle:

prepare packet
implementer
spec review
quality review
retry loops as needed
Do not batch multiple implementation tasks into one subagent unless the plan explicitly says they are inseparable.

Controller Decision Tree
Start task
  -> dispatch implementer
    -> implementation returned?
      -> no: wait or follow up
      -> yes:
        -> scoped correctly?
          -> no: inspect drift, resolve before review
          -> yes:
            -> run spec review
              -> spec approved?
                -> no: send required fixes to implementer, rerun spec review
                -> yes:
                  -> run code quality review
                    -> quality approved?
                      -> no: send required fixes to implementer, rerun quality review
                      -> yes: mark task complete
What To Do When Something Goes Wrong
Case 1: Implementer stalls
If the implementer does not return in reasonable time:

send one status-check prompt
if still stalled, close and replace with a fresh implementer
reuse the same exact task packet
Case 2: Unexpected out-of-scope changes appear
stop immediately
inspect and summarize changed files
decide whether to salvage or restart
do not continue review until the state is understood
Case 3: Reviewer asks for a redesign
Reject that unless:

it is tied to a concrete bug
or the task clearly violated architecture constraints
Reviewers are not allowed to silently rewrite the plan.

Case 4: Implementer “fixes” reviewer issues with broad refactors
Reject and redirect.
Ask for minimal fixes only.

Case 5: Tests were not run
Task is not review-ready.
Send back to implementer and require actual test execution.

Minimal Controller Prompts
Implementer dispatch
Implement ONLY Task X.
Follow TDD.
Do not widen scope.
Do not commit.
Run the targeted tests.
Return files changed, tests run/results, limitations.
Spec review dispatch
Review this task for spec compliance only.
Do not review general code quality yet.
Return APPROVED or NOT APPROVED, missing items, out-of-scope additions, required next actions.
Code quality review dispatch
Spec review already approved.
Review this task for code quality only.
Return APPROVED or NOT APPROVED, required fixes, optional improvements, residual risks.
Implementer fix prompt after spec review
Apply only these required spec fixes.
Do not widen scope.
Rerun targeted tests.
Return updated files and results.
Implementer fix prompt after quality review
Apply only these required quality fixes.
Do not redesign the task.
Rerun targeted tests.
Return updated files and results.
Completion Checklist Per Task
Before moving on, confirm all are true:

implementer stayed in scope
required files changed
targeted tests were run
tests passed
spec review approved
code quality review approved
no unresolved required fixes remain
If any item is false, the task is still open.

End-of-Run Procedure
After all tasks are complete:

run one final code review across the full implementation
run full test suite
run build
summarize:
completed tasks
files changed
test/build status
residual risks
only then move to branch-finishing or PR-prep flow
Final verification commands
pnpm --filter desktop test
pnpm --filter desktop build

If you want, I can now generate a **one-page controller cheat sheet** version of this runbook for fast use during live task orchestration.