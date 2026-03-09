import { DesignToolbar } from "../design/DesignToolbar";
import { DesignViewport } from "../design/DesignViewport";
import { DesignSidebar } from "../design/DesignSidebar";

/**
 * Design view shell — composes the toolbar, centre viewport, and sidebar.
 * All state is read by each sub-component directly from the Zustand stores.
 */
export function DesignView() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 280px",
        height: "100%",
        overflow: "hidden"
      }}
    >
      {/* Main design area: toolbar + viewport + tooth strip */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <DesignToolbar />
        <DesignViewport />
      </div>

      {/* Right sidebar */}
      <DesignSidebar />
    </div>
  );
}
