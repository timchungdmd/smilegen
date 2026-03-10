/**
 * PresentView — Patient-friendly smile design presentation.
 *
 * Stage 6 in the clinical workflow. Designed for chairside use on a tablet
 * or rotated laptop screen. Shows:
 *  - Before/After photo comparison (full-width portrait layout)
 *  - Design variant selection strip
 *  - Treatment summary in plain language
 *  - "Save Presentation" action
 *
 * Phase 10 full implementation targets:
 *  - Portrait-first full-bleed photo comparison
 *  - Animated fade between before/after
 *  - Patient-readable treatment summary (no jargon)
 *  - Print / PDF export
 *
 * Currently: structural scaffold.
 */

import { useDesignStore } from "../../store/useDesignStore";
import { useImportStore } from "../../store/useImportStore";
import { useCaseStore } from "../../store/useCaseStore";
import { useViewportStore } from "../../store/useViewportStore";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";

// ── Before/After Viewer ───────────────────────────────────────────────────

function BeforeAfterViewer({ photoUrl }: { photoUrl: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        gap: 12,
        padding: "16px 24px",
        minHeight: 0,
      }}
    >
      {/* Before */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted, #8892a0)",
          }}
        >
          Before
        </span>
        <div
          style={{
            flex: 1,
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--bg-tertiary, #252b38)",
          }}
        >
          <img
            src={photoUrl}
            alt="Before"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      {/* After */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--accent, #00b4d8)",
          }}
        >
          After
        </span>
        <div
          style={{
            flex: 1,
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--bg-tertiary, #252b38)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Placeholder: in Phase 10, this renders the design overlay composite */}
          <img
            src={photoUrl}
            alt="After (design overlay)"
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "hue-rotate(10deg) brightness(1.08)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Treatment Summary ─────────────────────────────────────────────────────

function TreatmentSummary() {
  const plan = useDesignStore((s) => s.plan);
  const selectedTeeth = plan.selectedTeeth;
  const treatmentMap = plan.treatmentMap;

  const treatmentCounts: Record<string, number> = {};
  selectedTeeth.forEach((t) => {
    const type = treatmentMap[t] ?? "veneer";
    treatmentCounts[type] = (treatmentCounts[type] ?? 0) + 1;
  });

  const summaryLines = Object.entries(treatmentCounts).map(
    ([type, count]) => `${count} ${type}${count !== 1 ? "s" : ""}`
  );

  return (
    <div
      style={{
        padding: "16px 24px",
        borderTop: "1px solid var(--border, #2a2f3b)",
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #8892a0)", marginBottom: 6 }}>
        Treatment Summary
      </div>
      <div style={{ fontSize: 14, color: "var(--text-primary, #e8eaf0)" }}>
        {summaryLines.length > 0
          ? summaryLines.join(" · ")
          : "No teeth selected — add teeth in Plan to build a treatment summary."}
      </div>
    </div>
  );
}

// ── PresentView ───────────────────────────────────────────────────────────

export function PresentView() {
  const generatedDesign = useDesignStore((s) => s.generatedDesign);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const caseRecord = useCaseStore((s) => s.caseRecord);
  const setActiveView = useViewportStore((s) => s.setActiveView);

  if (!generatedDesign) {
    return (
      <StageBlockerScreen
        stage="present"
        reason="Complete the Plan and Validate stages before presenting to the patient."
        actionLabel="Go to Plan"
        onAction={() => setActiveView("plan")}
      />
    );
  }

  const primaryPhoto = uploadedPhotos[0]?.url ?? null;

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
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted, #8892a0)",
            }}
          >
            Present
          </span>
          {caseRecord && (
            <span style={{ fontSize: 12, color: "var(--text-primary, #e8eaf0)", marginLeft: 10 }}>
              {caseRecord.title}
            </span>
          )}
        </div>
        <button
          onClick={() => setActiveView("collaborate")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            background: "var(--bg-tertiary, #252b38)",
            color: "var(--text-muted, #8892a0)",
            border: "1px solid var(--border, #2a2f3b)",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Share with Team
        </button>
      </div>

      {/* Main content */}
      {primaryPhoto ? (
        <BeforeAfterViewer photoUrl={primaryPhoto} />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted, #8892a0)",
            fontSize: 13,
            padding: 24,
            textAlign: "center",
          }}
        >
          No patient photo uploaded. Add a photo in Capture for the before/after comparison.
        </div>
      )}

      <TreatmentSummary />
    </div>
  );
}
