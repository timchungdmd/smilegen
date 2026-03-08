import { useMemo } from "react";
import { useSmileStore, selectActiveVariant } from "../../store/useSmileStore";
import { validateImportSet } from "../import/importService";

export function Header() {
  const caseRecord = useSmileStore((s) => s.caseRecord);
  const activeView = useSmileStore((s) => s.activeView);
  const activeVariant = useSmileStore(selectActiveVariant);
  const quickGenerate = useSmileStore((s) => s.quickGenerate);
  const downloadActiveStl = useSmileStore((s) => s.downloadActiveStl);
  const uploadedPhotos = useSmileStore((s) => s.uploadedPhotos);
  const archScanName = useSmileStore((s) => s.archScanName);
  const uploadedToothModels = useSmileStore((s) => s.uploadedToothModels);
  const generatedDesign = useSmileStore((s) => s.generatedDesign);

  const statusLabel = caseRecord?.workflowState ?? "draft";
  const canQuickGenerate = useMemo(() => {
    const v = validateImportSet({
      photos: uploadedPhotos.map((p) => p.name),
      archScan: archScanName,
      toothLibrary: uploadedToothModels.map((m) => m.name)
    });
    return v.ok;
  }, [uploadedPhotos, archScanName, uploadedToothModels]);

  // Workflow steps
  const steps = [
    { id: "import", label: "Import", done: Boolean(archScanName && uploadedPhotos.length) },
    { id: "design", label: "Design", done: Boolean(generatedDesign) },
    { id: "compare", label: "Review", done: Boolean(generatedDesign) },
    { id: "export", label: "Export", done: statusLabel === "prepared" }
  ];

  return (
    <header
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        zIndex: 100
      }}
    >
      {/* Left: brand + case info */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="var(--accent)" opacity="0.15" />
            <path
              d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 14c-2.2 0-4-1.8-4-4h2c0 1.1.9 2 2 2s2-.9 2-2h2c0 2.2-1.8 4-4 4z"
              fill="var(--accent)"
            />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>SmileGen</span>
        </div>

        <div style={{ height: 20, width: 1, background: "var(--border-emphasis)" }} />

        <span style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {caseRecord?.title ?? "No case"}
        </span>

        <span
          className={`badge ${
            statusLabel === "prepared"
              ? "badge-success"
              : statusLabel === "mapped"
                ? "badge-info"
                : "badge-warning"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Center: workflow steps */}
      <div className="workflow-steps">
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && <div className="workflow-step-connector" />}
            <div
              className={`workflow-step ${
                activeView === step.id ? "active" : step.done ? "completed" : ""
              }`}
            >
              <div className="workflow-step-dot" />
              <span>{step.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Right: actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Undo / Redo */}
        <button
          className="btn-icon"
          title="Undo (Ctrl+Z)"
          onClick={() => useSmileStore.temporal?.getState()?.undo?.()}
          style={{ padding: 5 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
          </svg>
        </button>
        <button
          className="btn-icon"
          title="Redo (Ctrl+Y)"
          onClick={() => useSmileStore.temporal?.getState()?.redo?.()}
          style={{ padding: 5 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
          </svg>
        </button>

        <div style={{ height: 20, width: 1, background: "var(--border)", marginLeft: 2, marginRight: 2 }} />

        {canQuickGenerate && !activeVariant && (
          <button className="btn btn-primary btn-sm" onClick={quickGenerate}>
            Generate Design
          </button>
        )}
        {activeVariant && (
          <button className="btn btn-sm" onClick={downloadActiveStl}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Export STL
          </button>
        )}
      </div>
    </header>
  );
}
