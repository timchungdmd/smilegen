import type { ViewId } from "../../store/useViewportStore";
// ── Legacy views (kept for backward compat) ────────────────────────────────
import { ImportView } from "../views/ImportView";
import { DesignView } from "../views/DesignView";
import { CompareView } from "../views/CompareView";
import { ExportView } from "../views/ExportView";
// ── Core views ─────────────────────────────────────────────────────────────
import { CaseListView } from "../views/CaseListView";
import { SettingsPanel } from "../settings/SettingsPanel";
import { ErrorBoundary } from "./ErrorBoundary";
// ── New workflow views ─────────────────────────────────────────────────────
import { OverviewView } from "../views/OverviewView";
import { CaptureView } from "../views/CaptureView";
import { SimulateView } from "../views/SimulateView";
import { PlanView } from "../views/PlanView";
import { ValidateView } from "../views/ValidateView";
import { PresentView } from "../views/PresentView";
import { CollaborateView } from "../views/CollaborateView";

interface WorkspaceProps {
  activeView: ViewId;
}

/**
 * All views are mounted on first render and kept alive via display:none.
 *
 * Using conditional rendering (`&&`) would unmount React Three Fiber trees
 * each time the user navigates away, destroying the WebGL context and losing
 * GPU-resident geometry, camera state, and orbit controls.
 *
 * With display:none the component tree stays mounted — only painting is
 * suppressed. The Canvas RAF loop pauses automatically and resumes when the
 * view becomes visible again.
 *
 * Legacy view IDs ("import", "design", "compare", "export") are mapped to
 * their modern equivalents to support any persisted navigation state.
 */
export function Workspace({ activeView }: WorkspaceProps) {
  // Resolve legacy aliases
  const resolved: ViewId =
    activeView === "import"
      ? "capture"
      : activeView === "design"
      ? "simulate"
      : activeView === "compare"
      ? "validate"
      : activeView === "export"
      ? "collaborate"
      : activeView;

  const show = (id: ViewId): React.CSSProperties => ({
    display: resolved === id ? "flex" : "none",
    flex: 1,
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
  });

  return (
    <main
      style={{
        gridRow: 3,
        gridColumn: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* ── Core ── */}
      <div style={show("cases")}>
        <ErrorBoundary label="Cases">
          <CaseListView />
        </ErrorBoundary>
      </div>

      {/* ── Workflow stages ── */}
      <div style={show("overview")}>
        <ErrorBoundary label="Overview">
          <OverviewView />
        </ErrorBoundary>
      </div>
      <div style={show("capture")}>
        <ErrorBoundary label="Capture">
          <CaptureView />
        </ErrorBoundary>
      </div>
      <div style={show("simulate")}>
        <ErrorBoundary label="Simulate">
          <SimulateView />
        </ErrorBoundary>
      </div>
      <div style={show("plan")}>
        <ErrorBoundary label="Plan">
          <PlanView />
        </ErrorBoundary>
      </div>
      <div style={show("validate")}>
        <ErrorBoundary label="Validate">
          <ValidateView />
        </ErrorBoundary>
      </div>
      <div style={show("present")}>
        <ErrorBoundary label="Present">
          <PresentView />
        </ErrorBoundary>
      </div>
      <div style={show("collaborate")}>
        <ErrorBoundary label="Collaborate">
          <CollaborateView />
        </ErrorBoundary>
      </div>

      {/* ── Utility ── */}
      <div
        style={{
          ...show("settings"),
          padding: 24,
          overflow: "auto",
          maxWidth: 600,
        }}
      >
        <ErrorBoundary label="Settings">
          <SettingsPanel />
        </ErrorBoundary>
      </div>
    </main>
  );
}
