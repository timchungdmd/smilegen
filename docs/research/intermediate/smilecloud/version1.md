# SmileCloud Workflow Clarity and Product Structure Report

## Executive Summary

SmileCloud presents a strong case-centric promise: capture patient records, produce an initial smile simulation quickly, expand into interdisciplinary planning, review outputs with collaborators, and share selected results with patients. Public product guidance supports that overall arc, especially the fast front door from a single photo to an editable Smile Design and video story ([S2](https://learn.smilecloud.com/en/article/how-to-design), [S3](https://learn.smilecloud.com/en/article/smile-design-video-simulation)).

The structural issue is not lack of capability; it is fragmentation of that capability across separate project types, review surfaces, and sharing modes. Smile Design, Blueprint, Signature Design, Review, Team-UP, Share Link, Drop-in Chat, and Passport each make sense individually, but the public information architecture suggests users must understand product taxonomy before they can understand workflow progression ([S1](https://learn.smilecloud.com/en), [S4](https://learn.smilecloud.com/en/article/what-is-blueprint), [S12](https://learn.smilecloud.com/en/article/what-is-signature-design), [S15](https://learn.smilecloud.com/en/article/smilecloud-review)).

From a workflow-clarity perspective, the product would likely be stronger if it were organized around explicit lifecycle stages instead of separate tools: intake, simulate, plan, review, collaborate, and present. The evidence also indicates three supporting needs that should be made first-class in the UI: readiness of input quality, clear transition rules between project types, and a unified model for role-based sharing across clinicians, labs, and patients ([S16](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files), [S19](https://learn.smilecloud.com/en/article/team-up), [S21](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients), [S25](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide)).

## Research Question and Scope

This report addresses one question: how clear is the public SmileCloud workflow model, and what does that imply about the product structure needed for a stronger UI/UX build?

Scope was limited to publicly accessible SmileCloud Learning Center and related public materials compiled in the source research note dated 2026-03-08. The emphasis here is workflow clarity, cross-feature transitions, and overall product architecture rather than visual design detail or undocumented internal behavior ([S1](https://learn.smilecloud.com/en)). No claims are made about private features, implementation details, or actual usage metrics.

## Methodology

The report is based on a structured reading of official SmileCloud learning-center articles already collected in the source note. Sources were grouped by workflow area: case entry, Smile Design, Blueprint, Signature Design, Review, collaboration, patient handoff, operations, and capture quality. Evidence was then re-mapped into a lifecycle lens to evaluate whether the product structure exposed to users matches the real order of work ([S1](https://learn.smilecloud.com/en), [S23](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans)).

Methodologically, this is a product-structure analysis, not a usability test. It uses official documentation as evidence of intended mental models and expected user journeys. That makes it useful for information architecture and workflow design, but weaker for assessing adoption, satisfaction, or actual task completion rates. Citations use concise inline markdown links tied to the public source set listed in Appendix B.

## Key Findings

### 1. The core product model is case-centric, not file-centric.

SmileCloud organizes work around cases and projects, with surrounding capabilities for collaboration, patient sharing, collections, and services. That is a sound structural foundation because dental planning is longitudinal and multi-party, not a single-file transaction ([S1](https://learn.smilecloud.com/en), [S24](https://learn.smilecloud.com/en/article/collections)).

### 2. The workflow branches into three major production paths.

The public materials describe three distinct paths: Smile Design for fast 2D simulation, Blueprint for interdisciplinary 2D-plus-3D planning, and Signature Design for imported external wax-up or STL-based presentation workflows ([S2](https://learn.smilecloud.com/en/article/how-to-design), [S4](https://learn.smilecloud.com/en/article/what-is-blueprint), [S12](https://learn.smilecloud.com/en/article/what-is-signature-design)). This is functionally coherent, but the branching logic is not obvious unless the user already understands the product taxonomy.

### 3. Blueprint is the clearest structured workflow in the product.

Blueprint has an explicit staged logic: Stack for multimodal alignment, Structure for tooth-level treatment intent, and Design for visualization and sculpting. That gives users a meaningful sense of progression and dependency between steps ([S6](https://learn.smilecloud.com/en/article/stack), [S7](https://learn.smilecloud.com/en/article/structure), [S8](https://learn.smilecloud.com/en/article/design-views), [S10](https://learn.smilecloud.com/en/article/design-sculpting)).

### 4. Review and collaboration are distributed across too many surfaces.

Review appears as both a dedicated product area and as controls embedded in Blueprint and Signature Design. Collaboration is split between Team-UP, Share Link, Drop-in Chat, and Passport. This likely increases decision load because users must choose communication and review channels based on permissions and file type rather than task intent ([S14](https://learn.smilecloud.com/en/article/signature-design-review-and-controls), [S15](https://learn.smilecloud.com/en/article/smilecloud-review), [S17](https://learn.smilecloud.com/en/article/share-link), [S18](https://learn.smilecloud.com/en/article/drop-in-chat), [S19](https://learn.smilecloud.com/en/article/team-up), [S21](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients)).

### 5. Workflow success depends heavily on prerequisites that are structurally secondary.

Input quality, documentation placement, and subscription tier all materially affect what a user can do next. However, these constraints appear as adjacent help content rather than as first-class workflow states in the product model ([S16](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files), [S23](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans), [S25](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide)).

## Analysis

The strongest part of SmileCloud's public workflow is the top of the funnel. The product clearly communicates immediate value: start from a case, generate an editable Smile Design, and convert it into a compelling patient-facing story quickly ([S2](https://learn.smilecloud.com/en/article/how-to-design), [S3](https://learn.smilecloud.com/en/article/smile-design-video-simulation)). That is a strong initial mental model because it aligns with commercial reality: clinicians often need a fast visual artifact before committing to deeper planning.

The next step is where clarity degrades. Public guidance implies that a user must decide whether to stay in Smile Design, move into Blueprint, or create a Signature Design. Those choices correspond to different kinds of data maturity and clinical intent, but the product naming does not itself explain that. Blueprint is effectively the "native advanced planning" route, while Signature Design is the "external design import and presentation" route, yet those distinctions must be inferred across separate articles rather than being explained as transitions in one lifecycle model ([S4](https://learn.smilecloud.com/en/article/what-is-blueprint), [S5](https://learn.smilecloud.com/en/article/create-a-blueprint), [S12](https://learn.smilecloud.com/en/article/what-is-signature-design), [S13](https://learn.smilecloud.com/en/article/create-a-signature-design)).

Blueprint shows what the broader product structure could become. Its Stack -> Structure -> Design sequence turns raw evidence into intent and then into output. That is good workflow architecture because it exposes dependency order: first align the data, then define clinical meaning, then shape the proposed result ([S6](https://learn.smilecloud.com/en/article/stack), [S7](https://learn.smilecloud.com/en/article/structure), [S9](https://learn.smilecloud.com/en/article/design-library-controls)). If SmileCloud used this same progression as the top-level product frame, it would likely reduce ambiguity elsewhere.

By contrast, Review appears structurally ambiguous. It functions as an evaluation layer with annotations, measurements, heatmaps, and preparation guidance, but similar controls also appear inside Signature Design and Blueprint-related flows ([S10](https://learn.smilecloud.com/en/article/design-sculpting), [S14](https://learn.smilecloud.com/en/article/signature-design-review-and-controls), [S15](https://learn.smilecloud.com/en/article/smilecloud-review)). From a product-structure standpoint, this suggests Review is less a separate destination than a cross-cutting mode. Treating it as both a feature area and a reusable layer risks duplicate entry points and unclear ownership of comments, measurements, and approval states.

The collaboration model has the same pattern. Team-UP supports persistent multi-account collaboration, Share Link covers short-lived guest access, Drop-in Chat handles unsupported files, and Passport manages patient communication and story delivery ([S17](https://learn.smilecloud.com/en/article/share-link), [S18](https://learn.smilecloud.com/en/article/drop-in-chat), [S19](https://learn.smilecloud.com/en/article/team-up), [S20](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport), [S21](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients)). The model is comprehensive, but not simple. It is organized by channel and permission type rather than by user goal such as "request lab input," "send patient preview," or "share for quick external review."

Another structural issue is off-path prerequisites. CBCT upload flows through documentation/gallery before visualization, while image-capture quality guidance sits outside the main production flow even though poor capture quality can degrade Smile Design outcomes substantially ([S16](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files), [S25](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide)). That implies the product currently treats readiness inputs as supporting content rather than as visible gates or checks. In workflow terms, this increases the chance that users discover problems late.

Finally, subscription tiers change the real workflow map. Lite, Starter, and Business tiers do not just limit feature access; they alter whether a team can participate in advanced planning, shared collections, CBCT-to-STL conversion, or broader collaboration patterns ([S23](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans)). When packaging changes the path itself, product structure should expose "available next steps" based on plan, instead of allowing users to discover those constraints only when they attempt a task.

## Recommendations

### 1. Reframe the product around lifecycle stages.

Top-level navigation should foreground stages such as `Intake`, `Simulate`, `Plan`, `Review`, `Collaborate`, and `Present`, with Smile Design, Blueprint, Signature Design, and Passport positioned as engines or modes within those stages rather than as parallel top-level concepts. This would align the product model with the real order of work evidenced in the documentation ([S2](https://learn.smilecloud.com/en/article/how-to-design), [S4](https://learn.smilecloud.com/en/article/what-is-blueprint), [S12](https://learn.smilecloud.com/en/article/what-is-signature-design)).

### 2. Make project creation intent-based, not taxonomy-based.

Instead of asking users to choose between Smile Design, Blueprint, and Signature Design upfront, the product should ask what they are trying to do: create a fast proposal, continue into multidisciplinary planning, or import an external design. The system can then create the right project type behind the scenes and explain the resulting workflow path ([S3](https://learn.smilecloud.com/en/article/smile-design-video-simulation), [S5](https://learn.smilecloud.com/en/article/create-a-blueprint), [S13](https://learn.smilecloud.com/en/article/create-a-signature-design)).

### 3. Treat Review as a shared system layer.

Annotations, measurements, heatmaps, cross-sections, and approval comments should be modeled as one review service reused across Smile Design, Blueprint, and Signature Design rather than as partly separate review destinations. The UI should show one review history and one approval state per case artifact ([S14](https://learn.smilecloud.com/en/article/signature-design-review-and-controls), [S15](https://learn.smilecloud.com/en/article/smilecloud-review)).

### 4. Unify collaboration around audience and intent.

The share flow should begin with audience selection such as `care team`, `external collaborator`, or `patient`, then map to the right channel and permissions automatically. That would reduce the current burden of understanding Team-UP versus Share Link versus Drop-in Chat versus Passport before taking action ([S17](https://learn.smilecloud.com/en/article/share-link), [S18](https://learn.smilecloud.com/en/article/drop-in-chat), [S19](https://learn.smilecloud.com/en/article/team-up), [S21](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients)).

### 5. Add readiness checks before advanced work begins.

Cases should expose explicit readiness states for image quality, scan availability, CBCT status, and subscription-dependent capabilities. That would surface blockers earlier and connect educational guidance directly to workflow progression ([S16](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files), [S23](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans), [S25](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide)).

### 6. Use Collections as an operational overlay, not a competing structure.

Collections are useful for status and procedure grouping, but they should remain a management lens on cases rather than feeling like a second organizational system. The primary object model should remain `case -> stage -> artifact -> share/review state` ([S24](https://learn.smilecloud.com/en/article/collections)).

## Risks and Limitations

This report is grounded in public documentation, not observed product usage. Public help-center content shows intended workflows but may simplify edge cases, omit internal logic, or lag behind the shipped product. The findings therefore identify likely structural friction, not proven usability failures.

The evidence is also uneven across domains. Blueprint is richly documented and therefore easier to interpret as a formal workflow, while other areas such as collaboration and plan gating are described in more fragmented pages. Inference was required when connecting those pages into a single lifecycle view. Finally, no benchmarking against live UI screens, customer interviews, or analytics was performed, so the recommendations should be treated as version-1 structural hypotheses rather than finalized design prescriptions.

## Appendix A: Evidence Table

| ID | Source | Workflow Area | Key Evidence | Product-Structure Implication |
| --- | --- | --- | --- | --- |
| S1 | [Learning Center](https://learn.smilecloud.com/en) | Information architecture | Categories span design, planning, review, collaboration, patient app, services, account, and case management. | Confirms a case-centric but feature-segmented product model. |
| S2 | [Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design) | Fast simulation | AI-assisted design begins from case projects and supports manual refinement. | Establishes the front-door workflow. |
| S3 | [From Design to Story](https://learn.smilecloud.com/en/article/smile-design-video-simulation) | Value proposition | One photo can become an editable design and video simulation quickly. | Shows strong early-stage workflow clarity. |
| S4 | [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint) | Advanced planning | Blueprint is a shared 2D-plus-3D interdisciplinary workspace. | Defines the native advanced-planning route. |
| S5 | [Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint) | Transition rules | Blueprint can start from an existing Smile Design, Projects, or New Project. | Indicates branching is possible but not self-explanatory. |
| S6 | [Stack](https://learn.smilecloud.com/en/article/stack) | Blueprint workflow | Multimodal data layering and alignment. | Clear stage 1 in advanced planning. |
| S7 | [Structure](https://learn.smilecloud.com/en/article/structure) | Blueprint workflow | Tooth-level treatment intent is defined after alignment. | Clear stage 2 in advanced planning. |
| S8 | [Design - Views](https://learn.smilecloud.com/en/article/design-views) | Blueprint workflow | Multiple views and visibility modes support design evaluation. | Confirms output/review coupling inside Blueprint. |
| S9 | [Library Controls](https://learn.smilecloud.com/en/article/design-library-controls) | Blueprint workflow | Linked 2D and 3D editing with export controls. | Suggests design and output are tightly integrated. |
| S10 | [3D Controls](https://learn.smilecloud.com/en/article/design-sculpting) | Review tooling | Cross-sections, heatmaps, and sculpting are present in design flow. | Review is partly embedded, not fully separate. |
| S11 | [Wet or Dry View](https://learn.smilecloud.com/en/article/wet-or-dry-view) | Presentation options | Display preference changes design-library view. | Indicates presentation settings are mixed into editing. |
| S12 | [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design) | External import path | Render-only workflow built from STL or wax-up sources. | Defines a second advanced path with different entry logic. |
| S13 | [Create a Signature Design](https://learn.smilecloud.com/en/article/create-a-signature-design) | External import path | Portrait plus initial upper plus imported signature upper, then alignment and review. | Shows a distinct setup sequence for imported designs. |
| S14 | [Signature Design Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls) | Review tooling | Review screen includes annotations, cross-sections, heatmap, and visibility controls. | Duplicates capabilities found elsewhere. |
| S15 | [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review) | Review surface | Dedicated 3D evaluation layer with measurements and preparation guidance. | Suggests Review is a shared capability treated as a separate area. |
| S16 | [Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files) | Intake/readiness | CBCT enters through Documentation/Gallery before visualization or STL conversion. | Important prerequisite is off the main workflow path. |
| S17 | [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link) | External sharing | Guest access is time-limited and OTP-protected. | Sharing is permission-specific rather than intent-first. |
| S18 | [Drop-in Chat](https://learn.smilecloud.com/en/article/drop-in-chat) | File exchange | Unsupported formats can be sent via chat with a seven-day window. | Special-case channel increases collaboration complexity. |
| S19 | [Team-UP](https://learn.smilecloud.com/en/article/team-up) | Team collaboration | Full-account collaboration with case files, chat, history, and access control. | Persistent care-team collaboration is distinct from guest sharing. |
| S20 | [Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport) | Patient experience | Mobile app for patient story, files, and communication. | Patient sharing is a separate downstream surface. |
| S21 | [How to Connect your Patients](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients) | Patient handoff | Initial documentation is shared automatically, then selected designs and galleries can be sent. | Patient-facing flow has its own rules and side effects. |
| S22 | [What is Metalab](https://learn.smilecloud.com/en/article/what-is-metalab) | Services | Outsourced design service is integrated in-workspace with chat and revisions. | Service operations are embedded in the case model. |
| S23 | [Subscription Plans](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans) | Packaging | Tiers gate Blueprint, Signature Design, shared collections, CBCT-to-STL, and other workflows. | Packaging changes the available workflow map. |
| S24 | [Collections](https://learn.smilecloud.com/en/article/collections) | Operations | Cases can be grouped by status or procedure, privately or clinic-wide. | Useful operational overlay that should not replace core workflow. |
| S25 | [iPad Photography Guide](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide) | Intake/readiness | Capture quality rules strongly affect design outcomes. | Readiness should be visible before simulation begins. |

## Appendix B: Sources

- [S1](https://learn.smilecloud.com/en) SmileCloud Learning Center. Accessed 2026-03-08.
- [S2](https://learn.smilecloud.com/en/article/how-to-design) Guide to Smile Design. Accessed 2026-03-08.
- [S3](https://learn.smilecloud.com/en/article/smile-design-video-simulation) Get the YES - From Design to Story. Accessed 2026-03-08.
- [S4](https://learn.smilecloud.com/en/article/what-is-blueprint) What is Blueprint. Accessed 2026-03-08.
- [S5](https://learn.smilecloud.com/en/article/create-a-blueprint) Create a Blueprint. Accessed 2026-03-08.
- [S6](https://learn.smilecloud.com/en/article/stack) Stack. Accessed 2026-03-08.
- [S7](https://learn.smilecloud.com/en/article/structure) Structure. Accessed 2026-03-08.
- [S8](https://learn.smilecloud.com/en/article/design-views) Design - Views. Accessed 2026-03-08.
- [S9](https://learn.smilecloud.com/en/article/design-library-controls) Design - Library Controls. Accessed 2026-03-08.
- [S10](https://learn.smilecloud.com/en/article/design-sculpting) Design - 3D Controls. Accessed 2026-03-08.
- [S11](https://learn.smilecloud.com/en/article/wet-or-dry-view) Wet or Dry View. Accessed 2026-03-08.
- [S12](https://learn.smilecloud.com/en/article/what-is-signature-design) What is Signature Design? Accessed 2026-03-08.
- [S13](https://learn.smilecloud.com/en/article/create-a-signature-design) Create a Signature Design. Accessed 2026-03-08.
- [S14](https://learn.smilecloud.com/en/article/signature-design-review-and-controls) Signature Design - Review and Controls. Accessed 2026-03-08.
- [S15](https://learn.smilecloud.com/en/article/smilecloud-review) Smilecloud Review. Accessed 2026-03-08.
- [S16](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files) Upload and Visualize CBCT Files. Accessed 2026-03-08.
- [S17](https://learn.smilecloud.com/en/article/share-link) Share Link - 24 Hours. Accessed 2026-03-08.
- [S18](https://learn.smilecloud.com/en/article/drop-in-chat) Drop - in - Chat. Accessed 2026-03-08.
- [S19](https://learn.smilecloud.com/en/article/team-up) Team-UP. Accessed 2026-03-08.
- [S20](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport) What is Smilecloud Passport. Accessed 2026-03-08.
- [S21](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients) How to Connect your Patients. Accessed 2026-03-08.
- [S22](https://learn.smilecloud.com/en/article/what-is-metalab) What is Metalab. Accessed 2026-03-08.
- [S23](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans) Understanding Smilecloud Subscription Plans. Accessed 2026-03-08.
- [S24](https://learn.smilecloud.com/en/article/collections) Collections. Accessed 2026-03-08.
- [S25](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide) Smilecloud iPad Photography & Simulation Guide. Accessed 2026-03-08.
