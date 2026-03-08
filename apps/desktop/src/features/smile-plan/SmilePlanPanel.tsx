import type { AdditiveBias, ProportionMode, SmilePlan, SmilePlanControls, TreatmentType } from "./smilePlanTypes";

interface SmilePlanPanelProps {
  plan: SmilePlan;
  onBiasChange: (bias: AdditiveBias) => void;
  onControlsChange: (controls: Partial<SmilePlanControls>) => void;
  onToggleTooth: (toothId: string) => void;
  onSetTreatmentType: (toothId: string, type: TreatmentType) => void;
}

const biasOptions: { value: AdditiveBias; label: string; desc: string }[] = [
  { value: "conservative", label: "Conservative", desc: "Minimal change" },
  { value: "balanced", label: "Balanced", desc: "Natural enhancement" },
  { value: "enhanced", label: "Enhanced", desc: "Maximum improvement" }
];

const proportionOptions: { value: ProportionMode; label: string; desc: string }[] = [
  { value: "golden", label: "Golden Ratio", desc: "1.618 : 1 : 0.618" },
  { value: "percentage", label: "Percentage", desc: "23% : 15% : 12%" },
  { value: "library", label: "Library", desc: "Use library dims" }
];

export function SmilePlanPanel({
  plan,
  onBiasChange,
  onControlsChange,
  onToggleTooth,
  onSetTreatmentType
}: SmilePlanPanelProps) {
  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <div className="panel-header">
        <h3>Smile Plan</h3>
      </div>
      <div className="panel-body" style={{ display: "grid", gap: 10 }}>
        {/* Additive Bias */}
        <div className="label">Additive Bias</div>
        <div style={{ display: "grid", gap: 4 }}>
          {biasOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onBiasChange(opt.value)}
              className={`card ${plan.additiveBias === opt.value ? "active" : ""}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                border:
                  plan.additiveBias === opt.value
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                padding: "8px 12px"
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{opt.desc}</div>
              </div>
              {plan.additiveBias === opt.value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="divider" />

        {/* Design Controls */}
        <div className="label">Design Controls</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span className="label">Width Scale</span>
            <span className="label-value">{plan.controls.widthScale.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.2"
            step="0.01"
            value={plan.controls.widthScale}
            onChange={(e) => onControlsChange({ widthScale: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span className="label">Length Scale</span>
            <span className="label-value">{plan.controls.lengthScale.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.2"
            step="0.01"
            value={plan.controls.lengthScale}
            onChange={(e) => onControlsChange({ lengthScale: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span className="label">Incisal Curve</span>
            <span className="label-value">{plan.controls.incisalCurve.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.0"
            step="0.05"
            value={plan.controls.incisalCurve}
            onChange={(e) => onControlsChange({ incisalCurve: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span className="label">Midline Offset</span>
            <span className="label-value">{plan.controls.midline.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min="-3.0"
            max="3.0"
            step="0.1"
            value={plan.controls.midline}
            onChange={(e) => onControlsChange({ midline: Number(e.target.value) })}
            style={{ width: "100%" }}
          />
        </div>

        <div className="divider" />

        {/* Tooth Proportions */}
        <div className="label">Tooth Proportions</div>
        <div style={{ display: "flex", gap: 3 }}>
          {proportionOptions.map((opt) => (
            <button
              key={opt.value}
              className={`btn btn-sm ${plan.controls.proportionMode === opt.value ? "active" : ""}`}
              onClick={() => onControlsChange({ proportionMode: opt.value })}
              title={opt.desc}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "3px 4px",
                fontSize: 10,
                borderColor: plan.controls.proportionMode === opt.value ? "var(--accent)" : undefined
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
          {plan.controls.proportionMode === "golden"
            ? "Central : Lateral : Canine = 1.618 : 1 : 0.618"
            : plan.controls.proportionMode === "percentage"
              ? "Central 23% · Lateral 15% · Canine 12%"
              : "Using tooth library dimensions as-is"}
        </div>

        <div className="divider" />

        {/* Tooth Selection */}
        <div className="label">Tooth Selection</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {["4","5","6","7","8","9","10","11","12","13"].map((id) => {
            const selected = plan.selectedTeeth.includes(id);
            const treatment = plan.treatmentMap[id];
            return (
              <button
                key={id}
                className={`tooth-number ${selected ? "ready" : ""}`}
                onClick={() => onToggleTooth(id)}
                title={selected ? `${treatment} — click to remove` : "Click to add"}
                style={{ opacity: selected ? 1 : 0.4 }}
              >
                {id}
              </button>
            );
          })}
        </div>

        {/* Treatment Map */}
        {plan.selectedTeeth.length > 0 && (
          <>
            <div className="divider" />
            <div className="label">Treatment Map</div>
            {plan.selectedTeeth.map((id) => (
              <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                <span>Tooth #{id}</span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    className={`btn btn-sm ${plan.treatmentMap[id] === "veneer" ? "active" : ""}`}
                    onClick={() => onSetTreatmentType(id, "veneer")}
                    style={{ padding: "2px 6px", fontSize: 10 }}
                  >
                    Veneer
                  </button>
                  <button
                    className={`btn btn-sm ${plan.treatmentMap[id] === "crown" ? "active" : ""}`}
                    onClick={() => onSetTreatmentType(id, "crown")}
                    style={{ padding: "2px 6px", fontSize: 10 }}
                  >
                    Crown
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
