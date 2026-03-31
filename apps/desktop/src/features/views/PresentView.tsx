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

import { useCallback, useEffect, useRef, useState } from "react";
import { useDesignStore } from "../../store/useDesignStore";
import { useImportStore } from "../../store/useImportStore";
import { useCaseStore } from "../../store/useCaseStore";
import { getCaseWorkflowStage, useViewportStore } from "../../store/useViewportStore";
import { StageBlockerScreen } from "../workflow/StageBlockerScreen";
import { useWorkspaceVariantStore } from "../experiments/workspaceVariantStore";
import { recordPresentationViewed } from "../experiments/workspaceMetrics";
import { BeforeAfterSlider } from "../present/BeforeAfterSlider";
import { PresentationMode } from "../present/PresentationMode";

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
  const variants = useDesignStore((s) => s.variants);
  const readyForDoctor = useDesignStore((s) => s.readyForDoctor);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const caseRecord = useCaseStore((s) => s.caseRecord);
  const activeView = useViewportStore((s) => s.activeView);
  const setActiveView = useViewportStore((s) => s.setActiveView);
  const workspaceVariant = useWorkspaceVariantStore((s) => s.variant);
  const isWorkspaceVariant = workspaceVariant === "workspace";
  const hasRecordedPresentationRef = useRef(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const isPresentStage = getCaseWorkflowStage(activeView) === "present";
    if (generatedDesign && isPresentStage && !hasRecordedPresentationRef.current) {
      recordPresentationViewed();
      hasRecordedPresentationRef.current = true;
      return;
    }

    if (!generatedDesign || !isPresentStage) {
      hasRecordedPresentationRef.current = false;
    }
    return () => {
      hasRecordedPresentationRef.current = false;
    };
  }, [activeView, generatedDesign]);

  const isPresentationApproved =
    readyForDoctor ||
    caseRecord?.workflowState === "prepared" ||
    caseRecord?.presentationReady === true;

  if (!generatedDesign) {
    return (
      <StageBlockerScreen
        stage="present"
        reason="Complete Design and Review before presenting to the patient."
        actionLabel="Go to Design"
        onAction={() => setActiveView("design")}
      />
    );
  }

  if (!isPresentationApproved) {
    return (
      <StageBlockerScreen
        stage="present"
        reason="Complete Review before presenting to the patient."
        actionLabel="Go to Review"
        onAction={() => setActiveView("review")}
      />
    );
  }

  const primaryPhoto = uploadedPhotos[0]?.url ?? null;

  const handleExport = useCallback(async () => {
    if (!primaryPhoto) return;
    setIsExporting(true);

    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1920, 1080);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = primaryPhoto;
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });
    } catch {
      console.error("Failed to load image for export");
      return;
    } finally {
      setIsExporting(false);
    }

    const scale = Math.min(1920 / img.width, 1080 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (1920 - w) / 2;
    const y = (1080 - h) / 2;
    ctx.drawImage(img, x, y, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "14px -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`SmileGen \u2022 ${new Date().toLocaleDateString()}`, 1900, 1060);

    const link = document.createElement("a");
    link.download = `smile-design-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [primaryPhoto]);

  return (
    <>
    {presentationMode && primaryPhoto && (
      <PresentationMode
        beforeSrc={primaryPhoto}
        afterSrc={primaryPhoto}
        patientName={caseRecord?.title}
        onExit={() => setPresentationMode(false)}
      />
    )}
    <div
      className={isWorkspaceVariant ? "studio-stage studio-stage--present" : undefined}
      data-testid="present-workspace-shell"
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
        <div className="presentation-action-zone" data-testid="present-action-zone" style={{ display: "flex", gap: 8 }}>
          {primaryPhoto && (
            <>
                        <button
                onClick={() => setPresentationMode(true)}
                data-testid="present-to-patient-button"
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
                Present to Patient
              </button>
                        <button
                onClick={handleExport}
                data-testid="export-png-button"
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
                Export PNG
              </button>
            </>
          )}
          <button
            onClick={() => setActiveView("handoff")}
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
            Open Handoff
          </button>
        </div>
      </div>

      <div className="presentation-meta-bar">
        <span className="shared-status-chip" data-testid="shared-status-chip">
          {primaryPhoto ? "Photo ready" : "Photo needed"}
        </span>
        <span className="shared-status-chip" data-testid="shared-status-chip">
          {variants.length > 0 ? `${variants.length} variant${variants.length === 1 ? "" : "s"}` : "No variants"}
        </span>
      </div>

      {/* Main content */}
      {primaryPhoto ? (
        <div className="presentation-canvas-shell" style={{ flex: 1, minHeight: 0, padding: "16px 24px" }}>
          <BeforeAfterSlider
            beforeSrc={primaryPhoto}
            afterSrc={primaryPhoto}
          />
        </div>
      ) : (
        <div
          className="presentation-canvas-shell presentation-canvas-shell--empty"
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
          No patient photo uploaded. Add a photo in Import for the before/after comparison.
        </div>
      )}

      <TreatmentSummary />

      {isWorkspaceVariant && (
        <div className="studio-bottom-strip" data-testid="present-studio-strip">
          <div className="studio-bottom-strip__section">
            <span className="studio-bottom-strip__label">Presentation</span>
            <span className="studio-bottom-strip__value">
              {primaryPhoto ? "Chairside-ready visuals" : "Awaiting patient photo"}
            </span>
          </div>
          <div className="studio-bottom-strip__section">
            <span className="studio-bottom-strip__label">Variants</span>
            <span className="studio-bottom-strip__value">
              {variants.length > 0 ? `${variants.length} option${variants.length === 1 ? "" : "s"}` : "No alternatives"}
            </span>
          </div>
          <div className="studio-bottom-strip__section">
            <span className="studio-bottom-strip__label">Mode</span>
            <span className="studio-bottom-strip__value">Presentation surface</span>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
