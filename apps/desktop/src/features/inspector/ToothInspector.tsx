import type { GeneratedVariantDesign } from "../engine/designEngine";

type ToothData = GeneratedVariantDesign["teeth"][number];

interface ToothInspectorProps {
  tooth: ToothData;
  onDimensionChange: (
    toothId: string,
    updates: Partial<Pick<ToothData, "width" | "height" | "depth">>
  ) => void;
}

interface DimSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (val: number) => void;
}

function DimSlider({ label, value, min, max, step, unit = "mm", onChange }: DimSliderProps) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="label">{label}</span>
        <span className="label-value">
          {value.toFixed(2)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--text-muted)"
        }}
      >
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function ToothInspector({ tooth, onDimensionChange }: ToothInspectorProps) {
  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <div className="panel-header">
        <h3>Tooth #{tooth.toothId}</h3>
        <span
          className={`badge ${
            tooth.trustState === "ready"
              ? "badge-success"
              : tooth.trustState === "needs_correction"
                ? "badge-warning"
                : "badge-danger"
          }`}
        >
          {tooth.trustState}
        </span>
      </div>
      <div className="panel-body" style={{ display: "grid", gap: 14 }}>
        {/* Tooth visualization */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0"
          }}
        >
          <svg width="80" height="100" viewBox="0 0 80 100">
            <defs>
              <linearGradient id="toothGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--enamel)" />
                <stop offset="100%" stopColor="var(--tooth-fill)" />
              </linearGradient>
            </defs>
            {/* Gingival line */}
            <path
              d="M 10 25 Q 40 15 70 25"
              fill="none"
              stroke="var(--gingival)"
              strokeWidth="1.5"
              opacity="0.5"
            />
            {/* Tooth shape */}
            <rect
              x={40 - (tooth.width * 3)}
              y={25}
              width={tooth.width * 6}
              height={tooth.height * 6}
              rx={tooth.width * 1.2}
              ry={tooth.width * 0.8}
              fill="url(#toothGrad)"
              stroke="var(--accent)"
              strokeWidth="1.5"
            />
            {/* Width annotation */}
            <line
              x1={40 - (tooth.width * 3)}
              y1={90}
              x2={40 + (tooth.width * 3)}
              y2={90}
              stroke="var(--text-muted)"
              strokeWidth="0.5"
            />
            <text x="40" y="98" textAnchor="middle" fill="var(--text-muted)" fontSize="8">
              {tooth.width.toFixed(1)}mm
            </text>
          </svg>
        </div>

        <DimSlider
          label="Width"
          value={tooth.width}
          min={3}
          max={14}
          step={0.1}
          onChange={(val) =>
            onDimensionChange(tooth.toothId, { width: val })
          }
        />
        <DimSlider
          label="Height"
          value={tooth.height}
          min={4}
          max={16}
          step={0.1}
          onChange={(val) =>
            onDimensionChange(tooth.toothId, { height: val })
          }
        />
        <DimSlider
          label="Depth"
          value={tooth.depth}
          min={2}
          max={10}
          step={0.1}
          onChange={(val) =>
            onDimensionChange(tooth.toothId, { depth: val })
          }
        />

        <div className="divider" />

        {/* Position info */}
        <div className="grid-2" style={{ fontSize: 11 }}>
          <div>
            <div className="label">Position X</div>
            <div className="label-value">{tooth.positionX.toFixed(1)}</div>
          </div>
          <div>
            <div className="label">Position Y</div>
            <div className="label-value">{tooth.positionY.toFixed(1)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span className="label">Facial Volume</span>
          <span className="label-value">{tooth.facialVolume.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span className="label">Treatment</span>
          <span className="label-value" style={{ textTransform: "capitalize" }}>{tooth.treatmentType}</span>
        </div>
      </div>
    </div>
  );
}
