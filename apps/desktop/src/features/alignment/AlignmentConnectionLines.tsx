import { useEffect, useState, useRef } from "react";
import { useAlignmentStore } from "../../store/useAlignmentStore";

interface AlignmentConnectionLinesProps {
  leftContainerRef: React.RefObject<HTMLDivElement | null>;
  rightContainerRef: React.RefObject<HTMLDivElement | null>;
  imageElement: HTMLImageElement | null;
}

function calculateImageBounds(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  padding: number
): { x: number; y: number; width: number; height: number } {
  const contentWidth = containerWidth - padding * 2;
  const contentHeight = containerHeight - padding * 2;

  if (contentWidth <= 0 || contentHeight <= 0) {
    return { x: padding, y: padding, width: 0, height: 0 };
  }

  const containerAspect = contentWidth / contentHeight;
  const imageAspect = imageWidth / imageHeight;

  let renderWidth: number;
  let renderHeight: number;

  if (containerAspect > imageAspect) {
    renderHeight = contentHeight;
    renderWidth = contentHeight * imageAspect;
  } else {
    renderWidth = contentWidth;
    renderHeight = contentWidth / imageAspect;
  }

  return {
    x: (contentWidth - renderWidth) / 2 + padding,
    y: (contentHeight - renderHeight) / 2 + padding,
    width: renderWidth,
    height: renderHeight,
  };
}

export function AlignmentConnectionLines({
  leftContainerRef,
  rightContainerRef,
  imageElement,
}: AlignmentConnectionLinesProps) {
  const landmarks = useAlignmentStore((s) => s.landmarks);
  const isAlignmentMode = useAlignmentStore((s) => s.isAlignmentMode);

  const [leftRect, setLeftRect] = useState<DOMRect | null>(null);
  const [rightRect, setRightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRects = () => {
      if (leftContainerRef.current) {
        setLeftRect(leftContainerRef.current.getBoundingClientRect());
      }
      if (rightContainerRef.current) {
        setRightRect(rightContainerRef.current.getBoundingClientRect());
      }
    };
    updateRects();

    const leftObserver = new ResizeObserver(updateRects);
    const rightObserver = new ResizeObserver(updateRects);

    if (leftContainerRef.current) leftObserver.observe(leftContainerRef.current);
    if (rightContainerRef.current) rightObserver.observe(rightContainerRef.current);

    window.addEventListener("resize", updateRects);
    return () => {
      leftObserver.disconnect();
      rightObserver.disconnect();
      window.removeEventListener("resize", updateRects);
    };
  }, [leftContainerRef, rightContainerRef]);

  // Calculate image bounds for photo side
  const imageBounds = leftRect && imageElement && imageElement.naturalWidth > 0
    ? calculateImageBounds(
        leftRect.width,
        leftRect.height,
        imageElement.naturalWidth,
        imageElement.naturalHeight,
        16
      )
    : null;

  if (!isAlignmentMode || !leftRect || !rightRect) {
    return null;
  }

  // Get all landmarks that have both photo and model coords
  const connectedLandmarks = landmarks.filter(
    (l) => l.photoCoord && l.modelCoord
  );

  if (connectedLandmarks.length === 0) {
    return null;
  }

  return (
    <svg
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      {connectedLandmarks.map((landmark) => {
        // Photo side coordinates - use image bounds if available
        let photoX: number;
        let photoY: number;

        if (imageBounds) {
          photoX = leftRect.left + imageBounds.x + landmark.photoCoord!.x * imageBounds.width;
          photoY = leftRect.top + imageBounds.y + landmark.photoCoord!.y * imageBounds.height;
        } else {
          // Fallback - should not normally happen
          photoX = leftRect.left + landmark.photoCoord!.x * leftRect.width;
          photoY = leftRect.top + landmark.photoCoord!.y * leftRect.height;
        }

        // For 3D scan side, we need to project the 3D point to 2D
        // For now, use a simple orthographic projection centered in the right panel
        const scale = 8; // pixels per mm
        const modelX = landmark.modelCoord!.x;
        const modelY = landmark.modelCoord!.y;

        const centerX = rightRect.left + rightRect.width / 2;
        const centerY = rightRect.top + rightRect.height / 2;

        const scanX = centerX + modelX * scale;
        const scanY = centerY - modelY * scale;

        return (
          <g key={landmark.id}>
            <line
              x1={photoX}
              y1={photoY}
              x2={scanX}
              y2={scanY}
              stroke={landmark.color}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              opacity={0.7}
            />
            <text
              x={(photoX + scanX) / 2}
              y={(photoY + scanY) / 2 - 8}
              textAnchor="middle"
              fill={landmark.color}
              fontSize={9}
              fontWeight={500}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
            >
              {landmark.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
