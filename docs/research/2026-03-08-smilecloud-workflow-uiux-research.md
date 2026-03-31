## Title
- SmileCloud Application Workflow and UI/UX Build Direction
- Date: 2026-03-08

## Report Spec
- Audience: Product/design/engineering team evaluating a SmileCloud-inspired workflow
- Purpose: Map the SmileCloud application workflow from public guidance and propose a stronger UI/UX build
- Scope: Public SmileCloud learning-center materials and public marketing/search snippets only
- Time Range: Publicly available pages accessed on 2026-03-08
- Geography: Global product, with Blueprint regional notes where relevant
- Required Sections: Executive Summary, Research Question and Scope, Methodology, Key Findings, Workflow Map, UI/UX Build Direction, Risks and Limitations, Appendix A Evidence Table, Appendix B Sources
- Citation Style: Inline markdown links
- Output Format: Markdown
- Length Targets: In-depth but concise enough for product planning
- Tone: Analytical, product-focused, implementation-aware
- Must-Include Sources: SmileCloud Learning Center
- Must-Exclude Topics: Private/internal features not evidenced by public sources

## Research Plan
### Primary Question
What is the end-to-end SmileCloud application workflow as evidenced by the public learning center, and what UI/UX architecture would best improve that workflow?

### Subquestions
1. What is the primary case lifecycle in SmileCloud?
2. How do Smile Design, Blueprint, Signature Design, and Review relate to each other?
3. How does collaboration work across clinicians, labs, and patients?
4. What role do file management, CBCT, collections, and subscription tiers play in the product flow?
5. What workflow or UX friction is implied by the current information architecture and feature boundaries?
6. What product/UX structure would better support speed, clarity, and interdisciplinary collaboration?

### Inclusion Criteria
- Official SmileCloud Learning Center pages
- Public SmileCloud pages reachable through search or linked from the learning center

### Exclusion Criteria
- Undated third-party commentary
- Assumptions about internal implementation
- Features not described in public source text

## Query Log
- Query: Open SmileCloud learning center homepage
  - Intended section: Site structure
  - Date run: 2026-03-08
  - Notes: Captured category map and featured articles
- Query: Open Smile Design, Blueprint, Signature Design, Review, Passport, Collaboration, Case Management pages
  - Intended section: Workflow and feature relations
  - Date run: 2026-03-08
  - Notes: Captured core flow and collaboration/patient handoff details
- Query: Open subscription and iPad guidance pages
  - Intended section: Plan gating and input quality requirements
  - Date run: 2026-03-08
  - Notes: Captured tier differences and photo capture constraints

## Appendix A: Evidence Table

| ID | Title | Publisher | Date Accessed | URL | Tier | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Smilecloud Learning Center | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en | B | Homepage and category structure |
| S2 | Guide to Smile Design | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/how-to-design | B | AI-assisted 2D smile design workflow |
| S3 | Get the YES - From Design to Story | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/smile-design-video-simulation | B | One-photo to editable design to video pitch |
| S4 | What is Blueprint | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/what-is-blueprint | B | Structured 2D+3D interdisciplinary workspace |
| S5 | Create a Blueprint | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/create-a-blueprint | B | Blueprint entry points |
| S6 | Stack | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/stack | B | Multi-modal data layering and alignment |
| S7 | Structure | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/structure | B | Tooth-level treatment intent definition |
| S8 | Design - Views | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/design-views | B | Multi-view and layer visibility modes |
| S9 | Design - Library Controls | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/design-library-controls | B | 2D/3D linked editing and export controls |
| S10 | Design - 3D Controls | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/design-sculpting | B | Cross-section, heatmap, sculpting |
| S11 | Wet or Dry View | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/wet-or-dry-view | B | Display preference for design libraries |
| S12 | What is Signature Design? | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/what-is-signature-design | B | Render-only workflow from STL to photo/video/3D review |
| S13 | Create a Signature Design | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/create-a-signature-design | B | Signature Design setup sequence |
| S14 | Signature Design - Review and Controls | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/signature-design-review-and-controls | B | Review modes and object controls |
| S15 | Smilecloud Review | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/smilecloud-review | B | Layered 3D evaluation and annotation |
| S16 | Upload and Visualize CBCT Files | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files | B | Documentation upload and CBCT handling |
| S17 | Share Link - 24 Hours | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/share-link | B | Guest collaboration flow |
| S18 | Drop - in - Chat | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/drop-in-chat | B | Unsupported-file sharing via case chat |
| S19 | Team-UP | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/team-up | B | Full-account case collaboration |
| S20 | What is Smilecloud Passport | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/what-is-smilecloud-passport | B | Patient-facing app and timeline/story positioning |
| S21 | How to Connect your Patients | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients | B | Patient invitation and share flow |
| S22 | What is Metalab | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/what-is-metalab | B | Outsourced design service integration |
| S23 | Understanding Smilecloud Subscription Plans | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans | B | Feature gating and team-scale differences |
| S24 | Collections | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/collections | B | Case organization model |
| S25 | Smilecloud iPad Photography & Simulation Guide | SmileCloud | 2026-03-08 | https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide | B | Input quality and device constraints |

## Core Evidence Notes

### Product structure
- SmileCloud organizes the product around a case workspace with categories for Smile Design, Blueprint, Signature Design, Review, Collaboration, Patient Passport, Services, Account/Subscription, and Case Management. This suggests a case-centric operating model rather than a file-centric one. [S1](https://learn.smilecloud.com/en)

### Entry workflow
- The fastest value proposition is explicit: one photo becomes an editable Smile Design, then a before/after video in minutes. [S3](https://learn.smilecloud.com/en/article/smile-design-video-simulation)
- Smile Design begins from Projects inside a case, uses AI-generated design proposals, supports portraits from multiple angles, and offers manual refinement for portrait alignment, lip contour, color, restorative space, and tooth hiding. [S2](https://learn.smilecloud.com/en/article/how-to-design)

### 3D expansion workflow
- Blueprint extends Smile Design into a structured shared 2D+3D environment that combines portrait, scans, CBCT, and motion data for interdisciplinary collaboration. [S4](https://learn.smilecloud.com/en/article/what-is-blueprint) [S6](https://learn.smilecloud.com/en/article/stack)
- Blueprint can start from an existing Smile Design, the Projects list, or New Project. [S5](https://learn.smilecloud.com/en/article/create-a-blueprint)
- Blueprint flow is staged: Stack (data layering/alignment), Structure (declare tooth-level actions), then Design (views, library controls, sculpting, export). [S6](https://learn.smilecloud.com/en/article/stack) [S7](https://learn.smilecloud.com/en/article/structure) [S8](https://learn.smilecloud.com/en/article/design-views) [S9](https://learn.smilecloud.com/en/article/design-library-controls) [S10](https://learn.smilecloud.com/en/article/design-sculpting)

### Alternative import workflow
- Signature Design is a render-only project type meant for external wax-ups/setups or scanned wax-ups delivered as STL, with output focused on before/after photo-video simulations and a 3D review scene. [S12](https://learn.smilecloud.com/en/article/what-is-signature-design)
- Signature Design setup expects portrait, initial upper, and imported signature upper, with automatic or manual alignment, then a review screen supporting annotations, cross-sections, heatmap, and object visibility. [S13](https://learn.smilecloud.com/en/article/create-a-signature-design) [S14](https://learn.smilecloud.com/en/article/signature-design-review-and-controls)

### Review workflow
- Review acts as the evaluation surface for layered 3D data, annotations, cross-sections, measurements, heatmap, and virtual preparation guidance. [S15](https://learn.smilecloud.com/en/article/smilecloud-review)
- CBCT upload currently routes through case Documentation/Gallery before visualization and optional STL conversion. [S16](https://learn.smilecloud.com/en/article/upload-and-visualize-dicom-cbct-files)

### Collaboration workflow
- Team-UP is the full-account collaboration path: shared case files, virtual treatment room chat, persistent history, and access control. [S19](https://learn.smilecloud.com/en/article/team-up)
- Share Link is the lightweight guest path with 24-hour access, OTP verification, and restricted permissions. [S17](https://learn.smilecloud.com/en/article/share-link)
- Drop-in Chat is a secondary delivery path for unsupported formats such as XML, MOD, KEY, and RAW with seven-day download windows. [S18](https://learn.smilecloud.com/en/article/drop-in-chat)

### Patient workflow
- Smilecloud Passport is the patient-facing mobile app that receives files, visual simulations, treatment story/timeline content, and patient chat. [S20](https://learn.smilecloud.com/en/article/what-is-smilecloud-passport)
- Patient connection flow begins from the case, with a warning that initial documentation is shared automatically, then selected designs, video simulations, and galleries can be shared; patient chat remains separate from treatment team chat. [S21](https://learn.smilecloud.com/en/article/smilecloud-passport-a-360-digital-experience-for-patients)

### Service and operations workflow
- Metalab is positioned as an in-workspace outsourced design service with direct chat, revisions, and four-working-day delivery. [S22](https://learn.smilecloud.com/en/article/what-is-metalab)
- Collections organize cases by status or procedure, with both private and clinic-shared collections. [S24](https://learn.smilecloud.com/en/article/collections)
- Subscription tiers reveal the product ladder: Lite for storage/collaboration, Starter for Smile Design and Review, Business for shared collections, multi-member support, Blueprint, Signature Design, CBCT-to-STL, and motion workflows. [S23](https://learn.smilecloud.com/en/article/understanding-smilecloud-subscription-plans)

### Input quality constraints
- Smile Design quality depends heavily on portrait capture quality, especially on iPad; guidance emphasizes correct head position, centered lighting, back camera use, landscape framing, and avoiding digital zoom. This implies the product outcome is sensitive to upstream capture quality. [S25](https://learn.smilecloud.com/en/article/smilecloud-ipad-photography-simulation-guide)
