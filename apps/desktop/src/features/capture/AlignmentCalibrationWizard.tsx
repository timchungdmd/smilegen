/**
 * AlignmentCalibrationWizard
 *
 * Full-viewport modal with two phases:
 *   Phase 1 (photo) — User clicks reference points on the patient photo
 *   Phase 2 (scan)  — User clicks the corresponding points on the 3D arch scan
 *
 * Features:
 *   - Reference point checklist (Right/Left Central + optional Right/Left Canine)
 *   - Undo stack (Cmd/Ctrl+Z + Undo button)
 *   - Apply Calibration (derives midline, smile arc, commissure positions)
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useImportStore } from "../../store/useImportStore";
import { useViewportStore } from "../../store/useViewportStore";
import {
  buildCalibrationFromIncisalPoints,
  IncisalReferencePoint,
} from "../alignment/archModel";
import { AlignmentScanViewer } from "./AlignmentScanViewer";

// ─── Reference point definitions ─────────────────────────────────────────────

export interface WizardRefPoint {
  id: string;
  label: string;
  required: boolean;
  color: string;
}

export const WIZARD_REF_POINTS: WizardRefPoint[] = [
  { id: "central-R", label: "Right Central", required: true,  color: "#00b4d8" },
  { id: "central-L", label: "Left Central",  required: true,  color: "#4ade80" },
  { id: "canine-R",  label: "Right Canine",  required: false, color: "#f59e0b" },
  { id: "canine-L",  label: "Left Canine",   required: false, color: "#f97316" },
];

// ─── State types ─────────────────────────────────────────────────────────────

type Phase = "photo" | "scan";

interface PointCoords2D { xPercent: number; yPercent: number; }
interface PointCoords3D { x: number; y: number; z: number; }

interface PointState {
  photo: PointCoords2D | null;
  scan:  PointCoords3D | null;
}

type UndoEntry = { phase: "photo" | "scan"; pointId: string };

// ─── Style constants ──────────────────────────────────────────────────────────

const MODAL_OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "var(--bg-primary, #111827)",
  display: "flex",
  flexDirection: "column",
};
const TOP_BAR_STYLE: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "8px 16px",
  borderBottom: "1px solid var(--border, #2a2f3b)",
  background: "var(--bg-secondary, #1a1f2b)",
  flexShrink: 0,
  height: 48,
};
const PANEL_HEADER_STYLE: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "6px 12px",
  borderBottom: "1px solid var(--border, #2a2f3b)",
  background: "var(--bg-secondary, #1a1f2b)",
  flexShrink: 0,
};
const BOTTOM_BAR_STYLE: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "10px 16px",
  borderTop: "1px solid var(--border, #2a2f3b)",
  background: "var(--bg-secondary, #1a1f2b)",
  flexShrink: 0,
  gap: 12,
  flexWrap: "wrap",
};
const BTN_PRIMARY_STYLE: React.CSSProperties = {
  padding: "7px 16px", background: "var(--accent, #00b4d8)",
  color: "#fff", border: "none", borderRadius: 6,
  fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const BTN_SECONDARY_STYLE: React.CSSProperties = {
  padding: "7px 12px", background: "var(--bg-tertiary, #252b38)",
  color: "var(--text-muted, #8892a0)",
  border: "1px solid var(--border, #2a2f3b)",
  borderRadius: 6, fontSize: 12, cursor: "pointer",
};
const BTN_DISABLED_STYLE: React.CSSProperties = {
  ...BTN_PRIMARY_STYLE, opacity: 0.4, cursor: "not-allowed",
};
const BTN_CLOSE_STYLE: React.CSSProperties = {
  background: "none", border: "none",
  color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 4,
};
const SUCCESS_BANNER_STYLE: React.CSSProperties = {
  padding: "7px 14px", background: "rgba(52,211,153,0.1)",
  border: "1px solid rgba(52,211,153,0.3)",
  borderRadius: 6, fontSize: 12, color: "#34d399",
};

// ─── PhaseChip helper ─────────────────────────────────────────────────────────

function PhaseChip({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span style={{
      padding: "3px 10px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: active ? 600 : 400,
      background: done ? "rgba(52,211,153,0.15)" : active ? "rgba(0,180,216,0.15)" : "transparent",
      color: done ? "#34d399" : active ? "var(--accent, #00b4d8)" : "var(--text-muted)",
      border: `1px solid ${done ? "rgba(52,211,153,0.3)" : active ? "rgba(0,180,216,0.3)" : "var(--border,#2a2f3b)"}`,
    }}>
      {done ? "✓ " : ""}{label}
    </span>
  );
}

// ─── PhotoCanvas (keeps existing zoom/pan logic, updated markers/props) ───────

function PhotoCanvas({
  photoUrl,
  points,
  onPhotoClick,
  activePhotoPointId,
  photoOpacity,
}: {
  photoUrl: string;
  points: Record<string, PointState>;
  onPhotoClick: (p: PointCoords2D) => void;
  activePhotoPointId: string | null;  // null = locked (scan phase)
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

  // ── Zoom helpers ────────────────────────────────────────────────────────────

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

  // ── Pan handlers ────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Middle-click or plain left-click starts a pan gesture
      if (e.button === 1 || e.button === 0) {
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

  // ── Click → place marker ────────────────────────────────────────────────────

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Suppress click that ended a pan drag
      if (didPanMoveRef.current) {
        didPanMoveRef.current = false;
        return;
      }
      if (!activePhotoPointId) return;  // locked in scan phase
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
      onPhotoClick({ xPercent, yPercent });
    },
    [activePhotoPointId, onPhotoClick, panX, panY, zoom]
  );

  // ── Cursor ──────────────────────────────────────────────────────────────────

  const cursor = isPanning
    ? "grabbing"
    : zoom > 1
    ? "grab"
    : activePhotoPointId
    ? "crosshair"
    : "default";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Clipping viewport — fixed size in layout, clips zoomed content */}
      <div
        ref={outerRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          overflow: "hidden",
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
            height: "100%",
          }}
        >
          <img
            src={photoUrl}
            alt="Patient photo"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
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
            {WIZARD_REF_POINTS.map(refPt => {
              const pt = points[refPt.id];
              if (!pt?.photo) return null;
              const { xPercent, yPercent } = pt.photo;
              return (
                <g key={refPt.id}>
                  <circle cx={xPercent} cy={yPercent} r={1.5} fill={refPt.color} />
                  <text x={xPercent + 2} y={yPercent - 2} fontSize={3} fill={refPt.color} fontWeight="bold">
                    {refPt.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Zoom controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "4px 0",
          flexShrink: 0,
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
        )}
      </div>
    </div>
  );
}

// ─── Main AlignmentCalibrationWizard component ───────────────────────────────

export interface AlignmentCalibrationWizardProps {
  onClose?: () => void;
}

export function AlignmentCalibrationWizard({ onClose }: AlignmentCalibrationWizardProps) {
  const [phase, setPhase] = useState<Phase>("photo");
  const [points, setPoints] = useState<Record<string, PointState>>(
    () => Object.fromEntries(WIZARD_REF_POINTS.map(p => [p.id, { photo: null, scan: null }]))
  );
  const [photoOpacity, setPhotoOpacity] = useState(1);
  const [applied, setApplied] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const uploadedPhotos = useImportStore(s => s.uploadedPhotos);
  const archScanMesh   = useImportStore(s => s.archScanMesh);
  const firstPhoto     = uploadedPhotos[0];

  const setMidlineX         = useViewportStore(s => s.setMidlineX);
  const setSmileArcY        = useViewportStore(s => s.setSmileArcY);
  const setLeftCommissureX  = useViewportStore(s => s.setLeftCommissureX);
  const setRightCommissureX = useViewportStore(s => s.setRightCommissureX);
  const clearAlignmentMarkers = useViewportStore(s => s.clearAlignmentMarkers);
  const addAlignmentMarker    = useViewportStore(s => s.addAlignmentMarker);

  // ── Derived state ───────────────────────────────────────────────────────────

  const nextPhotoPointId = WIZARD_REF_POINTS.find(p => !points[p.id].photo)?.id ?? null;
  const nextScanPointId  = WIZARD_REF_POINTS
    .filter(p => points[p.id].photo !== null)
    .find(p => !points[p.id].scan)?.id ?? null;

  const requiredPhotosDone = WIZARD_REF_POINTS
    .filter(p => p.required)
    .every(p => points[p.id].photo !== null);

  const requiredScansDone = WIZARD_REF_POINTS
    .filter(p => p.required)
    .every(p => points[p.id].scan !== null);

  const allPhotoMarkedPointsHaveScan = WIZARD_REF_POINTS
    .filter(p => points[p.id].photo !== null)
    .every(p => points[p.id].scan !== null);

  const canApply = requiredPhotosDone && requiredScansDone && allPhotoMarkedPointsHaveScan;

  // ── Undo ────────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setPoints(pts => ({
        ...pts,
        [last.pointId]: {
          ...pts[last.pointId],
          [last.phase]: null,
        },
      }));
      if (last.phase === "scan") setPhase("scan");
      if (last.phase === "photo") setPhase("photo");
      setApplied(false);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo]);

  // ── Photo click ─────────────────────────────────────────────────────────────

  const handlePhotoClick = useCallback((p: PointCoords2D) => {
    if (phase !== "photo" || !nextPhotoPointId) return;
    setPoints(pts => ({
      ...pts,
      [nextPhotoPointId]: { ...pts[nextPhotoPointId], photo: p },
    }));
    setUndoStack(prev => [...prev, { phase: "photo", pointId: nextPhotoPointId }]);
  }, [phase, nextPhotoPointId]);

  // ── Scan pick ───────────────────────────────────────────────────────────────

  const handleScanPick = useCallback((p: PointCoords3D) => {
    if (phase !== "scan" || !nextScanPointId) return;
    setPoints(pts => ({
      ...pts,
      [nextScanPointId]: { ...pts[nextScanPointId], scan: p },
    }));
    setUndoStack(prev => [...prev, { phase: "scan", pointId: nextScanPointId }]);
  }, [phase, nextScanPointId]);

  // ── Apply calibration ───────────────────────────────────────────────────────

  const handleApply = () => {
    const rPt = points["central-R"];
    const lPt = points["central-L"];
    if (!rPt.photo || !lPt.photo || !rPt.scan || !lPt.scan) return;

    const centralR: IncisalReferencePoint = {
      photoX: rPt.photo.xPercent, photoY: rPt.photo.yPercent,
      scanX: rPt.scan.x, scanY: rPt.scan.y, scanZ: rPt.scan.z,
    };
    const centralL: IncisalReferencePoint = {
      photoX: lPt.photo.xPercent, photoY: lPt.photo.yPercent,
      scanX: lPt.scan.x, scanY: lPt.scan.y, scanZ: lPt.scan.z,
    };

    const archScanWidth = archScanMesh?.bounds.width;
    const archScanDepth = archScanMesh
      ? archScanMesh.bounds.maxY - archScanMesh.bounds.minY
      : undefined;

    const cal = buildCalibrationFromIncisalPoints(
      centralR, centralL, 100, 100, archScanWidth, archScanDepth
    );

    // Derive commissure store positions from calibration
    const commissureOffsetPercent = cal.archHalfWidth * cal.scale;
    const midlinePercent = cal.midlineX;    // viewWidth=100 so midlineX IS the percent
    const incisalPercent = cal.incisalY;    // viewHeight=100 so incisalY IS the percent

    setMidlineX(midlinePercent);
    setSmileArcY(incisalPercent);
    setLeftCommissureX(Math.max(0, midlinePercent - commissureOffsetPercent));
    setRightCommissureX(Math.min(100, midlinePercent + commissureOffsetPercent));

    // Persist alignment markers
    clearAlignmentMarkers();
    WIZARD_REF_POINTS.forEach(refPt => {
      const pt = points[refPt.id];
      if (pt.photo) {
        addAlignmentMarker({
          id: `alignment-${refPt.id}`,
          type: refPt.id.startsWith("central") ? "incisal" : "cusp",
          toothId: refPt.id,
          x: pt.photo.xPercent,
          y: pt.photo.yPercent,
        });
      }
    });

    setApplied(true);
  };

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setPoints(Object.fromEntries(WIZARD_REF_POINTS.map(p => [p.id, { photo: null, scan: null }])));
    setUndoStack([]);
    setPhase("photo");
    setApplied(false);
  };

  // ── Guard: no photo ─────────────────────────────────────────────────────────

  if (!firstPhoto) {
    return (
      <div style={MODAL_OVERLAY_STYLE} data-testid="alignment-modal">
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
          <p>Upload a patient photo to start the alignment wizard.</p>
          <button onClick={onClose} style={BTN_SECONDARY_STYLE}>Close</button>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const currentPhotoPointDef = nextPhotoPointId
    ? WIZARD_REF_POINTS.find(p => p.id === nextPhotoPointId)!
    : null;
  const currentScanPointDef = nextScanPointId
    ? WIZARD_REF_POINTS.find(p => p.id === nextScanPointId)!
    : null;

  return (
    <div style={MODAL_OVERLAY_STYLE} data-testid="alignment-modal">
      {/* Top bar */}
      <div style={TOP_BAR_STYLE}>
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          style={BTN_SECONDARY_STYLE}
          title="Undo last point (Cmd/Ctrl+Z)"
        >
          ↩ Undo
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PhaseChip label="Phase 1: Mark Photo" active={phase === "photo"} done={phase === "scan"} />
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>──</span>
          <PhaseChip label="Phase 2: Mark Scan"  active={phase === "scan"}  done={applied} />
        </div>

        <button onClick={onClose} style={BTN_CLOSE_STYLE} title="Close wizard">✕</button>
      </div>

      {/* Two panels */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT: Photo panel */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--border, #2a2f3b)",
          overflow: "hidden",
          opacity: phase === "scan" ? 0.7 : 1,
          transition: "opacity 0.2s",
        }}>
          <div style={PANEL_HEADER_STYLE}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>Patient Photo</span>
            {phase === "photo" && currentPhotoPointDef && (
              <span style={{ fontSize: 11, color: currentPhotoPointDef.color }}>
                → Click: {currentPhotoPointDef.label}
              </span>
            )}
          </div>
          <div style={{ padding: "4px 12px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Opacity</span>
            <input
              type="range" min={0} max={1} step={0.05}
              value={photoOpacity}
              onChange={e => setPhotoOpacity(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--accent, #00b4d8)" }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 30, textAlign: "right" }}>
              {Math.round(photoOpacity * 100)}%
            </span>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <PhotoCanvas
              photoUrl={firstPhoto.url}
              points={points}
              onPhotoClick={handlePhotoClick}
              activePhotoPointId={phase === "photo" ? nextPhotoPointId : null}
              photoOpacity={photoOpacity}
            />
          </div>
        </div>

        {/* RIGHT: Scan panel */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          overflow: "hidden",
          opacity: phase === "photo" ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}>
          <div style={PANEL_HEADER_STYLE}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>3D Arch Scan</span>
            {phase === "scan" && currentScanPointDef && (
              <span style={{ fontSize: 11, color: currentScanPointDef.color }}>
                → Click: {currentScanPointDef.label}
              </span>
            )}
            {phase === "photo" && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Complete photo first</span>
            )}
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            {archScanMesh ? (
              <AlignmentScanViewer
                archScanMesh={archScanMesh}
                markers={WIZARD_REF_POINTS
                  .filter(p => points[p.id].scan !== null)
                  .map(p => ({ id: p.id, color: p.color, position: points[p.id].scan! }))}
                onPickPoint={handleScanPick}
                isPicking={phase === "scan" && nextScanPointId !== null}
              />
            ) : (
              <div style={{ padding: 24, color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
                No arch scan loaded. Upload a scan to enable scan alignment.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={BOTTOM_BAR_STYLE}>
        {/* Checklist */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {WIZARD_REF_POINTS.map(refPt => {
            const pt = points[refPt.id];
            const photoDone = pt.photo !== null;
            const scanDone  = pt.scan !== null;
            return (
              <div key={refPt.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: photoDone && scanDone ? refPt.color : "var(--border, #2a2f3b)",
                  border: `1px solid ${refPt.color}`,
                  display: "inline-block",
                }} />
                <span style={{ color: photoDone ? "var(--text-primary, #e8eaf0)" : "var(--text-muted)" }}>
                  {refPt.label}{!refPt.required && " (opt)"}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                  {photoDone ? "📷" : "○"}{scanDone ? "🦷" : "○"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={handleReset} style={BTN_SECONDARY_STYLE}>Reset</button>

          {phase === "photo" && (
            <button
              onClick={() => setPhase("scan")}
              disabled={!requiredPhotosDone}
              style={requiredPhotosDone ? BTN_PRIMARY_STYLE : BTN_DISABLED_STYLE}
              data-testid="next-btn"
            >
              Next: Mark on Scan →
            </button>
          )}

          {phase === "scan" && !applied && (
            <button
              onClick={handleApply}
              disabled={!canApply}
              style={canApply ? BTN_PRIMARY_STYLE : BTN_DISABLED_STYLE}
              data-testid="apply-btn"
            >
              Apply Calibration
            </button>
          )}

          {applied && (
            <div style={SUCCESS_BANNER_STYLE}>✓ Calibration applied</div>
          )}
        </div>
      </div>
    </div>
  );
}
