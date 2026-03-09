import { useMemo } from "react";
import { useCaseStore } from "../../store/useCaseStore";
import { useViewportStore } from "../../store/useViewportStore";
import { useDesignStore, selectActiveVariant } from "../../store/useDesignStore";
import { useImportStore } from "../../store/useImportStore";
import { validateImportSet } from "../import/importService";
import { IconUndo, IconRedo, IconDownload } from "../ui/icons";

export function Header() {
  const caseRecord = useCaseStore((s) => s.caseRecord);
  const activeView = useViewportStore((s) => s.activeView);
  const activeVariant = useDesignStore(selectActiveVariant);
  const quickGenerate = useDesignStore((s) => s.quickGenerate);
  const downloadActiveStl = useDesignStore((s) => s.downloadActiveStl);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanName = useImportStore((s) => s.archScanName);
  const uploadedToothModels = useImportStore((s) => s.uploadedToothModels);
  const generatedDesign = useDesignStore((s) => s.generatedDesign);

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
    <header className="app-header">
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
          aria-label="Undo last change"
          title="Undo (Ctrl+Z)"
          onClick={() => useDesignStore.temporal?.getState()?.undo?.()}
          style={{ padding: 5 }}
        >
          <IconUndo />
        </button>
        <button
          className="btn-icon"
          aria-label="Redo"
          title="Redo (Ctrl+Y)"
          onClick={() => useDesignStore.temporal?.getState()?.redo?.()}
          style={{ padding: 5 }}
        >
          <IconRedo />
        </button>

        <div style={{ height: 20, width: 1, background: "var(--border)", marginLeft: 2, marginRight: 2 }} />

        {canQuickGenerate && !activeVariant && (
          <button className="btn btn-primary btn-sm" onClick={quickGenerate}>
            Generate Design
          </button>
        )}
        {activeVariant && (
          <button className="btn btn-sm" onClick={downloadActiveStl}>
            <IconDownload width={14} height={14} />
            Export STL
          </button>
        )}
      </div>
    </header>
  );
}
