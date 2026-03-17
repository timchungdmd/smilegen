import { useEffect } from "react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

interface PresentationModeProps {
  beforeSrc: string;
  afterSrc: string;
  patientName?: string;
  onExit: () => void;
}

export function PresentationMode({ beforeSrc, afterSrc, patientName, onExit }: PresentationModeProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Minimal header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        flexShrink: 0,
      }}>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
          {patientName || "Smile Design Proposal"}
          <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 12, fontSize: 11 }}>
            {new Date().toLocaleDateString()}
          </span>
        </div>
        <button
          onClick={onExit}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 6,
            color: "rgba(255,255,255,0.7)",
            padding: "6px 14px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Exit Presentation (ESC)
        </button>
      </div>
      {/* Full-bleed slider */}
      <div style={{ flex: 1, padding: "0 20px 20px" }}>
        <BeforeAfterSlider beforeSrc={beforeSrc} afterSrc={afterSrc} />
      </div>
    </div>
  );
}
