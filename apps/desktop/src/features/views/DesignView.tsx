import { DesignToolbar } from "../design/DesignToolbar";
import { DesignViewport } from "../design/DesignViewport";
import { DesignSidebar } from "../design/DesignSidebar";
import { useResizeHandle } from "../../hooks/useResizeHandle";

/**
 * Design view shell — composes the toolbar, centre viewport, and sidebar.
 * All state is read by each sub-component directly from the Zustand stores.
 */
export function DesignView() {
  const { width: sidebarWidth, handleProps } = useResizeHandle({
    initialWidth: 280,
    minWidth: 220,
    maxWidth: 400,
    storageKey: "smilegen-sidebar-width",
    direction: "left",
  });

  return (
    <div
      className="design-view-grid"
      style={{ gridTemplateColumns: `1fr ${sidebarWidth}px` }}
    >
      {/* Main design area: toolbar + viewport + tooth strip */}
      <div className="design-view-main">
        <DesignToolbar />
        <DesignViewport />
      </div>

      {/* Right sidebar */}
      <div style={{ position: "relative" }}>
        <div {...handleProps} />
        <DesignSidebar />
      </div>
    </div>
  );
}
