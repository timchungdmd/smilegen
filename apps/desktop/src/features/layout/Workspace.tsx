import {
  Suspense,
  lazy,
  useEffect,
  useState,
  type CSSProperties,
  type ComponentType,
} from "react";
import type { ViewId } from "../../store/useViewportStore";
import {
  getWorkspaceRouteForView,
  useViewportStore,
} from "../../store/useViewportStore";
// ── Core views ─────────────────────────────────────────────────────────────
import { CaseListView } from "../views/CaseListView";
import { SettingsPanel } from "../settings/SettingsPanel";
import { ErrorBoundary } from "./ErrorBoundary";

const CaptureView = lazy(async () => {
  const mod = await import("../views/CaptureView");
  return { default: mod.CaptureView };
});

const OverviewView = lazy(async () => {
  const mod = await import("../views/OverviewView");
  return { default: mod.OverviewView };
});

const SimulateView = lazy(async () => {
  const mod = await import("../views/SimulateView");
  return { default: mod.SimulateView };
});

const PlanView = lazy(async () => {
  const mod = await import("../views/PlanView");
  return { default: mod.PlanView };
});

const ValidateView = lazy(async () => {
  const mod = await import("../views/ValidateView");
  return { default: mod.ValidateView };
});

const PresentView = lazy(async () => {
  const mod = await import("../views/PresentView");
  return { default: mod.PresentView };
});

const CollaborateView = lazy(async () => {
  const mod = await import("../views/CollaborateView");
  return { default: mod.CollaborateView };
});

interface WorkspaceProps {
  activeView: ViewId;
}

type LazyWorkspaceRoute =
  | "overview"
  | "capture"
  | "simulate"
  | "plan"
  | "validate"
  | "present"
  | "collaborate";

const LAZY_WORKSPACE_ROUTES: LazyWorkspaceRoute[] = [
  "overview",
  "capture",
  "simulate",
  "plan",
  "validate",
  "present",
  "collaborate",
];

const LAZY_WORKSPACE_ROUTE_SET = new Set<ViewId>(LAZY_WORKSPACE_ROUTES);

function WorkspaceLoadingFallback() {
  return (
    <div
      data-testid="workspace-loading-fallback"
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 0,
        padding: 24,
        color: "var(--text-muted, #8892a0)",
        fontSize: 13,
        letterSpacing: "0.02em",
        background: "var(--bg-primary, #121620)",
      }}
    >
      Loading workspace…
    </div>
  );
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
  const resolved = getWorkspaceRouteForView(activeView);
  const [mountedRoutes, setMountedRoutes] = useState<Set<ViewId>>(
    () => new Set(LAZY_WORKSPACE_ROUTE_SET.has(resolved) ? [resolved] : [])
  );

  useEffect(() => {
    if (!LAZY_WORKSPACE_ROUTE_SET.has(resolved)) {
      return;
    }

    setMountedRoutes((current) => {
      if (current.has(resolved)) {
        return current;
      }

      const next = new Set(current);
      next.add(resolved);
      return next;
    });
  }, [resolved]);

  const show = (id: ViewId): CSSProperties => ({
    display: resolved === id ? "flex" : "none",
    flex: 1,
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
  });

  const shouldRenderLazyRoute = (id: LazyWorkspaceRoute) =>
    mountedRoutes.has(id) || resolved === id;

  const renderLazyRoute = (
    id: LazyWorkspaceRoute,
    label: string,
    ViewComponent: ComponentType,
  ) => (
    <div key={id} style={show(id)}>
      {shouldRenderLazyRoute(id) ? (
        <Suspense fallback={resolved === id ? <WorkspaceLoadingFallback /> : null}>
          <ErrorBoundary label={label}>
            <ViewComponent />
          </ErrorBoundary>
        </Suspense>
      ) : null}
    </div>
  );

  return (
    <main
      id="workspace-panel"
      role="tabpanel"
      style={{
        gridRow: 2,
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
      {renderLazyRoute("overview", "Align", OverviewView)}
      {renderLazyRoute("capture", "Import", CaptureView)}
      {renderLazyRoute("simulate", "Design", SimulateView)}
      {renderLazyRoute("plan", "Design Planning", PlanView)}
      {renderLazyRoute("validate", "Review", ValidateView)}
      {renderLazyRoute("present", "Present", PresentView)}
      {renderLazyRoute("collaborate", "Collaborate", CollaborateView)}

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
