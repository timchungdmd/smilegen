import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import type { UploadedPhoto } from "../../store/useImportStore";
import { useImportStore } from "../../store/useImportStore";
import { useViewportStore } from "../../store/useViewportStore";
import type { AlignmentMarker } from "../../store/useViewportStore";
import { useDesignStore } from "../../store/useDesignStore";
import type { GeneratedVariantDesign } from "../engine/designEngine";
import {
  buildCalibrationFromGuides,
  projectToothToPhoto,
  type AlignmentCalibration
} from "../alignment/archModel";
import { PhotoOverlayToolbar } from "./PhotoOverlayToolbar";

interface PhotoOverlayProps {
  photo: UploadedPhoto;
  activeVariant: GeneratedVariantDesign | null;
  selectedToothId: string | null;
  onSelectTooth: (toothId: string) => void;
  onMoveTooth: (toothId: string, delta: { deltaX: number; deltaY: number }) => void;
}

type DragType = "tooth" | "midline" | "smileArc" | "gingival" | "commissureL" | "commissureR" | "marker" | "pan";

export function PhotoOverlay({
  photo,
  activeVariant,
  selectedToothId,
  onSelectTooth,
  onMoveTooth
}: PhotoOverlayProps) {
  const showOverlay = useViewportStore((s) => s.showOverlay);
  const overlayOpacity = useViewportStore((s) => s.overlayOpacity);
  const showSmileArc = useViewportStore((s) => s.showSmileArc);
  const showMidline = useViewportStore((s) => s.showMidline);
  const showGingivalLine = useViewportStore((s) => s.showGingivalLine);
  const midlineX = useViewportStore((s) => s.midlineX);
  const smileArcY = useViewportStore((s) => s.smileArcY);
  const gingivalLineY = useViewportStore((s) => s.gingivalLineY);
  const setMidlineX = useViewportStore((s) => s.setMidlineX);
  const setSmileArcY = useViewportStore((s) => s.setSmileArcY);
  const setGingivalLineY = useViewportStore((s) => s.setGingivalLineY);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const archDepthOverride = useDesignStore((s) => s.archDepthOverride);
  const archHalfWidthOverride = useDesignStore((s) => s.archHalfWidthOverride);
  const cameraDistance = useViewportStore((s) => s.cameraDistance);
  const leftCommissureX = useViewportStore((s) => s.leftCommissureX);
  const rightCommissureX = useViewportStore((s) => s.rightCommissureX);
  const setLeftCommissureX = useViewportStore((s) => s.setLeftCommissureX);
  const setRightCommissureX = useViewportStore((s) => s.setRightCommissureX);

  // Pan / Zoom
  const photoZoom = useViewportStore((s) => s.photoZoom);
  const photoPanX = useViewportStore((s) => s.photoPanX);
  const photoPanY = useViewportStore((s) => s.photoPanY);
  const setPhotoZoom = useViewportStore((s) => s.setPhotoZoom);
  const setPhotoPan = useViewportStore((s) => s.setPhotoPan);

  // Alignment markers
  const alignmentMarkers = useViewportStore((s) => s.alignmentMarkers);
  const updateAlignmentMarker = useViewportStore((s) => s.updateAlignmentMarker);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });
  const [imgNatural, setImgNatural] = useState({ w: 600, h: 400 });

  const [dragState, setDragState] = useState<{
    type: DragType;
    id?: string;
    startX: number;
    startY: number;
    startValue: number;
    startPanX?: number;
    startPanY?: number;
  } | null>(null);

  // Measure container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load image natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = photo.url;
  }, [photo.url]);

  // Compute "contain" fit dimensions for the image
  const fit = useMemo(() => {
    const scaleW = containerSize.w / imgNatural.w;
    const scaleH = containerSize.h / imgNatural.h;
    const s = Math.min(scaleW, scaleH);
    const w = imgNatural.w * s;
    const h = imgNatural.h * s;
    return { w, h, offsetX: (containerSize.w - w) / 2, offsetY: (containerSize.h - h) / 2 };
  }, [containerSize, imgNatural]);

  // SVG viewBox matches photo space for consistent coordinate system
  const viewWidth = 600;
  const viewHeight = (imgNatural.h / imgNatural.w) * 600;

  // Build perspective calibration
  const calibration: AlignmentCalibration = useMemo(() => {
    const vw = viewWidth;
    const vh = viewHeight;
    const base = buildCalibrationFromGuides(
      midlineX, smileArcY, vw, vh,
      archScanMesh?.bounds.width,
      archScanMesh ? (archScanMesh.bounds.maxY - archScanMesh.bounds.minY) : undefined,
      leftCommissureX, rightCommissureX
    );
    return {
      ...base,
      archDepth: archDepthOverride ?? base.archDepth,
      archHalfWidth: archHalfWidthOverride ?? base.archHalfWidth,
      cameraDistance
    };
  }, [
    midlineX, smileArcY, viewWidth, viewHeight,
    archScanMesh?.bounds.width, archScanMesh?.bounds.minY, archScanMesh?.bounds.maxY,
    archDepthOverride, archHalfWidthOverride, cameraDistance,
    leftCommissureX, rightCommissureX
  ]);

  const getSvgPoint = useCallback(
    (e: React.MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * viewWidth,
        y: ((e.clientY - rect.top) / rect.height) * viewHeight
      };
    },
    [viewWidth, viewHeight]
  );

  const getClientPoint = useCallback((e: React.MouseEvent) => {
    return { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseDown = useCallback(
    (type: "midline" | "smileArc" | "gingival" | "commissureL" | "commissureR", e: React.MouseEvent) => {
      e.stopPropagation();
      const pt = getSvgPoint(e);
      const startValue =
        type === "midline" ? midlineX
          : type === "smileArc" ? smileArcY
          : type === "commissureL" ? leftCommissureX
          : type === "commissureR" ? rightCommissureX
          : gingivalLineY;
      setDragState({ type, startX: pt.x, startY: pt.y, startValue });
    },
    [getSvgPoint, midlineX, smileArcY, gingivalLineY, leftCommissureX, rightCommissureX]
  );

  const handleMarkerMouseDown = useCallback(
    (markerId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const pt = getSvgPoint(e);
      setDragState({ type: "marker", id: markerId, startX: pt.x, startY: pt.y, startValue: 0 });
    },
    [getSvgPoint]
  );

  const handlePanMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start pan on middle click or when space is held (detected via no other drag)
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        const pt = getClientPoint(e);
        setDragState({ type: "pan", startX: pt.x, startY: pt.y, startValue: 0, startPanX: photoPanX, startPanY: photoPanY });
      }
    },
    [getClientPoint, photoPanX, photoPanY]
  );

  const handleToothMouseDown = useCallback(
    (toothId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const pt = getSvgPoint(e);
      onSelectTooth(toothId);
      setDragState({ type: "tooth", id: toothId, startX: pt.x, startY: pt.y, startValue: 0 });
    },
    [getSvgPoint, onSelectTooth]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) return;

      if (dragState.type === "pan") {
        const pt = getClientPoint(e);
        const dx = pt.x - dragState.startX;
        const dy = pt.y - dragState.startY;
        setPhotoPan(
          (dragState.startPanX ?? 0) + dx,
          (dragState.startPanY ?? 0) + dy
        );
        return;
      }

      const pt = getSvgPoint(e);

      if (dragState.type === "midline") {
        const pct = (pt.x / viewWidth) * 100;
        setMidlineX(Math.max(10, Math.min(90, pct)));
      } else if (dragState.type === "smileArc") {
        const pct = (pt.y / viewHeight) * 100;
        setSmileArcY(Math.max(20, Math.min(80, pct)));
      } else if (dragState.type === "gingival") {
        const pct = (pt.y / viewHeight) * 100;
        setGingivalLineY(Math.max(10, Math.min(70, pct)));
      } else if (dragState.type === "commissureL") {
        const pct = (pt.x / viewWidth) * 100;
        setLeftCommissureX(Math.max(5, Math.min(45, pct)));
      } else if (dragState.type === "commissureR") {
        const pct = (pt.x / viewWidth) * 100;
        setRightCommissureX(Math.max(55, Math.min(95, pct)));
      } else if (dragState.type === "marker" && dragState.id) {
        const pctX = (pt.x / viewWidth) * 100;
        const pctY = (pt.y / viewHeight) * 100;
        updateAlignmentMarker(dragState.id, {
          x: Math.max(2, Math.min(98, pctX)),
          y: Math.max(2, Math.min(98, pctY))
        });
      } else if (dragState.type === "tooth" && dragState.id) {
        const dx = (pt.x - dragState.startX) * 0.05;
        const dy = (pt.y - dragState.startY) * 0.05;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          onMoveTooth(dragState.id, { deltaX: dx, deltaY: -dy });
          setDragState({ ...dragState, startX: pt.x, startY: pt.y });
        }
      }
    },
    [
      dragState, getSvgPoint, getClientPoint,
      viewWidth, viewHeight,
      setMidlineX, setSmileArcY, setGingivalLineY,
      setLeftCommissureX, setRightCommissureX,
      setPhotoPan, updateAlignmentMarker, onMoveTooth
    ]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setPhotoZoom(photoZoom + delta);
    },
    [photoZoom, setPhotoZoom]
  );

  const teeth = activeVariant?.teeth ?? [];

  // Project teeth
  const projectedTeeth = useMemo(
    () =>
      teeth.map((tooth) => ({
        tooth,
        projected: projectToothToPhoto(tooth.positionX, tooth.positionY, calibration)
      })),
    [teeth, calibration]
  );

  // Build arch curve from alignment markers to show the detected arch shape
  const markerArchPath = useMemo(() => {
    if (alignmentMarkers.length < 3) return "";
    const sorted = [...alignmentMarkers].sort((a, b) => a.x - b.x);
    const points = sorted.map((m) => ({
      x: (m.x / 100) * viewWidth,
      y: (m.y / 100) * viewHeight
    }));
    // Catmull-Rom spline through the points
    if (points.length < 2) return "";
    const segments: string[] = [];
    segments.push(`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      segments.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    }
    return segments.join(" ");
  }, [alignmentMarkers, viewWidth, viewHeight]);

  // Smile arc: if teeth exist, trace their incisal edges; otherwise draw from calibration
  const smileArcData = useMemo(() => {
    // When teeth are projected, build a smooth arc through their bottom edges
    if (projectedTeeth.length >= 3) {
      const sorted = [...projectedTeeth].sort((a, b) => a.projected.x - b.projected.x);
      const pts = sorted.map(({ tooth, projected }) => {
        const th = Math.max(tooth.height * calibration.scale * projected.scale * 0.9, 20);
        return { x: projected.x, y: projected.y + th / 2 };
      });
      return { points: pts, centerY: pts[Math.floor(pts.length / 2)].y };
    }

    // No teeth — draw a parabolic arc from the calibration
    const incisalY = calibration.incisalY;
    const lx = (leftCommissureX / 100) * viewWidth;
    const rx = (rightCommissureX / 100) * viewWidth;
    const cx = calibration.midlineX;
    const halfSpan = (rx - lx) / 2;
    const pts: { x: number; y: number }[] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 - 1; // -1 to 1
      const x = cx + t * halfSpan;
      // Parabolic dip: center is lowest (incisalY), edges rise
      const rise = halfSpan * 0.15 * t * t;
      pts.push({ x, y: incisalY - rise });
    }
    return { points: pts, centerY: incisalY };
  }, [projectedTeeth, calibration, leftCommissureX, rightCommissureX, viewWidth]);

  // Build smooth SVG path through smile arc points (Catmull-Rom)
  const smileArcPath = useMemo(() => {
    const pts = smileArcData.points;
    if (pts.length < 2) return "";
    const d: string[] = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    }
    return d.join(" ");
  }, [smileArcData]);

  const markerColor = (type: AlignmentMarker["type"]) =>
    type === "incisal" ? "#06d6a0" : "#ffd166";

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#111",
        borderRadius: "var(--panel-radius)",
        overflow: "hidden",
        cursor: dragState?.type === "pan" ? "grabbing" : "default"
      }}
      onWheel={handleWheel}
      onMouseDown={handlePanMouseDown}
    >
      {/* Photo layer with pan/zoom transform */}
      <div
        style={{
          position: "absolute",
          left: fit.offsetX + photoPanX,
          top: fit.offsetY + photoPanY,
          width: fit.w,
          height: fit.h,
          transform: `scale(${photoZoom})`,
          transformOrigin: "center center",
          transition: dragState ? "none" : "transform 0.15s ease"
        }}
      >
        <img
          src={photo.url}
          alt={photo.name}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            userSelect: "none"
          }}
        />

        {/* SVG overlay on top of photo */}
        {showOverlay && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              cursor: dragState && dragState.type !== "pan" ? "grabbing" : "crosshair"
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Alignment markers arch curve */}
            {markerArchPath && (
              <path
                d={markerArchPath}
                fill="none"
                stroke="#06d6a0"
                strokeWidth="2"
                strokeDasharray="8 4"
                opacity="0.6"
              />
            )}

            {/* Alignment markers */}
            {alignmentMarkers.map((marker) => {
              const mx = (marker.x / 100) * viewWidth;
              const my = (marker.y / 100) * viewHeight;
              const color = markerColor(marker.type);
              return (
                <g
                  key={marker.id}
                  cursor="grab"
                  onMouseDown={(e) => handleMarkerMouseDown(marker.id, e)}
                >
                  {/* Crosshair */}
                  <line x1={mx - 8} y1={my} x2={mx + 8} y2={my} stroke={color} strokeWidth="1" opacity="0.5" />
                  <line x1={mx} y1={my - 8} x2={mx} y2={my + 8} stroke={color} strokeWidth="1" opacity="0.5" />
                  {/* Marker dot */}
                  <circle cx={mx} cy={my} r="5" fill={color} opacity="0.85" stroke="#000" strokeWidth="1" />
                  {/* Label */}
                  <text
                    x={mx}
                    y={my - 10}
                    textAnchor="middle"
                    fill={color}
                    fontSize="9"
                    fontWeight="600"
                  >
                    {marker.type === "incisal" ? `#${marker.toothId}` : `C${marker.toothId}`}
                  </text>
                </g>
              );
            })}

            {/* Smile arc curve */}
            {showSmileArc && smileArcPath && (() => {
              const pts = smileArcData.points;
              const leftPt = pts[0];
              const rightPt = pts[pts.length - 1];
              const midPt = pts[Math.floor(pts.length / 2)];
              return (
                <g>
                  {/* Glow behind the arc */}
                  <path
                    d={smileArcPath}
                    fill="none"
                    stroke="#00b4d8"
                    strokeWidth="5"
                    opacity="0.1"
                    strokeLinecap="round"
                  />
                  {/* Main arc line */}
                  <path
                    d={smileArcPath}
                    fill="none"
                    stroke="#00b4d8"
                    strokeWidth="2"
                    opacity="0.8"
                    strokeLinecap="round"
                  />
                  {/* Center drag handle */}
                  <g cursor="ns-resize" onMouseDown={(e) => handleMouseDown("smileArc", e)}>
                    <circle cx={midPt.x} cy={midPt.y} r="10" fill="transparent" />
                    <circle cx={midPt.x} cy={midPt.y} r="5" fill="#00b4d8" opacity="0.9" stroke="#fff" strokeWidth="1.5" />
                  </g>
                  {/* Left endpoint */}
                  <circle cx={leftPt.x} cy={leftPt.y} r="3" fill="#00b4d8" opacity="0.5" />
                  {/* Right endpoint */}
                  <circle cx={rightPt.x} cy={rightPt.y} r="3" fill="#00b4d8" opacity="0.5" />
                  {/* Label */}
                  <text
                    x={rightPt.x + 8}
                    y={rightPt.y + 4}
                    fill="#00b4d8"
                    fontSize="9"
                    fontWeight="500"
                    opacity="0.7"
                  >
                    Smile Arc
                  </text>
                </g>
              );
            })()}

            {/* Midline guide */}
            {showMidline && (() => {
              const mx = calibration.midlineX;
              const y1 = viewHeight * 0.08;
              const y2 = viewHeight * 0.92;
              return (
                <g>
                  <line x1={mx} y1={y1} x2={mx} y2={y2} stroke="#ef476f" strokeWidth="1" strokeDasharray="6 4" opacity="0.5" />
                  {/* Top handle */}
                  <g cursor="ew-resize" onMouseDown={(e) => handleMouseDown("midline", e)}>
                    <circle cx={mx} cy={y1} r="10" fill="transparent" />
                    <circle cx={mx} cy={y1} r="5" fill="#ef476f" opacity="0.85" stroke="#fff" strokeWidth="1.5" />
                  </g>
                  {/* Bottom handle */}
                  <g cursor="ew-resize" onMouseDown={(e) => handleMouseDown("midline", e)}>
                    <circle cx={mx} cy={y2} r="10" fill="transparent" />
                    <circle cx={mx} cy={y2} r="4" fill="#ef476f" opacity="0.5" />
                  </g>
                  <text x={mx + 8} y={y1 + 4} fill="#ef476f" fontSize="9" fontWeight="500" opacity="0.7">
                    Midline
                  </text>
                </g>
              );
            })()}

            {/* Gingival line guide */}
            {showGingivalLine && (() => {
              const gy = (gingivalLineY / 100) * viewHeight;
              const lx = (leftCommissureX / 100) * viewWidth;
              const rx = (rightCommissureX / 100) * viewWidth;
              return (
                <g>
                  <line x1={lx} y1={gy} x2={rx} y2={gy} stroke="#d4736c" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
                  {/* Left handle */}
                  <g cursor="ns-resize" onMouseDown={(e) => handleMouseDown("gingival", e)}>
                    <circle cx={lx} cy={gy} r="10" fill="transparent" />
                    <circle cx={lx} cy={gy} r="5" fill="#d4736c" opacity="0.85" stroke="#fff" strokeWidth="1.5" />
                  </g>
                  {/* Right endpoint */}
                  <circle cx={rx} cy={gy} r="3" fill="#d4736c" opacity="0.5" />
                  <text x={rx + 8} y={gy + 4} fill="#d4736c" fontSize="9" fontWeight="500" opacity="0.7">
                    Gingival
                  </text>
                </g>
              );
            })()}

            {/* Commissure guides (smile corners) */}
            {(() => {
              const lx = (leftCommissureX / 100) * viewWidth;
              const rx = (rightCommissureX / 100) * viewWidth;
              const cy = calibration.incisalY;
              return (
                <g>
                  {/* Connecting line */}
                  <line x1={lx} y1={cy} x2={rx} y2={cy} stroke="#ffd166" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.25" />
                  {/* Left commissure */}
                  <line x1={lx} y1={cy - 24} x2={lx} y2={cy + 24} stroke="#ffd166" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
                  <g cursor="ew-resize" onMouseDown={(e) => handleMouseDown("commissureL", e)}>
                    <circle cx={lx} cy={cy} r="10" fill="transparent" />
                    <circle cx={lx} cy={cy} r="5" fill="#ffd166" opacity="0.85" stroke="#000" strokeWidth="1" />
                  </g>
                  <text x={lx} y={cy - 28} fill="#ffd166" fontSize="8" fontWeight="600" textAnchor="middle" opacity="0.7">L</text>
                  {/* Right commissure */}
                  <line x1={rx} y1={cy - 24} x2={rx} y2={cy + 24} stroke="#ffd166" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
                  <g cursor="ew-resize" onMouseDown={(e) => handleMouseDown("commissureR", e)}>
                    <circle cx={rx} cy={cy} r="10" fill="transparent" />
                    <circle cx={rx} cy={cy} r="5" fill="#ffd166" opacity="0.85" stroke="#000" strokeWidth="1" />
                  </g>
                  <text x={rx} y={cy - 28} fill="#ffd166" fontSize="8" fontWeight="600" textAnchor="middle" opacity="0.7">R</text>
                </g>
              );
            })()}

            {/* Perspective-projected teeth overlay */}
            {projectedTeeth.map(({ tooth, projected }) => {
              const tw = Math.max(tooth.width * calibration.scale * projected.scale, 14);
              const th = Math.max(tooth.height * calibration.scale * projected.scale * 0.9, 20);
              const isSelected = tooth.toothId === selectedToothId;
              const depthOpacity = 0.7 + 0.3 * projected.scale;

              return (
                <g
                  key={tooth.toothId}
                  opacity={overlayOpacity * depthOpacity}
                  cursor="grab"
                  onMouseDown={(e) => handleToothMouseDown(tooth.toothId, e)}
                >
                  <rect
                    x={projected.x - tw / 2}
                    y={projected.y - th / 2}
                    width={tw}
                    height={th}
                    rx={tw * 0.18}
                    ry={tw * 0.18}
                    fill={isSelected ? "rgba(0, 180, 216, 0.35)" : "rgba(240, 232, 216, 0.25)"}
                    stroke={isSelected ? "#00b4d8" : "rgba(240, 232, 216, 0.5)"}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <text
                    x={projected.x}
                    y={projected.y + 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? "#00b4d8" : "#f0e8d8"}
                    fontSize={Math.max(7, 9 * projected.scale)}
                    fontWeight="600"
                    opacity="0.9"
                  >
                    {tooth.toothId}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Bottom toolbar for alignment markers & zoom */}
      <PhotoOverlayToolbar />

      {/* Marker legend */}
      {alignmentMarkers.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            padding: "6px 10px",
            background: "rgba(15, 20, 25, 0.8)",
            backdropFilter: "blur(8px)",
            borderRadius: 6,
            border: "1px solid var(--border)",
            zIndex: 10,
            fontSize: 10,
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#06d6a0", display: "inline-block" }} />
            <span style={{ color: "#06d6a0" }}>Incisal edge</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffd166", display: "inline-block" }} />
            <span style={{ color: "#ffd166" }}>Cusp tip</span>
          </div>
          <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
            Drag markers to match tooth edges
          </div>
        </div>
      )}
    </div>
  );
}
