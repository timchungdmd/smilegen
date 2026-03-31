import React, { useRef, useState, useEffect } from "react";
import { useViewportStore } from "../../store/useViewportStore";
import { useDesignStore, selectActiveVariant } from "../../store/useDesignStore";
import { buildCalibrationFromGuides, projectToothToPhoto } from "../alignment/archModel";

export const GimbalOverlay: React.FC = () => {
  const { 
    midlineX, smileArcY, leftCommissureX, rightCommissureX, 
    activeGimbalAxis, setActiveGimbalAxis, 
    designTab 
  } = useViewportStore();
  
  const { 
    selectedToothId, 
    moveTooth, 
    archHalfWidthOverride, 
    archDepthOverride 
  } = useDesignStore();

  const activeVariant = useDesignStore(selectActiveVariant);
  
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setSvgSize({ width, height });
    }
  }, [designTab]);

  if (designTab !== "photo" || !selectedToothId || !activeVariant) return null;

  const tooth = activeVariant.teeth.find(t => t.toothId === selectedToothId);
  if (!tooth) return null;

  // Derive calibration on the fly for 2D projection
  // Fallback to defaults if overrides are missing
  const cal = buildCalibrationFromGuides(
    midlineX, 
    smileArcY, 
    svgSize.width || 600, 
    svgSize.height || 400,
    (archHalfWidthOverride ?? 35) * 2,
    archDepthOverride ?? 15,
    leftCommissureX,
    rightCommissureX
  );

  const projection = projectToothToPhoto(tooth.positionX, tooth.positionY, cal);
  const pxPerMm = cal.scale * projection.scale;

  const onMouseDown = (e: React.MouseEvent, axis: "x" | "y" | "rotate") => {
    e.stopPropagation();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setActiveGimbalAxis(axis);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragStartRef.current || !activeGimbalAxis) return;

    const dx = (e.clientX - dragStartRef.current.x) / pxPerMm;
    const dy = (e.clientY - dragStartRef.current.y) / pxPerMm;

    if (activeGimbalAxis === "x") {
      moveTooth(selectedToothId, { deltaX: dx, deltaY: 0 });
    } else if (activeGimbalAxis === "y") {
      moveTooth(selectedToothId, { deltaX: 0, deltaY: dy });
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseUp = () => {
    dragStartRef.current = null;
    setActiveGimbalAxis(null);
  };

  useEffect(() => {
    if (activeGimbalAxis) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
    }
  }, [activeGimbalAxis]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-20">
      <svg className="w-full h-full">
        <g transform={`translate(${projection.x}, ${projection.y})`}>
          {/* X Axis handle (Lateral) */}
          <line 
            x1="-20" y1="0" x2="20" y2="0" 
            stroke={activeGimbalAxis === "x" ? "#ff0" : "red"} 
            strokeWidth="4" 
            className="cursor-ew-resize pointer-events-auto"
            onMouseDown={(e) => onMouseDown(e, "x")}
          />
          {/* Y Axis handle (Vertical) */}
          <line 
            x1="0" y1="-20" x2="0" y2="20" 
            stroke={activeGimbalAxis === "y" ? "#ff0" : "blue"} 
            strokeWidth="4" 
            className="cursor-ns-resize pointer-events-auto"
            onMouseDown={(e) => onMouseDown(e, "y")}
          />
          {/* Selection highlight circle */}
          <circle cx="0" cy="0" r="4" fill="white" />
        </g>
      </svg>
    </div>
  );
};
