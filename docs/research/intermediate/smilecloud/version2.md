# SmileCloud Workflow UI/UX Research, Version 2

- Date: 2026-03-09
- Basis: `/docs/research/2026-03-08-smilecloud-workflow-uiux-research.md`
- Focus: UX friction, mental models, and navigation design implications

## Executive Summary

- SmileCloud presents as a case-centric product, but the public learning content describes multiple overlapping work modes: fast 2D Smile Design, structured 2D+3D Blueprint, import-based Signature Design, Review, team collaboration, and patient sharing. That breadth is powerful, but it also implies a fragmented mental model if users must decide between project types before the system clarifies the intended outcome ([Learning Center](https://learn.smilecloud.com/en), [Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design), [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint), [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design)).
- The main UX friction is transition cost. Users can start from a case, a projects list, an existing Smile Design, imported STL assets, documentation uploads, or collaboration/share tools, but the public information suggests these paths are exposed as separate feature surfaces rather than as one guided workflow ([Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint), [Create a Signature Design](https://learn.smilecloud.com/en/article/create-a-signature-design), [Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files)).
- Navigation complexity appears to come from tool-centric information architecture. Users must understand terms such as Stack, Structure, Design, Review, Team-UP, Share Link, Passport, and Collections before they can predict where to act next. That naming system likely works for expert users, but it increases orientation overhead for new clinicians and cross-functional teams ([Stack](https://learn.smilecloud.com/en/article/stack), [Structure](https://learn.smilecloud.com/en/article/structure), [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review), [Team-UP](https://learn.smilecloud.com/en/article/team-up), [Collections](https://learn.smilecloud.com/en/article/collections)).
- Collaboration is split by audience and permission model: internal teams, temporary guests, unsupported-file chat, and patients each use different sharing mechanics. This supports access control, but it also implies repeated handoff logic and a risk that users must translate the same case state into multiple communication surfaces ([Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link), [Drop - in - Chat](https://learn.smilecloud.com/en/article/drop-in-chat), [What is Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport), [How to Connect your Patients](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients)).
- The strongest design opportunity is not adding more tools; it is introducing a clearer primary journey: capture, design intent, 3D validation, collaboration, patient communication, and production handoff. A workflow-first shell would reduce category hunting, make project types feel like stages instead of separate products, and better align the UI with clinician expectations inferred from the public workflow documentation ([Get the YES - From Design to Story](https://learn.smilecloud.com/en/article/smile-design-video-simulation), [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint), [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review)).

## Research Question and Scope

Primary question: What UX friction, mental-model conflicts, and navigation design implications are suggested by the publicly documented SmileCloud workflow?

Scope:
- Included: public SmileCloud Learning Center pages and evidence captured in the source report dated 2026-03-08.
- Focus areas: case workflow, project-type boundaries, collaboration modes, patient-sharing flow, capture prerequisites, and subscription-related workflow gating.
- Excluded: private product behavior, internal metrics, undocumented features, and claims not supported by the source report.
- Time range: public pages accessed on 2026-03-08.
- Geography: global product context, with regional nuance only where surfaced in the source report.

## Methodology

This version 2 report is a synthesis of the evidence already collected in [`2026-03-08-smilecloud-workflow-uiux-research.md`](/Users/timchung/Desktop/smilegen/docs/research/2026-03-08-smilecloud-workflow-uiux-research.md). The approach was:

- Review the source report's evidence table and evidence notes.
- Re-cluster the evidence around UX questions instead of feature description: where users enter, what they must understand, where they switch contexts, and how they share work.
- Separate direct source statements from inferred product implications. In this report, phrases such as "implies," "suggests," and "likely" indicate interpretation rather than explicit vendor claims.
- Preserve concise inline citations to the original public pages named in the evidence set.

Source basis:
- Official SmileCloud Learning Center category pages and articles on Smile Design, Blueprint, Signature Design, Review, collaboration, Passport, collections, subscription plans, CBCT handling, and iPad capture guidance ([Learning Center](https://learn.smilecloud.com/en)).

## Key Findings

- The documented workflow mixes outcome-oriented language (design, story, patient connection) with internal tool names (Stack, Structure, Review), which suggests a mismatch between user goals and navigation labels ([Get the YES - From Design to Story](https://learn.smilecloud.com/en/article/smile-design-video-simulation), [Stack](https://learn.smilecloud.com/en/article/stack), [Structure](https://learn.smilecloud.com/en/article/structure)).
- Smile Design, Blueprint, and Signature Design appear to be adjacent but distinct project types. That separation likely forces early path selection before users fully understand which path fits the case ([Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design), [Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint), [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design)).
- Review capabilities are distributed across Blueprint, Signature Design, and Smilecloud Review, which implies overlapping evaluation surfaces and potential duplication in user expectations about where annotation and validation should happen ([Design - 3D Controls](https://learn.smilecloud.com/en/article/design-sculpting), [Signature Design - Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls), [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review)).
- Collaboration is not one flow but several: Team-UP for full collaborators, Share Link for temporary guests, Drop-in Chat for unsupported files, and Passport for patients. This likely increases decision load at every handoff ([Team-UP](https://learn.smilecloud.com/en/article/team-up), [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link), [Drop - in - Chat](https://learn.smilecloud.com/en/article/drop-in-chat), [What is Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport)).
- Upstream input quality is a major hidden dependency. The iPad photography guide shows that output quality depends on careful capture technique, so poor early guidance could make downstream design quality feel inconsistent or "unreliable" to users ([Smilecloud iPad Photography & Simulation Guide](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide)).
- Subscription tiers affect which workflow pieces are available, meaning the product’s conceptual model can change by plan. That is a navigation and onboarding risk, not just a packaging choice ([Understanding Smilecloud Subscription Plans](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans)).

## Analysis

### Mental Model Tension: One Case, Many Product Modes

The source material consistently frames SmileCloud around a case workspace, which is a strong base mental model because clinicians naturally think in terms of patients and cases ([Learning Center](https://learn.smilecloud.com/en), [Collections](https://learn.smilecloud.com/en/article/collections)). However, within that case model, the product introduces multiple mode-specific concepts: Smile Design for rapid 2D work, Blueprint for structured 2D+3D interdisciplinary planning, Signature Design for imported wax-up or STL-based rendering, and Review for evaluation ([Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design), [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint), [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design), [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review)).

The inferred UX issue is that the product is case-centric in container design but mode-centric in operational logic. Users likely understand "I am working on this patient," while the UI may require them to understand "I am now inside this specific workflow engine." That gap creates translation work. Expert users may tolerate it because the tools are specialized; newer users may experience the product as several related apps sharing the same records.

### Transition Friction Between Workflow Stages

The public documentation suggests multiple entry points into advanced work. Blueprint can start from an existing Smile Design, from the Projects list, or from a new project ([Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint)). Signature Design follows a different setup sequence tied to portrait plus STL import and then moves into its own review controls ([Create a Signature Design](https://learn.smilecloud.com/en/article/create-a-signature-design), [Signature Design - Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls)). CBCT upload routes through Documentation or Gallery before it becomes usable for visualization ([Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files)).

This implies a navigation burden at stage boundaries. Instead of moving through a single longitudinal journey, users may need to know the correct object type, upload location, and project surface for the next step. From a UX perspective, that is high-friction because the system exposes implementation structure. Good workflow software usually lets users think "next, I validate anatomy" or "next, I prepare something to share," not "next, I switch to the correct module and data container."

### Tool Labels Likely Cost More Than They Teach

Blueprint’s internal stages, especially Stack and Structure, appear meaningful once learned. Stack refers to multimodal data layering and alignment; Structure refers to tooth-level treatment intent definition ([Stack](https://learn.smilecloud.com/en/article/stack), [Structure](https://learn.smilecloud.com/en/article/structure)). These are precise names for trained users, but they are not immediately legible as navigation labels for first-time or occasional users.

The implication is not that the terminology is wrong. It is that the terminology likely belongs in the workspace body, helper text, or step titles rather than as primary wayfinding. If navigation exposes expert nouns before users understand the job to be done, users must learn the product’s taxonomy in order to proceed. That increases onboarding cost and makes the product feel denser than the underlying workflow actually is.

### Review and Collaboration Are Distributed Across Separate Surfaces

The evidence shows strong review functionality, including cross-sections, layered 3D visualization, measurements, heatmaps, and annotations ([Design - 3D Controls](https://learn.smilecloud.com/en/article/design-sculpting), [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review)). Similar review language also appears inside Signature Design ([Signature Design - Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls)). Collaboration is similarly distributed: Team-UP for full account collaboration, Share Link for short-lived guest access, Drop-in Chat for unsupported files, Passport for patient communication, and Metalab for outsourced design service interaction ([Team-UP](https://learn.smilecloud.com/en/article/team-up), [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link), [Drop - in - Chat](https://learn.smilecloud.com/en/article/drop-in-chat), [How to Connect your Patients](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients), [What is Metalab](https://learn.smilecloud.com/en/article/what-is-metalab)).

The inferred issue is not feature absence; it is surface proliferation. Users likely need to remember who the audience is, what file type they have, how long access should last, and which permissions should apply before choosing a share mechanism. That is a classic decision-tree problem. It makes collaboration safe and flexible, but it may also make collaboration feel like repeated setup work rather than a continuous thread attached to the case.

### Upstream Capture and Plan Gating Shape Perceived UX Quality

The iPad photography guidance is unusually specific about posture, camera choice, lighting, framing, and zoom avoidance, which indicates that Smile Design output quality is tightly coupled to capture quality ([Smilecloud iPad Photography & Simulation Guide](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide)). Subscription tiers also determine whether users can access Blueprint, Signature Design, CBCT-to-STL, shared collections, and multi-member collaboration ([Understanding Smilecloud Subscription Plans](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans)).

These are important UX implications because users experience them as product behavior, even when they are operational constraints. If a user gets a weak result from poor capture, they may blame the design engine. If a user cannot find a feature because their plan excludes it, they may blame navigation. In both cases, the UI needs to externalize dependencies earlier and more clearly.

## Recommendations

- Reframe top-level navigation around workflow stages rather than feature brands: `Capture`, `Design`, `Validate`, `Collaborate`, `Share`, `Manage`. Keep expert concepts such as Stack and Structure inside those stages as contextual substeps, not as first-level wayfinding. This recommendation is supported by the current spread of feature-specific labels across the documented workflow ([Learning Center](https://learn.smilecloud.com/en), [Stack](https://learn.smilecloud.com/en/article/stack), [Structure](https://learn.smilecloud.com/en/article/structure)).
- Introduce a single case progress model that makes Smile Design, Blueprint, Signature Design, and Review feel like optional paths within one journey. Users should choose goals such as "create quick simulation," "build interdisciplinary plan," or "import external wax-up," rather than choosing among project brands first ([Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design), [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint), [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design)).
- Build transition helpers at major boundaries. Examples: convert Smile Design into Blueprint from within the existing case, route CBCT upload from the exact step where anatomy validation is needed, and expose recommended next actions after STL import or review completion ([Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint), [Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files), [Signature Design - Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls)).
- Consolidate sharing into one audience-first flow. Ask users who they are sharing with, then adapt permissions, time limits, file support, and surface selection behind the scenes. This would reduce the need to choose between Team-UP, Share Link, Drop-in Chat, Passport, and service-specific channels up front ([Team-UP](https://learn.smilecloud.com/en/article/team-up), [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link), [Drop - in - Chat](https://learn.smilecloud.com/en/article/drop-in-chat), [What is Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport), [What is Metalab](https://learn.smilecloud.com/en/article/what-is-metalab)).
- Surface hidden prerequisites before users commit effort. Capture checklists, plan availability badges, and data-readiness indicators should appear before design or validation steps begin. That would reduce avoidable failure and lower the perceived unpredictability of advanced tools ([Smilecloud iPad Photography & Simulation Guide](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide), [Understanding Smilecloud Subscription Plans](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans)).
- Use persistent case context across all surfaces. The same case summary should show current stage, available assets, pending collaborators, patient-share state, and unresolved review items regardless of whether the user is in design, review, or sharing. This recommendation follows from the documented fragmentation across project, review, and collaboration surfaces ([Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review), [How to Connect your Patients](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients), [Collections](https://learn.smilecloud.com/en/article/collections)).

## Risks and Limitations

- This report relies entirely on public materials captured in the source report. It does not include product telemetry, usability testing, or direct observation of the live application.
- Some conclusions are inferred from documentation structure and terminology rather than from hands-on interaction. Where the report interprets likely UX behavior, it uses qualifying language intentionally.
- The source set is weighted toward instructional content, which may over-represent official workflow intent and under-represent real-world user workarounds.
- Subscription-driven differences may change the observed information architecture by account type, so a single public evidence set may not reflect every in-product navigation experience.
- The public pages describe features across time, but the report does not independently verify whether all pages reflect the current live UX on 2026-03-09.

## Appendix A: Evidence Table

| Theme | Evidence | UX implication | Sources |
| --- | --- | --- | --- |
| Case-centered structure | Product organized around case workspace, projects, collaboration, Passport, and collections | Strong base object model, but many parallel operating modes | [Learning Center](https://learn.smilecloud.com/en), [Collections](https://learn.smilecloud.com/en/article/collections) |
| Rapid-entry design | One photo can become editable Smile Design and video story | Fast initial value, but may bias users toward an oversimplified first mental model | [Get the YES - From Design to Story](https://learn.smilecloud.com/en/article/smile-design-video-simulation), [Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design) |
| Blueprint progression | Blueprint expands work through Stack, Structure, and Design | Advanced path is structured, but labels are expert-centric | [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint), [Stack](https://learn.smilecloud.com/en/article/stack), [Structure](https://learn.smilecloud.com/en/article/structure) |
| Multiple advanced entry points | Blueprint can begin from several places | Users may need to understand system structure before taking next step | [Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint) |
| Import-based alternative path | Signature Design uses portrait plus imported STL or wax-up workflow | Distinct project type likely adds early branching pressure | [What is Signature Design?](https://learn.smilecloud.com/en/article/what-is-signature-design), [Create a Signature Design](https://learn.smilecloud.com/en/article/create-a-signature-design) |
| Distributed review surfaces | Review capabilities appear in Signature Design and Smilecloud Review, with related 3D controls elsewhere | Annotation and validation may feel duplicated across contexts | [Signature Design - Review and Controls](https://learn.smilecloud.com/en/article/signature-design-review-and-controls), [Smilecloud Review](https://learn.smilecloud.com/en/article/smilecloud-review), [Design - 3D Controls](https://learn.smilecloud.com/en/article/design-sculpting) |
| CBCT upload path | CBCT upload routes through Documentation or Gallery | Technical data preparation is not aligned to intent-based navigation | [Upload and Visualize CBCT Files](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files) |
| Collaboration split by audience | Team-UP, Share Link, Drop-in Chat, Passport, and Metalab each cover different handoffs | Safe but fragmented sharing model increases decision load | [Team-UP](https://learn.smilecloud.com/en/article/team-up), [Share Link - 24 Hours](https://learn.smilecloud.com/en/article/share-link), [Drop - in - Chat](https://learn.smilecloud.com/en/article/drop-in-chat), [What is Smilecloud Passport](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport), [What is Metalab](https://learn.smilecloud.com/en/article/what-is-metalab) |
| Patient connection flow | Initial documentation is shared when connecting patients, with later selective sharing | Patient communication is integrated but governed by separate logic from team collaboration | [How to Connect your Patients](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients) |
| Input quality dependency | Photo capture rules are detailed and strict | Poor capture likely degrades perceived product quality unless the UI sets expectations early | [Smilecloud iPad Photography & Simulation Guide](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide) |
| Subscription gating | Blueprint, Signature Design, shared collections, and advanced features vary by plan | Packaging changes the apparent product map and can confuse navigation expectations | [Understanding Smilecloud Subscription Plans](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans) |

## Appendix B: Sources

- [Smilecloud Learning Center](https://learn.smilecloud.com/en)
- [Guide to Smile Design](https://learn.smilecloud.com/en/article/how-to-design)
- [Get the YES - From Design to Story](https://learn.smilecloud.com/en/article/smile-design-video-simulation)
- [What is Blueprint](https://learn.smilecloud.com/en/article/what-is-blueprint)
- [Create a Blueprint](https://learn.smilecloud.com/en/article/create-a-blueprint)
- [Stack](https://learn.smilecloud.com/en/article/stack)
- [Structure](https://learn.smilecloud.com/en/article/structure)
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
