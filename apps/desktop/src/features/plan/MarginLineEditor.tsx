/**
 * MarginLineEditor
 *
 * UI panel for defining a crown margin and triggering synthesis via the
 * apps/mesh microservice.
 *
 * Inputs:
 *  - libraryMesh: the template tooth model from the tooth library
 *  - targetMesh: the arch scan (prep scan) the crown must seat on
 *  - onResult: callback receiving the synthesised crown as a Blob
 *
 * The component exposes:
 *  - Three number inputs for margin centre X / Y / Z (mm, in mesh space)
 *  - A margin radius input (default 3.5 mm)
 *  - "Synthesize Crown" button that POSTs to the mesh service
 *  - Status line: idle / loading / success / error
 */

import { useState } from "react";
import type { ParsedStlMesh } from "../import/stlParser";
import { parsedMeshToStlBlob } from "./parsedMeshToStlBlob";
import { synthesizeCrown } from "../../services/meshSynthesisClient";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarginParams {
  x: number;
  y: number;
  z: number;
  radius: number;
}

type SynthesisStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; resultUrl: string }
  | { type: "error"; message: string };

// ── Sub-component: labelled number input ──────────────────────────────────────

function MarginInput({
  label,
  value,
  onChange,
  step = 0.1,
  unit = "mm",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  unit?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 11,
        color: "var(--text-muted, #8892a0)",
      }}
    >
      {label}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{
            width: 64,
            padding: "4px 6px",
            borderRadius: 5,
            border: "1px solid var(--border, #2a2f3b)",
            background: "var(--bg-tertiary, #252b38)",
            color: "var(--text-primary, #e8eaf0)",
            fontSize: 12,
          }}
        />
        <span style={{ fontSize: 10, color: "var(--text-muted, #8892a0)" }}>
          {unit}
        </span>
      </div>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface MarginLineEditorProps {
  toothId: string;
  libraryMesh: ParsedStlMesh;
  targetMesh: ParsedStlMesh;
  /** Called with a URL.createObjectURL URL for the synthesised crown PLY blob. */
  onResult?: (blobUrl: string, blob: Blob) => void;
}

export function MarginLineEditor({
  toothId,
  libraryMesh,
  targetMesh,
  onResult,
}: MarginLineEditorProps) {
  const [params, setParams] = useState<MarginParams>({
    x: 0,
    y: 0,
    z: 0,
    radius: 3.5,
  });
  const [status, setStatus] = useState<SynthesisStatus>({ type: "idle" });

  const set = (key: keyof MarginParams) => (v: number) =>
    setParams((p) => ({ ...p, [key]: v }));

  const handleSynthesize = async () => {
    setStatus({ type: "loading" });
    try {
      const libraryBlob = parsedMeshToStlBlob(libraryMesh);
      const targetBlob = parsedMeshToStlBlob(targetMesh);
      const crownBlob = await synthesizeCrown(
        libraryBlob,
        targetBlob,
        { x: params.x, y: params.y, z: params.z },
        params.radius,
        "ply"
      );
      const url = URL.createObjectURL(crownBlob);
      setStatus({ type: "success", resultUrl: url });
      onResult?.(url, crownBlob);
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Synthesis failed",
      });
    }
  };

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--bg-secondary, #1a1f2b)",
        borderRadius: 8,
        border: "1px solid var(--border, #2a2f3b)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary, #e8eaf0)",
            marginBottom: 2,
          }}
        >
          Crown Margin — Tooth #{toothId}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted, #8892a0)",
          }}
        >
          Set the margin centre in mesh space, then synthesize the crown via
          the mesh service.
        </div>
      </div>

      {/* Margin centre */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted, #8892a0)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Margin Centre
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <MarginInput label="X" value={params.x} onChange={set("x")} />
          <MarginInput label="Y" value={params.y} onChange={set("y")} />
          <MarginInput label="Z" value={params.z} onChange={set("z")} />
        </div>
      </div>

      {/* Margin radius */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted, #8892a0)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Margin Radius
        </div>
        <MarginInput
          label="Radius"
          value={params.radius}
          onChange={set("radius")}
          step={0.5}
        />
      </div>

      {/* Synthesize button */}
      <button
        onClick={handleSynthesize}
        disabled={status.type === "loading"}
        style={{
          padding: "8px 14px",
          background:
            status.type === "loading"
              ? "var(--bg-tertiary, #252b38)"
              : "var(--accent, #00b4d8)",
          color: status.type === "loading" ? "var(--text-muted)" : "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: status.type === "loading" ? "not-allowed" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {status.type === "loading" ? "Synthesizing…" : "Synthesize Crown"}
      </button>

      {/* Status feedback */}
      {status.type === "success" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.3)",
            borderRadius: 6,
            fontSize: 11,
            color: "#34d399",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          Crown synthesized — loaded into 3D viewer
          <a
            href={status.resultUrl}
            download={`crown_tooth${toothId}.ply`}
            style={{ marginLeft: "auto", color: "#34d399", fontSize: 11 }}
          >
            Download PLY
          </a>
        </div>
      )}

      {status.type === "error" && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 6,
            fontSize: 11,
            color: "#f87171",
          }}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
