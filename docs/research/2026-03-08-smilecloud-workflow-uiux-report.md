## Title
- SmileCloud Workflow and UI/UX Build Direction
- Date: 2026-03-08

## Executive Summary
- SmileCloud is best understood as a case-centric dental workflow platform, but its public learning center exposes that workflow through tool names and separate feature surfaces rather than one explicit end-to-end journey. The underlying flow is coherent; the navigation model is what appears fragmented. [Learning Center](https://learn.smilecloud.com/en) [Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design) [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint)
- The strongest front door is rapid simulation: from a single photo, clinicians can create an editable Smile Design and patient-facing video story quickly. That is the clearest commercial value proposition and should remain the primary entry point. [Get the YES - From Design to Story](https://learn.smilecloud.com/en/article/smile-design-video-simulation)
- The core branching happens after that first simulation. Users appear to choose between staying lightweight in Smile Design, moving into Blueprint for structured 2D plus 3D planning, or importing an external setup through Signature Design. That branch is product-valid, but it is not currently framed as a decision inside one lifecycle. [Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint) [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design)
- Review and collaboration are spread across multiple surfaces: Smilecloud Review, Blueprint controls, Signature Design review, Team-UP, Share Link, Drop-in Chat, Passport, and Metalab. This implies users must learn channel names and permission mechanics instead of simply expressing intent such as review, approve, send to patient, or request lab input. [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review) [Team-UP](https://learn.smilecloud.com/en/article/team-up) [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link) [What is Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport)
- The best UI/UX build is a workflow-first case workspace that makes the product feel like one guided journey: `Capture -> Simulate -> Plan -> Validate -> Collaborate -> Present`. Smile Design, Blueprint, Signature Design, Review, and Passport should become modes or engines inside that journey, not competing top-level concepts. This is an inference from the public workflow evidence, not a statement from SmileCloud itself.

## Research Question and Scope
Primary question: What is the likely end-to-end SmileCloud application workflow based on public guidance, and what UI/UX architecture would best support that workflow?

Included:
- Public SmileCloud Learning Center pages accessed on 2026-03-08
- Public product guidance for Smile Design, Blueprint, Signature Design, Review, collaboration, Passport, collections, subscription tiers, CBCT handling, and iPad capture

Excluded:
- Private/internal product behavior
- Claims not evidenced by public documentation
- Visual critique of the live UI beyond what can be inferred from help content

## Methodology
- Read the SmileCloud Learning Center structure to identify major workflow areas. [Learning Center](https://learn.smilecloud.com/en)
- Collected official articles for each area and mapped them into a case lifecycle instead of a feature list.
- Compared the documented feature boundaries against likely user goals: capture, design, review, collaborate, patient communication, and production handoff.
- Drafted parallel full reports focused on workflow structure and UX friction, then union-merged the unique findings into this final version.

Limitations:
- This is documentation-grounded analysis, not a usability test.
- Several recommendations are informed inferences; they are phrased accordingly.
- Public learning pages may lag the shipped product.

## Key Findings
### 1. The real object model is `case -> project/artifact -> review/share state`.
Cases sit at the center, with surrounding projects, documentation, collaboration, collections, and patient sharing. That is the right foundational model for interdisciplinary dental work. [Learning Center](https://learn.smilecloud.com/en) [Collections](https://learn.smilecloud.com/en/article/collections)

### 2. SmileCloud has one workflow with three production paths, not three separate products.
The documentation indicates:
- `Smile Design` = fast AI-assisted 2D simulation and story creation. [Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design)
- `Blueprint` = native structured 2D plus 3D interdisciplinary planning. [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint)
- `Signature Design` = render/review workflow for imported STL or external wax-up assets. [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design)

### 3. Blueprint is the clearest expression of the product’s ideal workflow logic.
Blueprint uses a strong stage model:
- `Stack` for data alignment and layering
- `Structure` for tooth-level treatment intent
- `Design` for view management, library controls, sculpting, and output refinement

That staged logic is more intuitive than the top-level product taxonomy and should influence the overall app shell. [Stack](https://learn.smilecloud.com/en/article/stack) [Structure](https://learn.smilecloud.com/en/article/structure) [Design - Views](https://learn.smilecloud.com/en/article/design-views) [Design - Library Controls](https://learn.smilecloud.com/en/article/design-library-controls) [Design - 3D Controls](https://learn.smilecloud.com/en/article/design-sculpting)

### 4. Review is a cross-cutting system capability, not a cleanly separate destination.
Annotations, cross-sections, heatmaps, measurements, and evaluation controls appear in Smilecloud Review and also inside Signature Design and Blueprint-related flows. The likely UX problem is duplicated entry points and unclear ownership of comments, approvals, and measurements. [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review) [Signature Design - Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls) [Design - 3D Controls](https://learn.smilecloud.com/en/article/design-sculpting)

### 5. Collaboration is audience-split rather than intent-first.
The current public model appears to be:
- `Team-UP` for persistent full-account collaboration
- `Share Link` for temporary guest access
- `Drop-in Chat` for unsupported file types
- `Passport` for patient communication
- `Metalab` for outsourced design service interaction

That is comprehensive, but it likely forces users to choose channel mechanics before they choose outcome. [Team-UP](https://learn.smilecloud.com/en/article/team-up) [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link) [Drop - in - Chat](https://learn.smilecloud.com/en/article/drop-in-chat) [What is Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport) [What is Metalab](https://learn.smilecloud.com/en/article/what-is-metalab)

### 6. Upstream readiness is critical but structurally secondary.
Capture quality and data availability materially change downstream outcomes:
- Smile Design depends on disciplined photo capture on iPad. [Smilecloud iPad Photography & Simulation Guide](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide)
- CBCT upload runs through Documentation or Gallery before advanced use. [Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files)
- Subscription tier changes whether Blueprint, Signature Design, shared collections, and advanced collaboration paths are even available. [Understanding Smilecloud Subscription Plans](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans)

## Analysis
### Likely End-to-End Workflow
The following workflow is the most defensible reading of the public SmileCloud materials:

| Stage | User goal | Likely SmileCloud surface | Evidence |
| --- | --- | --- | --- |
| 1. Case setup | Create patient/case container and gather records | Case workspace, Documentation/Gallery, Collections | [Learning Center](https://learn.smilecloud.com/en) [Collections](https://learn.smilecloud.com/en/article/collections) [Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files) |
| 2. Capture readiness | Ensure usable portraits/scans/CBCT inputs | iPad/photo guidance, documentation upload | [Smilecloud iPad Photography & Simulation Guide](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide) [Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files) |
| 3. Rapid simulation | Produce an editable smile proposal quickly | Smile Design | [Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design) [Get the YES - From Design to Story](https://learn.smilecloud.com/en/article/smile-design-video-simulation) |
| 4A. Native advanced planning | Turn proposal into interdisciplinary plan | Blueprint: Stack -> Structure -> Design | [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint) [Stack](https://learn.smilecloud.com/en/article/stack) [Structure](https://learn.smilecloud.com/en/article/structure) |
| 4B. External design import | Present and review outside wax-up/STL work | Signature Design | [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design) [Create a Signature Design](https://learn.smilecloud.com/en/article/create-a-signature-design) |
| 5. Validation | Inspect, annotate, measure, compare, approve | Smilecloud Review and embedded review controls | [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review) [Signature Design - Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls) |
| 6. Collaboration | Bring in care team, guest experts, lab, or service provider | Team-UP, Share Link, Drop-in Chat, Metalab | [Team-UP](https://learn.smilecloud.com/en/article/team-up) [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link) [Drop - in - Chat](https://learn.smilecloud.com/en/article/drop-in-chat) [What is Metalab](https://learn.smilecloud.com/en/article/what-is-metalab) |
| 7. Patient presentation | Deliver story, visuals, and communication to patient | Passport | [What is Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport) [How to Connect your Patients](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients) |
| 8. Ongoing management | Track case state and clinic portfolio | Collections, case history, shared workspace | [Collections](https://learn.smilecloud.com/en/article/collections) [Team-UP](https://learn.smilecloud.com/en/article/team-up) |

### Where the Current Mental Model Likely Breaks
The friction appears in four places:

#### 1. Early branching
Users likely have to decide between Smile Design, Blueprint, and Signature Design too early. That forces understanding of product taxonomy before understanding of workflow intent.

#### 2. Review duplication
When review tools exist both as a dedicated surface and embedded inside project flows, users can be unsure where formal feedback, measurements, and approval state should live.

#### 3. Sharing fragmentation
Different share paths are organized by permission/channel rather than by task. A clinician trying to "send this for lab feedback" should not first need to decide whether the right mechanism is Team-UP, Share Link, or Drop-in Chat.

#### 4. Hidden readiness constraints
Input quality, CBCT availability, and subscription limits affect the workflow materially, but public guidance suggests those dependencies live off-path as articles or packaging details instead of as visible in-product readiness states.

## UI/UX Build Direction
### Design Goal
Build a SmileCloud-inspired product shell that feels like one longitudinal case journey rather than a bundle of tools.

### Three Approaches
#### Approach A: Workflow-First Case Workspace
Navigation is organized by stages:
- `Overview`
- `Capture`
- `Simulate`
- `Plan`
- `Validate`
- `Collaborate`
- `Present`

Pros:
- Closest match to real clinician intent
- Reduces taxonomy learning
- Makes feature transitions explicit
- Best for onboarding and mixed-experience teams

Cons:
- Requires careful mapping of legacy concepts into stages
- Experts may initially miss direct tool entry points

Recommendation:
- Best option

#### Approach B: Expert Tool Hub
Keep current top-level tools as primary navigation:
- Smile Design
- Blueprint
- Signature Design
- Review
- Collaboration
- Passport

Pros:
- Minimal conceptual rewrite
- Efficient for expert repeat users

Cons:
- Preserves the current learning burden
- Keeps stage transitions implicit
- More likely to fragment collaboration and review

Recommendation:
- Only suitable if optimizing for existing expert users over broader adoption

#### Approach C: Role-Based Split Experience
Separate experience by persona:
- Clinician
- Lab
- Coordinator
- Patient

Pros:
- Can reduce irrelevant controls per role
- Potentially cleaner permissions

Cons:
- Harder cross-role continuity
- Risks duplicating the same case state across multiple surfaces
- Adds complexity before the core workflow is simplified

Recommendation:
- Useful later as a permissions/view layer, not as the primary architecture

### Recommended Build
Use Approach A, with Blueprint’s staged logic as the conceptual backbone.

#### 1. Persistent Case Header
Every case should have one sticky header that always shows:
- patient/case identity
- readiness status
- current stage
- last review state
- current collaborators
- patient-share state

This prevents context loss when moving between planning, sharing, and review.

#### 2. Left-Rail Stage Navigation
Use stage labels, not tool labels:
- `Overview`
- `Capture`
- `Simulate`
- `Plan`
- `Validate`
- `Collaborate`
- `Present`

Inside each stage, expose expert substeps only when relevant:
- `Plan` can contain `Stack`, `Structure`, `Design`
- `Validate` can contain `Measurements`, `Annotations`, `Heatmap`, `Cross-section`

#### 3. Intent-Based Project Creation
Replace “Create Blueprint” or “Create Signature Design” as the first decision with:
- `Create quick smile simulation`
- `Continue into full 3D planning`
- `Import external design / wax-up`

The system then creates the correct underlying project type and explains why.

#### 4. Unified Review Layer
Review should behave like a shared capability:
- one comments system
- one approval timeline
- one change-log per artifact
- one measurement history

Users should not need to care whether they are in Blueprint review, Signature review, or a separate Review page.

#### 5. Audience-First Share Wizard
Start with:
- `Share with care team`
- `Share with external expert`
- `Share with patient`
- `Send to service provider`

Then adapt:
- permissions
- expiry
- file support
- chat surface
- notification behavior

This removes the need to memorize Team-UP versus Share Link versus Passport before acting.

#### 6. Readiness Dashboard
Before allowing advanced work, show:
- photo quality check
- scan availability
- CBCT availability
- alignment completeness
- plan-tier capability

This should be a visible gate, not hidden education.

#### 7. Artifact Timeline Instead of Disconnected Outputs
Each case should show a chronological artifact lane:
- original records
- Smile Design proposal
- Blueprint versions
- Signature import
- review snapshots
- patient-facing story/video
- approvals and comments

That would make the case legible as a story, not just a set of files.

## Recommendations
- Use a workflow-first shell and demote brand/tool names to secondary labels.
- Preserve Smile Design as the fastest entry path and commercial hook.
- Model Blueprint as the advanced planning spine of the experience.
- Collapse review into one system capability across all project types.
- Replace channel-based sharing decisions with audience-first intent.
- Surface readiness and subscription gating as visible state, not surprise blockers.
- Keep Collections as an operational overlay, not the main navigation paradigm.

## Risks and Limitations
- This report is based on public help documentation, not direct product telemetry or live app instrumentation.
- Some UI/UX recommendations are inferential because the public source set is stronger on workflow instruction than on current product screen architecture.
- Subscription-dependent behavior may change what different accounts actually see.
- The recommended structure may require migration support for existing power users if implemented in a live product.

## Appendix A: Evidence Table
| ID | Source | Key evidence | UX implication |
| --- | --- | --- | --- |
| S1 | [Learning Center](https://learn.smilecloud.com/en) | Product areas organized by feature families around cases | Case-centric core, tool-centric navigation |
| S2 | [Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design) | AI-assisted editable smile proposals from case projects | Strong rapid-entry workflow |
| S3 | [Get the YES - From Design to Story](https://learn.smilecloud.com/en/article/smile-design-video-simulation) | One-photo to design to patient story/video | Best front-door value proposition |
| S4 | [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint) | Interdisciplinary shared 2D plus 3D workspace | Native advanced planning path |
| S5 | [Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint) | Multiple entry points into Blueprint | Transition logic needs guidance |
| S6 | [Stack](https://learn.smilecloud.com/en/article/stack) | Data layering and alignment stage | Good model for overall app staging |
| S7 | [Structure](https://learn.smilecloud.com/en/article/structure) | Tooth-level treatment intent stage | Clarifies planning sequence |
| S8 | [Design - Views](https://learn.smilecloud.com/en/article/design-views) | Multi-view evaluation controls | Review and output intertwined with planning |
| S9 | [Design - Library Controls](https://learn.smilecloud.com/en/article/design-library-controls) | Linked 2D/3D editing and export | Strong integrated planning workspace |
| S10 | [Design - 3D Controls](https://learn.smilecloud.com/en/article/design-sculpting) | Cross-sections, heatmap, sculpting | Review tools embedded inside design flow |
| S12 | [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design) | Imported STL/wax-up presentation workflow | Alternative advanced branch |
| S13 | [Create a Signature Design](https://learn.smilecloud.com/en/article/create-a-signature-design) | Portrait plus imported asset setup sequence | Different input model needs guided branching |
| S14 | [Signature Design - Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls) | Review exists inside Signature Design | Reinforces need for unified review system |
| S15 | [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review) | Dedicated evaluation layer | Review likely behaves as cross-cutting service |
| S16 | [Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files) | CBCT enters through Documentation/Gallery | Readiness and technical uploads are off-path |
| S17 | [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link) | OTP, time-limited guest sharing | Sharing is permission-first |
| S18 | [Drop - in - Chat](https://learn.smilecloud.com/en/article/drop-in-chat) | Unsupported-file transfer route | Special-case collaboration adds complexity |
| S19 | [Team-UP](https://learn.smilecloud.com/en/article/team-up) | Persistent full-account collaboration | Care-team collaboration is distinct from guest sharing |
| S20 | [What is Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport) | Patient-facing app for story and communication | Downstream patient presentation surface |
| S21 | [How to Connect your Patients](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients) | Patient share has separate rules and side effects | Patient handoff needs explicit state model |
| S22 | [What is Metalab](https://learn.smilecloud.com/en/article/what-is-metalab) | Outsourced service inside workspace | Service operations are part of the case lifecycle |
| S23 | [Understanding Smilecloud Subscription Plans](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans) | Tiers change available workflow capabilities | Packaging changes the actual navigation map |
| S24 | [Collections](https://learn.smilecloud.com/en/article/collections) | Status/procedure-based grouping | Good operational layer, not core workflow shell |
| S25 | [Smilecloud iPad Photography & Simulation Guide](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide) | Strict capture requirements for good outcomes | Upstream readiness must be visible in-product |

## Appendix B: Sources
- [SmileCloud Learning Center](https://learn.smilecloud.com/en)
- [Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design)
- [Get the YES - From Design to Story](https://learn.smilecloud.com/en/article/smile-design-video-simulation)
- [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint)
- [Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint)
- [Stack](https://learn.smilecloud.com/en/article/stack)
- [Structure](https://learn.smilecloud.com/en/article/structure)
- [Design - Views](https://learn.smilecloud.com/en/article/design-views)
- [Design - Library Controls](https://learn.smilecloud.com/en/article/design-library-controls)
- [Design - 3D Controls](https://learn.smilecloud.com/en/article/design-sculpting)
- [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design)
- [Create a Signature Design](https://learn.smilecloud.com/en/article/create-a-signature-design)
- [Signature Design - Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls)
- [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review)
- [Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files)
- [Team-UP](https://learn.smilecloud.com/en/article/team-up)
- [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link)
- [Drop - in - Chat](https://learn.smilecloud.com/en/article/drop-in-chat)
- [What is Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport)
- [How to Connect your Patients](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients)
- [What is Metalab](https://learn.smilecloud.com/en/article/what-is-metalab)
- [Collections](https://learn.smilecloud.com/en/article/collections)
- [Understanding Smilecloud Subscription Plans](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans)
- [Smilecloud iPad Photography & Simulation Guide](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide)
