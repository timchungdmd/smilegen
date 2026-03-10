# Smilefy, SmileCloud & Exocad: Underlying Technology & Workflow Analysis

**Research Date:** March 8, 2026
**Confidence Level:** High (based on official sources, press releases, peer-reviewed studies, and manufacturer documentation)

---

## Executive Summary

Smilefy, SmileCloud, and Exocad represent three distinct but complementary layers of the digital dentistry stack. Exocad is a full-spectrum **CAD/CAM restoration design** platform (owned by Align Technology). SmileCloud is an **AI-powered smile design and collaboration** platform (partnered with Straumann). Smilefy is an **AI-driven 3D smile simulation and wax-up** platform focused on chairside speed and patient communication. Each has carved out a loyal customer base by solving different pain points in the digital workflow.

---

## 1. SMILEFY

### Company Background
- **Founded:** 2016 by Ralph Georg (Miami, FL)
- **Category:** AI-powered 3D smile design and treatment planning
- **Current Version:** SmileFy 4.6 (August 2025)
- **Platform:** iOS (iPhone, iPad, Mac), Web

### Underlying Technology

**AI Engine Architecture:**
Smilefy's core is a proprietary AI engine that performs automated smile analysis in three dimensions. Unlike legacy 2D smile design tools that overlay template teeth onto a flat photograph, Smilefy evaluates facial dynamics, dental proportions, incisal edge positioning, and gingival contours volumetrically — accounting for depth, form, and light interaction across multiple angles. The AI was trained and continuously refined against real clinical cases, with algorithms adjusted based on practitioner feedback and strict adherence to biological/functional constraints.

**3D Data Fusion:**
The system merges two primary inputs: (1) a patient facial photograph and (2) an intraoral digital scan. By registering these two data sources in 3D space, Smilefy creates a unified virtual model that connects the patient's facial aesthetics to their actual dental anatomy. This is the critical technical differentiator — it bridges the gap between "what the patient sees in the mirror" and "what the lab needs to manufacture."

**Automated 3D Wax-Up Generation:**
Starting with version 4.5 (January 2025), Smilefy introduced automated conversion of digital scans into 3D print-ready wax-ups. The AI generates diagnostic wax-ups, mockup shells, injectable composite guides, direct composite guides, gum contouring guides, implant bridge designs, and crown temporaries — all without requiring lab communication or manual sculpting.

**SmileFy AVA (v4.6):**
The August 2025 release introduced AVA — an AI-powered system that generates lifelike animated video of a patient smiling with their future smile. Given a patient photo and a 3D treatment plan, AVA produces a realistic motion preview in minutes. This is a patient communication tool as much as a clinical one.

### Workflow (6-Step Guided Process)

1. **Upload** patient photographs and intraoral scans
2. **AI Analysis** — automatic facial flow, dental proportion, and smile design rule evaluation
3. **3D Design Generation** — AI produces a 3D smile design accounting for depth, form, and light
4. **Refinement** — clinician adjusts the AI-generated design using intuitive tools
5. **Patient Preview** ("Smile Trial") — patient sees a realistic simulation of the proposed outcome; AVA can generate an animated video
6. **Output** — 3D print-ready files for wax-ups, mockups, guides, and provisionals

### Why Customers Choose Smilefy

- **Speed:** Full smile design to 3D-printable wax-up in minutes, not days
- **Chairside self-sufficiency:** Eliminates lab back-and-forth for diagnostic stages
- **Patient acceptance:** The Smile Trial and AVA video dramatically increase case acceptance rates by setting realistic expectations
- **Low barrier to entry:** The six-step wizard makes the tool accessible even to clinicians with no prior digital design experience
- **Comprehensive output:** One platform produces wax-ups, mockups, guides, provisionals, and patient presentations
- **Clinical accuracy:** Average error difference of 0.29 ± 0.095 mm in comparative studies

---

## 2. SMILECLOUD

### Company Background
- **Founded:** 2019 by Florin Cofar (based on the RAW protocol published in 2015/2017)
- **Category:** AI-powered smile design and collaboration platform
- **Partnership:** Integrated into Straumann AXS digital ecosystem
- **Platform:** Cloud-based (web, Android, iOS)
- **Usability Score:** SUS 80.33 / "A−" grade (highest among DSD tools in comparative study)

### Underlying Technology

**Biometric Tooth Library System:**
SmileCloud's most distinctive technical feature is its approach to tooth anatomy. All tooth libraries are sourced from **natural donor patients** — not generic CAD shapes. Each library is a unique composition of 12 natural tooth shapes collected from real dentitions. This represents a fundamental shift from traditional DSD tools that use generic template libraries modified to fit the restorative space. Instead, SmileCloud's AI acts as a "search engine for anatomy" — it matches the clinician's design parameters (restorative space, facial references, smile line) to the best-fitting real tooth shapes from its database.

**AI-Powered Shape Matching:**
The AI uses principles similar to facial recognition technology. It analyzes biometric data related to teeth and tissues, then searches its library in real-time to identify tooth shapes that match the defined criteria (smile line, lip position, bipupillary line, etc.). The rendering happens in real-time as the clinician adjusts parameters — the 2D preview shows actual photographs of real teeth that exist as downloadable STL/OBJ files.

**Cloud-Native Architecture:**
SmileCloud is fully cloud-based, enabling multi-device access and real-time collaboration between clinicians, labs, and specialists. Cases are stored in a secure cloud environment with no local software installation required. The platform also includes "Blueprint" — a shared visual reference that combines smile designs and 3D anatomy in one view for team alignment.

**Straumann AXS Integration:**
SmileCloud integrates into Straumann's AXS cloud platform, with forthcoming connections to coDiagnostiX (implant planning), Smile in a Box, and ClearCorrect (aligners). This positions SmileCloud as the aesthetic design entry point for Straumann's broader digital ecosystem.

### Workflow

1. **Photo Upload** — single patient photo captured
2. **Facial Analysis** — software identifies facial landmarks, smile line, lip dynamics
3. **Restorative Space Definition** — clinician defines the design space in 2D
4. **AI Library Search** — real-time AI searches biometric libraries for matching natural tooth shapes
5. **Design Composition** — clinician selects from AI-recommended compositions, adjusts in real-time
6. **Color Matching** — photorealistic color simulation applied
7. **3D Review** — overlay, visualize, and annotate multiple layers of 3D dental data (static occlusion checks, veneer prep review, lab work evaluation)
8. **Video Simulation** — AI-assisted video simulation of the proposed smile
9. **Collaboration & Handoff** — shared case with lab/specialist via Blueprint; STL/OBJ files downloadable for import into CAD software (e.g., Exocad)

### Why Customers Choose SmileCloud

- **Natural-looking results:** Biometric libraries from real patients produce more lifelike designs than generic templates
- **Best-in-class usability:** Highest SUS score among DSD platforms tested in peer-reviewed studies
- **Collaboration-first design:** Cloud-native with built-in team communication tools
- **Ecosystem integration:** Part of Straumann AXS — connects to implant planning, guided surgery, and aligner workflows
- **Flexible pricing tiers:** Lite (case management), Starter (smile design + 10 videos/mo), Business (unlimited + CBCT conversion + 30 videos/mo)
- **STL/OBJ export:** Designs can be directly imported into Exocad or other CAD software, bridging aesthetic design to manufacturing
- **MetaLab access:** Built-in outsourcing to independent digital service providers for design and manufacturing

---

## 3. EXOCAD

### Company Background
- **Founded:** Germany-based dental CAD/CAM company
- **Acquired by:** Align Technology (completed April 2020 for ~€376 million)
- **Category:** Full-spectrum dental CAD/CAM restoration design software
- **Current Version:** DentalCAD 3.3 Chemnitz (2025)
- **Installed Base:** 35,000+ licenses in 150+ countries (pre-acquisition figure)
- **Partner Network:** ~200 hardware and material partners

### Underlying Technology

**Open, Hardware-Neutral Architecture:**
Exocad's foundational technical principle is **vendor neutrality**. The open software architecture allows integration with virtually any scanner (intraoral or desktop), any 3D printer, and any milling machine from any manufacturer. This is Exocad's single most important differentiator — it avoids lock-in to any hardware ecosystem. Users can combine data from intraoral scans, model scans, 3D face scans, jaw motion data, DICOM files (CBCT), and patient photos in a single design workflow.

**Modular Software Architecture:**
DentalCAD uses a modular design where the base platform handles core restoration design, and specialized add-on modules extend capabilities:

- **Auto Articulator Module** — virtual jaw movement simulation
- **Smile Creator Module** — aesthetic smile design planning
- **Model Creator Module** — physical model generation for 3D printing
- **Provisional Module** — eggshell temporary creation
- **InCAD Nesting Module** — positioning restorations in milling blanks
- **Jaw Motion Import Module** — importing real jaw motion recordings
- **PartialCAD** — removable partial denture design
- **Implant Module** — implant-supported restoration design

Users can buy modules individually, purchase perpetual licenses, or rent the full software.

**Wizard + Expert Mode Dual Workflow:**
Exocad offers a guided wizard-based workflow that walks users through each design step sequentially. However, it also provides an **"Expert Mode"** that allows experienced users to jump between any step in the design process non-linearly. This dual approach is a key customer attraction — it's accessible to beginners but doesn't constrain power users.

**AI Services (2025):**
At IDS 2025, Exocad unveiled AI-powered features including:
- **AI Design** — automated design suggestions for single crowns (generated in minutes)
- **AI-enabled multi-unit design** — in DentalCAD 3.3 Chemnitz
- **TruSmile Video** — photorealistic smile visualization from designs
- **TruSmile Photo** — smile photos with proposed restorations overlaid

**CAM Integration:**
ModuleWorks Dental CAM is integrated into Exocad's ChairsideCAD software, enabling a seamless Scan → CAD → CAM → CNC workflow for chairside milling applications.

### Workflow (Lab-Side)

1. **Data Import** — receive scans from any open intraoral scanner or desktop scanner; import face scans, DICOM data, jaw motion recordings, photos
2. **Case Setup** — define restoration type, materials, margins, insertion direction
3. **AI-Assisted Design** — AI generates initial design proposals for crowns/bridges
4. **Manual Refinement** — comprehensive sculpting and adjustment tools; Expert Mode for non-linear editing
5. **Articulation** — virtual articulator for functional occlusion checking
6. **Nesting/CAM** — position designs in milling blanks or prepare for 3D printing
7. **Manufacturing** — output to any compatible mill or 3D printer

### Workflow (Chairside)

1. **Scan** — intraoral scan with any compatible scanner
2. **Design** — ChairsideCAD with guided workflow
3. **Mill/Print** — direct output to chairside mill
4. **Seat** — same-visit restoration delivery

### Why Customers Choose Exocad

- **Hardware freedom:** No lock-in — works with nearly any scanner, printer, or mill on the market
- **Modular pricing:** Buy only the modules you need; upgrade incrementally
- **Expert Mode:** Power users aren't constrained by linear wizards
- **Market-leading breadth:** Designs crowns, bridges, copings, veneers, inlays, onlays, pontics, provisionals, removable partials, implant restorations, and dental appliances — all in one platform
- **Massive partner ecosystem:** 200+ integration partners mean clinicians and labs rarely encounter incompatibility
- **Perpetual + rental licensing:** Flexibility in business model (not forced into subscription)
- **Proven reliability:** With 35,000+ installations, it's one of the two dominant CAD platforms globally (alongside 3Shape)
- **Align Technology backing:** Post-acquisition, Exocad benefits from Align's resources while maintaining its independent, open architecture

---

## Comparative Technology Matrix

| Dimension | Smilefy | SmileCloud | Exocad |
|-----------|---------|------------|--------|
| **Primary Function** | AI smile simulation + 3D wax-up | AI smile design + collaboration | Full CAD/CAM restoration design |
| **Core AI** | Facial dynamics + 3D volumetric analysis | Biometric tooth matching (facial recognition principles) | AI crown design + multi-unit proposals |
| **Architecture** | Mobile-first (iOS) + Web | Cloud-native (SaaS) | Desktop software (Windows) with modular add-ons |
| **Data Inputs** | Photos + intraoral scans | Photos + scans + 3D references | Scans + face scans + CBCT + jaw motion + photos |
| **Primary Output** | 3D print-ready wax-ups, mockups, guides | Smile designs (2D/3D), STL/OBJ files, case collaboration | Manufacturing-ready restoration files |
| **Target User** | Chairside clinician (restorative/cosmetic) | Clinician + lab + specialist teams | Dental lab technicians + chairside clinicians |
| **Hardware Dependency** | Scanner-agnostic (major IOS brands) | Scanner-agnostic | Fully hardware-neutral (any scanner, mill, printer) |
| **Ecosystem** | Standalone | Straumann AXS (coDiagnostiX, ClearCorrect) | Align Technology (iTero, Invisalign) |
| **Pricing Model** | Subscription | Tiered subscription (Lite/Starter/Business) | Perpetual license + rental option + module purchases |
| **Competitive Position** | Fastest chairside smile design to print | Best collaboration + natural aesthetics | Broadest restoration design capabilities |

---

## How They Work Together

These three platforms are not strictly competitors — they occupy different positions in the digital dentistry workflow and can be used in sequence:

1. **SmileCloud** or **Smilefy** → Used first for aesthetic smile design and patient communication. The clinician creates a smile design proposal, gets patient buy-in, and establishes the treatment blueprint.

2. **SmileCloud → Exocad:** SmileCloud designs can be exported as STL/OBJ files and imported directly into Exocad's DentalCAD for final restoration design and manufacturing preparation.

3. **Smilefy → Lab/Exocad:** Smilefy's 3D wax-ups and diagnostic models can serve as the design reference for lab technicians working in Exocad to create the final restorations.

4. **Exocad** → Used last for manufacturing-ready restoration design, nesting, and output to mills/printers.

The combined workflow creates a complete digital chain: **patient visualization → clinical planning → restoration design → manufacturing**.

---

## Key Takeaway

Each platform's customer loyalty stems from solving a specific, acute pain point:

- **Smilefy** wins on **speed and simplicity** — minutes from photo to 3D-printable wax-up, chairside, no lab dependency
- **SmileCloud** wins on **natural aesthetics and collaboration** — real-tooth biometric libraries + cloud-native team workflows + Straumann ecosystem
- **Exocad** wins on **freedom and breadth** — hardware-neutral, modular, and capable of designing virtually any restoration type

The dental practices and labs that get the most value tend to use these tools in complementary rather than competitive fashion.

---

## Sources

- [SmileFy Official Website](https://smilefy.com/)
- [SmileFy 4.6 Release](https://smilefy.com/smilefy-4-6-release/)
- [SmileFy 4.5 Automated 3D Wax-Up Technology (EIN Presswire)](https://www.einpresswire.com/article/781013739/transforming-digital-dentistry-smilefy-4-5-introduces-automated-3d-wax-up-technology)
- [SmileFy 4.0 AI Features (Dental Products Report)](https://www.dentalproductsreport.com/view/new-smilefy-4-0-features-innovative-3d-smile-design-powered-by-ai)
- [SmileCloud Official Website](https://smilecloud.com/)
- [SmileCloud on Straumann](https://www.straumann.com/us/en/dental-professionals/digital-performance/software/smilecloud.html)
- [SmileCloud AI in Smile Design (Institute of Digital Dentistry)](https://instituteofdigitaldentistry.com/news/smilecloud-utilizing-ai-in-smile-design/)
- [SmileCloud Libraries Technical Blog](https://blog.smilecloud.com/post/libraries-digital)
- [SmileCloud Origins](https://blog.smilecloud.com/post/origins-of-smilecloud)
- [Exocad Official Website](https://exocad.com/)
- [Exocad DentalCAD Product Page](https://exocad.com/our-products/dentalcad)
- [Exocad DentalCAD 3.3 Chemnitz Launch](https://exocad.com/news-1/press-area-1/press-release/exocad-launches-dentalcad-33-chemnitz)
- [Exocad at IDS 2025 (Compendium)](https://www.compendiumlive.com/news/?newsID=101131)
- [What is Exocad? (Institute of Digital Dentistry)](https://instituteofdigitaldentistry.com/news/what-is-exocad-a-comprehensive-overview-of-exocad/)
- [Align Technology Acquires Exocad](https://investor.aligntech.com/news-releases/news-release-details/align-technology-completes-acquisition-exocad-global-dental)
- [Comparative Usability Study of DSD Tools (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12468294/)
- [Comparative Analysis: AI vs Conventional DSD (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12436661/)
- [SmileCloud x Straumann Partnership](https://blog.smilecloud.com/post/smilecloud-straumann)
