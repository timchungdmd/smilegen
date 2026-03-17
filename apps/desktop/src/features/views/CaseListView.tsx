import { useEffect, useState, useCallback } from "react";
import { listCases, deleteCase, type SavedCaseSummary } from "../../services/caseDb";
import { useCaseStore } from "../../store/useCaseStore";

// ── Stage progress mapping ────────────────────────────────────────────────────

const CLINICAL_STAGES = [
  { id: "import", label: "Import" },
  { id: "align", label: "Align" },
  { id: "design", label: "Design" },
  { id: "review", label: "Review" },
  { id: "present", label: "Present" },
] as const;

/** Maps legacy workflowState values to how many pipeline stages are complete */
function stagesComplete(workflowState: string): number {
  switch (workflowState) {
    case "draft":
      return 0;
    case "imported":
      return 1; // Capture done
    case "mapped":
      return 2; // Simulate done
    case "prepared":
      return 3; // Plan done
    case "needs_doctor_review":
      return 3; // Validate in progress (plan still last full stage)
    case "doctor_approved":
      return 4; // Validate done
    case "exported":
      return 6; // All done
    default:
      return 0;
  }
}

/** Human-readable label for legacy workflowState */
function stageLabel(workflowState: string): string {
  switch (workflowState) {
    case "draft":
      return "Started";
    case "imported":
      return "Assets imported";
    case "mapped":
      return "Design generated";
    case "prepared":
      return "Treatment planned";
    case "needs_doctor_review":
      return "Awaiting review";
    case "doctor_approved":
      return "Doctor approved";
    case "exported":
      return "Delivered";
    default:
      return workflowState;
  }
}

/** Badge colour for a workflowState */
function stageBadgeStyle(workflowState: string): React.CSSProperties {
  const color =
    workflowState === "doctor_approved" || workflowState === "exported"
      ? "#34d399"
      : workflowState === "needs_doctor_review"
      ? "#fbbf24"
      : workflowState === "draft"
      ? "#8892a0"
      : "#60a5fa";

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.04em",
    background: `${color}1a`,
    color,
    border: `1px solid ${color}40`,
    whiteSpace: "nowrap" as const,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StagePipeline({ workflowState }: { workflowState: string }) {
  const done = stagesComplete(workflowState);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginTop: 10,
        marginBottom: 2,
      }}
    >
      {CLINICAL_STAGES.map((stage, i) => {
        const isComplete = i < done;
        const isCurrent = i === done && workflowState !== "exported";
        return (
          <div
            key={stage.id}
            title={stage.label}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: isComplete
                ? "#00b4d8"
                : isCurrent
                ? "rgba(0,180,216,0.25)"
                : "var(--border, #2a2f3b)",
              transition: "background 0.2s",
            }}
          />
        );
      })}
    </div>
  );
}

function StageLabels({ workflowState }: { workflowState: string }) {
  const done = stagesComplete(workflowState);
  const current = CLINICAL_STAGES[done];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 9,
        color: "var(--text-muted, #8892a0)",
        marginTop: 2,
      }}
    >
      <span>{CLINICAL_STAGES[0].label}</span>
      {current && done < CLINICAL_STAGES.length && (
        <span style={{ color: "var(--accent, #00b4d8)" }}>
          {current.label} →
        </span>
      )}
      <span>{CLINICAL_STAGES[CLINICAL_STAGES.length - 1].label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CaseListView() {
  const [cases, setCases] = useState<SavedCaseSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const refreshCases = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listCases();
      setCases(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  const handleNewCase = () => {
    useCaseStore.getState().newCase();
  };

  /**
   * Load the case and let the store choose the canonical workspace stage
   * based on the saved case readiness.
   */
  const handleOpenCase = async (id: string) => {
    setOpeningId(id);
    try {
      await useCaseStore.getState().loadCaseFromDB(id);
    } finally {
      setOpeningId(null);
    }
  };

  const handleDeleteCase = async (id: string) => {
    await deleteCase(id);
    setDeleteConfirmId(null);
    await refreshCases();
  };

  const filteredCases = searchQuery.trim()
    ? cases.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : cases;

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 960,
        margin: "0 auto",
        overflow: "auto",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary, #e8eaf0)",
              margin: 0,
            }}
          >
            Cases
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted, #8892a0)",
              margin: "4px 0 0",
            }}
          >
            {cases.length > 0
              ? `${cases.length} case${cases.length === 1 ? "" : "s"}`
              : "Start your first smile design"}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleNewCase}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
          </svg>
          New Case
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 20 }}>
        <input
          className="input"
          type="text"
          placeholder="Search cases by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: "100%", padding: "8px 12px", boxSizing: "border-box" }}
        />
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: "var(--text-muted, #8892a0)",
          }}
        >
          Loading cases…
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && cases.length === 0 && (
        <div
          className="card"
          style={{ textAlign: "center", padding: 48 }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted, #8892a0)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "block", margin: "0 auto 16px" }}
          >
            <path d="M9 12h.01M15 12h.01M12 17c2.5 0 4-1 4-3H8c0 2 1.5 3 4 3z" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary, #e8eaf0)",
              marginBottom: 6,
            }}
          >
            No cases yet
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #8892a0)",
              marginBottom: 20,
            }}
          >
            Create your first case to start the smile design workflow.
          </div>
          <button className="btn btn-primary" onClick={handleNewCase}>
            + New Case
          </button>
        </div>
      )}

      {/* ── No search results ── */}
      {!loading && cases.length > 0 && filteredCases.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: 24,
            color: "var(--text-muted, #8892a0)",
          }}
        >
          No cases match &quot;{searchQuery}&quot;
        </div>
      )}

      {/* ── Case grid ── */}
      {!loading && filteredCases.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {filteredCases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="card"
              style={{
                cursor: "default",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Title + badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--text-primary, #e8eaf0)",
                  }}
                >
                  {caseItem.title}
                </div>
                <span style={stageBadgeStyle(caseItem.workflowState)}>
                  {stageLabel(caseItem.workflowState)}
                </span>
              </div>

              {/* Pipeline progress */}
              <StagePipeline workflowState={caseItem.workflowState} />
              <StageLabels workflowState={caseItem.workflowState} />

              {/* Dates */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--text-muted, #8892a0)",
                  marginTop: 10,
                }}
              >
                <span>Created {formatDate(caseItem.createdAt)}</span>
                <span>Updated {formatDate(caseItem.updatedAt)}</span>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                  gap: 8,
                }}
              >
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: 12 }}
                  disabled={openingId === caseItem.id}
                  onClick={() => handleOpenCase(caseItem.id)}
                >
                  {openingId === caseItem.id ? "Opening…" : "Open →"}
                </button>

                {deleteConfirmId === caseItem.id ? (
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span
                      style={{ fontSize: 11, color: "var(--danger, #f87171)" }}
                    >
                      Delete?
                    </span>
                    <button
                      className="btn btn-sm"
                      style={{
                        borderColor: "var(--danger, #f87171)",
                        color: "var(--danger, #f87171)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCase(caseItem.id);
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(null);
                      }}
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    className="btn btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(caseItem.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
