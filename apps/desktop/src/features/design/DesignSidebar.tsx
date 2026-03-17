import type { ReactNode } from "react";
import { useDesignStore, selectActiveVariant } from "../../store/useDesignStore";
import { useCaseStore } from "../../store/useCaseStore";
import { SmilePlanPanel } from "../smile-plan/SmilePlanPanel";
import { ToothInspector } from "../inspector/ToothInspector";
import { TrustBanner } from "../trust/TrustBanner";
import { ScanReviewPanel } from "../review/ScanReviewPanel";
import { LibraryPanel } from "../library/LibraryPanel";
import { ShadeSelector } from "../color/ShadeSelector";
import { SmileMetricsPanel } from "../analysis/SmileMetricsPanel";
import type { ToothLibraryEntry } from "../library/toothLibraryTypes";
import { ArchFormEditor } from "../alignment/ArchFormEditor";
import { useCanvasStore } from "../../store/useCanvasStore";
import { useImportStore } from "../../store/useImportStore";

function InspectorCard({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "subtle";
}) {
  return (
    <section
      className={`inspector-card inspector-card--${tone}`}
      data-testid="design-inspector-card"
    >
      {children}
    </section>
  );
}

/**
 * Right sidebar of the Design view: trust state, smile plan, arch form,
 * mapping review, tooth inspector, shade, library, and design info panels.
 * Reads state directly from stores — no props required.
 */
export function DesignSidebar() {
  const activeVariant = useDesignStore(selectActiveVariant);
  const selectedToothId = useDesignStore((s) => s.selectedToothId);
  const adjustTooth = useDesignStore((s) => s.adjustTooth);
  const plan = useDesignStore((s) => s.plan);
  const changeBias = useDesignStore((s) => s.changeBias);
  const updatePlanControls = useDesignStore((s) => s.updatePlanControls);
  const toggleToothAction = useDesignStore((s) => s.toggleTooth);
  const setTreatmentTypeFn = useDesignStore((s) => s.setTreatmentType);
  const trustSummary = useDesignStore((s) => s.trustSummary);
  const selectedShadeId = useDesignStore((s) => s.selectedShadeId);
  const setSelectedShadeId = useDesignStore((s) => s.setSelectedShadeId);
  const applyLibraryCollection = useDesignStore((s) => s.applyLibraryCollection);

  const mappingState = useCaseStore((s) => s.mappingState);

  const hiddenLayers = useCanvasStore((s) => s.hiddenLayers);
  const toggleLayer = useCanvasStore((s) => s.toggleLayer);
  const archScanMesh = useImportStore((s) => s.archScanMesh);

  const selectedTooth = activeVariant?.teeth.find((t) => t.toothId === selectedToothId) ?? null;

  return (
    <div
      className="design-inspector-stack design-sidebar-scroll"
      data-testid="design-inspector-stack"
      style={{ borderLeft: "1px solid var(--border)" }}
    >
      {/* Trust banner */}
      {trustSummary && (
        <InspectorCard tone="accent">
          <TrustBanner summary={trustSummary} />
        </InspectorCard>
      )}

      {/* Layers */}
      <InspectorCard>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
          Layers
        </div>
        {[
          { id: "arch-scan", label: "Arch Scan", visible: Boolean(archScanMesh) },
          { id: "design-teeth", label: "Design Teeth", visible: Boolean(activeVariant) },
          { id: "arch-curve", label: "Arch Curve", visible: Boolean(activeVariant) },
          { id: "grid", label: "Grid", visible: true },
        ].filter(l => l.visible).map(layer => (
          <label key={layer.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", padding: "2px 0" }}>
            <input
              type="checkbox"
              checked={!hiddenLayers.has(layer.id)}
              onChange={() => toggleLayer(layer.id)}
            />
            {layer.label}
          </label>
        ))}
      </InspectorCard>

      {/* Smile Plan */}
      <InspectorCard>
        <SmilePlanPanel
          plan={plan}
          onBiasChange={changeBias}
          onControlsChange={updatePlanControls}
          onToggleTooth={toggleToothAction}
          onSetTreatmentType={setTreatmentTypeFn}
        />
      </InspectorCard>

      {/* Arch Form */}
      <InspectorCard>
        <ArchFormEditor />
      </InspectorCard>

      {/* Mapping */}
      {mappingState && (
        <InspectorCard tone="subtle">
          <ScanReviewPanel mappingState={mappingState} />
        </InspectorCard>
      )}

      {/* Tooth Inspector */}
      {selectedTooth && (
        <InspectorCard tone="subtle">
          <ToothInspector
            tooth={selectedTooth}
            onDimensionChange={adjustTooth}
          />
        </InspectorCard>
      )}

      {/* Shade selector */}
      <InspectorCard>
        <ShadeSelector
          selectedShade={selectedShadeId}
          onSelectShade={setSelectedShadeId}
        />
      </InspectorCard>

      {/* Tooth Library */}
      <InspectorCard>
        <LibraryPanel
          selectedToothId={selectedToothId}
          onApplyTooth={(_toothNumber: string, entry: ToothLibraryEntry) => {
            if (selectedToothId) {
              adjustTooth(selectedToothId, {
                width: entry.dimensions.width,
                height: entry.dimensions.height,
                depth: entry.dimensions.depth
              });
            }
          }}
          onApplyCollection={applyLibraryCollection}
        />
      </InspectorCard>

      {/* Smile Metrics */}
      {activeVariant && (
        <InspectorCard tone="subtle">
          <SmileMetricsPanel teeth={activeVariant.teeth} />
        </InspectorCard>
      )}

      {/* Design info */}
      {activeVariant && (
        <InspectorCard tone="subtle">
          <div style={{ padding: 14 }}>
            <div className="label" style={{ marginBottom: 8 }}>
              Active Design
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Variant</span>
                <span className="label-value">{activeVariant.label}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Teeth</span>
                <span className="label-value">{activeVariant.teeth.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Triangles</span>
                <span className="label-value">
                  {activeVariant.teeth.reduce((s, t) => s + t.previewTriangles.length, 0)}
                </span>
              </div>
            </div>
          </div>
        </InspectorCard>
      )}
    </div>
  );
}
