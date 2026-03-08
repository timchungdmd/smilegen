import { useMemo } from "react";
import { useSmileStore } from "../../store/useSmileStore";

type ArchPreset = "auto" | "narrow" | "average" | "wide" | "custom";

const PRESETS: { value: ArchPreset; label: string; desc: string }[] = [
  { value: "auto", label: "Auto", desc: "From scan" },
  { value: "narrow", label: "Narrow", desc: "28mm wide" },
  { value: "average", label: "Average", desc: "35mm wide" },
  { value: "wide", label: "Wide", desc: "42mm wide" },
  { value: "custom", label: "Custom", desc: "Manual" }
];

export function ArchFormEditor() {
  const archPreset = useSmileStore((s) => s.archPreset);
  const archDepthOverride = useSmileStore((s) => s.archDepthOverride);
  const archHalfWidthOverride = useSmileStore((s) => s.archHalfWidthOverride);
  const cameraDistance = useSmileStore((s) => s.cameraDistance);
  const archScanMesh = useSmileStore((s) => s.archScanMesh);
  const setArchPreset = useSmileStore((s) => s.setArchPreset);
  const setArchDepthOverride = useSmileStore((s) => s.setArchDepthOverride);
  const setArchHalfWidthOverride = useSmileStore((s) => s.setArchHalfWidthOverride);
  const setCameraDistance = useSmileStore((s) => s.setCameraDistance);

  // Effective values (what's actually used)
  const effective = useMemo(() => {
    const autoDepth = archScanMesh
      ? Math.max(8, Math.min(25, (archScanMesh.bounds.maxY - archScanMesh.bounds.minY) * 0.5))
      : 15;
    const autoHalfWidth = archScanMesh
      ? Math.max(20, Math.min(50, archScanMesh.bounds.width / 2))
      : 35;
    return {
      depth: archDepthOverride ?? autoDepth,
      halfWidth: archHalfWidthOverride ?? autoHalfWidth
    };
  }, [archDepthOverride, archHalfWidthOverride, archScanMesh]);

  const isCustom = archPreset === "custom";

  // Mini SVG arch preview
  const archPreviewPath = useMemo(() => {
    const w = 120;
    const h = 50;
    const pts: string[] = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 - 1;
      const x = 10 + ((t + 1) / 2) * (w - 20);
      const depth = effective.depth / 25; // normalize
      const y = h - 8 - depth * 35 * (1 - t * t);
      pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [effective.depth]);

  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <div className="panel-header">
        <h3>Arch Form</h3>
      </div>
      <div className="panel-body" style={{ display: "grid", gap: 10 }}>
        {/* Mini arch preview */}
        <svg viewBox="0 0 120 50" style={{ width: "100%", height: 50, opacity: 0.8 }}>
          <path d={archPreviewPath} fill="none" stroke="#00b4d8" strokeWidth="2" />
          {/* Midline dot */}
          <circle cx="60" cy="8" r="2.5" fill="#ef476f" opacity="0.7" />
          {/* Width indicators */}
          <line x1="10" y1="46" x2="110" y2="46" stroke="var(--text-muted)" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x="60" y="48" textAnchor="middle" fill="var(--text-muted)" fontSize="6">
            {(effective.halfWidth * 2).toFixed(0)}mm
          </text>
        </svg>

        {/* Presets */}
        <div className="label">Preset</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              className={`btn btn-sm ${archPreset === p.value ? "active" : ""}`}
              onClick={() => setArchPreset(p.value)}
              title={p.desc}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "3px 4px",
                fontSize: 10,
                borderColor: archPreset === p.value ? "var(--accent)" : undefined
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Auto info */}
        {archPreset === "auto" && archScanMesh && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
            Derived from scan: {effective.halfWidth.toFixed(1)}mm half-width, {effective.depth.toFixed(1)}mm depth
          </div>
        )}
        {archPreset === "auto" && !archScanMesh && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
            No scan loaded — using defaults (35mm / 15mm)
          </div>
        )}

        {/* Sliders — always shown for custom, read-only display for presets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span className="label">Arch Width</span>
            <span className="label-value">{(effective.halfWidth * 2).toFixed(0)} mm</span>
          </div>
          <input
            type="range"
            min="40"
            max="100"
            step="1"
            value={effective.halfWidth * 2}
            onChange={(e) => setArchHalfWidthOverride(Number(e.target.value) / 2)}
            disabled={!isCustom && archPreset !== "narrow" && archPreset !== "average" && archPreset !== "wide"}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span className="label">Arch Depth</span>
            <span className="label-value">{effective.depth.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min="8"
            max="25"
            step="0.5"
            value={effective.depth}
            onChange={(e) => setArchDepthOverride(Number(e.target.value))}
            disabled={!isCustom && archPreset !== "narrow" && archPreset !== "average" && archPreset !== "wide"}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span className="label">Camera Distance</span>
            <span className="label-value">{cameraDistance} mm</span>
          </div>
          <input
            type="range"
            min="100"
            max="500"
            step="10"
            value={cameraDistance}
            onChange={(e) => setCameraDistance(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        {/* Effective values summary */}
        <div style={{ display: "grid", gap: 3, fontSize: 10, color: "var(--text-muted)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Half-width</span>
            <span>{effective.halfWidth.toFixed(1)} mm</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Depth</span>
            <span>{effective.depth.toFixed(1)} mm</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Perspective</span>
            <span>{cameraDistance <= 150 ? "Strong" : cameraDistance <= 300 ? "Normal" : "Flat"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
