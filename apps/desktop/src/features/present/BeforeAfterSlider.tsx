import { useRef, useState, useCallback, useEffect } from "react";

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
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const [beforeError, setBeforeError] = useState(false);
  const [afterError, setAfterError] = useState(false);

  const isLoading = !beforeLoaded || !afterLoaded;
  const hasError = beforeError || afterError;

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

  // Preload images
  useEffect(() => {
    setBeforeLoaded(false);
    setAfterLoaded(false);
    setBeforeError(false);
    setAfterError(false);
  }, [beforeSrc, afterSrc]);

  const handleBeforeLoad = () => setBeforeLoaded(true);
  const handleAfterLoad = () => setAfterLoaded(true);
  const handleBeforeError = () => setBeforeError(true);
  const handleAfterError = () => setAfterError(true);

  if (hasError) {
    return (
      <div
        data-testid="before-after-slider"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1f2b",
          borderRadius: 8,
          color: "var(--text-muted, #8892a0)",
          fontSize: 13,
        }}
      >
        Failed to load images
      </div>
    );
  }

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
        cursor: isLoading ? "wait" : "col-resize",
        background: "#000",
        borderRadius: 8,
      }}
    >
      {/* Loading spinner */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid rgba(255,255,255,0.2)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      )}
      {/* After image (full width, behind) */}
      <img
        src={afterSrc}
        alt={afterLabel}
        onLoad={handleAfterLoad}
        onError={handleAfterError}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          opacity: afterLoaded ? 1 : 0,
          transition: "opacity 0.2s",
        }}
        draggable={false}
      />
      {/* Before image (clipped to left of slider) */}
      <img
        src={beforeSrc}
        alt={beforeLabel}
        onLoad={handleBeforeLoad}
        onError={handleBeforeError}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          clipPath: `inset(0 ${100 - position}% 0 0)`,
          opacity: beforeLoaded ? 1 : 0,
          transition: "opacity 0.2s",
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
