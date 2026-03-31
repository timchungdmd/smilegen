# SmileCloud Learning Center Inventory for SmileGen Traceability

**Date:** 2026-03-09
**Purpose:** Expanded public-page inventory used to tighten SmileGen IA, PRD, and implementation planning
**Coverage rule:** This is a page-by-page functional inventory, not a verbatim reproduction of source text

## Method

- Source basis: public SmileCloud Learning Center pages reachable from [learn.smilecloud.com](https://learn.smilecloud.com/en)
- Access status:
  - `opened` means the page was opened directly during research
  - `catalog-only` means the page title was verified from the learning-center/category inventory, but the current pass did not extract a direct content summary
- Purpose: ensure the SmileGen design and implementation plan do not omit publicly documented workflows

## Inventory

| Category | Title | Access | Primary SmileGen stage | Notes |
| --- | --- | --- | --- | --- |
| Root | SmileCloud Learning Center | opened | Overview | Top-level information architecture and category map |
| Smile Design | Guide to Smile Design | opened | Simulate | Core fast smile-design workflow |
| Smile Design | Get the YES - Step by Step | opened | Simulate | Procedural path for simulation workflow |
| Smile Design | HD Mode in Smile Design | catalog-only | Simulate | High-fidelity design-display mode |
| Smile Design | Adaptive Lighting | catalog-only | Simulate | Display/lighting refinement behavior |
| Smile Design | Get the YES - From Design to Story | opened | Simulate / Present | One-photo to editable design to video story |
| Smile Design | What's New in Smile Design | catalog-only | Simulate | Change log for simulation workflow |
| Blueprint | What is Blueprint | opened | Plan | Product-level definition of advanced planning workspace |
| Blueprint | Create a Blueprint | opened | Plan | Entry and transition flow into Blueprint |
| Blueprint | Where is Blueprint Available? | catalog-only | Plan / Settings | Availability and regional gating information |
| Blueprint | Blueprint Technical Requirements | opened | Plan / Capture | Device and system prerequisites |
| Blueprint | Lock / Unlock Blueprint | catalog-only | Plan | Session/version control behavior |
| Blueprint | Stack | opened | Plan | Data alignment and layer management |
| Blueprint | Structure | opened | Plan | Tooth-level treatment intent |
| Blueprint | Design - Views | opened | Plan / Validate | Multi-view planning and inspection |
| Blueprint | Design - Library Controls | opened | Plan | Linked 2D/3D editing and library management |
| Blueprint | Design - 3D Controls | opened | Plan / Validate | Cross-section, heatmap, sculpting, inspection |
| Blueprint | Wet or Dry View | opened | Plan / Present | Visualization mode toggle |
| Signature / Review | What is Signature Design? | opened | Plan / Present | Imported STL or external wax-up flow |
| Signature / Review | Create a Signature Design | opened | Plan / Capture | Signature setup sequence |
| Signature / Review | Signature Design - Review and Controls | opened | Validate | Review behaviors on imported designs |
| Signature / Review | Visualise Selective Teeth | opened | Validate | Selective visibility and focused inspection |
| Signature / Review | Smilecloud Review | opened | Validate | Core review, measurement, annotation, and prep guidance surface |
| Documentation / Imaging | Upload and Visualize CBCT Files | opened | Capture / Plan | Imaging ingestion workflow |
| Documentation / Imaging | Convert and Visualize CBCT Files in 3D | opened | Capture / Plan | 3D conversion workflow for imaging |
| Documentation / Imaging | Align 3D Files | opened | Plan | Multi-file 3D alignment task |
| Documentation / Imaging | Collections | opened | Cases / Overview | Case grouping and clinic portfolio organization |
| Collaboration | Share Link - 24 Hours | opened | Collaborate | Temporary guest review sharing |
| Collaboration | Drop - in - Chat | opened | Collaborate | Unsupported-file transfer path |
| Collaboration | Team-UP | opened | Collaborate | Persistent multi-account collaboration |
| Patient | What is Smilecloud Passport | opened | Present | Patient-facing experience model |
| Patient | How to Connect your Patients | opened | Present / Collaborate | Patient invitation and sharing rules |
| Patient | Guide for Patients | opened | Present | Patient-side instructions and expectations |
| Services | What is Metalab | opened | Collaborate | Integrated outsourced service model |
| Services | How to Order a Case on Metalab | opened | Collaborate | Service-provider request workflow |
| Services | Which Services does Metalab Offer? | opened | Collaborate | Service scope and offer catalog |
| Account / Team | Understanding Smilecloud Subscription Plans | opened | Settings / Overview | Capability and plan gating |
| Account / Team | How to Create a Subscription Plan | catalog-only | Settings | Subscription onboarding flow |
| Account / Team | How to Add Members to Your Team | opened | Settings / Collaborate | Team administration |
| Account / Team | Joining your Smilecloud Team | opened | Settings / Collaborate | Invite acceptance flow |
| Account / Team | Partners | catalog-only | Settings | Ecosystem / partner capability surface |
| Account / Team | Upgrade, Downgrade and Cancellation | opened | Settings | Plan lifecycle management |
| Account / Team | Methods of Registration and Authentication | opened | Settings | Identity and authentication model |
| Account / Team | What's New in Account | opened | Settings | Account-area change log |
| Release / iPad | Smilecloud iPad Photography & Simulation Guide | opened | Capture / Simulate | Capture quality rules and device guidance |
| Release / iPad | iPad App Development Activity Page | opened | Capture / Settings | Mobile-app progress/availability signal |
| Release / iPad | Release Notes | opened | Overview / Settings | Product evolution and capability deltas |

## Traceability Notes

### Pages that materially affect product behavior
- capture quality and imaging pages affect readiness logic
- Blueprint pages affect plan-stage substep design
- review pages affect the Validate route and approval model
- Passport and patient pages affect Present-route behavior
- team/account/subscription pages affect Settings, capability gates, and collaboration management

### Catalog-only pages
The following pages were visible in the public learning-center inventory but were not directly expanded in the current pass:
- HD Mode in Smile Design
- Adaptive Lighting
- What's New in Smile Design
- Where is Blueprint Available?
- Lock / Unlock Blueprint
- How to Create a Subscription Plan
- Partners

They should remain in the traceability matrix as requirements-review checkpoints during implementation.
