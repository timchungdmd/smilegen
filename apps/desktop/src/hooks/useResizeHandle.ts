import { useCallback, useRef, useState } from "react";

interface UseResizeHandleOptions {
  /** Initial width in pixels */
  initialWidth: number;
  /** Minimum width in pixels */
  minWidth: number;
  /** Maximum width in pixels */
  maxWidth: number;
  /** localStorage key to persist preferred width */
  storageKey?: string;
  /** Direction: "left" means dragging left increases width (right-side panel) */
  direction?: "left" | "right";
}

export function useResizeHandle({
  initialWidth,
  minWidth,
  maxWidth,
  storageKey,
  direction = "left",
}: UseResizeHandleOptions) {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) return parsed;
      }
    }
    return initialWidth;
  });

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = direction === "left"
      ? startX.current - e.clientX
      : e.clientX - startX.current;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + delta));
    setWidth(newWidth);
  }, [minWidth, maxWidth, direction]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (storageKey) {
      localStorage.setItem(storageKey, String(width));
    }
  }, [storageKey, width]);

  const handleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    style: {
      width: 6,
      cursor: "col-resize" as const,
      background: "transparent",
      position: "absolute" as const,
      top: 0,
      bottom: 0,
      zIndex: 10,
      ...(direction === "left" ? { left: -3 } : { right: -3 }),
    },
  };

  return { width, handleProps };
}
