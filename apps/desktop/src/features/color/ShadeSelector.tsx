import { useState, useMemo } from "react";
import { VITA_CLASSICAL_SHADES, getShadeById, type ShadeEntry } from "./shadeGuide";

interface ShadeSelectorProps {
  selectedShade: string;
  onSelectShade: (shadeId: string) => void;
}

const GROUPS: ShadeEntry["group"][] = ["A", "B", "C", "D"];

function rgbStr(c: { r: number; g: number; b: number }): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

export function ShadeSelector({ selectedShade, onSelectShade }: ShadeSelectorProps) {
  const [activeGroup, setActiveGroup] = useState<ShadeEntry["group"]>(
    () => getShadeById(selectedShade)?.group ?? "A"
  );

  const groupShades = useMemo(
    () => VITA_CLASSICAL_SHADES.filter((s) => s.group === activeGroup),
    [activeGroup]
  );

  const currentShade = getShadeById(selectedShade);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Shade Selection</h3>
        {currentShade && (
          <span className="badge badge-info">{currentShade.id}</span>
        )}
      </div>

      <div className="panel-body" style={{ display: "grid", gap: 12 }}>
        {/* Group tabs */}
        <div className="tab-bar">
          {GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              className={`tab ${activeGroup === group ? "active" : ""}`}
              onClick={() => setActiveGroup(group)}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Shade swatches */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {groupShades.map((shade) => {
            const isSelected = shade.id === selectedShade;
            return (
              <button
                key={shade.id}
                type="button"
                onClick={() => onSelectShade(shade.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: 4,
                  border: isSelected
                    ? "2px solid var(--accent)"
                    : "2px solid var(--border)",
                  borderRadius: "var(--card-radius)",
                  background: isSelected
                    ? "var(--accent-dim)"
                    : "var(--bg-tertiary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  minWidth: 48
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 4,
                    background: `linear-gradient(to bottom, ${rgbStr(shade.cervicalColor)}, ${rgbStr(shade.bodyColor)} 50%, ${rgbStr(shade.incisalColor)})`,
                    border: "1px solid var(--border-emphasis)"
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isSelected
                      ? "var(--text-primary)"
                      : "var(--text-secondary)"
                  }}
                >
                  {shade.id}
                </span>
              </button>
            );
          })}
        </div>

        {/* Preview tooth gradient */}
        {currentShade && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="32" height="56" viewBox="0 0 32 56">
              <defs>
                <linearGradient
                  id="shade-preview-gradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={rgbStr(currentShade.cervicalColor)}
                  />
                  <stop
                    offset="45%"
                    stopColor={rgbStr(currentShade.bodyColor)}
                  />
                  <stop
                    offset="100%"
                    stopColor={rgbStr(currentShade.incisalColor)}
                  />
                </linearGradient>
              </defs>
              <rect
                x="2"
                y="2"
                width="28"
                height="52"
                rx="8"
                ry="8"
                fill="url(#shade-preview-gradient)"
                stroke="var(--border-emphasis)"
                strokeWidth="1"
              />
            </svg>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)"
                }}
              >
                {currentShade.id}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginTop: 2
                }}
              >
                {currentShade.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  marginTop: 2
                }}
              >
                Translucency: {Math.round(currentShade.translucency * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
