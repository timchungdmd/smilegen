import { useRef, useState, useCallback, useEffect } from "react";

interface BeforeAfterSliderProps {
  /** URL of the patient photo */
  photoUrl: string;
  /** Overlay content (teeth SVG) shown on the "after" side */
  children: React.ReactNode;
  /** Width of the view in CSS pixels */
  viewWidth: number;
  /** Height of the view in CSS pixels */
  viewHeight: number;
}

/**
 * Before/After comparison slider.
 *
 * The patient photo is shown full-width. A draggable vertical divider
 * splits the view: the left side shows the original photo ("Before"),
 * the right side shows the photo with the teeth overlay ("After").
 */
export function BeforeAfterSlider({
  photoUrl,
  children,
  viewWidth,
  viewHeight
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPercent, setSliderPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updateSlider = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPercent(pct);
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updateSlider(e.clientX);
    },
    [updateSlider]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      e.preventDefault();
      updateSlider(e.clientX);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, updateSlider]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: viewWidth,
        height: viewHeight,
        overflow: "hidden",
        borderRadius: "var(--panel-radius)",
        background: "var(--bg-primary)",
        cursor: isDragging ? "ew-resize" : "default",
        userSelect: "none"
      }}
    >
      {/* Base photo — always fully visible */}
      <img
        src={photoUrl}
        alt="Patient photo"
        draggable={false}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block"
        }}
      />

      {/* "After" overlay — clipped to the right side of the slider */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          clipPath: `inset(0 0 0 ${sliderPercent}%)`,
          pointerEvents: "none"
        }}
      >
        {/* Photo duplicate behind overlay for seamless compositing */}
        <img
          src={photoUrl}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block"
          }}
        />
        {children}
      </div>

      {/* Slider divider line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: `${sliderPercent}%`,
          width: 2,
          height: "100%",
          background: "rgba(255, 255, 255, 0.8)",
          transform: "translateX(-1px)",
          pointerEvents: "none",
          zIndex: 2
        }}
      />

      {/* Draggable handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          top: "50%",
          left: `${sliderPercent}%`,
          transform: "translate(-50%, -50%)",
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--bg-secondary)",
          border: "2px solid rgba(255, 255, 255, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "ew-resize",
          zIndex: 3,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)"
        }}
      >
        {/* Arrow indicators */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ opacity: 0.9 }}
        >
          <path
            d="M5 4L1 8L5 12"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 4L15 8L11 12"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Labels */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.6)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        Before
      </div>
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.6)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        After
      </div>
    </div>
  );
}
