import { useRef, useState, useCallback } from "react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPosition(x);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-testid="before-after-slider"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        cursor: "col-resize",
        background: "#000",
        borderRadius: 8,
      }}
    >
      {/* After image (full width, behind) */}
      <img
        src={afterSrc}
        alt={afterLabel}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
        }}
        draggable={false}
      />
      {/* Before image (clipped to left of slider) */}
      <img
        src={beforeSrc}
        alt={beforeLabel}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
        draggable={false}
      />
      {/* Slider line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${position}%`,
          width: 2,
          background: "white",
          transform: "translateX(-1px)",
          pointerEvents: "none",
          boxShadow: "0 0 8px rgba(0,0,0,0.5)",
        }}
      />
      {/* Slider handle */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${position}%`,
          transform: "translate(-50%, -50%)",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.9)",
          border: "2px solid rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#333">
          <path d="M8 5v14l-7-7 7-7zm8 0v14l7-7-7-7z" />
        </svg>
      </div>
      {/* Labels */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 16,
          color: "white",
          fontSize: 12,
          fontWeight: 600,
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
      >
        {beforeLabel}
      </div>
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          color: "white",
          fontSize: 12,
          fontWeight: 600,
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
      >
        {afterLabel}
      </div>
    </div>
  );
}
