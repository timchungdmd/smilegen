import { DesignToolbar } from "../design/DesignToolbar";
import { DesignViewport } from "../design/DesignViewport";
import { DesignSidebar } from "../design/DesignSidebar";

/**
 * Design view shell — composes the toolbar, centre viewport, and sidebar.
 * All state is read by each sub-component directly from the Zustand stores.
 */
export function DesignView() {
  return (
    <div className="design-view-grid">
      {/* Main design area: toolbar + viewport + tooth strip */}
      <div className="design-view-main">
        <DesignToolbar />
        <DesignViewport />
      </div>

      {/* Right sidebar */}
      <DesignSidebar />
    </div>
  );
}
