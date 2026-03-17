import { useMemo, useCallback, useEffect } from "react";
import { useViewportStore } from "../../store/useViewportStore";
import { useImportStore } from "../../store/useImportStore";
import { useKeyboardShortcuts } from "../shortcuts/useKeyboardShortcuts";
import { useDropZone } from "../import/useDropZone";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Workspace } from "./Workspace";
import { useWorkspaceVariantStore } from "../experiments/workspaceVariantStore";
import {
  finishWorkspaceSession,
  startWorkspaceSession,
  syncWorkspaceVariant,
  trackWorkspaceView,
} from "../experiments/workspaceMetrics";

export function AppShell() {
  const activeView = useViewportStore((s) => s.activeView);
  const workspaceVariant = useWorkspaceVariantStore((s) => s.variant);

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  // Global drag-and-drop file import
  const handlePhotosSelected = useImportStore((s) => s.handlePhotosSelected);
  const handleArchScanSelected = useImportStore((s) => s.handleArchScanSelected);
  const handleToothModelsSelected = useImportStore((s) => s.handleToothModelsSelected);

  const onPhotos = useCallback(
    (files: File[]) => {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handlePhotosSelected(dt.files);
    },
    [handlePhotosSelected]
  );

  const onArchScan = useCallback(
    (file: File) => {
      const dt = new DataTransfer();
      dt.items.add(file);
      handleArchScanSelected(dt.files);
    },
    [handleArchScanSelected]
  );

  const onToothModels = useCallback(
    (files: File[]) => {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleToothModelsSelected(dt.files);
    },
    [handleToothModelsSelected]
  );

  const dropHandlers = useMemo(
    () => ({ onPhotos, onArchScan, onToothModels }),
    [onPhotos, onArchScan, onToothModels]
  );
  const { isDragging } = useDropZone(dropHandlers);

  useEffect(() => {
    startWorkspaceSession(workspaceVariant);

    return () => {
      finishWorkspaceSession();
    };
  }, []);

  useEffect(() => {
    syncWorkspaceVariant(workspaceVariant);
  }, [workspaceVariant]);

  useEffect(() => {
    trackWorkspaceView(activeView);
  }, [activeView]);

  return (
    <div
      className="app-shell"
      data-workspace-variant={workspaceVariant}
      style={{
        display: "grid",
        gridTemplateColumns: "var(--sidebar-width) 1fr",
        gridTemplateRows: "var(--header-height) 1fr",
        height: "100vh",
        overflow: "hidden",
        position: "relative"
      }}
    >
      <Header />
      <Sidebar activeView={activeView} />
<Workspace activeView={activeView} />

      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 180, 216, 0.08)",
            border: "3px dashed var(--accent)",
            borderRadius: 8,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none"
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "20px 40px",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              color: "var(--accent)"
            }}
          >
            Drop files to import
          </div>
        </div>
      )}
    </div>
  );
}
