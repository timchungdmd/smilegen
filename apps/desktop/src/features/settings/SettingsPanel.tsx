import { useState, useEffect } from "react";
import { DEFAULT_SETTINGS, type AppSettings, type ThemeMode, type ToothNumbering } from "./settingsTypes";
import { updateSettings, loadSettings } from "./settingsStore";

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function handleChange(updates: Partial<AppSettings>) {
    const next = updateSettings(updates);
    setSettings(next);
  }

  function handleReset() {
    const next = updateSettings({ ...DEFAULT_SETTINGS });
    setSettings(next);
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Settings</h3>
      </div>

      <div className="panel-body" style={{ display: "grid", gap: 16 }}>
        {/* Theme */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="label">Theme</span>
          <select
            className="input"
            value={settings.theme}
            onChange={(e) => handleChange({ theme: e.target.value as ThemeMode })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        {/* Expert Mode */}
        <ToggleRow
          label="Expert Mode"
          checked={settings.expertMode}
          onChange={(v) => handleChange({ expertMode: v })}
        />

        {/* Auto-save */}
        <ToggleRow
          label="Auto-save"
          checked={settings.autoSave}
          onChange={(v) => handleChange({ autoSave: v })}
        />

        {/* Auto-detect landmarks */}
        <ToggleRow
          label="Auto-detect Landmarks"
          checked={settings.autoDetectLandmarks}
          onChange={(v) => handleChange({ autoDetectLandmarks: v })}
        />

        {/* Tooth Numbering */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="label">Tooth Numbering</span>
          <select
            className="input"
            value={settings.toothNumbering}
            onChange={(e) => handleChange({ toothNumbering: e.target.value as ToothNumbering })}
          >
            <option value="universal">Universal</option>
            <option value="fdi">FDI</option>
          </select>
        </div>

        {/* Export Format */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="label">Default Export Format</span>
          <select
            className="input"
            value={settings.exportFormat}
            onChange={(e) =>
              handleChange({ exportFormat: e.target.value as AppSettings["exportFormat"] })
            }
          >
            <option value="stl_binary">STL (Binary)</option>
            <option value="stl_ascii">STL (ASCII)</option>
            <option value="obj">OBJ</option>
          </select>
        </div>

        {/* Arch Depth */}
        <NumberRow
          label="Arch Depth (mm)"
          value={settings.defaultArchDepth}
          min={5}
          max={30}
          step={0.5}
          onChange={(v) => handleChange({ defaultArchDepth: v })}
        />

        {/* Arch Half-Width */}
        <NumberRow
          label="Arch Half-Width (mm)"
          value={settings.defaultArchHalfWidth}
          min={15}
          max={50}
          step={0.5}
          onChange={(v) => handleChange({ defaultArchHalfWidth: v })}
        />

        {/* Camera Distance */}
        <NumberRow
          label="Camera Distance (mm)"
          value={settings.defaultCameraDistance}
          min={100}
          max={500}
          step={10}
          onChange={(v) => handleChange({ defaultCameraDistance: v })}
        />

        {/* Reset */}
        <button
          type="button"
          className="btn"
          onClick={handleReset}
          style={{ justifySelf: "start" }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className="label">{label}</span>
      <button
        type="button"
        className={`btn btn-sm ${checked ? "btn-primary" : ""}`}
        onClick={() => onChange(!checked)}
        style={{ minWidth: 52 }}
      >
        {checked ? "On" : "Off"}
      </button>
    </div>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className="label">{label}</span>
      <input
        type="number"
        className="input"
        value={value}
        min={min}
        max={max}
        step={step}
        style={{ width: 80, textAlign: "right" }}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          if (Number.isFinite(parsed)) {
            onChange(Math.max(min, Math.min(max, parsed)));
          }
        }}
      />
    </div>
  );
}
