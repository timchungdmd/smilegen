/**
 * AlignmentCalibrationWizard
 *
 * Full-viewport modal with two phases:
 *   Phase 1 (photo) — User clicks reference points on the patient photo
 *   Phase 2 (scan)  — User clicks the corresponding points on the 3D arch scan
 *
 * Features:
 *   - 4 required base reference points (centrals + canines)
 *   - Add extra landmark pairs beyond the base 4
 *   - Undo stack (Cmd/Ctrl+Z + Undo button)
 *   - Navigate / Pick mode toggle for the 3D scan panel
 *   - Apply Calibration (derives midline, smile arc, commissure positions)
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
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

/** The 4 fixed base points — centrals required, canines optional extras. */
export const WIZARD_REF_POINTS: WizardRefPoint[] = [
  { id: "central-R", label: "Right Central", required: true,  color: "#00b4d8" },
  { id: "central-L", label: "Left Central",  required: true,  color: "#4ade80" },
  { id: "canine-R",  label: "Right Canine",  required: false, color: "#f59e0b" },
  { id: "canine-L",  label: "Left Canine",   required: false, color: "#f97316" },
];

/** Color palette for additional custom landmark points. */
const EXTRA_POINT_COLORS = [
  "#c084fc", "#fb7185", "#34d399", "#60a5fa",
  "#fbbf24", "#a78bfa", "#f472b6", "#38bdf8",
];

// ─── State types ─────────────────────────────────────────────────────────────

type Phase = "photo" | "scan";
type ScanMode = "navigate" | "pick";

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
  allPoints,
  points,
  onPhotoClick,
  activePhotoPointId,
  photoOpacity,
}: {
  photoUrl: string;
  allPoints: WizardRefPoint[];
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

  // ── objectFit: contain letterbox compensation ────────────────────────────────
  // The image uses objectFit: contain, so it may not fill the container —
  // black bars appear on sides or top/bottom depending on aspect ratio.
  // We track the natural image size (set when the image loads) and the container
  // size (set via ResizeObserver) to compute the visible photo bounds. When those
  // measurements are not yet available we fall back to a no-letterbox assumption
  // so that tests (which use mock rects and never fire load events) still work.

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rendered image bounds within the container (layout-space, before zoom transform).
  // Returns null when not enough info is available yet.
  const containFit = useMemo(() => {
    const { w: cw, h: ch } = containerSize;
    const { w: nw, h: nh } = naturalSize;
    if (!cw || !ch || !nw || !nh) return null;
    const s = Math.min(cw / nw, ch / nh);
    const w = nw * s;
    const h = nh * s;
    return { offsetX: (cw - w) / 2, offsetY: (ch - h) / 2, w, h };
  }, [naturalSize, containerSize]);

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

      // Undo the zoom/pan transform applied to the inner div to get a position
      // in the container's layout coordinate space.
      const rawX = (e.clientX - rect.left - panX) / zoom;
      const rawY = (e.clientY - rect.top - panY) / zoom;

      let xPercent: number;
      let yPercent: number;

      const { w: nw, h: nh } = naturalSize;
      if (nw > 0 && nh > 0) {
        // Compute objectFit: contain letterbox using the current container rect.
        // Using rect here (not containerSize state) so we always get the live value
        // even if the ResizeObserver hasn't fired yet (e.g. in test environments).
        const s = Math.min(rect.width / nw, rect.height / nh);
        const imgW = nw * s;
        const imgH = nh * s;
        const offsetX = (rect.width - imgW) / 2;
        const offsetY = (rect.height - imgH) / 2;
        xPercent = ((rawX - offsetX) / imgW) * 100;
        yPercent = ((rawY - offsetY) / imgH) * 100;
      } else {
        // Natural size not yet known (image not loaded) — fall back to
        // container-relative coordinates.  This matches the old behaviour and
        // ensures tests (which mock getBoundingClientRect but never fire onLoad)
        // continue to work correctly.
        xPercent = (rawX / rect.width) * 100;
        yPercent = (rawY / rect.height) * 100;
      }

      // Ignore clicks that land outside the photo (letterbox area)
      if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;
      onPhotoClick({ xPercent, yPercent });
    },
    [activePhotoPointId, onPhotoClick, panX, panY, zoom, naturalSize]
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
            onLoad={(e) => {
              const img = e.currentTarget;
              setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
            }}
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

          {/* SVG overlay for markers — positioned over the visible photo area only,
              not the full container. This ensures marker percentages (0-100) map
              exactly to the photo, matching PhotoOverlay's SVG coordinate space.
              Falls back to full-container coverage when containFit is not yet
              computed (e.g. before the image loads or the container is measured). */}
          <svg
            style={containFit ? {
              position: "absolute",
              left: containFit.offsetX,
              top: containFit.offsetY,
              width: containFit.w,
              height: containFit.h,
              pointerEvents: "none",
            } : {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {allPoints.map(refPt => {
              const pt = points[refPt.id];
              if (!pt?.photo) return null;
              const { xPercent, yPercent } = pt.photo;
              return (
                <g key={refPt.id}>
                  {/* Single dot marker with thin outline for contrast */}
                  <circle
                    cx={xPercent} cy={yPercent}
                    r={0.8}
                    fill={refPt.color}
                    stroke="rgba(0,0,0,0.45)"
                    strokeWidth={0.18}
                  />
                  <text
                    x={xPercent + 1.1} y={yPercent - 1.1}
                    fontSize={2}
                    fill={refPt.color}
                    fontWeight="bold"
                    style={{ textShadow: "0 0 2px rgba(0,0,0,0.8)" }}
                  >
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
  const [scanMode, setScanMode] = useState<ScanMode>("navigate");
  const [extraPoints, setExtraPoints] = useState<WizardRefPoint[]>([]);
  const [points, setPoints] = useState<Record<string, PointState>>(
    () => Object.fromEntries(WIZARD_REF_POINTS.map(p => [p.id, { photo: null, scan: null }]))
  );
  const [photoOpacity, setPhotoOpacity] = useState(1);
  const [applied, setApplied] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  // Combined ordered list of all reference points (base + user-added)
  const allPoints = useMemo(
    () => [...WIZARD_REF_POINTS, ...extraPoints],
    [extraPoints]
  );

  const uploadedPhotos = useImportStore(s => s.uploadedPhotos);
  const archScanMesh   = useImportStore(s => s.archScanMesh);
  const firstPhoto     = uploadedPhotos[0];

  const setMidlineX         = useViewportStore(s => s.setMidlineX);
  const setSmileArcY        = useViewportStore(s => s.setSmileArcY);
  const setLeftCommissureX  = useViewportStore(s => s.setLeftCommissureX);
  const setRightCommissureX = useViewportStore(s => s.setRightCommissureX);
  const clearAlignmentMarkers = useViewportStore(s => s.clearAlignmentMarkers);
  const addAlignmentMarker    = useViewportStore(s => s.addAlignmentMarker);
  const setShowOverlay      = useViewportStore(s => s.setShowOverlay);
  const setDesignTab        = useViewportStore(s => s.setDesignTab);

  // ── Derived state ───────────────────────────────────────────────────────────

  const nextPhotoPointId = allPoints.find(p => !points[p.id]?.photo)?.id ?? null;
  const nextScanPointId  = allPoints
    .filter(p => points[p.id]?.photo !== null)
    .find(p => !points[p.id]?.scan)?.id ?? null;

  const requiredPhotosDone = allPoints
    .filter(p => p.required)
    .every(p => points[p.id]?.photo !== null);

  const requiredScansDone = allPoints
    .filter(p => p.required)
    .every(p => points[p.id]?.scan !== null);

  const allPhotoMarkedPointsHaveScan = allPoints
    .filter(p => points[p.id]?.photo !== null)
    .every(p => points[p.id]?.scan !== null);

  const canApply = requiredPhotosDone && requiredScansDone && allPhotoMarkedPointsHaveScan;

  // ── Add / remove extra points ────────────────────────────────────────────────

  const handleAddPoint = useCallback(() => {
    const n = extraPoints.length + 1;
    const newPt: WizardRefPoint = {
      id: `custom-${n}`,
      label: `Landmark ${WIZARD_REF_POINTS.length + n}`,
      required: true,
      color: EXTRA_POINT_COLORS[(n - 1) % EXTRA_POINT_COLORS.length],
    };
    setExtraPoints(prev => [...prev, newPt]);
    setPoints(prev => ({ ...prev, [newPt.id]: { photo: null, scan: null } }));
  }, [extraPoints.length]);

  const handleRemoveExtraPoint = useCallback((id: string) => {
    setExtraPoints(prev => prev.filter(p => p.id !== id));
    setPoints(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setUndoStack(prev => prev.filter(e => e.pointId !== id));
    setApplied(false);
  }, []);

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

    // Persist alignment markers (all photo-marked points)
    clearAlignmentMarkers();
    allPoints.forEach(refPt => {
      const pt = points[refPt.id];
      if (pt?.photo) {
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

    // Activate the photo overlay so it's visible when the user navigates to Simulate
    setShowOverlay(true);
    setDesignTab("photo");
  };

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setExtraPoints([]);
    setPoints(Object.fromEntries(WIZARD_REF_POINTS.map(p => [p.id, { photo: null, scan: null }])));
    setUndoStack([]);
    setPhase("photo");
    setScanMode("navigate");
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
    ? allPoints.find(p => p.id === nextPhotoPointId)!
    : null;
  const currentScanPointDef = nextScanPointId
    ? allPoints.find(p => p.id === nextScanPointId)!
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
              allPoints={allPoints}
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
          {/* Scan panel header with Navigate / Pick mode toggle */}
          <div style={PANEL_HEADER_STYLE}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>3D Arch Scan</span>

            {phase === "scan" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* Navigate / Pick mode toggle */}
                <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border, #2a2f3b)" }}>
                  <button
                    onClick={() => setScanMode("navigate")}
                    title="Navigate: rotate, pan, zoom the scan"
                    style={{
                      padding: "3px 10px",
                      fontSize: 11,
                      border: "none",
                      borderRight: "1px solid var(--border, #2a2f3b)",
                      background: scanMode === "navigate" ? "rgba(0,180,216,0.2)" : "var(--bg-tertiary, #252b38)",
                      color: scanMode === "navigate" ? "var(--accent, #00b4d8)" : "var(--text-muted)",
                      cursor: "pointer",
                      fontWeight: scanMode === "navigate" ? 600 : 400,
                    }}
                  >
                    ⊕ Navigate
                  </button>
                  <button
                    onClick={() => setScanMode("pick")}
                    title="Pick: click the scan to place a reference point"
                    style={{
                      padding: "3px 10px",
                      fontSize: 11,
                      border: "none",
                      background: scanMode === "pick" ? "rgba(0,180,216,0.2)" : "var(--bg-tertiary, #252b38)",
                      color: scanMode === "pick" ? "var(--accent, #00b4d8)" : "var(--text-muted)",
                      cursor: "pointer",
                      fontWeight: scanMode === "pick" ? 600 : 400,
                    }}
                  >
                    ✦ Pick
                  </button>
                </div>

                {scanMode === "pick" && currentScanPointDef && (
                  <span style={{ fontSize: 11, color: currentScanPointDef.color }}>
                    → {currentScanPointDef.label}
                  </span>
                )}
                {scanMode === "navigate" && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Drag to orient scan
                  </span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Complete photo first</span>
            )}
          </div>

          <div style={{ flex: 1, position: "relative" }}>
            {archScanMesh ? (
              <AlignmentScanViewer
                archScanMesh={archScanMesh}
                markers={allPoints
                  .filter(p => points[p.id]?.scan !== null)
                  .map(p => ({ id: p.id, color: p.color, position: points[p.id].scan! }))}
                onPickPoint={handleScanPick}
                isPicking={phase === "scan" && nextScanPointId !== null}
                isNavigating={scanMode === "navigate"}
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
        {/* Checklist + add landmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {allPoints.map(refPt => {
            const pt = points[refPt.id];
            const photoDone = pt?.photo !== null && pt?.photo !== undefined;
            const scanDone  = pt?.scan !== null && pt?.scan !== undefined;
            const isExtra   = !WIZARD_REF_POINTS.some(b => b.id === refPt.id);
            return (
              <div key={refPt.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: photoDone && scanDone ? refPt.color : "var(--border, #2a2f3b)",
                  border: `1px solid ${refPt.color}`,
                  display: "inline-block",
                }} />
                <span style={{ color: photoDone ? "var(--text-primary, #e8eaf0)" : "var(--text-muted)" }}>
                  {refPt.label}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                  {photoDone ? "📷" : "○"}{scanDone ? "🦷" : "○"}
                </span>
                {isExtra && (
                  <button
                    onClick={() => handleRemoveExtraPoint(refPt.id)}
                    title={`Remove ${refPt.label}`}
                    style={{
                      background: "none", border: "none",
                      color: "var(--text-muted)", cursor: "pointer",
                      fontSize: 11, padding: "0 2px", lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* Add landmark button */}
          <button
            onClick={handleAddPoint}
            title="Add an extra reference landmark pair"
            style={{
              padding: "2px 8px",
              background: "var(--bg-tertiary, #252b38)",
              color: "var(--text-muted, #8892a0)",
              border: "1px dashed var(--border, #2a2f3b)",
              borderRadius: 4,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            + Add landmark
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={handleReset} style={BTN_SECONDARY_STYLE}>Reset</button>

          {phase === "photo" && (
            <button
              onClick={() => { setPhase("scan"); setScanMode("navigate"); }}
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
