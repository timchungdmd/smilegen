import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useAlignmentStore as useAlignmentStoreRaw } from "../../store/useAlignmentStore";
import type { UploadedPhoto } from "../../store/useImportStore";
import { useImportStore } from "../../store/useImportStore";
import { useViewportStore } from "../../store/useViewportStore";
import { useAlignmentStore } from "../../store/useAlignmentStore";
import type { AlignmentLandmarkId } from "../../store/useAlignmentStore";
import { useDesignStore } from "../../store/useDesignStore";
import type { GeneratedVariantDesign } from "../engine/designEngine";
import {
  buildCalibrationFromGuides,
  projectToothToPhoto,
  type AlignmentCalibration
} from "../alignment/archModel";
import {
  computeScanOverlayTransform,
  applyAdjustmentDelta,
  toSvgTransform,
  procrustesProject,
} from "../alignment/scanOverlayAlignment";
import { project3Dto2D, applyTransform } from "../alignment/projection";
import type { ProjectionParams } from "../alignment/alignmentTypes";
import { PhotoOverlayToolbar } from "./PhotoOverlayToolbar";
import { AlignmentMarkers } from "./AlignmentMarkers";
import { OverlayGuides } from "./OverlayGuides";
import { shouldEnablePhotoOverlayPointerEvents } from "./photoOverlayInteractionMode";
import { applySmileArcOffsets } from "./smileArcOffsets";

interface PhotoOverlayProps {
  photo: UploadedPhoto;
  activeVariant: GeneratedVariantDesign | null;
  selectedToothId: string | null;
  onSelectTooth: (toothId: string) => void;
  onMoveTooth: (toothId: string, delta: { deltaX: number; deltaY: number }) => void;
}

type DragType =
  | "tooth"
  | "midline"
  | "smileArc"
  | "smileArcLeft"
  | "smileArcRight"
  | "gingival"
  | "commissureL"
  | "commissureR"
  | "marker"
  | "pan"
  | "overlay-pan";

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
  const smileArcLeftOffset = useViewportStore((s) => s.smileArcLeftOffset);
  const smileArcRightOffset = useViewportStore((s) => s.smileArcRightOffset);
  const gingivalLineY = useViewportStore((s) => s.gingivalLineY);
  const setMidlineX = useViewportStore((s) => s.setMidlineX);
  const setSmileArcY = useViewportStore((s) => s.setSmileArcY);
  const setSmileArcLeftOffset = useViewportStore((s) => s.setSmileArcLeftOffset);
  const setSmileArcRightOffset = useViewportStore((s) => s.setSmileArcRightOffset);
  const setGingivalLineY = useViewportStore((s) => s.setGingivalLineY);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const mouthMaskUrl = useImportStore((s) => s.mouthMaskUrl);
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
  const designTab = useViewportStore((s) => s.designTab);

  // Alignment markers
  const alignmentMarkers = useViewportStore((s) => s.alignmentMarkers);
  const updateAlignmentMarker = useViewportStore((s) => s.updateAlignmentMarker);

  // Alignment store
  const isAlignmentMode = useAlignmentStore((s) => s.isAlignmentMode);
  const activeSurface = useAlignmentStore((s) => s.activeSurface);
  const activeLandmarkId = useAlignmentStore((s) => s.activeLandmarkId);
  const landmarks = useAlignmentStore((s) => s.landmarks);
  const adjustmentDelta = useAlignmentStore((s) => s.adjustmentDelta);
  const setPhotoLandmark = useAlignmentStore((s) => s.setPhotoLandmark);
  const setActiveSurface = useAlignmentStore((s) => s.setActiveSurface);
  const setScanInteractionMode = useAlignmentStore((s) => s.setScanInteractionMode);
  const applyAdjustment = useAlignmentStore((s) => s.applyAdjustment);
  const nudgeScale = useAlignmentStore((s) => s.nudgeScale);
  const setOverlayTransform = useAlignmentStore((s) => s.setOverlayTransform);
  const alignmentResult = useAlignmentStore((s) => s.alignmentResult);
  const setViewDimensions = useAlignmentStore((s) => s.setViewDimensions);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const overlayGroupRef = useRef<SVGGElement>(null);
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
const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
const [draggingLandmarkId, setDraggingLandmarkId] = useState<AlignmentLandmarkId | null>(null);

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

  // Sync view dimensions to alignment store
  useEffect(() => {
    setViewDimensions(viewWidth, viewHeight);
  }, [viewWidth, viewHeight, setViewDimensions]);

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

  const handleGuideMouseDown = useCallback(
    (
      type:
        | "midline"
        | "smileArc"
        | "smileArcLeft"
        | "smileArcRight"
        | "gingival"
        | "commissureL"
        | "commissureR",
      e: React.MouseEvent<SVGElement>
    ) => {
      if (isAlignmentMode) return;
      e.stopPropagation();
      const pt = getSvgPoint(e as unknown as React.MouseEvent);
      const startValue =
        type === "midline" ? midlineX
          : type === "smileArc" ? smileArcY
          : type === "smileArcLeft" ? smileArcLeftOffset
          : type === "smileArcRight" ? smileArcRightOffset
          : type === "commissureL" ? leftCommissureX
          : type === "commissureR" ? rightCommissureX
          : gingivalLineY;
      setDragState({ type, startX: pt.x, startY: pt.y, startValue });
    },
    [
      getSvgPoint,
      isAlignmentMode,
      midlineX,
      smileArcY,
      smileArcLeftOffset,
      smileArcRightOffset,
      gingivalLineY,
      leftCommissureX,
      rightCommissureX,
    ]
  );

  const handleMarkerMouseDown = useCallback(
    (markerId: string, e: React.MouseEvent<SVGGElement>) => {
      e.stopPropagation();
      const pt = getSvgPoint(e as unknown as React.MouseEvent);
      setDragState({ type: "marker", id: markerId, startX: pt.x, startY: pt.y, startValue: 0 });
    },
    [getSvgPoint]
  );

  const handlePanMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle-click, Alt+Left, or Shift+Left starts a pan gesture
      if (e.button === 1 || (e.button === 0 && (e.altKey || e.shiftKey))) {
        e.preventDefault();
        const pt = getClientPoint(e);
        setDragState({ type: "pan", startX: pt.x, startY: pt.y, startValue: 0, startPanX: photoPanX, startPanY: photoPanY });
      }
    },
    [getClientPoint, photoPanX, photoPanY]
  );

  const handleToothMouseDown = useCallback(
    (toothId: string, e: React.MouseEvent) => {
      if (isAlignmentMode) return;
      e.stopPropagation();
      const pt = getSvgPoint(e);
      onSelectTooth(toothId);
      setDragState({ type: "tooth", id: toothId, startX: pt.x, startY: pt.y, startValue: 0 });
    },
    [getSvgPoint, isAlignmentMode, onSelectTooth]
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

      if (dragState.type === "overlay-pan") {
        const dx = pt.x - dragState.startX;
        const dy = pt.y - dragState.startY;
        applyAdjustment({
          translateX: (dragState.startPanX ?? 0) + dx,
          translateY: (dragState.startPanY ?? 0) + dy
        });
        return;
      }

      if (dragState.type === "midline") {
        setMidlineX(Math.max(2, Math.min(98, (pt.x / viewWidth) * 100)));
      } else if (dragState.type === "smileArc") {
        setSmileArcY(Math.max(10, Math.min(90, (pt.y / viewHeight) * 100)));
      } else if (dragState.type === "smileArcLeft") {
        const deltaPercent = ((pt.y - dragState.startY) / viewHeight) * 100;
        setSmileArcLeftOffset(Math.max(-20, Math.min(20, dragState.startValue + deltaPercent)));
      } else if (dragState.type === "smileArcRight") {
        const deltaPercent = ((pt.y - dragState.startY) / viewHeight) * 100;
        setSmileArcRightOffset(Math.max(-20, Math.min(20, dragState.startValue + deltaPercent)));
      } else if (dragState.type === "gingival") {
        setGingivalLineY(Math.max(5, Math.min(95, (pt.y / viewHeight) * 100)));
      } else if (dragState.type === "commissureL") {
        setLeftCommissureX(Math.max(1, Math.min(49, (pt.x / viewWidth) * 100)));
      } else if (dragState.type === "commissureR") {
        setRightCommissureX(Math.max(51, Math.min(99, (pt.x / viewWidth) * 100)));
      } else if (dragState.type === "marker" && dragState.id) {
        updateAlignmentMarker(dragState.id, {
          x: Math.max(2, Math.min(98, (pt.x / viewWidth) * 100)),
          y: Math.max(2, Math.min(98, (pt.y / viewHeight) * 100))
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
      setSmileArcLeftOffset, setSmileArcRightOffset,
      setLeftCommissureX, setRightCommissureX,
      setPhotoPan, updateAlignmentMarker, onMoveTooth
    ]
  );

  const handleMouseUp = useCallback(() => setDragState(null), []);
const handleLandmarkDragStart = useCallback((id: AlignmentLandmarkId) => (e: React.MouseEvent) => {
  e.stopPropagation();
  setDraggingLandmarkId(id);
}, []);
const handleLandmarkDrag = useCallback(
  (e: React.MouseEvent) => {
    if (!draggingLandmarkId) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    setPhotoLandmark(draggingLandmarkId, svgPoint.x / viewWidth, svgPoint.y / viewHeight);
  },
  [draggingLandmarkId, viewWidth, viewHeight, setPhotoLandmark]
);
const handleLandmarkDragEnd = useCallback(() => {
  setDraggingLandmarkId(null);
}, []);

  const photoZoomRef = useRef(photoZoom);
  photoZoomRef.current = photoZoom;

  const handleZoom = useCallback(
    (delta: number) => {
      const oldZ = photoZoomRef.current;
      const newZ = Math.max(0.1, Math.min(10, oldZ + delta));
      if (oldZ === newZ) return;
      setPhotoZoom(newZ);
    },
    [setPhotoZoom]
  );

  const teeth = activeVariant?.teeth ?? [];
  const activeLandmark = landmarks.find((landmark) => landmark.id === activeLandmarkId) ?? null;
  const completedPairCount = landmarks.filter(
    (landmark) => landmark.photoCoord !== null && landmark.modelCoord !== null
  ).length;
  const activeLandmarkTarget = activeLandmark?.photoCoord ?? (activeLandmark ? { x: 0.5, y: 0.5 } : null);
  const photoLayerOpacity = Math.max(0.18, Math.min(0.72, overlayOpacity * 0.72));
  const projectedOverlayOpacity = Math.max(0.3, overlayOpacity);

  // ── Procrustes overlay transform (auto-solved whenever landmarks change) ──
  const baseOverlayTransform = useMemo(() => {
    return computeScanOverlayTransform(landmarks, viewWidth, viewHeight);
  }, [landmarks, viewWidth, viewHeight]);

  // Persist solved transform to store — guarded by value equality to prevent
  // spurious downstream re-renders from new object references.
  useEffect(() => {
    const current = useAlignmentStoreRaw.getState().overlayTransform;
    if (
      baseOverlayTransform === null && current === null
    ) return;
    if (
      current !== null &&
      baseOverlayTransform !== null &&
      current.scale === baseOverlayTransform.scale &&
      current.rotation === baseOverlayTransform.rotation &&
      current.translateX === baseOverlayTransform.translateX &&
      current.translateY === baseOverlayTransform.translateY &&
      current.residualError === baseOverlayTransform.residualError &&
      current.wasFlipCorrected === baseOverlayTransform.wasFlipCorrected
    ) return;
    setOverlayTransform(baseOverlayTransform);
  }, [baseOverlayTransform, setOverlayTransform]);

  // Compose base transform + user fine-tune delta
  const effectiveOverlayTransform = useMemo(() => {
    if (!baseOverlayTransform) return null;
    return applyAdjustmentDelta(baseOverlayTransform, adjustmentDelta);
  }, [baseOverlayTransform, adjustmentDelta]);

  const overlayTransformString = useMemo(
    () => (effectiveOverlayTransform ? toSvgTransform(effectiveOverlayTransform) : null),
    [effectiveOverlayTransform]
  );
  // Scroll-to-scale: non-passive native wheel listener on the scan overlay group.
  // Uses nudgeScale for multiplicative accumulation (1.02 × 1.02 × ...) instead
  // of replacement, so scrolling compounds correctly across multiple ticks.
  useEffect(() => {
    const el = overlayGroupRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const step = e.deltaY > 0 ? -0.02 : 0.02;
      nudgeScale(1 + step);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [nudgeScale]);

  const overlayPointerEventsEnabled = shouldEnablePhotoOverlayPointerEvents({
    designTab,
    isAlignmentMode,
    activeSurface: activeSurface ?? "photo",
  });
  const shouldRenderOverlaySvg =
    showOverlay || (isAlignmentMode && activeSurface === "photo");

  const getLandmarkStatusLabel = useCallback((landmarkId: string) => {
    const landmark = landmarks.find((item) => item.id === landmarkId);
    if (!landmark) return "Pending";
    if (landmark.photoCoord && landmark.modelCoord) return "Matched";
    if (landmark.photoCoord) return "Photo only";
    if (landmark.modelCoord) return "Scan only";
    return "Pending";
  }, [landmarks]);

  // Project teeth onto photo coordinates.
  // Uses 3D projection when alignment result is available, falls back to Procrustes
  // or legacy arch calibration.
  const projectedTeeth = useMemo(() => {
    if (alignmentResult && alignmentResult.transform) {
      return teeth.map((tooth) => {
        const params: ProjectionParams = {
          fov: 45,
          imageWidth: viewWidth,
          imageHeight: viewHeight,
          principalPoint: { x: 0.5, y: 0.5 },
        };
        const modelPoint = {
          x: tooth.positionX,
          y: tooth.positionY,
          z: tooth.depth || 0,
        };
        const transformed = applyTransform(modelPoint, alignmentResult.transform);
        const projected = project3Dto2D(
          transformed,
          alignmentResult.cameraPosition,
          alignmentResult.cameraTarget,
          { x: 0, y: 1, z: 0 },
          params
        );
        return {
          tooth,
          projected: {
            x: projected.x * viewWidth,
            y: projected.y * viewHeight,
            scale: alignmentResult.transform.scale,
            depthZ: projected.depth,
          },
        };
      });
    }
    // Fallback to existing behavior if no alignment result
    const midlineStl = landmarks.find((l) => l.id === "midline")?.modelCoord;
    if (effectiveOverlayTransform && midlineStl) {
      return teeth.map((tooth) => {
        const pt = procrustesProject(
          tooth.positionX,
          tooth.positionY,
          effectiveOverlayTransform,
          midlineStl.x,
          midlineStl.y
        );
        return {
          tooth,
          projected: {
            x: pt.x,
            y: pt.y,
            scale: effectiveOverlayTransform.scale / calibration.scale,
            depthZ: 0,
          },
        };
      });
    }
    // Legacy fallback
    return teeth.map((tooth) => ({
      tooth,
      projected: projectToothToPhoto(tooth.positionX, tooth.positionY, calibration),
    }));
  }, [teeth, calibration, effectiveOverlayTransform, landmarks, alignmentResult, viewWidth, viewHeight]);
  
  // Ghost overlay visibility logic:
  // If we are IN alignment mode but have a solved transform, show it as a ghost
  // so the user gets live feedback as they place landmarks.
  const showTeethOverlay = !isAlignmentMode || effectiveOverlayTransform !== null;
  const renderOpacity = (isAlignmentMode ? 0.2 : projectedOverlayOpacity);

  // Build arch curve from alignment markers
  const markerArchPath = useMemo(() => {
    if (alignmentMarkers.length < 3) return "";
    const sorted = [...alignmentMarkers].sort((a, b) => a.x - b.x);
    const points = sorted.map((m) => ({
      x: (m.x / 100) * viewWidth,
      y: (m.y / 100) * viewHeight
    }));
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

  // Smile arc data (from teeth or parabolic fallback)
  const smileArcData = useMemo(() => {
    const applyOffsets = (points: { x: number; y: number }[]) => {
      const adjustedPoints = applySmileArcOffsets({
        points,
        leftOffsetPercent: smileArcLeftOffset,
        rightOffsetPercent: smileArcRightOffset,
        viewHeight,
      });
      return {
        points: adjustedPoints,
        centerY: adjustedPoints[Math.floor(adjustedPoints.length / 2)]?.y ?? 0,
      };
    };

    if (projectedTeeth.length >= 3) {
      const sorted = [...projectedTeeth].sort((a, b) => a.projected.x - b.projected.x);
      const pts = sorted.map(({ tooth, projected }) => {
        const th = Math.max(tooth.height * calibration.scale * projected.scale * 0.9, 20);
        return { x: projected.x, y: projected.y + th / 2 };
      });
      return applyOffsets(pts);
    }
    const incisalY = calibration.incisalY;
    const lx = (leftCommissureX / 100) * viewWidth;
    const rx = (rightCommissureX / 100) * viewWidth;
    const cx = calibration.midlineX;
    const halfSpan = (rx - lx) / 2;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * 2 - 1;
      const x = cx + t * halfSpan;
      const rise = halfSpan * 0.15 * t * t;
      pts.push({ x, y: incisalY - rise });
    }
    return applyOffsets(pts);
  }, [
    projectedTeeth,
    calibration,
    leftCommissureX,
    rightCommissureX,
    smileArcLeftOffset,
    smileArcRightOffset,
    viewWidth,
    viewHeight,
  ]);

  // Smooth Catmull-Rom path through smile arc points
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

  return (
    <div
      ref={containerRef}
      data-testid="photo-overlay-root"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "transparent",
        borderRadius: "var(--panel-radius)",
        overflow: "hidden",
        pointerEvents: "none",
      cursor: dragState?.type === "pan" ? "grabbing" : isAlignmentMode && activeSurface === "photo" ? "crosshair" : "default"
      }}
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
          transition: dragState ? "none" : "transform 0.15s ease",
          pointerEvents: overlayPointerEventsEnabled ? "auto" : "none",
        }}
        onMouseDown={overlayPointerEventsEnabled ? handlePanMouseDown : undefined}
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
            opacity: photoLayerOpacity,
            filter: "saturate(0.94) contrast(1.03)",
            userSelect: "none",
            // Apply mouth mask when available — isolates smile zone in SimulateView overlay
            ...(mouthMaskUrl
              ? {
                  maskImage: `url(${mouthMaskUrl})`,
                  maskSize: "100% 100%",
                  maskRepeat: "no-repeat",
                  WebkitMaskImage: `url(${mouthMaskUrl})`,
                  WebkitMaskSize: "100% 100%",
                  WebkitMaskRepeat: "no-repeat",
                }
              : {}),
          }}
        />

        {/* SVG overlay on top of photo */}
        {shouldRenderOverlaySvg && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              cursor: isAlignmentMode && activeSurface === "photo"
                ? "crosshair"
                : (dragState && dragState.type !== "pan" ? "grabbing" : "crosshair")
            }}
onMouseMove={(e) => {
  handleLandmarkDrag(e);
  handleMouseMove(e);
  if (isAlignmentMode && activeSurface === "photo" && activeLandmarkId && !draggingLandmarkId) {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    setHoverPoint({ x: svgPoint.x / viewWidth, y: svgPoint.y / viewHeight });
  } else if (!draggingLandmarkId) {
    setHoverPoint(null);
  }
}}
onMouseUp={() => {
  handleMouseUp();
  handleLandmarkDragEnd();
}}
onMouseLeave={() => {
  setHoverPoint(null);
  handleLandmarkDragEnd();
}}
              onClick={(e) => {
                if (isAlignmentMode && activeSurface === "photo" && activeLandmarkId) {
                  e.stopPropagation();
                  const pt = getSvgPoint(e);
                  setPhotoLandmark(activeLandmarkId, pt.x / viewWidth, pt.y / viewHeight);
                  // Auto-progression: after placing photo point, switch to scan surface
                  setActiveSurface("scan");
                  setScanInteractionMode("pick");
                  return;
                }
              }}
            >
            {isAlignmentMode && activeSurface === "photo" && activeLandmark && activeLandmarkTarget && (
              <g data-testid="photo-overlay-placement-target">
                <circle
                  cx={activeLandmarkTarget.x * viewWidth}
                  cy={activeLandmarkTarget.y * viewHeight}
                  r={4}
                  fill="none"
                  stroke={activeLandmark.color}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
                <line
                  x1={activeLandmarkTarget.x * viewWidth - 3}
                  y1={activeLandmarkTarget.y * viewHeight}
                  x2={activeLandmarkTarget.x * viewWidth + 3}
                  y2={activeLandmarkTarget.y * viewHeight}
                  stroke={activeLandmark.color}
                  strokeWidth={1}
                  opacity={0.66}
                />
                <line
                  x1={activeLandmarkTarget.x * viewWidth}
                  y1={activeLandmarkTarget.y * viewHeight - 3}
                  x2={activeLandmarkTarget.x * viewWidth}
                  y2={activeLandmarkTarget.y * viewHeight + 3}
                  stroke={activeLandmark.color}
                  strokeWidth={1}
                  opacity={0.66}
                />
              </g>
            )}

{isAlignmentMode && landmarks.map((landmark) => {
  if (!landmark.photoCoord) return null;
  const isActive = landmark.id === activeLandmarkId;
  return (
    <g key={landmark.id}>
      {isActive && (
        <circle
          cx={landmark.photoCoord.x * viewWidth}
          cy={landmark.photoCoord.y * viewHeight}
          r={4.5}
          fill="none"
          stroke={landmark.color}
          strokeWidth={1.25}
          strokeDasharray="2 1.5"
          opacity={0.82}
        />
      )}
      <circle
        cx={landmark.photoCoord.x * viewWidth}
        cy={landmark.photoCoord.y * viewHeight}
        r={6}
        fill={landmark.color}
        stroke="#fff"
        strokeWidth={1}
        style={{ cursor: "grab" }}
        onMouseDown={handleLandmarkDragStart(landmark.id)}
      />
      <text
        x={landmark.photoCoord.x * viewWidth}
        y={landmark.photoCoord.y * viewHeight - 6}
        textAnchor="middle"
        fill={landmark.color}
        fontSize={7}
        fontWeight={700}
        style={{ pointerEvents: "none" }}
      >
        {landmark.label}
      </text>
    </g>
  );
})}

          {/* Ghost marker for hover preview */}
          {hoverPoint && activeLandmark && (
            <circle
              cx={hoverPoint.x * viewWidth}
              cy={hoverPoint.y * viewHeight}
              r={6}
              fill="none"
              stroke={activeLandmark.color}
              strokeWidth={2}
              strokeDasharray="3 2"
              opacity={0.7}
              style={{ pointerEvents: "none" }}
            />
          )}

          {/* Alignment markers (arch curve + crosshairs) */}
            {!isAlignmentMode && (
              <AlignmentMarkers
                markers={alignmentMarkers}
                viewWidth={viewWidth}
                viewHeight={viewHeight}
                markerArchPath={markerArchPath}
                onMarkerMouseDown={handleMarkerMouseDown}
              />
            )}

            {/* Calibration guides (smile arc, midline, gingival, commissures) */}
            {!isAlignmentMode && (
              <OverlayGuides
                showMidline={showMidline}
                showSmileArc={showSmileArc}
                showGingivalLine={showGingivalLine}
                viewWidth={viewWidth}
                viewHeight={viewHeight}
                calibration={calibration}
                smileArcPath={smileArcPath}
                smileArcData={smileArcData}
                gingivalLineY={gingivalLineY}
                leftCommissureX={leftCommissureX}
                rightCommissureX={rightCommissureX}
                onGuideMouseDown={handleGuideMouseDown}
              />
            )}

            {/* Perspective-projected teeth — Positioned by Procrustes solver if available */}
            {/* onWheel is wired via native non-passive listener (overlayGroupRef) above */}
            {showTeethOverlay && projectedTeeth.length > 0 && (
              <g
                ref={overlayGroupRef}
                data-testid="scan-overlay-group"
                onMouseDown={(e) => {
                  if (isAlignmentMode) return;
                  e.stopPropagation();
                  // Initiate pan
                  const pt = getSvgPoint(e as unknown as React.MouseEvent);
                  setDragState({
                    type: "overlay-pan" as any, // lazy extending DragType
                    startX: pt.x,
                    startY: pt.y,
                    startValue: 0,
                    startPanX: adjustmentDelta.translateX,
                    startPanY: adjustmentDelta.translateY,
                  });
                }}
              >
                {projectedTeeth.map(({ tooth, projected }) => {
                  const tw = Math.max(tooth.width * calibration.scale * projected.scale, 14);
                  const th = Math.max(tooth.height * calibration.scale * projected.scale * 0.9, 20);
                  const isSelected = tooth.toothId === selectedToothId;
                  const depthOpacity = 0.7 + 0.3 * projected.scale;

                  return (
                    <g
                      key={tooth.toothId}
                      opacity={renderOpacity * depthOpacity}
                      cursor={isAlignmentMode ? "default" : "grab"}
                      onMouseDown={(e) => isAlignmentMode ? null : handleToothMouseDown(tooth.toothId, e)}
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
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Flip-correction notice banner */}
      {baseOverlayTransform?.wasFlipCorrected && !isAlignmentMode && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "5px 10px",
            background: "rgba(0, 180, 216, 0.15)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(0, 180, 216, 0.4)",
            borderRadius: 6,
            fontSize: 10,
            color: "#00b4d8",
            zIndex: 12,
            pointerEvents: "none",
          }}
        >
          ✓ Scan orientation auto-corrected
        </div>
      )}

      {/* Bottom toolbar for alignment markers & zoom */}
      <div style={{ pointerEvents: "auto" }}>
        <PhotoOverlayToolbar onZoom={handleZoom} />
      </div>

      {/* Marker legend */}
      {isAlignmentMode ? (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            padding: "8px 10px",
            background: "rgba(15, 20, 25, 0.82)",
            backdropFilter: "blur(8px)",
            borderRadius: 6,
            border: "1px solid var(--border)",
            zIndex: 10,
            fontSize: 10,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            pointerEvents: "auto",
          }}
        >
          <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>Landmark Placement</div>
          <div data-testid="photo-overlay-alignment-status" style={{ color: "var(--text-primary)" }}>
            {activeLandmark ? `Active landmark: ${activeLandmark.label}` : "Select a landmark to continue."}
          </div>
          <div data-testid="photo-overlay-alignment-instruction" style={{ color: "var(--text-muted)" }}>
            {activeSurface === "photo"
              ? activeLandmark
                ? "Click the photo to place the 2D point."
                : "Choose a landmark from the photo workspace panel."
              : "Switch to photo placement to set the 2D point."}
          </div>
          {activeLandmark && (
            <div data-testid="photo-overlay-point-state" style={{ color: "var(--text-muted)" }}>
              {`${activeLandmark.photoCoord ? "2D point placed" : "2D point missing"} · ${activeLandmark.modelCoord ? "3D point placed" : "3D point missing"}`}
            </div>
          )}
          <div style={{ color: "var(--text-muted)" }}>
            {completedPairCount} matched pair{completedPairCount === 1 ? "" : "s"}
          </div>
          <div style={{ display: "grid", gap: 4, marginTop: 2 }}>
            {landmarks.map((landmark) => (
              <div
                key={landmark.id}
                data-testid={`photo-overlay-landmark-${landmark.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  color: landmark.id === activeLandmarkId ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: landmark.color,
                      display: "inline-block",
                    }}
                  />
                  <span>{landmark.label}</span>
                </span>
                <span>{getLandmarkStatusLabel(landmark.id)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : alignmentMarkers.length > 0 && (
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
            gap: 4,
            pointerEvents: "auto",
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
