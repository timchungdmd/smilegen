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

  const selectedTooth = activeVariant?.teeth.find((t) => t.toothId === selectedToothId) ?? null;

  return (
    <div
      style={{
        borderLeft: "1px solid var(--border)",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 0
      }}
    >
      {/* Trust banner */}
      {trustSummary && <TrustBanner summary={trustSummary} />}

      {/* Smile Plan */}
      <SmilePlanPanel
        plan={plan}
        onBiasChange={changeBias}
        onControlsChange={updatePlanControls}
        onToggleTooth={toggleToothAction}
        onSetTreatmentType={setTreatmentTypeFn}
      />

      {/* Arch Form */}
      <ArchFormEditor />

      {/* Mapping */}
      {mappingState && <ScanReviewPanel mappingState={mappingState} />}

      {/* Tooth Inspector */}
      {selectedTooth && (
        <ToothInspector
          tooth={selectedTooth}
          onDimensionChange={adjustTooth}
        />
      )}

      {/* Shade selector */}
      <ShadeSelector
        selectedShade={selectedShadeId}
        onSelectShade={setSelectedShadeId}
      />

      {/* Tooth Library */}
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

      {/* Smile Metrics */}
      {activeVariant && (
        <SmileMetricsPanel teeth={activeVariant.teeth} />
      )}

      {/* Design info */}
      {activeVariant && (
        <div style={{ padding: 14, borderTop: "1px solid var(--border)" }}>
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
      )}
    </div>
  );
}
