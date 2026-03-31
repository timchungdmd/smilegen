# SmileGen Workflow-First Product PRD

**Date:** 2026-03-08
**Status:** Draft for implementation planning
**Product:** SmileGen desktop application in `apps/desktop`
**Positioning:** Local-first dental smile design and planning platform with a workflow shell inspired by SmileCloud’s documented case lifecycle

## 1. Product Summary

SmileGen should evolve from a capable CAD-oriented desktop tool into a workflow-first case platform for smile simulation, planning, review, collaboration, and presentation.

The product should combine:
- fast proposal creation
- advanced 2D/3D planning
- clear review/approval workflows
- collaboration and handoff
- presentation-ready outputs

The key product change is not only feature addition. It is a change in product language and orchestration:

From:
- import
- design
- compare
- export

To:
- capture
- simulate
- plan
- validate
- collaborate
- present

## 2. Problem Statement

The current SmileGen architecture is feature-capable but workflow-fragmented.

Observed product issues:
- stage boundaries are implicit
- review is separated from upstream planning logic
- export is overloaded with presentation and handoff behaviors
- collaboration is under-modeled
- readiness checks are not first-class

User consequence:
- the app requires too much internal model knowledge
- case progress is not visible enough
- users can generate output before they understand whether the case is actually ready

## 3. Goals

### Primary goals
- make every case feel like one guided workflow
- preserve fast initial smile simulation as the main front door
- create a clear transition from simulation into advanced planning
- centralize validation and approvals
- centralize collaboration and handoff
- centralize patient-facing and doctor-facing presentation outputs

### Secondary goals
- improve discoverability of existing repo features
- reduce navigation ambiguity
- create a foundation for future cloud sync and richer collaboration

## 4. Non-Goals

- building a web-first multi-tenant product in this phase
- implementing real-time multi-user editing in this phase
- replicating every SmileCloud feature literally
- replacing the current local-first architecture
- introducing role-split apps before the workflow shell is stabilized

## 5. Personas

### Primary persona: clinician-designer
Needs:
- fast chairside simulation
- clinically legible case progress
- easy movement from quick proposal to deeper planning

### Secondary persona: lab/expert reviewer
Needs:
- structured review payloads
- clear requests
- clean artifact packaging

### Secondary persona: coordinator
Needs:
- visibility into case stage
- readiness and blockers
- share and presentation status

### Downstream persona: patient
Needs:
- simple, clear visual presentation assets
- limited, safe communication surface

## 6. Jobs to Be Done

### JTBD 1
When I capture a new patient case, I want to know whether the inputs are good enough before I spend time designing.

### JTBD 2
When I create an initial smile proposal, I want a fast visual result that I can iterate without entering a heavy planning mode.

### JTBD 3
When a case needs deeper planning, I want to move into a structured workflow that keeps alignment, treatment intent, and design refinement separate.

### JTBD 4
When a design is under review, I want all comments, measurements, and approvals in one place.

### JTBD 5
When I share a case, I want to start with who I am sharing to, not which technical channel I should use.

### JTBD 6
When I present a case, I want all doctor-ready and patient-ready outputs organized and easy to publish.

## 7. Product Principles

### 7.1 One case, one journey
Every action should reinforce the case lifecycle.

### 7.2 Intent-first UX
The app should ask what the user wants to accomplish.

### 7.3 Readiness first
The app should expose blockers early.

### 7.4 Shared review model
Approval and feedback must not fragment.

### 7.5 Artifact continuity
The app should treat outputs as a case timeline, not unrelated downloads.

## 8. Feature Requirements

### Epic A: Case Foundation

#### FR-A1 Case portfolio
The app shall provide a `Cases` route with:
- search
- filter by stage
- create case
- resume last state

#### FR-A2 Overview route
The app shall provide an `Overview` route for every active case showing:
- case identity
- current stage
- readiness summary
- active design/version
- open review items
- collaborator summary
- presentation status
- recommended next action

#### FR-A3 Artifact timeline
The app shall maintain a case artifact timeline including:
- imports
- simulation versions
- planning versions
- review snapshots
- reports
- packages

### Epic B: Capture

#### FR-B1 Unified capture route
The app shall unify all imports and readiness checks inside a `Capture` route.

#### FR-B2 Input inventory
The app shall manage:
- photos
- arch scan
- tooth models
- optional imaging state

#### FR-B3 Readiness assessment
The app shall compute and display:
- missing required inputs
- quality warnings
- compatibility errors
- capability gating warnings

#### FR-B4 Embedded guidance
The app shall absorb the learning-center capture guidance into in-product checklists and hints rather than relying on external articles only.

### Epic C: Simulate

#### FR-C1 Fast proposal generation
The app shall provide a `Simulate` route for rapid proposal creation from imported assets.

#### FR-C2 Variant workflow
The app shall support:
- generation of multiple variants
- active variant selection
- quick regeneration
- variant strip snapshots

#### FR-C3 High-feedback simulation surface
The route shall expose:
- photo overlay
- before/after comparison
- smile metrics
- trust/confidence summary
- immediate next-step recommendations

### Epic D: Plan

#### FR-D1 Structured planning route
The app shall provide a `Plan` route with three explicit substeps:
- `Stack`
- `Structure`
- `Design`

#### FR-D2 Stack substep
The app shall support alignment and visibility control for:
- portrait
- arch scan
- tooth models
- future imaging layers

#### FR-D3 Structure substep
The app shall support per-tooth treatment intent, library strategy, and planning decisions.

#### FR-D4 Design substep
The app shall support refinement of geometry, views, sculpt-like controls, and diagnostic inspection.

#### FR-D5 Transition clarity
The app shall present movement from `Simulate` to `Plan` as an intent-based continuation, not as a hidden module jump.

### Epic E: Validate

#### FR-E1 Unified validation route
The app shall provide a `Validate` route that centralizes:
- variant comparison
- comments
- annotations
- measurements
- approval state

#### FR-E2 Review history
The app shall preserve a review timeline for each case artifact.

#### FR-E3 Approval state
The app shall support explicit design states such as:
- needs review
- changes requested
- approved
- ready for presentation

### Epic F: Collaborate

#### FR-F1 Audience-first collaboration route
The app shall provide a `Collaborate` route starting with audience intent:
- care team
- external expert
- lab
- service provider

#### FR-F2 Package selection
The app shall allow users to choose which artifacts are sent.

#### FR-F3 Share audit
The app shall maintain a log of what was sent, to whom, and when.

#### FR-F4 Request/revision loop
The route shall support request framing and response tracking for external collaboration.

### Epic G: Present

#### FR-G1 Unified presentation route
The app shall provide a `Present` route for:
- case summary
- report generation
- design export
- patient-facing assets
- doctor handoff outputs

#### FR-G2 Presentation readiness
The route shall show whether the case is presentation-ready and what blockers remain.

#### FR-G3 Patient-ready asset management
The route shall organize before/after visuals, reports, and story assets into one presentation workspace.

## 9. UX Requirements

### UX-1 Persistent case context
Every non-case route shall show the active case identity and workflow state.

### UX-2 Consistent next-step guidance
Every stage shall recommend the logical next action.

### UX-3 Blocked-state clarity
If a stage cannot proceed, the app shall explain why and how to unblock it.

### UX-4 Stable mounted heavy views
WebGL-heavy views shall remain mounted where needed to preserve context and performance.

### UX-5 Shared terminology
Stage labels shall be user-goal-oriented and consistent across the product.

## 10. Technical Product Constraints

- keep the desktop app local-first
- preserve mounted workspace behavior in [`Workspace.tsx`](/Users/timchung/Desktop/smilegen/apps/desktop/src/features/layout/Workspace.tsx) where beneficial
- reuse current stores and refactor incrementally
- avoid a ground-up rewrite of the CAD/viewer stack
- keep current import, design, compare, and export modules as implementation assets

## 11. Success Metrics

### Product metrics
- reduced time from case creation to first simulation
- reduced time from simulation to validated design
- increased proportion of cases with explicit stage progression
- reduced export attempts blocked by missing prerequisites

### UX metrics
- fewer navigation reversals between adjacent stages
- higher completion rate for first-time case setup
- lower rate of failed generation caused by incomplete capture state

### Team metrics
- clearer mapping from product requirements to feature ownership
- lower ambiguity in implementation planning

## 12. Release Plan

### Release 1
- cases
- overview
- capture
- simulate
- present rename
- stage-aware sidebar

### Release 2
- plan route
- validate route
- artifact timeline
- readiness engine

### Release 3
- collaborate route
- share audit log
- patient-ready asset management

### Release 4
- optional cloud-aware workflows
- richer service-provider and lab loop

## 13. Risks

- users familiar with current tabs may resist new workflow labels
- splitting `design` into `simulate` and `plan` may expose architectural coupling in current components
- collaboration and presentation features may require more domain modeling than currently exists
- source learning-center guidance may evolve and require traceability updates

## 14. Open Decisions

- whether `Overview` should be default after loading any case
- whether `Compare` survives as a named child tab under `Validate`
- whether patient-story generation is in-scope before cloud sync
- whether plan gating should live in `Overview`, `Capture`, or both

## 15. Source Traceability Appendix

Full expanded source inventory: [2026-03-09-smilecloud-learning-center-inventory.md](/Users/timchung/Desktop/smilegen/docs/research/2026-03-09-smilecloud-learning-center-inventory.md)

This PRD is directly informed by the following public SmileCloud learning-center pages:

| Source page | PRD sections influenced |
| --- | --- |
| Learning Center homepage | overall workflow shell, case-centric navigation |
| Guide to Smile Design | FR-C1, FR-C2, FR-C3 |
| Get the YES - Step by Step | FR-C1, FR-C2, FR-D5 |
| Get the YES - From Design to Story | FR-C1, FR-G3 |
| What is Blueprint | FR-D1 through FR-D5 |
| Create a Blueprint | FR-D5 |
| Blueprint Technical Requirements | FR-B3, FR-D2 |
| Stack | FR-D2 |
| Structure | FR-D3 |
| Design - Views | FR-D4, FR-E1 |
| Design - Library Controls | FR-D4 |
| Design - 3D Controls | FR-D4, FR-E1 |
| Wet or Dry View | FR-D4, FR-G3 |
| What is Signature Design? | FR-D5, FR-G1 |
| Create a Signature Design | FR-B2, FR-D5 |
| Signature Design - Review and Controls | FR-E1, FR-E2 |
| Visualise Selective Teeth | FR-E1, FR-E2 |
| Smilecloud Review | FR-E1, FR-E2, FR-E3 |
| Upload and Visualize CBCT Files | FR-B2, FR-B3, FR-D2 |
| Convert and Visualize CBCT Files in 3D | FR-B2, FR-D2 |
| Align 3D Files | FR-D2, FR-D4 |
| Share Link - 24 Hours | FR-F1, FR-F2, FR-F3 |
| Drop - in - Chat | FR-F1, FR-F2 |
| Team-UP | FR-F1, FR-F3, FR-F4 |
| What is Smilecloud Passport | FR-G1, FR-G3 |
| How to Connect your Patients | FR-G1, FR-G3 |
| Guide for Patients | FR-G3, UX-2 |
| What is Metalab | FR-F1, FR-F4 |
| How to Order a Case on Metalab | FR-F2, FR-F4 |
| Which Services does Metalab Offer? | FR-F1, FR-F2 |
| Understanding Smilecloud Subscription Plans | FR-B3, UX-3 |
| How to Add Members to Your Team | FR-F1, FR-F3 |
| Joining your Smilecloud Team | FR-F1, UX-1 |
| Upgrade, Downgrade and Cancellation | FR-B3, UX-3 |
| Methods of Registration and Authentication | FR-B3, UX-3 |
| What's New in Account | UX-5 |
| Collections | FR-A1, FR-A2 |
| Smilecloud iPad Photography & Simulation Guide | FR-B3, FR-B4, FR-C1 |
| iPad App Development Activity Page | FR-B3, UX-3 |
| Release Notes | UX-5, release phasing |

This PRD is the product contract for turning SmileGen in this repo into a workflow-first platform.
