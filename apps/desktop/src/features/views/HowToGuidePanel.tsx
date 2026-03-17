import { useState } from "react";

const GUIDE_STEPS = [
  {
    n: 1,
    title: "Import Assets",
    text: "Upload a patient photo (front smile view) and an arch scan file (STL, OBJ, or PLY) from your intraoral scanner. Optionally upload individual tooth 3D files for higher fidelity. You can also drag and drop files anywhere in the window."
  },
  {
    n: 2,
    title: "Select Tooth Library & Generate",
    text: "Choose a tooth morphology library (Ovoid, Square, or Triangular) that best matches your patient's natural tooth shape. Click Generate Smile Design to create three design variants: Conservative, Balanced, and Enhanced."
  },
  {
    n: 3,
    title: "Refine in the Design View",
    text: "Use the 3D View tab to inspect and rotate the smile design. Switch to Photo Overlay to see teeth projected onto the patient photo. Drag the yellow L/R commissure guides to match the patient's smile corners for accurate photo-to-scan alignment."
  },
  {
    n: 4,
    title: "Adjust Proportions & Plan",
    text: "In the right sidebar, use the Smile Plan panel to adjust width/length scale, incisal curve, and midline offset. Choose a proportion mode: Golden Ratio (1.618:1:0.618) enforces classical dental aesthetics; Percentage mode uses 23%:15%:12% rule; Library mode uses raw tooth dimensions."
  },
  {
    n: 5,
    title: "Fine-Tune Individual Teeth",
    text: "Click any tooth in the 3D view or the bottom tooth strip to select it. Use the Tooth Inspector to adjust width, height, and depth. The Arch Form panel lets you switch between arch presets (Narrow, Average, Wide) or set custom arch width and depth. Red-highlighted teeth indicate collisions."
  },
  {
    n: 6,
    title: "Compare & Export",
    text: "Use the comparison view to evaluate variants side by side. When satisfied, go to the export tab to download the final STL file for CAM processing. Use Ctrl+Z / Ctrl+Y to undo/redo changes."
  }
];

/** Collapsible "How to Use SmileGen" guide panel. Manages its own open/closed state. */
export function HowToGuidePanel() {
  const [open, setOpen] = useState(() => {
    return !localStorage.getItem("smilegen-ftux-seen");
  });

  const handleToggle = () => {
    setOpen((v) => {
      if (v) {
        localStorage.setItem("smilegen-ftux-seen", "1");
      }
      return !v;
    });
  };

  return (
    <div
      className="panel"
      style={{
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        overflow: "visible",   // allow flex parent to compute correct height
      }}
    >
      <div
        className="sidebar-section-header"
        onClick={handleToggle}
      >
        <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          How to Use SmileGen
        </h3>
        <svg className={`sidebar-section-chevron ${open ? "open" : ""}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </div>

      {open && (
        <div className="panel-body" style={{ display: "grid", gap: 14, fontSize: 12, lineHeight: 1.6, maxHeight: 260, overflowY: "auto" }}>
          {GUIDE_STEPS.map((step) => (
            <div key={step.n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span className="guide-step-number">{step.n}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                  {step.title}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 11 }}>
                  {step.text}
                </div>
              </div>
            </div>
          ))}

          {/* Keyboard shortcuts */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Keyboard Shortcuts
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 11, color: "var(--text-muted)", alignItems: "center" }}>
              <kbd>Ctrl+Z</kbd><span>Undo</span>
              <kbd>Ctrl+Y</kbd><span>Redo</span>
              <kbd>1-5</kbd><span>Switch views (Import, Design, Compare, Export, Cases)</span>
              <kbd>Esc</kbd><span>Deselect tooth</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
