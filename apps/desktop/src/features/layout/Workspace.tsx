import type { ViewId } from "../../store/useViewportStore";
import { ImportView } from "../views/ImportView";
import { DesignView } from "../views/DesignView";
import { CompareView } from "../views/CompareView";
import { ExportView } from "../views/ExportView";
import { CaseListView } from "../views/CaseListView";
import { SettingsPanel } from "../settings/SettingsPanel";

interface WorkspaceProps {
  activeView: ViewId;
}

/**
 * All views are mounted on first render and kept alive via display:none.
 *
 * Using conditional rendering (`&&`) would unmount DesignView's React Three
 * Fiber tree each time the user navigates away, destroying the WebGL context
 * and losing GPU-resident geometry, camera state, and orbit controls.
 *
 * With display:none the component tree stays mounted — only painting is
 * suppressed. The Canvas RAF loop pauses automatically and resumes when the
 * view becomes visible again.
 */
export function Workspace({ activeView }: WorkspaceProps) {
  // Shared style for the active view slot — fills all available flex space
  const show = (id: ViewId): React.CSSProperties => ({
    display: activeView === id ? "flex" : "none",
    flex: 1,
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0
  });

  return (
    <main
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div style={show("cases")}><CaseListView /></div>
      <div style={show("import")}><ImportView /></div>
      <div style={show("design")}><DesignView /></div>
      <div style={show("compare")}><CompareView /></div>
      <div style={show("export")}><ExportView /></div>
      <div style={{ ...show("settings"), padding: 24, overflow: "auto", maxWidth: 600 }}>
        <SettingsPanel />
      </div>
    </main>
  );
}
