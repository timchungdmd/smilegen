# Smilefy-Inspired Workspace A/B Design

**Date:** 2026-03-12

## Goal

Redesign the SmileGen desktop app so it feels closer to a Smilefy-style clinical design studio: one premium case workspace, fewer redundant steps, a larger patient/result canvas, and a clearer path from import to presentation. The redesign will be explored as an A/B test between two workflow framings that share the same visual system.

## Design Decision

Build and compare:

- **Variant A: Workspace-First Studio**
- **Variant B: Guided Workspace Hybrid**

Do **not** build a strict step-by-step wizard as the primary direction.

## Product Intent

The current app has many of the right capabilities, but the workflow feels fragmented across too many destinations. The redesign should make the product feel like a single clinical design workspace rather than a chain of adjacent tools.

The app should feel:

- premium
- clinical
- visual-first
- calm
- fast for experts
- understandable for first-time users

## Information Architecture

### Outside The Case Workspace

- `Cases`
- `Settings`

### Inside A Case Workspace

Both variants share the same five jobs:

1. `Import`
2. `Align`
3. `Design`
4. `Review`
5. `Present`

### Redundant Step Collapse

- `Capture` + `Overview` -> `Import`
- `Simulate` + `Plan` -> `Design`
- `Validate` + `Compare` -> `Review`
- `Collaborate` + `Export` -> `Present`

## Variant Definitions

### Variant A: Workspace-First Studio

This version behaves like a professional design studio.

Characteristics:

- free movement between workspace modes
- minimal instructional chrome
- persistent workspace controls
- persistent variant strip
- optimized for expert speed and confidence

Expected strengths:

- feels premium
- feels efficient
- supports repeat clinic use

Expected risks:

- next action may be less obvious
- first-time users may not know which job matters next

### Variant B: Guided Workspace Hybrid

This version uses the same shell, but adds structure and completion cues.

Characteristics:

- same persistent workspace shell as A
- top progress rail for `Import -> Align -> Design -> Review -> Present`
- strong “next best action” cue in each stage
- completion states and readiness prompts
- de-emphasis of later stages until the case is ready

Expected strengths:

- easier onboarding
- clearer stage progression
- more commercially launch-ready

Expected risks:

- may feel slightly constrained for experts
- may feel less fluid than A

## Shared Screen Anatomy

Both variants should use the same core structure:

- **Left rail:** cases, case switcher, workspace modes
- **Top bar:** patient name, case state, autosave state, primary CTA
- **Center stage:** photo, 3D scan, compare view, or presentation canvas
- **Right rail:** contextual controls only for the active job
- **Bottom strip:** variants, snapshots, or review checkpoints

## Job Definitions

### 1. Import

**Outcome:** create a complete and usable case

Contains:

- patient photo upload
- STL / scan upload
- case metadata
- import quality and readiness cards
- missing-input warnings
- readiness summary

### 2. Align

**Outcome:** make the photo/scan relationship believable and clinically usable

Contains:

- landmark placement
- photo/scan overlay
- alignment quality state
- guide toggles
- proportion and perspective confirmation

### 3. Design

**Outcome:** generate and refine a smile proposal

Contains:

- hero photo simulation
- 3D design workspace
- before/after toggle
- variant strip
- arch / tooth / proportion controls
- generate and refine actions

### 4. Review

**Outcome:** decide whether the design is ready to present

Contains:

- compare states
- readiness summary
- validation metrics
- notes and flags
- approve vs revise decision

### 5. Present

**Outcome:** communicate the approved proposal clearly

Contains:

- patient-facing presentation
- doctor-facing summary
- snapshot selection
- export/share/report actions

## UI Language

### Visual Direction

- dark graphite workspace, not pure black
- patient/result canvas as the hero
- restrained chrome
- bright clinical accent
- warm enamel tones and softer gingival support colors
- “studio console” more than “admin dashboard”

### Component Principles

- inspector controls grouped into short modules, never one long wall
- before/after and overlay controls near the canvas
- status chips for readiness and stage completion
- minimal empty state text
- strong hierarchy between image/result and controls

### Avoid

- too many equal-weight panels
- modal-heavy workflow
- full-screen blockers for small tasks
- separate screens for tiny state changes
- long form-driven main workflow

## A/B Test Plan

### Hypothesis

- **A** will win on speed and desirability for expert users
- **B** will win on clarity and commercial launch readiness

### Hold Constant

- visual system
- major components
- alignment tools
- presentation surface
- design canvases

### Change Between Variants

- workflow framing
- progress visibility
- action guidance
- stage completion emphasis

### Metrics

- time from case open to first believable simulation
- time from import complete to alignment complete
- number of mode switches
- number of abandoned or stalled cases
- number of alignment retries
- number of users who reach present mode
- self-reported trust
- self-reported clarity

### Expected Recommendation

For an early commercial release, **Variant B** is the safer default. The likely long-term product direction is B as the default workflow shell, with some of A’s flexibility gradually unlocked for advanced users.

## Implementation Intent

The A/B effort should primarily touch the layout shell, case workspace structure, route/view consolidation, and stage-specific control presentation. The goal is not a full product rewrite; it is a workflow simplification plus a premium workspace redesign.
