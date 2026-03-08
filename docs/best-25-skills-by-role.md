# Best 25 Skills By Role

Created: 2026-03-07

This is a practical shortlist from the installed skill set. The goal is not to cover every available skill, but to identify the highest-value skills to reach for first by role.

## 1. Coding and Code Review

### 1. `github-ops`
Best for pull requests, issues, workflow runs, repo operations, and GitHub API tasks.

Example prompt:
`Use $github-ops to inspect this PR and summarize the blocking issues.`

### 2. `qa-expert`
Best for test strategy, test cases, bug reporting structure, and QA process setup.

Example prompt:
`Use $qa-expert to create a test plan for this feature.`

### 3. `ln-511-code-quality-checker`
Best for architecture review, maintainability analysis, and code quality scoring.

Example prompt:
`Use $ln-511-code-quality-checker to review this module for architecture and maintainability risks.`

### 4. `ln-621-security-auditor`
Best for targeted security reviews covering secrets, injection risks, XSS, and validation gaps.

Example prompt:
`Use $ln-621-security-auditor to scan this repo for high-severity security issues.`

### 5. `ln-710-dependency-upgrader`
Best for coordinating package upgrades across multiple package managers.

Example prompt:
`Use $ln-710-dependency-upgrader to propose a safe dependency upgrade plan for this project.`

### 6. `ln-782-test-runner`
Best for running and summarizing the project test suite.

Example prompt:
`Use $ln-782-test-runner to run the tests and summarize failures by root cause.`

### 7. `playwright-interactive`
Best for debugging browser flows interactively when a normal static code read is not enough.

Example prompt:
`Use $playwright-interactive to reproduce the checkout bug in the browser and capture the failing step.`

## 2. Founder and Product Work

### 8. `prompt-optimizer`
Best for turning rough ideas into concrete, actionable specifications.

Example prompt:
`Use $prompt-optimizer to turn this product idea into a clear implementation spec.`

### 9. `deep-research`
Best for broad research that needs synthesis, structure, and decision-ready output.

Example prompt:
`Use $deep-research to compare the leading approaches for this feature and recommend one.`

### 10. `product-analysis`
Best for multi-angle product audits and optimization plans.

Example prompt:
`Use $product-analysis to audit this product and identify the highest-leverage UX improvements.`

### 11. `competitors-analysis`
Best for structured competitor benchmarking and positioning work.

Example prompt:
`Use $competitors-analysis to compare our onboarding against three competitors.`

### 12. `ln-200-scope-decomposer`
Best for breaking a project into epics and stories.

Example prompt:
`Use $ln-200-scope-decomposer to break this roadmap item into epics and stories.`

### 13. `ln-230-story-prioritizer`
Best for ranking stories with a RICE-style lens.

Example prompt:
`Use $ln-230-story-prioritizer to prioritize these stories for the next sprint.`

## 3. Research, Documentation, and Communication

### 14. `fact-checker`
Best for verifying claims in docs against current sources.

Example prompt:
`Use $fact-checker to verify this technical doc and flag any stale claims.`

### 15. `markdown-tools`
Best for converting PDF, DOCX, and PPTX into usable markdown.

Example prompt:
`Use $markdown-tools to convert this PDF into clean markdown with preserved structure.`

### 16. `pdf-creator`
Best for converting markdown into a printable PDF.

Example prompt:
`Use $pdf-creator to turn this report into a polished PDF.`

### 17. `ppt-creator`
Best for creating presentations from topics, notes, or source documents.

Example prompt:
`Use $ppt-creator to build a presentation from this outline.`

### 18. `meeting-minutes-taker`
Best for structuring meeting notes, decisions, and follow-ups.

Example prompt:
`Use $meeting-minutes-taker to turn these notes into a clean meeting summary with action items.`

### 19. `mermaid-tools`
Best for extracting and rendering diagrams from markdown content.

Example prompt:
`Use $mermaid-tools to render the Mermaid diagrams in this doc as PNGs.`

## 4. Design, UI, and Media

### 20. `ui-designer`
Best for extracting design direction from reference interfaces and turning that into implementation-ready guidance.

Example prompt:
`Use $ui-designer to derive a design system from this reference UI screenshot.`

### 21. `i18n-expert`
Best for localization audits and internationalization setup in UI codebases.

Example prompt:
`Use $i18n-expert to audit this frontend for missing localization coverage.`

### 22. `llm-icon-finder`
Best for locating brand icons for AI providers, models, and related tools.

Example prompt:
`Use $llm-icon-finder to find SVG icons for GPT, Claude, and Gemini.`

### 23. `capture-screen`
Best for scripted macOS screenshots and window captures.

Example prompt:
`Use $capture-screen to capture the main app window for documentation.`

### 24. `video-comparer`
Best for before/after video quality comparisons with metrics and visual output.

Example prompt:
`Use $video-comparer to compare the original and compressed videos and summarize quality loss.`

### 25. `youtube-downloader`
Best for pulling reference videos or extracting media from supported sources.

Example prompt:
`Use $youtube-downloader to download this product demo for offline review.`

## Quick Starting Set

If you only want a small default stack, start here:

- `github-ops`
- `deep-research`
- `prompt-optimizer`
- `fact-checker`
- `markdown-tools`
- `ppt-creator`
- `ui-designer`
- `qa-expert`
- `ln-621-security-auditor`
- `ln-782-test-runner`

## Notes

- This list favors practical day-to-day usefulness over completeness.
- Some skills are orchestration-heavy and make more sense once you already have structured docs, stories, or tasks.
- The large `ln-*` set is powerful, but most people should start with a handful of entry-point skills before using the full pipeline.
