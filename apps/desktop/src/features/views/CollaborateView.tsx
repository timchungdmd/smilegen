/**
 * CollaborateView — Case sharing and specialist coordination.
 *
 * Stage 7 in the clinical workflow. Wraps ExportView while adding
 * audience-first framing (team + lab vs. patient vs. archive).
 *
 * Phase 11 full implementation targets:
 *  - Audience selector: Team / Lab / Patient / Archive
 *  - .smilegen case package builder (from casePackager.ts)
 *  - Export format presets per audience (DXF+photos for lab, PDF for patient)
 *  - Delivery method: local save, AirDrop, QR code share
 *
 * Currently: structural scaffold wrapping ExportView with stage header.
 */

import { useCaseStore } from "../../store/useCaseStore";
import { useViewportStore } from "../../store/useViewportStore";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";
import { ExportView } from "./ExportView";

// ── Audience pill ─────────────────────────────────────────────────────────

type CollaborateAudience = "team" | "lab" | "patient" | "archive";

const AUDIENCES: { id: CollaborateAudience; label: string; icon: string; description: string }[] = [
  {
    id: "team",
    label: "Team",
    icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    description: "Share the full case with your clinical team",
  },
  {
    id: "lab",
    label: "Lab",
    icon: "M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zm-7 15l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-8.5 9z",
    description: "Send STL/PLY files and instructions to the dental lab",
  },
  {
    id: "patient",
    label: "Patient",
    icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    description: "Export a patient-friendly PDF or image to share",
  },
  {
    id: "archive",
    label: "Archive",
    icon: "M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.54 15.8.5 13.14.5c-1.32 0-2.44.5-3.3 1.36L9 2.7l-.84-.84C7.3 1 6.18.5 4.86.5 2.2.5 0 2.54 0 4.64c0 .48.11.92.18 1.36H0v2h20V6zm-8.86-3.5c.5-.5 1.18-.86 1.94-.86 1.32 0 2.5 1.04 2.5 2.14 0 .24-.04.48-.11.72H9.53c-.07-.24-.11-.48-.11-.72 0-1.1 1.18-2.14 2.5-2.14-.86 0-1.44.36-1.78.72zm-8-1.5c.76 0 1.44.36 1.94.86.34-.36.92-.72 1.78-.72 1.32 0 2.5 1.04 2.5 2.14 0 .24-.04.48-.11.72H1.61C1.54 3.76 1.5 3.52 1.5 3.28 1.5 2.18 2.68 1.14 4 1.14zM2 10v10a2 2 0 002 2h16a2 2 0 002-2V10H2zm7 8H7v-6h2v6zm4 0h-2v-6h2v6zm4 0h-2v-6h2v6z",
    description: "Save a complete .smilegen package for records",
  },
];

// ── CollaborateView ───────────────────────────────────────────────────────

export function CollaborateView() {
  const caseRecord = useCaseStore((s) => s.caseRecord);
  const setActiveView = useViewportStore((s) => s.setActiveView);

  if (!caseRecord) {
    return (
      <StageBlockerScreen
        stage="present"
        reason="Open or create a case before collaborating with your team."
        actionLabel="Go to Cases"
        onAction={() => setActiveView("cases")}
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
          padding: "10px 16px",
          borderBottom: "1px solid var(--border, #2a2f3b)",
          background: "var(--bg-secondary, #1a1f2b)",
          flexShrink: 0,
          gap: 10,
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
          Collaborate
        </span>
        <span style={{ fontSize: 12, color: "var(--text-primary, #e8eaf0)" }}>
          {caseRecord.title}
        </span>
      </div>

      {/* Audience selector */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid var(--border, #2a2f3b)",
          background: "var(--bg-secondary, #1a1f2b)",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {AUDIENCES.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              border: "1px solid var(--border, #2a2f3b)",
              borderRadius: 6,
              background: "var(--bg-tertiary, #252b38)",
              cursor: "pointer",
              fontSize: 12,
              color: "var(--text-muted, #8892a0)",
            }}
            title={a.description}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d={a.icon} />
            </svg>
            {a.label}
          </div>
        ))}
      </div>

      {/* Export content (ExportView) */}
      <ExportView />
    </div>
  );
}
