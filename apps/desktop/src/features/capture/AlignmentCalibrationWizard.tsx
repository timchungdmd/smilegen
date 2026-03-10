/**
 * AlignmentCalibrationWizard
 *
 * Semi-automated 2-point photo-to-arch alignment.
 *
 * Clinical workflow:
 *   Step 1 — User clicks the midline on the patient photo
 *             → stores an "incisal" AlignmentMarker for tooth "8"
 *             → seeds midlineX and smileArcY in ViewportStore
 *   Step 2 — User clicks the right commissure (corner of mouth)
 *             → stores a commissure marker
 *             → derives scale + arch half-width
 *   Step 3 — "Apply Calibration" calls buildCalibrationFromGuides() and
 *             writes midlineX, smileArcY, leftCommissureX, rightCommissureX
 *             back to ViewportStore so the smile-arc overlay snaps to the photo
 *
 * The photo is displayed as a fully-interactive overlay: the user clicks
 * to place markers; markers can be dragged to refine.
 *
 * Integration:
 *   Render this component inside CaptureView when at least one patient
 *   photo has been uploaded.
 */

import { useState, useRef, useCallback } from "react";
import { useViewportStore } from "../../store/useViewportStore";
import { useImportStore } from "../../store/useImportStore";
import { buildCalibrationFromGuides } from "../alignment/archModel";

// ── Step definitions ──────────────────────────────────────────────────────────

type WizardStep = "midline" | "commissure" | "review";

interface StepDef {
  id: WizardStep;
  number: number;
  label: string;
  instruction: string;
  color: string;
}

const STEPS: StepDef[] = [
  {
    id: "midline",
    number: 1,
    label: "Midline",
    instruction:
      "Click the tip of the upper central incisor (midline) on the photo.",
    color: "#00b4d8",
  },
  {
    id: "commissure",
    number: 2,
    label: "Commissure",
    instruction:
      "Click the right corner of the mouth (right commissure).",
    color: "#f59e0b",
  },
  {
    id: "review",
    number: 3,
    label: "Apply",
    instruction: "Review your placement, then apply the calibration.",
    color: "#34d399",
  },
];

// ── Marker types ──────────────────────────────────────────────────────────────

interface ClickPoint {
  xPercent: number; // 0–100 % of photo width
  yPercent: number; // 0–100 % of photo height
}

// ── Sub-component: step rail ──────────────────────────────────────────────────

function StepRail({
  active,
  midlineSet,
  commissureSet,
}: {
  active: WizardStep;
  midlineSet: boolean;
  commissureSet: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 12 }}>
      {STEPS.map((step, i) => {
        const isActive = active === step.id;
        const isDone =
          step.id === "midline"
            ? midlineSet
            : step.id === "commissure"
            ? commissureSet
            : false;
        return (
          <div
            key={step.id}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              position: "relative",
            }}
          >
            {/* Connector line */}
            {i > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 0,
                  right: "50%",
                  height: 2,
                  background: isDone
                    ? step.color
                    : "var(--border, #2a2f3b)",
                }}
              />
            )}
            {i < STEPS.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: "50%",
                  right: 0,
                  height: 2,
                  background: isDone
                    ? step.color
                    : "var(--border, #2a2f3b)",
                }}
              />
            )}
            {/* Circle */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: isDone
                  ? step.color
                  : isActive
                  ? `${step.color}33`
                  : "var(--bg-tertiary, #252b38)",
                border: `2px solid ${isActive || isDone ? step.color : "var(--border, #2a2f3b)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: isDone ? "#fff" : isActive ? step.color : "var(--text-muted)",
                zIndex: 1,
              }}
            >
              {isDone ? "✓" : step.number}
            </div>
            <span
              style={{
                fontSize: 10,
                color: isActive ? step.color : "var(--text-muted, #8892a0)",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Photo canvas with click + marker rendering ────────────────────────────────

function PhotoCanvas({
  photoUrl,
  midline,
  commissure,
  onMidlineClick,
  onCommissureClick,
  activeStep,
}: {
  photoUrl: string;
  midline: ClickPoint | null;
  commissure: ClickPoint | null;
  onMidlineClick: (p: ClickPoint) => void;
  onCommissureClick: (p: ClickPoint) => void;
  activeStep: WizardStep;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeStep === "review") return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
      const point: ClickPoint = { xPercent, yPercent };
      if (activeStep === "midline") onMidlineClick(point);
      else if (activeStep === "commissure") onCommissureClick(point);
    },
    [activeStep, onMidlineClick, onCommissureClick]
  );

  const cursor =
    activeStep === "review"
      ? "default"
      : activeStep === "midline"
      ? "crosshair"
      : "crosshair";

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        position: "relative",
        width: "100%",
        cursor,
        overflow: "hidden",
        borderRadius: 8,
        border: "1px solid var(--border, #2a2f3b)",
        background: "#000",
        userSelect: "none",
      }}
    >
      <img
        src={photoUrl}
        alt="Patient photo"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          pointerEvents: "none",
        }}
        draggable={false}
      />

      {/* SVG overlay for markers */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Vertical midline guide */}
        {midline && (
          <line
            x1={midline.xPercent}
            y1={0}
            x2={midline.xPercent}
            y2={100}
            stroke="#00b4d8"
            strokeWidth={0.4}
            strokeDasharray="2 2"
            opacity={0.6}
          />
        )}
        {/* Horizontal incisal guide */}
        {midline && (
          <line
            x1={0}
            y1={midline.yPercent}
            x2={100}
            y2={midline.yPercent}
            stroke="#00b4d8"
            strokeWidth={0.4}
            strokeDasharray="2 2"
            opacity={0.6}
          />
        )}

        {/* Midline marker */}
        {midline && (
          <>
            <circle
              cx={midline.xPercent}
              cy={midline.yPercent}
              r={1.5}
              fill="#00b4d8"
            />
            <text
              x={midline.xPercent + 2}
              y={midline.yPercent - 2}
              fontSize={3.5}
              fill="#00b4d8"
              fontWeight="bold"
            >
              Midline
            </text>
          </>
        )}

        {/* Commissure marker */}
        {commissure && (
          <>
            <circle
              cx={commissure.xPercent}
              cy={commissure.yPercent}
              r={1.5}
              fill="#f59e0b"
            />
            <text
              x={commissure.xPercent + 2}
              y={commissure.yPercent - 2}
              fontSize={3.5}
              fill="#f59e0b"
              fontWeight="bold"
            >
              Commissure
            </text>
          </>
        )}

        {/* Scale line between midline and commissure */}
        {midline && commissure && (
          <line
            x1={midline.xPercent}
            y1={midline.yPercent}
            x2={commissure.xPercent}
            y2={commissure.yPercent}
            stroke="#34d399"
            strokeWidth={0.5}
            strokeDasharray="1.5 1.5"
            opacity={0.7}
          />
        )}
      </svg>

      {/* Click hint overlay */}
      {activeStep !== "review" && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.65)",
            color: "#fff",
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 12,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {activeStep === "midline"
            ? "Click to place midline"
            : "Click to place commissure"}
        </div>
      )}
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export interface AlignmentCalibrationWizardProps {
  onClose?: () => void;
}

export function AlignmentCalibrationWizard({
  onClose,
}: AlignmentCalibrationWizardProps) {
  const [activeStep, setActiveStep] = useState<WizardStep>("midline");
  const [midline, setMidline] = useState<ClickPoint | null>(null);
  const [commissure, setCommissure] = useState<ClickPoint | null>(null);
  const [applied, setApplied] = useState(false);

  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const firstPhoto = uploadedPhotos[0];

  // Viewport store actions
  const setMidlineX = useViewportStore((s) => s.setMidlineX);
  const setSmileArcY = useViewportStore((s) => s.setSmileArcY);
  const setLeftCommissureX = useViewportStore((s) => s.setLeftCommissureX);
  const setRightCommissureX = useViewportStore((s) => s.setRightCommissureX);
  const addAlignmentMarker = useViewportStore((s) => s.addAlignmentMarker);
  const clearAlignmentMarkers = useViewportStore((s) => s.clearAlignmentMarkers);

  const handleMidlineClick = useCallback(
    (p: ClickPoint) => {
      setMidline(p);
      setActiveStep("commissure");
    },
    []
  );

  const handleCommissureClick = useCallback(
    (p: ClickPoint) => {
      setCommissure(p);
      setActiveStep("review");
    },
    []
  );

  const handleApply = () => {
    if (!midline || !commissure) return;

    // Derive the calibration (uses commissure as the right commissure).
    // Mirror the right commissure to get left commissure (symmetry assumption).
    const rightCommissureX = commissure.xPercent;
    const leftCommissureX = midline.xPercent - (commissure.xPercent - midline.xPercent);

    const archScanWidth = archScanMesh?.bounds.width;
    const archScanDepth = archScanMesh
      ? archScanMesh.bounds.maxY - archScanMesh.bounds.minY
      : undefined;

    buildCalibrationFromGuides(
      midline.xPercent,
      midline.yPercent,
      100, // viewWidth = 100 (percent-based)
      100, // viewHeight = 100
      archScanWidth,
      archScanDepth,
      Math.max(0, leftCommissureX),
      rightCommissureX
    );

    // Write guide positions to ViewportStore (they drive the photo overlay)
    setMidlineX(midline.xPercent);
    setSmileArcY(midline.yPercent);
    setLeftCommissureX(Math.max(0, leftCommissureX));
    setRightCommissureX(rightCommissureX);

    // Store as alignment markers for persistence
    clearAlignmentMarkers();
    addAlignmentMarker({
      id: "calibration-midline",
      type: "incisal",
      toothId: "8",
      x: midline.xPercent,
      y: midline.yPercent,
    });
    addAlignmentMarker({
      id: "calibration-commissure",
      type: "cusp",
      toothId: "commissure-right",
      x: commissure.xPercent,
      y: commissure.yPercent,
    });

    setApplied(true);
  };

  const handleReset = () => {
    setMidline(null);
    setCommissure(null);
    setActiveStep("midline");
    setApplied(false);
  };

  const activeStepDef = STEPS.find((s) => s.id === activeStep)!;

  if (!firstPhoto) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: "center",
          color: "var(--text-muted, #8892a0)",
          fontSize: 12,
        }}
      >
        Upload a patient photo to start the alignment wizard.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary, #e8eaf0)",
            }}
          >
            Photo Alignment Wizard
          </div>
          <div
            style={{ fontSize: 11, color: "var(--text-muted, #8892a0)", marginTop: 2 }}
          >
            2-point calibration — ties the 3D arch to the photo
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
            title="Close wizard"
          >
            ×
          </button>
        )}
      </div>

      {/* Step rail */}
      <StepRail
        active={activeStep}
        midlineSet={midline !== null}
        commissureSet={commissure !== null}
      />

      {/* Instruction */}
      <div
        style={{
          padding: "8px 12px",
          background: `${activeStepDef.color}15`,
          border: `1px solid ${activeStepDef.color}40`,
          borderRadius: 6,
          fontSize: 12,
          color: activeStepDef.color,
        }}
      >
        <strong>Step {activeStepDef.number}:</strong> {activeStepDef.instruction}
      </div>

      {/* Photo canvas */}
      <PhotoCanvas
        photoUrl={firstPhoto.url}
        midline={midline}
        commissure={commissure}
        onMidlineClick={handleMidlineClick}
        onCommissureClick={handleCommissureClick}
        activeStep={activeStep}
      />

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        {activeStep === "review" && !applied && (
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleApply}
            disabled={!midline || !commissure}
          >
            Apply Calibration
          </button>
        )}
        {applied && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.3)",
              borderRadius: 6,
              fontSize: 11,
              color: "#34d399",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            Calibration applied — smile arc overlay updated
          </div>
        )}
        <button
          className="btn"
          onClick={handleReset}
          title="Start over"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
