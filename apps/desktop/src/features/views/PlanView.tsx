/**
 * PlanView — Treatment planning with three sequential substeps.
 *
 * Stage 4 in the clinical workflow. Houses three sub-screens:
 *
 *  1. Stack   — Tooth count, arch selection, treatment type assignment
 *  2. Structure — Arch curve parameters, proportions, additive bias
 *  3. Design  — 3D preview + per-tooth fine-tuning (GimbalTooth)
 *
 * Phase 8 full implementation targets:
 *  - ToothTreatmentMap component (SVG arch diagram with treatment type badges)
 *  - Arch parameter controls with live preview in 3D
 *  - Per-tooth size and position sliders wired to useDesignStore
 *
 * Currently: structural scaffold with substep rail and content areas.
 */

import { useState } from "react";
import { useImportStore } from "../../store/useImportStore";
import { useDesignStore } from "../../store/useDesignStore";
import { useViewportStore } from "../../store/useViewportStore";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";
import { DesignView } from "./DesignView";
import { MarginLineEditor } from "../plan/MarginLineEditor";

// ── Substep types ─────────────────────────────────────────────────────────

type PlanSubstep = "stack" | "structure" | "design";

const SUBSTEPS: { id: PlanSubstep; label: string; description: string }[] = [
  { id: "stack", label: "1 · Stack", description: "Select teeth and treatment types" },
  { id: "structure", label: "2 · Structure", description: "Arch curve and proportions" },
  { id: "design", label: "3 · Design", description: "Fine-tune in 3D" },
];

// ── Substep Rail ──────────────────────────────────────────────────────────

function SubstepRail({
  active,
  onChange,
}: {
  active: PlanSubstep;
  onChange: (s: PlanSubstep) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        padding: "8px 16px",
        borderBottom: "1px solid var(--border, #2a2f3b)",
        background: "var(--bg-secondary, #1a1f2b)",
        flexShrink: 0,
      }}
    >
      {SUBSTEPS.map((step) => {
        const isActive = active === step.id;
        return (
          <button
            key={step.id}
            onClick={() => onChange(step.id)}
            style={{
              padding: "6px 14px",
              background: isActive ? "var(--accent-dim, rgba(0,180,216,0.12))" : "transparent",
              color: isActive ? "var(--accent, #00b4d8)" : "var(--text-muted, #8892a0)",
              border: "1px solid",
              borderColor: isActive ? "var(--accent, #00b4d8)" : "transparent",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title={step.description}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Stack Substep (tooth selection + treatment types) ─────────────────────

function StackSubstep() {
  const plan = useDesignStore((s) => s.plan);
  const toggleTooth = useDesignStore((s) => s.toggleTooth);
  const setTreatmentType = useDesignStore((s) => s.setTreatmentType);
  const generateDesign = useDesignStore((s) => s.generateDesign);
  const quickGenerate = useDesignStore((s) => s.quickGenerate);
  const setActiveView = useViewportStore((s) => s.setActiveView);

  const selectedTeeth = plan.selectedTeeth;
  const treatmentMap = plan.treatmentMap;

  // Common anterior teeth for selection
  const anteriorTeeth = ["6", "7", "8", "9", "10", "11"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, padding: "20px 24px", overflow: "auto" }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #e8eaf0)", margin: "0 0 6px" }}>
          Tooth Selection
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted, #8892a0)", margin: "0 0 16px" }}>
          Select which teeth to include in the smile design.
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {anteriorTeeth.map((toothId) => {
            const isSelected = selectedTeeth.includes(toothId);
            return (
              <button
                key={toothId}
                onClick={() => toggleTooth(toothId)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: isSelected ? "var(--accent, #00b4d8)" : "var(--border, #2a2f3b)",
                  background: isSelected ? "rgba(0,180,216,0.12)" : "var(--bg-tertiary, #252b38)",
                  color: isSelected ? "var(--accent, #00b4d8)" : "var(--text-muted, #8892a0)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title={`Tooth #${toothId}`}
              >
                {toothId}
              </button>
            );
          })}
        </div>
      </div>

      {selectedTeeth.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #e8eaf0)", margin: "0 0 6px" }}>
            Treatment Types
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {selectedTeeth.map((toothId) => {
              const treatment = treatmentMap[toothId] ?? "veneer";
              return (
                <div
                  key={toothId}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--bg-tertiary, #252b38)", borderRadius: 8 }}
                >
                  <span style={{ width: 28, fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                    #{toothId}
                  </span>
                  {(["veneer", "crown", "implant"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTreatmentType(toothId, type)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 5,
                        border: "1px solid",
                        borderColor: treatment === type ? "var(--accent, #00b4d8)" : "var(--border, #2a2f3b)",
                        background: treatment === type ? "rgba(0,180,216,0.12)" : "transparent",
                        color: treatment === type ? "var(--accent, #00b4d8)" : "var(--text-muted, #8892a0)",
                        fontSize: 11,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: "auto", display: "flex", gap: 10 }}>
        <button
          onClick={() => quickGenerate()}
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
          Generate Design
        </button>
        <button
          onClick={() => setActiveView("simulate")}
          style={{
            padding: "10px 16px",
            background: "var(--bg-tertiary, #252b38)",
            color: "var(--text-muted)",
            border: "1px solid var(--border, #2a2f3b)",
            borderRadius: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          View Simulation
        </button>
      </div>
    </div>
  );
}

// ── Structure Substep ─────────────────────────────────────────────────────

function StructureSubstep() {
  const archPreset = useDesignStore((s) => s.archPreset);
  const setArchPreset = useDesignStore((s) => s.setArchPreset);
  const plan = useDesignStore((s) => s.plan);
  const updatePlanControls = useDesignStore((s) => s.updatePlanControls);

  const PRESETS = ["narrow", "average", "wide"] as const;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, padding: "20px 24px", overflow: "auto" }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #e8eaf0)", margin: "0 0 6px" }}>
          Arch Shape
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted, #8892a0)", margin: "0 0 16px" }}>
          Select the arch curve that best matches the patient's anatomy.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setArchPreset(preset)}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: archPreset === preset ? "var(--accent, #00b4d8)" : "var(--border, #2a2f3b)",
                background: archPreset === preset ? "rgba(0,180,216,0.12)" : "var(--bg-tertiary, #252b38)",
                color: archPreset === preset ? "var(--accent, #00b4d8)" : "var(--text-muted, #8892a0)",
                fontSize: 12,
                fontWeight: archPreset === preset ? 600 : 500,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary, #e8eaf0)", margin: "0 0 6px" }}>
          Proportion Style
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted, #8892a0)", margin: "0 0 16px" }}>
          Set the overall size and additive bias for the design.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Tooth Width Scale
            <input
              type="range"
              min={80}
              max={120}
              value={Math.round((plan.controls?.widthScale ?? 1) * 100)}
              onChange={(e) => updatePlanControls({ widthScale: Number(e.target.value) / 100 })}
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Tooth Length Scale
            <input
              type="range"
              min={80}
              max={120}
              value={Math.round((plan.controls?.lengthScale ?? 1) * 100)}
              onChange={(e) => updatePlanControls({ lengthScale: Number(e.target.value) / 100 })}
              style={{ width: "100%", marginTop: 6 }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Design Substep (3D viewer + crown margin editors) ─────────────────────

function DesignSubstep() {
  const plan = useDesignStore((s) => s.plan);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const uploadedToothModels = useImportStore((s) => s.uploadedToothModels);

  // Teeth that need crown synthesis: those with treatment type "crown" and a
  // matching library tooth model uploaded by the user.
  const crownTeeth = plan.selectedTeeth.filter(
    (toothId) => plan.treatmentMap[toothId] === "crown"
  );

  const crownTeethWithLibrary = crownTeeth.filter((toothId) =>
    uploadedToothModels.some((m) => m.toothId === toothId)
  );

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
      {/* 3D DesignView fills the top half */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <DesignView />
      </div>

      {/* Crown margin editors appear below the 3D view when applicable */}
      {crownTeethWithLibrary.length > 0 && archScanMesh && (
        <div
          style={{
            flexShrink: 0,
            maxHeight: 320,
            overflowY: "auto",
            borderTop: "1px solid var(--border, #2a2f3b)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted, #8892a0)",
              marginBottom: 4,
            }}
          >
            Crown Margin Setup
          </div>
          {crownTeethWithLibrary.map((toothId) => {
            const libraryEntry = uploadedToothModels.find(
              (m) => m.toothId === toothId
            )!;
            return (
              <MarginLineEditor
                key={toothId}
                toothId={toothId}
                libraryMesh={libraryEntry.mesh}
                targetMesh={archScanMesh}
              />
            );
          })}
        </div>
      )}

      {/* Hint when crown teeth exist but no library models uploaded */}
      {crownTeeth.length > 0 && crownTeethWithLibrary.length === 0 && (
        <div
          style={{
            flexShrink: 0,
            padding: "10px 16px",
            borderTop: "1px solid var(--border, #2a2f3b)",
            fontSize: 11,
            color: "var(--text-muted, #8892a0)",
            background: "var(--bg-secondary, #1a1f2b)",
          }}
        >
          Tooth{crownTeeth.length > 1 ? "s" : ""} #{crownTeeth.join(", #")}{" "}
          {crownTeeth.length > 1 ? "are" : "is"} marked as crown. Upload
          library tooth models in Capture to enable crown synthesis.
        </div>
      )}
    </div>
  );
}

// ── PlanView ──────────────────────────────────────────────────────────────

export function PlanView() {
  const [activeSubstep, setActiveSubstep] = useState<PlanSubstep>("stack");
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const setActiveView = useViewportStore((s) => s.setActiveView);
  const hasVariants = useDesignStore((s) => s.variants.length > 0);

  const hasCapture = uploadedPhotos.length > 0 || Boolean(archScanMesh);

  if (!hasCapture) {
    return (
      <StageBlockerScreen
        stage="plan"
        reason="Import patient photos or a 3D arch scan before planning the design."
        actionLabel="Go to Capture"
        onAction={() => setActiveView("capture")}
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
          Plan
        </span>
        {hasVariants && (
          <button
            onClick={() => setActiveView("validate")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: "var(--accent, #00b4d8)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Proceed to Validate
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>

      {/* Substep rail */}
      <SubstepRail active={activeSubstep} onChange={setActiveSubstep} />

      {/* Substep content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {activeSubstep === "stack" && <StackSubstep />}
        {activeSubstep === "structure" && <StructureSubstep />}
        {activeSubstep === "design" && <DesignSubstep />}
      </div>
    </div>
  );
}
