import {
  Suspense,
  lazy,
  useEffect,
  useState,
  useRef,
  useCallback,
  type CSSProperties,
  type ComponentType,
} from "react";
import type { ViewId } from "../../store/useViewportStore";
import {
  normalizeViewId,
  useViewportStore,
} from "../../store/useViewportStore";
import { useImportStore } from "../../store/useImportStore";
import { useDesignStore } from "../../store/useDesignStore";
import { useAlignmentStore } from "../../store/useAlignmentStore";
import { SceneCanvas } from "../viewer/SceneCanvas";
import { useResizeHandle } from "../../hooks/useResizeHandle";
import { PhotoLandmarkOverlay } from "../alignment/PhotoLandmarkOverlay";
import { AlignmentConnectionLines } from "../alignment/AlignmentConnectionLines";

// ── Core view panels ───────────────────────────────────────────────────────
import { CaseListView } from "../views/CaseListView";
import { SettingsPanel } from "../settings/SettingsPanel";
import { ErrorBoundary } from "./ErrorBoundary";

const CaptureView = lazy(async () => {
  const mod = await import("../views/CaptureView");
  return { default: mod.CaptureView };
});

const SimulateView = lazy(async () => {
  const mod = await import("../views/SimulateView");
  return { default: mod.SimulateView };
});

const ValidateView = lazy(async () => {
  const mod = await import("../views/ValidateView");
  return { default: mod.ValidateView };
});

const PresentView = lazy(async () => {
  const mod = await import("../views/PresentView");
  return { default: mod.PresentView };
});

const HandoffView = lazy(async () => {
  const mod = await import("../views/HandoffView");
  return { default: mod.HandoffView };
});

interface WorkspaceProps {
  activeView: ViewId;
}

type LazyWorkspaceRoute = "import" | "design" | "review" | "present" | "handoff";

const LAZY_WORKSPACE_ROUTES: LazyWorkspaceRoute[] = [
  "import",
  "design",
  "review",
  "present",
  "handoff",
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
      Loading...
    </div>
  );
}

/**
 * Workspace — The main layout container with a split view.
 * 
 * Left: Dynamic feature area (Import assets, Design tools, etc.)
 * Right: Persistent 3D Scan Preview
 */
export function Workspace({ activeView }: WorkspaceProps) {
  const resolved = normalizeViewId(activeView);
  const [mountedRoutes, setMountedRoutes] = useState<Set<ViewId>>(
    () => new Set(LAZY_WORKSPACE_ROUTE_SET.has(resolved) ? [resolved] : [])
  );

  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const activeVariant = useDesignStore((s) => {
    const design = s.generatedDesign;
    if (!design) return null;
    return design.variants.find(v => v.id === s.activeVariantId) || design.variants[0] || null;
  });
  const isAlignmentMode = useAlignmentStore((s) => s.isAlignmentMode);
  const activeLandmarkId = useAlignmentStore((s) => s.activeLandmarkId);
  const getCompletedPairCount = useAlignmentStore((s) => s.getCompletedPairCount);
  const setAlignmentMode = useAlignmentStore((s) => s.setAlignmentMode);
  const canEnterAlignment =
    resolved === "design" && uploadedPhotos.length > 0 && Boolean(archScanMesh);

  // Split view state for photo/scan preview
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftContainerRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const photoImageRef = useRef<HTMLImageElement | null>(null);
  const [photoImageElement, setPhotoImageElement] = useState<HTMLImageElement | null>(null);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSplit]);

  // Resize handle for the left panel
  const { width: panelWidth, handleProps } = useResizeHandle({
    initialWidth: 400,
    minWidth: 300,
    maxWidth: 600,
    storageKey: "smilegen-main-panel-width",
    direction: "right",
  });

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

  useEffect(() => {
    if (resolved !== "design" && isAlignmentMode) {
      setAlignmentMode(false);
    }
  }, [isAlignmentMode, resolved, setAlignmentMode]);

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

  // In 'cases' or 'settings' mode, we might want a full-width view.
  // But for the work stages (import, design, etc.), we use the split.
  const isWorkStage = LAZY_WORKSPACE_ROUTE_SET.has(resolved);

  return (
    <main
      id="workspace-panel"
      role="tabpanel"
      style={{
        gridRow: 2,
        gridColumn: 2,
        overflow: "hidden",
        position: "relative",
        minHeight: 0,
      }}
    >
      {/* ── Split View: Photo (left) | 3D Scan (right) with resizable divider ── */}
      {isWorkStage && (
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "row",
            background: "var(--bg-app)",
            zIndex: 0,
          }}
        >
        {/* Left: Photo View */}
        <div
          style={{
            width: `${splitRatio * 100}%`,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid var(--border)",
              background: "rgba(15, 20, 25, 0.8)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={uploadedPhotos.length > 0 ? "var(--success)" : "var(--text-muted)"}>
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Photo
            </span>
          </div>
          <div
            ref={leftContainerRef}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflow: "hidden", minWidth: 0, position: "relative" }}
          >
        {uploadedPhotos.length > 0 ? (
          <img
            ref={(el) => {
              photoImageRef.current = el;
              setPhotoImageElement(el);
            }}
            src={uploadedPhotos[0].url}
            alt="Patient photo"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              borderRadius: 8,
              pointerEvents: isAlignmentMode ? "none" : "auto",
            }}
          />
        ) : (
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3, marginBottom: 8 }}>
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
              <div style={{ fontSize: 11 }}>No photo imported</div>
            </div>
          )}
          <PhotoLandmarkOverlay containerRef={leftContainerRef} imageElement={photoImageElement} />
        </div>
        </div>

          {/* Resizable Divider */}
          <div
            onMouseDown={handleSplitMouseDown}
            style={{
              width: 8,
              cursor: "col-resize",
              background: isDraggingSplit ? "var(--accent)" : "transparent",
              position: "relative",
              zIndex: 20,
              flexShrink: 0,
              transition: "background 0.15s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 2,
                height: 40,
                borderRadius: 1,
                background: isDraggingSplit ? "var(--accent)" : "var(--text-muted)",
                opacity: isDraggingSplit ? 1 : 0.5,
              }}
            />
          </div>

        {/* Right: 3D Scan View */}
        <div
          ref={rightContainerRef}
          style={{
            width: `${(1 - splitRatio) * 100}%`,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minWidth: 0,
          }}
        >
          <SceneCanvas archScanMesh={archScanMesh} activeVariant={activeVariant} />
        </div>
        <AlignmentConnectionLines leftContainerRef={leftContainerRef} rightContainerRef={rightContainerRef} imageElement={photoImageElement} />
      </div>
    )}

      {isWorkStage && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 10,
            background: "rgba(15, 20, 25, 0.6)",
            backdropFilter: "blur(12px)",
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            pointerEvents: "auto",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            3D Scan Preview
          </span>
          {resolved === "design" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAlignmentMode && (
              <span style={{ fontSize: 11, color: "var(--text-primary)" }}>
                {getCompletedPairCount()} pairs
                {activeLandmarkId ? ` · ${activeLandmarkId}` : ""}
              </span>
            )}
            <button
              onClick={() => setAlignmentMode(!isAlignmentMode)}
              disabled={!canEnterAlignment}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid",
                borderColor: isAlignmentMode ? "var(--accent)" : "rgba(255,255,255,0.1)",
                background: isAlignmentMode ? "rgba(0,180,216,0.2)" : "rgba(0,0,0,0.3)",
                color: isAlignmentMode ? "var(--accent)" : "var(--text-primary)",
                fontSize: 11,
                cursor: canEnterAlignment ? "pointer" : "not-allowed",
                opacity: canEnterAlignment ? 1 : 0.5,
                transition: "all 0.2s ease"
              }}
            >
              {isAlignmentMode ? "Exit Alignment" : "Landmark Align"}
            </button>
          </div>
          )}
        </div>
      )}

      {/* ── Foreground Left Sidebar / Floating Feature Area ── */}
      {isWorkStage ? (
        <div 
          style={{ 
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: panelWidth,
            zIndex: 10,
            display: "flex", 
            flexDirection: "column", 
            overflow: "hidden", 
            borderRight: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(18, 22, 32, 0.75)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
            pointerEvents: "auto",
          }}
        >
          <div {...handleProps} />
          {/* Workflow stages */}
          {renderLazyRoute("import", "Import", CaptureView)}
          {renderLazyRoute("design", "Design", SimulateView)}
          {renderLazyRoute("review", "Review", ValidateView)}
          {renderLazyRoute("present", "Present", PresentView)}
          {renderLazyRoute("handoff", "Handoff", HandoffView)}
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={show("cases")}>
            <ErrorBoundary label="Cases">
              <CaseListView />
            </ErrorBoundary>
          </div>
          <div style={show("settings")}>
            <ErrorBoundary label="Settings">
              <SettingsPanel />
            </ErrorBoundary>
          </div>
        </div>
      )}
    </main>
  );
}
