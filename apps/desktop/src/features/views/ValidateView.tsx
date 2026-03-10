/**
 * ValidateView — Design validation before presentation.
 *
 * Stage 5 in the clinical workflow. Four tabs:
 *
 *  1. Comparison  — Side-by-side before/after with CompareView
 *  2. Measurements — Tooth proportions, golden ratio checks
 *  3. Review      — Annotation thread and design notes
 *  4. Approvals   — Mark ready for doctor, approval status
 *
 * Phase 9 full implementation targets:
 *  - Proportion measurement overlays (width/height ratio badges)
 *  - Golden ratio compliance indicator
 *  - Annotation panel wired to useDesignStore.annotations
 *  - Doctor approval workflow with "Mark Ready" button
 *
 * Currently: structural scaffold with all four tab panels.
 */

import { useState } from "react";
import { useDesignStore } from "../../store/useDesignStore";
import { useViewportStore } from "../../store/useViewportStore";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";
import { CompareView } from "./CompareView";

// ── Tab types ─────────────────────────────────────────────────────────────

type ValidateTab = "comparison" | "measurements" | "review" | "approvals";

const TABS: { id: ValidateTab; label: string }[] = [
  { id: "comparison", label: "Comparison" },
  { id: "measurements", label: "Measurements" },
  { id: "review", label: "Review" },
  { id: "approvals", label: "Approvals" },
];

// ── Tab rail ──────────────────────────────────────────────────────────────

function TabRail({
  active,
  onChange,
}: {
  active: ValidateTab;
  onChange: (t: ValidateTab) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid var(--border, #2a2f3b)",
        background: "var(--bg-secondary, #1a1f2b)",
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "10px 16px",
              background: "transparent",
              color: isActive ? "var(--accent, #00b4d8)" : "var(--text-muted, #8892a0)",
              border: "none",
              borderBottom: isActive ? "2px solid var(--accent, #00b4d8)" : "2px solid transparent",
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Measurements tab ──────────────────────────────────────────────────────

function MeasurementsTab() {
  const generatedDesign = useDesignStore((s) => s.generatedDesign);
  const activeVariantId = useDesignStore((s) => s.activeVariantId);

  const activeVariant = generatedDesign?.variants.find((v) => v.id === activeVariantId) ?? null;

  if (!activeVariant) {
    return (
      <div style={{ padding: 24, color: "var(--text-muted, #8892a0)", fontSize: 13 }}>
        Generate a design in Plan to see tooth measurements.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px" }}>
        Tooth Proportions
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {activeVariant.teeth.map((tooth) => {
          const ratio = tooth.height > 0 ? (tooth.width / tooth.height).toFixed(2) : "–";
          const isGolden = tooth.width / tooth.height > 0.6 && tooth.width / tooth.height < 0.75;
          return (
            <div
              key={tooth.toothId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                background: "var(--bg-tertiary, #252b38)",
                borderRadius: 8,
              }}
            >
              <span style={{ width: 32, fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                #{tooth.toothId}
              </span>
              <span style={{ flex: 1, fontSize: 12, color: "var(--text-muted)" }}>
                W {tooth.width.toFixed(1)} mm · H {tooth.height.toFixed(1)} mm · D {tooth.depth.toFixed(1)} mm
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: isGolden ? "rgba(0,180,216,0.12)" : "rgba(255,140,0,0.1)",
                  color: isGolden ? "var(--accent, #00b4d8)" : "#ff8c00",
                }}
              >
                {ratio} ratio
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Review tab ────────────────────────────────────────────────────────────

function ReviewTab() {
  const annotations = useDesignStore((s) => s.annotations);
  const addAnnotation = useDesignStore((s) => s.addAnnotation);
  const removeAnnotation = useDesignStore((s) => s.removeAnnotation);
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const text = draft.trim();
    if (!text) return;
    addAnnotation({
      id: `ann-${Date.now()}`,
      type: "text",
      text,
      color: "#00b4d8",
      createdAt: new Date().toISOString(),
      x: 50,
      y: 50,
    });
    setDraft("");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        {annotations.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted, #8892a0)" }}>
            No review notes yet. Add notes below.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {annotations.map((ann) => (
              <div
                key={ann.id}
                style={{
                  padding: "10px 14px",
                  background: "var(--bg-tertiary, #252b38)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-primary, #e8eaf0)" }}>{ann.text}</div>
                </div>
                <button
                  onClick={() => removeAnnotation(ann.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        style={{
          padding: "12px 24px",
          borderTop: "1px solid var(--border, #2a2f3b)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a review note…"
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "var(--bg-tertiary, #252b38)",
            border: "1px solid var(--border, #2a2f3b)",
            borderRadius: 6,
            color: "var(--text-primary, #e8eaf0)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: "8px 14px",
            background: "var(--accent, #00b4d8)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Approvals tab ─────────────────────────────────────────────────────────

function ApprovalsTab() {
  const readyForDoctor = useDesignStore((s) => s.readyForDoctor);
  const markReadyForDoctor = useDesignStore((s) => s.markReadyForDoctor);
  const setActiveView = useViewportStore((s) => s.setActiveView);

  return (
    <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #e8eaf0)", margin: "0 0 6px" }}>
          Design Approval
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted, #8892a0)", margin: 0 }}>
          Mark the design as ready for doctor review. This allows the patient presentation to proceed.
        </p>
      </div>

      <div
        style={{
          padding: "16px",
          background: "var(--bg-tertiary, #252b38)",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: readyForDoctor ? "rgba(0,180,216,0.15)" : "var(--bg-secondary, #1a1f2b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: readyForDoctor ? "var(--accent, #00b4d8)" : "var(--text-muted)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            {readyForDoctor ? (
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            ) : (
              <path d="M12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1zm0 20c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9z" />
            )}
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #e8eaf0)" }}>
            {readyForDoctor ? "Ready for Doctor Review" : "Pending Approval"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted, #8892a0)" }}>
            {readyForDoctor
              ? "Design has been marked as ready. Proceed to Present."
              : "Mark the design ready once measurements and review notes are satisfactory."}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {!readyForDoctor && (
          <button
            onClick={() => markReadyForDoctor()}
            style={{
              flex: 1,
              padding: "10px",
              background: "var(--accent, #00b4d8)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Mark Ready for Doctor
          </button>
        )}
        {readyForDoctor && (
          <button
            onClick={() => setActiveView("present")}
            style={{
              flex: 1,
              padding: "10px",
              background: "var(--accent, #00b4d8)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            Proceed to Present
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── ValidateView ──────────────────────────────────────────────────────────

export function ValidateView() {
  const [activeTab, setActiveTab] = useState<ValidateTab>("comparison");
  const generatedDesign = useDesignStore((s) => s.generatedDesign);
  const setActiveView = useViewportStore((s) => s.setActiveView);

  if (!generatedDesign) {
    return (
      <StageBlockerScreen
        stage="validate"
        reason="Generate a smile design in Plan before validating."
        actionLabel="Go to Plan"
        onAction={() => setActiveView("plan")}
      />
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* Stage header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border, #2a2f3b)",
          background: "var(--bg-secondary, #1a1f2b)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted, #8892a0)",
          }}
        >
          Validate
        </span>
      </div>

      <TabRail active={activeTab} onChange={setActiveTab} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        {activeTab === "comparison" && <CompareView />}
        {activeTab === "measurements" && <MeasurementsTab />}
        {activeTab === "review" && <ReviewTab />}
        {activeTab === "approvals" && <ApprovalsTab />}
      </div>
    </div>
  );
}
