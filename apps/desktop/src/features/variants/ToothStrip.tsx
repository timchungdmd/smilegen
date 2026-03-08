interface ToothStripProps {
  selectedTeeth: string[];
  activeToothId: string | null;
  onSelectTooth: (toothId: string) => void;
}

export function ToothStrip({ selectedTeeth, activeToothId, onSelectTooth }: ToothStripProps) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {selectedTeeth.map((toothId) => (
        <button
          key={toothId}
          type="button"
          aria-label={`Select tooth ${toothId}`}
          onClick={() => onSelectTooth(toothId)}
          className={`tooth-number ${activeToothId === toothId ? "selected" : ""}`}
        >
          {toothId}
        </button>
      ))}
    </div>
  );
}
