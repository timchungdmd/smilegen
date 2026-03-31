import { useRef, useEffect, useState, useCallback } from "react";
import { useAlignmentStore, type AlignmentLandmarkId } from "../../store/useAlignmentStore";

interface PhotoLandmarkOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  imageElement: HTMLImageElement | null;
}

interface ImageDimensions {
  naturalWidth: number;
  naturalHeight: number;
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

export function PhotoLandmarkOverlay({ containerRef, imageElement }: PhotoLandmarkOverlayProps) {
  const landmarks = useAlignmentStore((s) => s.landmarks);
  const isAlignmentMode = useAlignmentStore((s) => s.isAlignmentMode);
  const activeSurface = useAlignmentStore((s) => s.activeSurface);
  const activeLandmarkId = useAlignmentStore((s) => s.activeLandmarkId);
  const setPhotoLandmark = useAlignmentStore((s) => s.setPhotoLandmark);
  const setActiveLandmark = useAlignmentStore((s) => s.setActiveLandmark);

  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [draggingLandmark, setDraggingLandmark] = useState<AlignmentLandmarkId | null>(null);

  // Track image natural dimensions
  useEffect(() => {
    if (!imageElement) {
      setImageDimensions(null);
      return;
    }

    const updateDimensions = () => {
      if (imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
        setImageDimensions({
          naturalWidth: imageElement.naturalWidth,
          naturalHeight: imageElement.naturalHeight,
        });
      }
    };

    if (imageElement.complete) {
      updateDimensions();
    } else {
      imageElement.addEventListener("load", updateDimensions);
      return () => imageElement.removeEventListener("load", updateDimensions);
    }
  }, [imageElement]);

  // Track container size changes
  useEffect(() => {
    if (!containerRef.current) {
      setContainerSize(null);
      return;
    }

    const updateContainerSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateContainerSize();

    const resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(containerRef.current);

    window.addEventListener("resize", updateContainerSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateContainerSize);
    };
  }, [containerRef]);

  // Calculate current image bounds based on container size
  const imageBounds = imageDimensions && containerSize
    ? calculateImageBounds(
        containerSize.width,
        containerSize.height,
        imageDimensions.naturalWidth,
        imageDimensions.naturalHeight,
        16
      )
    : null;

  const handleMouseDown = useCallback((landmarkId: AlignmentLandmarkId, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingLandmark(landmarkId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingLandmark || !imageBounds) return;
    const svgRect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = (e.clientX - svgRect.left - imageBounds.x) / imageBounds.width;
    const y = (e.clientY - svgRect.top - imageBounds.y) / imageBounds.height;
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      setPhotoLandmark(draggingLandmark, x, y);
    }
  }, [draggingLandmark, imageBounds, setPhotoLandmark]);

  const handleMouseUp = useCallback(() => {
    setDraggingLandmark(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isAlignmentMode || activeSurface !== "photo" || !activeLandmarkId || !imageBounds) return;
    if (draggingLandmark) return;

    const svgRect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const clickX = e.clientX - svgRect.left;
    const clickY = e.clientY - svgRect.top;

    const x = (clickX - imageBounds.x) / imageBounds.width;
    const y = (clickY - imageBounds.y) / imageBounds.height;

    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      setPhotoLandmark(activeLandmarkId, x, y);

      const state = useAlignmentStore.getState();
      const nextLandmark = state.landmarks.find(
        (l) => l.id !== activeLandmarkId && !l.photoCoord
      );
      if (nextLandmark) {
        setActiveLandmark(nextLandmark.id);
      }
    }
  }, [isAlignmentMode, activeSurface, activeLandmarkId, imageBounds, draggingLandmark, setPhotoLandmark, setActiveLandmark]);

  if (!isAlignmentMode || !imageBounds) {
    return null;
  }

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        zIndex: 10,
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {landmarks
        .filter((l) => l.photoCoord)
        .map((landmark) => {
          const x = imageBounds.x + landmark.photoCoord!.x * imageBounds.width;
          const y = imageBounds.y + landmark.photoCoord!.y * imageBounds.height;
          const isActive = landmark.id === activeLandmarkId;
          const isPicking = activeSurface === "photo" && activeLandmarkId === landmark.id;

          return (
            <g key={landmark.id}>
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r={12}
                  fill={landmark.color}
                  opacity={0.2}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={isPicking ? 8 : 6}
                fill={landmark.color}
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: "grab" }}
                onMouseDown={(e) => handleMouseDown(landmark.id, e)}
              />
              <text
                x={x}
                y={y - 14}
                textAnchor="middle"
                fill="#fff"
                fontSize={10}
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {landmark.label}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
