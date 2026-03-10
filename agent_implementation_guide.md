# Engineering Implementation Guide: Project Smile-Gen

This document serves as the absolute technical runbook for an autonomous coding agent to synthesize a production-ready, cloud-native Digital Smile Design (DSD) application, effectively amalgamating the strengths of SmileFy, Smile Cloud, and exocad into a unified WebGL/Python architecture.

---

## Technical Stack Definition
*   **Frontend (The Canvas):** React (Next.js), Tailwind CSS.
*   **3D Rendering Engine (The Viewport):** Three.js (WebGL), `@react-three/fiber`, `@react-three/drei`.
*   **Backend (The Gateway):** Node.js (Express) or Python (FastAPI) for high-throughput concurrency.
*   **AI/Vision Processing (The Brain):** Python (OpenCV, PyTorch/MediaPipe) for facial landmark detection and 2D/3D alignment.
*   **Database (The Memory):** PostgreSQL (relational patient data), AWS S3 / Google Cloud Storage (blob storage for heavy `.stl`, `.ply`, `.obj` meshes and `.jpeg` imagery).

---

## Phase 1: Architectural Foundation & Data Ingestion
**Objective:** Establish the core data models and infrastructure to securely ingest and store raw patient diagnostic files (photos, intraoral scans).

1.  **Initialize Monorepo:** Setup a Turborepo containing `apps/web` (Next.js frontend) and `apps/api` (FastAPI backend).
2.  **Define Patient Schema (Prisma/PostgreSQL):**
    *   `Patient` model (ID, Name, Date of Birth).
    *   `Case` model (ID, PatientID, Status, CreatedAt).
    *   `Asset` model (ID, CaseID, Type: `PHOTO_FRONTAL_SMILE`, `PHOTO_RETRACTED`, `SCAN_UPPER_JAW`, `SCAN_LOWER_JAW`, `CBCT`, URL).
3.  **Implement Asset Upload Pipeline:**
    *   Create secure, signed-URL multi-part upload routes in the API.
    *   Ensure the frontend handles large file uploads (up to 500MB for CBCT/Scans) using chunking and displays a robust progress bar.

---

## Phase 2: Computer Vision & AI Landmark Detection (The "Smile Cloud" Biometrics)
**Objective:** Automate the 2D facial analysis to detect key anatomical landmarks on the imported frontal smile photograph, eliminating manual user calibration.

1.  **Integrate MediaPipe/OpenCV:** Set up a microservice dedicated to image processing.
2.  **Facial Mesh Extraction:** When a `PHOTO_FRONTAL_SMILE` is uploaded, run a deep learning model to extract the 468 3D facial landmarks.
3.  **Specific Landmark Mapping:**
    *   Isolate the lip contours (inner and outer vermilion borders).
    *   Identify the interpupillary line (for horizontal leveling).
    *   Identify the facial midline.
4.  **Generative Masking:** Create an alpha-channel mask knocking out the interior of the mouth (the existing teeth) based on the inner lip contour. Store this masked image alongside the original.

---

## Phase 3: The WebGL 3D Rendering Core (The "exocad" Viewport)
**Objective:** Build the high-performance browser-native 3D viewport capable of rendering dense stereolithography (STL) meshes synchronously.

1.  **Initialize Three.js Canvas:** Implement `<Canvas>` from `@react-three/fiber` as the primary workspace component.
2.  **Mesh Loaders:** Implement robust `STLLoader` and `OBJLoader` utilities to fetch and parse the patient's intraoral scans from cloud storage.
3.  **Material Definitions:** Define custom shader materials (PBR) that accurately mimic dental anatomy (enamel translucency, dentin opacity, gingival subsurface scattering).
4.  **Scene Lighting:** Configure a studio lighting setup within the WebGL scene to highlight surface texture and line angles on the digital wax-up.

---

## Phase 4: 2D/3D Hybrid Alignment & The "Gimbal" UI
**Objective:** Synthesize the 2D biometric data with the 3D meshes, and provide the user with intuitive tools to manipulate the proposed smile design.

1.  **The 2D Overlay:** Project the masked, alignment-corrected 2D frontal photograph as a semi-transparent screen-space overlay atop the 3D viewport.
2.  **Semi-Automated Alignment:** Provide a UI flow where the user clicks two corresponding points (e.g., canine cusps) on both the 2D photo and the 3D intraoral scan. Execute a rigid body transformation matrix to snap the 3D scan behind the 2D photo.
3.  **Tooth Library Implementation:** Populate a database with high-quality, pre-modeled 3D tooth libraries (STL/OBJ format). Provide a UI gallery for the user to select a mold (e.g., "Ovoid", "Square").
4.  **The "Gimbal" Tooling:**
    *   Implement an interactive `TransformControls` (from Three.js/drei) wrapper around the imported 3D library teeth.
    *   Allow the user to click any library tooth and manipulate its Scale, Rotation, and Translation in global or local space.
5.  **Parametric Deformation (Advanced):** Implement Lattice Deformation or shape-key blending, allowing the user to push/pull specific control nodes (e.g., pulling the mesial incisal angle) without losing the physiological surface texture of the library tooth.

---

## Phase 5: Export & Manufacturing Hand-off (The Mesh Synthesis Engine)
**Objective:** Translate the digital proposal into physical, print-ready, watertight files (`.stl`, `.ply`). This phase synthesizes the heavy localized geometry deformation found in systems like exocad with the rapid output capabilities of SmileFy.

### 5.1 System Primitives (Context)
*   **Target Mesh ($T$):** The original, prepared intraoral scan of the patient's dentition.
*   **Library Mesh ($L$):** The 3D tooth template positioned and morphed by the user during Phase 4.
*   **Margin Line ($M$):** A closed 3D spline loop defined on $T$ that dictates the exact boundary of the restoration.

### 5.2 The Crown Generation Algorithm (Synthesizing exocad/Smile Cloud)
Generating a full coverage crown requires unifying the outer esthetic surface of $L$ with the internal intaglio (fitting) surface derived from $T$, while respecting $M$.

1.  **Preparation (Intaglio Extraction):**
    *   **Raycast/Flood Fill:** From the center of the user-defined $M$, flood-fill the triangles on $T$ until reaching the margin boundary.
    *   **Duplication & Reversal:** Extract this region from $T$, creating the "Preparation Mesh" ($P$). Reverse the normals of $P$ to form the internal cavity of the crown.
    *   **Cement Gap Generation:** Extrude $P$ outward by a defined micros-scale parameter (e.g., $50\mu m$) to account for the physical cement layer. Call this $P_{gap}$.
2.  **Margin Adaptation (The Seamless Blend):**
    *   Calculate the shortest distance vector from the base vertices of $L$ to the spline $M$.
    *   Apply a localized Laplacian smooth/deformation (Shrinkwrap) to pull the cervical third of $L$ exactly onto $M$, ensuring $C^1$ continuity (tangent alignment) with the root structure of $T$ below the margin. Call this adapted outer shell $L_{adapted}$.
3.  **Boolean Synthesis (The Core Operation):**
    *   Calculate the Boolean Difference: $Crown = L_{adapted} - P_{gap}$.
    *   *Note:* Cloud-native architectures (like Smile Cloud) often offload this heavy CSG (Constructive Solid Geometry) to scalable AWS/Azure instances running PyMesh or CGAL, returning the final `$Crown$` URL. Desktop systems (exocad) execute this locally via C++/DirectX APIs.
4.  **Finalization:** Run a lightweight smoothing pass solely on the generated Boolean intersection seam to remove micro-artifacts, ensuring a biologically acceptable emergence profile.

### 5.3 The Veneer/Mockup Shell Generation Algorithm
Veneers and Mockup Shells differ from Crowns; they do not require a prepared tooth stump, but rather sit *over* the existing unprepared anatomy.

1.  **Block-out Undercuts (Crucial Step):**
    *   Define an insertion axis (path of draw).
    *   Iterate over $T$; if a face normal opposes the insertion vector (creating an undercut), project vertices along the axis to eliminate the concavity. Call this non-undercut model $T_{blocked}$.
2.  **Offset & Collision Resolution:**
    *   Similar to the cement gap, inflate $T_{blocked}$ by the desired shell thickness (e.g., $0.3mm$) to create the inner boundary, $T_{inflated}$.
3.  **Boolean Shelling:**
    *   Calculate the Boolean Difference: $Veneer = L - T_{inflated}$.
    *   *Edge Case Handling:* If the original tooth on $T$ protrudes *outside* the boundary of $L$, the Boolean will fail or create holes. The algorithm must pre-emptively push the intersecting vertices of $T$ inward (simulating digital reduction) before the Boolean operation.

### 5.4 Export Routines
*   Implement watertight verification on the final $Crown$ and $Veneer$ meshes.
*   Serialize matrices to standard `.stl` and `.ply` formats for 3D printer slicing software.
