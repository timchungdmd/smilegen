import { useMemo, useState } from "react";
import { useCaseStore } from "../../store/useCaseStore";
import {
  getCaseWorkflowStage,
  useViewportStore,
  type CaseWorkflowStage,
} from "../../store/useViewportStore";
import { useDesignStore, selectActiveVariant } from "../../store/useDesignStore";
import { useImportStore } from "../../store/useImportStore";
import { validateImportSet } from "../import/importService";
import { IconUndo, IconRedo, IconDownload } from "../ui/icons";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  areWorkspaceExperimentsEnabled,
  useWorkspaceVariantStore,
} from "../experiments/workspaceVariantStore";

const WORKFLOW_STEPS: { id: CaseWorkflowStage; label: string; done: (args: {
  hasAssetsReady: boolean;
  hasGeneratedDesign: boolean;
  hasAlignmentReady: boolean;
  isReviewReady: boolean;
  hasPresentationReady: boolean;
  statusLabel: string;
}) => boolean }[] = [
  {
    id: "import",
    label: "Import",
    done: ({ hasAssetsReady }) => hasAssetsReady,
  },
  {
    id: "design",
    label: "Design",
    done: ({ hasGeneratedDesign, hasAlignmentReady }) => hasGeneratedDesign && hasAlignmentReady,
  },
  {
    id: "review",
    label: "Review",
    done: ({ isReviewReady }) => isReviewReady,
  },
  {
    id: "present",
    label: "Present",
    done: ({ hasPresentationReady }) => hasPresentationReady,
  },
  {
    id: "handoff",
    label: "Handoff",
    done: ({ statusLabel }) => statusLabel === "exported",
  },
];

type GuidedStepState = "active" | "completed" | "available" | "locked";

function getGuidedStepState(args: {
  step: CaseWorkflowStage;
  activeStage: CaseWorkflowStage | null;
  hasAssetsReady: boolean;
  hasGeneratedDesign: boolean;
  hasAlignmentReady: boolean;
  isReviewReady: boolean;
  hasPresentationReady: boolean;
  statusLabel: string;
}): GuidedStepState {
  const {
    step,
    activeStage,
    hasAssetsReady,
    hasGeneratedDesign,
    hasAlignmentReady,
    isReviewReady,
    hasPresentationReady,
    statusLabel,
  } = args;
  const activeStepIndex = activeStage
    ? WORKFLOW_STEPS.findIndex((candidate) => candidate.id === activeStage)
    : -1;
  const stepIndex = WORKFLOW_STEPS.findIndex((candidate) => candidate.id === step);
  const isStepCompleted = WORKFLOW_STEPS[stepIndex]?.done({
    hasAssetsReady,
    hasGeneratedDesign,
    hasAlignmentReady,
    isReviewReady,
    hasPresentationReady,
    statusLabel,
  }) ?? false;

  if (activeStage === step) {
    return "active";
  }

  if (isStepCompleted && activeStepIndex > stepIndex) {
    return "completed";
  }

  switch (step) {
    case "import":
      return hasAssetsReady ? "completed" : "available";
    case "design":
      return isStepCompleted ? "completed" : hasAssetsReady ? "available" : "locked";
    case "review":
      return isStepCompleted ? "completed" : hasGeneratedDesign && hasAlignmentReady ? "available" : "locked";
    case "present":
      return isStepCompleted ? "completed" : isReviewReady ? "available" : "locked";
    case "handoff":
      return isStepCompleted ? "completed" : hasPresentationReady ? "available" : "locked";
    default:
      return "locked";
  }
}

export function Header() {
  const caseRecord = useCaseStore((s) => s.caseRecord);
  const activeView = useViewportStore((s) => s.activeView);
  const activeVariant = useDesignStore(selectActiveVariant);
  const generateDesign = useDesignStore((s) => s.generateDesign);
  const downloadActiveStl = useDesignStore((s) => s.downloadActiveStl);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const archScanName = useImportStore((s) => s.archScanName);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const uploadedToothModels = useImportStore((s) => s.uploadedToothModels);
  const generatedDesign = useDesignStore((s) => s.generatedDesign);
  const readyForDoctor = useDesignStore((s) => s.readyForDoctor);
  const hasAlignmentReady = useViewportStore((s) => s.getCompletedPairCount() >= 3);
  const variants = useDesignStore((s) => s.variants);
  const [showNewCaseDialog, setShowNewCaseDialog] = useState(false);
  const workspaceVariant = useWorkspaceVariantStore((s) => s.variant);
  const setWorkspaceVariant = useWorkspaceVariantStore((s) => s.setVariant);
  const showWorkspaceVariantToggle = areWorkspaceExperimentsEnabled();
  const isWorkspaceVariant = workspaceVariant === "workspace";

  const statusLabel = caseRecord?.workflowState ?? "draft";
  const activeStage = getCaseWorkflowStage(activeView);
  const canQuickGenerate = useMemo(() => {
    const v = validateImportSet({
      photos: uploadedPhotos.map((p) => p.name),
      archScan: archScanName,
      toothLibrary: uploadedToothModels.map((m) => m.name)
    });
    return v.ok;
  }, [uploadedPhotos, archScanName, uploadedToothModels]);

  const hasAssetsReady = Boolean(archScanName && uploadedPhotos.length);

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

        <div className="case-studio-label" data-testid="case-studio-landmark">
          <span className="case-studio-label__eyebrow">
            {isWorkspaceVariant ? "Studio" : "Workspace"}
          </span>
          <span className="case-studio-label__title">Case Studio</span>
        </div>
      </div>

      {/* Center: workflow steps */}
      {isWorkspaceVariant ? (
        <div className="workspace-header-focus">
          <span className="workspace-header-focus__eyebrow">Clinical design studio</span>
          <span className="workspace-header-focus__title">
            Switch freely between Import, Design, Review, Present, and Handoff
          </span>
        </div>
      ) : (
        <div className="workflow-steps" data-testid="header-progress-chrome">
          {WORKFLOW_STEPS.map((step, i) => {
            const stepState = getGuidedStepState({
              step: step.id,
              activeStage,
              hasAssetsReady,
              hasGeneratedDesign: Boolean(generatedDesign),
              hasAlignmentReady,
              isReviewReady: readyForDoctor || statusLabel === "prepared",
              hasPresentationReady: caseRecord?.presentationReady ?? false,
              statusLabel,
            });

            return (
            <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <div className="workflow-step-connector" />}
              <div
                className={`workflow-step ${
                  stepState === "active"
                    ? "active"
                    : stepState === "completed"
                      ? "completed"
                      : stepState === "available"
                        ? "available"
                        : "locked"
                }`}
                data-testid={`guided-progress-step-${step.id}`}
                data-state={stepState}
              >
                <div className="workflow-step-dot" />
                <span>{step.label}</span>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Right: actions */}
      <div
        className="header-action-zone"
        data-testid="header-action-zone"
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        {showWorkspaceVariantToggle && (
          <>
            <div className="workspace-variant-toggle" role="group" aria-label="Workspace Variant">
              <button
                className={`workspace-variant-toggle__button ${
                  workspaceVariant === "workspace" ? "is-active" : ""
                }`}
                onClick={() => setWorkspaceVariant("workspace")}
                aria-pressed={workspaceVariant === "workspace"}
              >
                Workspace
              </button>
              <button
                className={`workspace-variant-toggle__button ${
                  workspaceVariant === "guided" ? "is-active" : ""
                }`}
                onClick={() => setWorkspaceVariant("guided")}
                aria-pressed={workspaceVariant === "guided"}
              >
                Guided
              </button>
            </div>

            <div
              style={{
                height: 20,
                width: 1,
                background: "var(--border)",
                marginLeft: 2,
                marginRight: 2,
              }}
            />
          </>
        )}

        <button
          onClick={() => setShowNewCaseDialog(true)}
          style={{
            padding: "4px 10px",
            background: "transparent",
            border: "1px solid var(--border, #2a2f3b)",
            borderRadius: 5,
            cursor: "pointer",
            fontSize: 11,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
          }}
          title="Discard current case and start fresh"
        >
          New Case
        </button>

        <ConfirmDialog
          open={showNewCaseDialog}
          title="Start New Case?"
          message="All unsaved changes will be lost."
          details={[
            `${uploadedPhotos.length} photo${uploadedPhotos.length !== 1 ? "s" : ""}`,
            archScanMesh ? "1 arch scan" : null,
            `${variants.length} design variant${variants.length !== 1 ? "s" : ""}`,
          ].filter(Boolean) as string[]}
          confirmLabel="Discard & Start New"
          confirmDanger
          onConfirm={() => { useCaseStore.getState().newCase(); setShowNewCaseDialog(false); }}
          onCancel={() => setShowNewCaseDialog(false)}
        />

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
          {canQuickGenerate && !activeVariant && (
            <button className="btn btn-primary btn-sm" onClick={generateDesign}>
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
