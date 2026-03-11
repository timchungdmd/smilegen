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

import { useState, useRef, useCallback, useEffect } from "react";
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

// ── Photo canvas with click + marker rendering + zoom/pan ─────────────────────

function PhotoCanvas({
  photoUrl,
  midline,
  commissure,
  onMidlineClick,
  onCommissureClick,
  activeStep,
  photoOpacity,
}: {
  photoUrl: string;
  midline: ClickPoint | null;
  commissure: ClickPoint | null;
  onMidlineClick: (p: ClickPoint) => void;
  onCommissureClick: (p: ClickPoint) => void;
  activeStep: WizardStep;
  photoOpacity: number;
}) {
  // Outer ref is the clipping viewport — this is what we measure for coordinates
  const outerRef = useRef<HTMLDivElement>(null);

  // Zoom (1–4×) and pan (pixels) state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);

  // Pan gesture tracking (use refs so mouse-move handler never stales)
  const panOriginRef = useRef({ mouseX: 0, mouseY: 0, startPanX: 0, startPanY: 0 });
  // Tracks whether the pointer has moved enough to count as a pan (vs. a click)
  const didPanMoveRef = useRef(false);

  // ── Zoom helpers ──────────────────────────────────────────────────────────

  const applyZoom = useCallback((next: number) => {
    const clamped = Math.max(1, Math.min(4, next));
    setZoom(clamped);
    if (clamped === 1) {
      setPanX(0);
      setPanY(0);
    }
  }, []);

  // Scroll-wheel zoom (must be a native listener to call preventDefault)
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => {
        const next = Math.max(1, Math.min(4, prev + (e.deltaY < 0 ? 0.25 : -0.25)));
        if (next === 1) {
          setPanX(0);
          setPanY(0);
        }
        return next;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── Pan handlers ──────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Middle-click or Alt+left-click starts a pan gesture
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        didPanMoveRef.current = false;
        panOriginRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          startPanX: panX,
          startPanY: panY,
        };
      }
    },
    [panX, panY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPanning) return;
      const dx = e.clientX - panOriginRef.current.mouseX;
      const dy = e.clientY - panOriginRef.current.mouseY;
      // 3-pixel threshold so a click that accidentally drifts doesn't become a pan
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didPanMoveRef.current = true;
      }
      const rect = outerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxPanX = rect.width * (zoom - 1);
      const maxPanY = rect.height * (zoom - 1);
      setPanX(Math.max(-maxPanX, Math.min(0, panOriginRef.current.startPanX + dx)));
      setPanY(Math.max(-maxPanY, Math.min(0, panOriginRef.current.startPanY + dy)));
    },
    [isPanning, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ── Click → place marker ──────────────────────────────────────────────────

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Suppress click that ended a pan drag
      if (didPanMoveRef.current) {
        didPanMoveRef.current = false;
        return;
      }
      if (activeStep === "review") return;
      const rect = outerRef.current?.getBoundingClientRect();
      // Guard: zero dimensions means the container has no layout (e.g. collapsed
      // workspace). Division by zero would produce Infinity coords and place an
      // invisible marker while still advancing the step — silently ignore instead.
      if (!rect || rect.width === 0 || rect.height === 0) return;
      // Convert viewport coordinates to image-relative percentages,
      // accounting for the current pan offset and zoom level.
      const xPercent = ((e.clientX - rect.left - panX) / zoom / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top - panY) / zoom / rect.height) * 100;
      // Ignore clicks that land in the revealed background (outside the photo area)
      if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;
      const point: ClickPoint = { xPercent, yPercent };
      if (activeStep === "midline") onMidlineClick(point);
      else if (activeStep === "commissure") onCommissureClick(point);
    },
    [activeStep, onMidlineClick, onCommissureClick, panX, panY, zoom]
  );

  // ── Cursor ────────────────────────────────────────────────────────────────

  const cursor = isPanning
    ? "grabbing"
    : zoom > 1
    ? "grab"
    : activeStep === "review"
    ? "default"
    : "crosshair";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Clipping viewport — fixed size in layout, clips zoomed content */}
      <div
        ref={outerRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          borderRadius: 8,
          border: "1px solid var(--border, #2a2f3b)",
          background: "#000",
          userSelect: "none",
          cursor,
        }}
      >
        {/* Zoomed + panned inner content — CSS transform doesn't affect layout */}
        <div
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: "top left",
            width: "100%",
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
              opacity: photoOpacity,
              transition: "opacity 0.1s ease",
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
      </div>

      {/* Zoom controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 6,
        }}
      >
        <button
          onClick={() => applyZoom(zoom - 0.5)}
          disabled={zoom <= 1}
          title="Zoom out (or scroll down)"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: "1px solid var(--border, #2a2f3b)",
            background: "var(--bg-secondary, #1a1f2b)",
            color: zoom <= 1 ? "var(--text-muted, #8892a0)" : "var(--text-primary, #e8eaf0)",
            cursor: zoom <= 1 ? "default" : "pointer",
            fontSize: 16,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          −
        </button>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted, #8892a0)",
            minWidth: 34,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {zoom.toFixed(1)}×
        </span>
        <button
          onClick={() => applyZoom(zoom + 0.5)}
          disabled={zoom >= 4}
          title="Zoom in (or scroll up)"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: "1px solid var(--border, #2a2f3b)",
            background: "var(--bg-secondary, #1a1f2b)",
            color: zoom >= 4 ? "var(--text-muted, #8892a0)" : "var(--text-primary, #e8eaf0)",
            cursor: zoom >= 4 ? "default" : "pointer",
            fontSize: 16,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
        {zoom > 1 && (
          <>
            <button
              onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
              title="Reset zoom"
              style={{
                padding: "0 8px",
                height: 26,
                borderRadius: 6,
                border: "1px solid var(--border, #2a2f3b)",
                background: "var(--bg-secondary, #1a1f2b)",
                color: "var(--text-muted, #8892a0)",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Reset
            </button>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted, #8892a0)",
                marginLeft: 2,
              }}
            >
              Alt+drag to pan
            </span>
          </>
        )}
      </div>
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
  const [photoOpacity, setPhotoOpacity] = useState(1);

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

      {/* Photo opacity slider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted, #8892a0)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Photo opacity
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={photoOpacity}
          onChange={(e) => setPhotoOpacity(Number(e.target.value))}
          style={{ flex: 1, accentColor: "var(--accent, #00b4d8)", cursor: "pointer" }}
          aria-label="Photo opacity"
        />
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted, #8892a0)",
            minWidth: 30,
            textAlign: "right",
          }}
        >
          {Math.round(photoOpacity * 100)}%
        </span>
      </div>

      {/* Photo canvas */}
      <PhotoCanvas
        photoUrl={firstPhoto.url}
        midline={midline}
        commissure={commissure}
        onMidlineClick={handleMidlineClick}
        onCommissureClick={handleCommissureClick}
        activeStep={activeStep}
        photoOpacity={photoOpacity}
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
