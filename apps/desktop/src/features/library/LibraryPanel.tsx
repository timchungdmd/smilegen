import { useState } from "react";
import { BUNDLED_COLLECTIONS } from "./bundledLibrary";
import type { ToothLibraryCollection, ToothLibraryEntry } from "./toothLibraryTypes";

interface LibraryPanelProps {
  selectedToothId: string | null;
  onApplyTooth: (toothNumber: string, entry: ToothLibraryEntry) => void;
  onApplyCollection: (collection: ToothLibraryCollection) => void;
}

const POSITION_LABELS: Record<string, string> = {
  central_incisor: "Central Incisor",
  lateral_incisor: "Lateral Incisor",
  canine: "Canine",
  first_premolar: "1st Premolar",
  second_premolar: "2nd Premolar"
};

const TOOTH_ORDER = ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];

export function LibraryPanel({
  selectedToothId,
  onApplyTooth,
  onApplyCollection
}: LibraryPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    BUNDLED_COLLECTIONS[0]?.id ?? ""
  );

  const activeCollection = BUNDLED_COLLECTIONS.find(
    (c) => c.id === selectedCollectionId
  ) ?? BUNDLED_COLLECTIONS[0];

  if (!activeCollection) {
    return null;
  }

  const entries = TOOTH_ORDER
    .map((num) => activeCollection.entries[num])
    .filter((entry): entry is ToothLibraryEntry => entry !== undefined);

  return (
    <div className="panel">
      <div
        className="panel-header"
        style={{ cursor: "pointer" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3>Tooth Library</h3>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {collapsed ? "+" : "\u2212"}
        </span>
      </div>

      {!collapsed && (
        <div className="panel-body" style={{ display: "grid", gap: 12 }}>
          {/* Collection selector */}
          <div style={{ display: "grid", gap: 4 }}>
            <span className="label">Collection</span>
            <select
              className="input"
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              style={{ width: "100%" }}
            >
              {BUNDLED_COLLECTIONS.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {activeCollection.description}
            </span>
          </div>

          {/* Tooth grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8
            }}
          >
            {entries.map((entry) => {
              const isSelected = entry.toothNumber === selectedToothId;

              return (
                <div
                  key={entry.id}
                  className={`card${isSelected ? " active" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onApplyTooth(entry.toothNumber, entry)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 12 }}>
                      #{entry.toothNumber}
                    </span>
                    <span className="badge badge-info">
                      {entry.morphologyTag}
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                    {POSITION_LABELS[entry.position] ?? entry.position}
                  </div>

                  <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                    {entry.dimensions.width.toFixed(1)} x{" "}
                    {entry.dimensions.height.toFixed(1)} x{" "}
                    {entry.dimensions.depth.toFixed(1)} mm
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: "grid", gap: 6 }}>
            <button
              className="btn btn-primary"
              onClick={() => onApplyCollection(activeCollection)}
            >
              Apply Collection
            </button>
            {selectedToothId && activeCollection.entries[selectedToothId] && (
              <button
                className="btn"
                onClick={() =>
                  onApplyTooth(
                    selectedToothId,
                    activeCollection.entries[selectedToothId]
                  )
                }
              >
                Apply to Tooth #{selectedToothId}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
