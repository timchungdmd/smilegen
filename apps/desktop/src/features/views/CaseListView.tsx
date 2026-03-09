import { useEffect, useState, useCallback } from "react";
import { listCases, deleteCase, type SavedCaseSummary } from "../../services/caseDb";
import { useCaseStore } from "../../store/useCaseStore";

function workflowBadgeClass(state: string): string {
  switch (state) {
    case "draft":
      return "badge badge-warning";
    case "imported":
    case "mapped":
      return "badge badge-info";
    case "prepared":
    case "needs_doctor_review":
      return "badge badge-success";
    case "doctor_approved":
    case "exported":
      return "badge badge-success";
    default:
      return "badge badge-info";
  }
}

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

export function CaseListView() {
  const [cases, setCases] = useState<SavedCaseSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const handleLoadCase = async (id: string) => {
    await useCaseStore.getState().loadCaseFromDB(id);
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
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto", overflow: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Cases</h2>
        <button className="btn btn-primary" onClick={handleNewCase}>
          + New Case
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          type="text"
          placeholder="Search cases by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: "100%", padding: "8px 12px" }}
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
          Loading cases...
        </div>
      )}

      {/* Empty state */}
      {!loading && cases.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: 40,
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 8 }}>No saved cases yet</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            Create a new case to get started with your smile design workflow.
          </div>
          <button className="btn btn-primary" onClick={handleNewCase}>
            + New Case
          </button>
        </div>
      )}

      {/* No results for search */}
      {!loading && cases.length > 0 && filteredCases.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: 24,
            color: "var(--text-secondary)",
          }}
        >
          No cases match &quot;{searchQuery}&quot;
        </div>
      )}

      {/* Case grid */}
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
              style={{ cursor: "pointer", position: "relative" }}
              onClick={() => handleLoadCase(caseItem.id)}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {caseItem.title}
                </div>
                <span className={workflowBadgeClass(caseItem.workflowState)}>
                  {caseItem.workflowState}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
                <span>Created {formatDate(caseItem.createdAt)}</span>
                <span>Updated {formatDate(caseItem.updatedAt)}</span>
              </div>

              {/* Delete button */}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                {deleteConfirmId === caseItem.id ? (
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--danger)" }}>Delete?</span>
                    <button
                      className="btn btn-sm"
                      style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
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
