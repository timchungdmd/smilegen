import type { VariantSummary } from "./variantStore";

interface VariantCardProps {
  variant: VariantSummary;
  active: boolean;
  onSelect: () => void;
}

export function VariantCard({ variant, active, onSelect }: VariantCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Select variant ${variant.label}`}
      className={`card variant-card ${active ? "active" : ""}`}
      style={{
        textAlign: "left",
        display: "grid",
        gap: 6,
        cursor: "pointer",
        padding: 14
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
        {variant.label}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        Width: {variant.widthTendency}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        Length: {variant.lengthTendency}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        Additive: {variant.additiveIntensity}
      </div>
    </button>
  );
}
