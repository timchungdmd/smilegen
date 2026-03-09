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

export function Workspace({ activeView }: WorkspaceProps) {
  return (
    <main
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {activeView === "cases" && <CaseListView />}
      {activeView === "import" && <ImportView />}
      {activeView === "design" && <DesignView />}
      {activeView === "compare" && <CompareView />}
      {activeView === "export" && <ExportView />}
      {activeView === "settings" && (
        <div style={{ padding: 24, overflow: "auto", maxWidth: 600 }}>
          <SettingsPanel />
        </div>
      )}
    </main>
  );
}
