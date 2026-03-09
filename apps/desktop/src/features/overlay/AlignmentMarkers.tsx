import type { AlignmentMarker } from "../../store/useViewportStore";

interface AlignmentMarkersProps {
  markers: AlignmentMarker[];
  viewWidth: number;
  viewHeight: number;
  /** Pre-computed Catmull-Rom spline path through the sorted markers */
  markerArchPath: string;
  onMarkerMouseDown: (markerId: string, e: React.MouseEvent<SVGGElement>) => void;
}

const markerColor = (type: AlignmentMarker["type"]) =>
  type === "incisal" ? "#06d6a0" : "#ffd166";

/**
 * Renders the alignment marker crosshairs + dots + labels and the smooth
 * spline arch that passes through them. Pure presentational SVG — all state
 * management lives in PhotoOverlay.
 */
export function AlignmentMarkers({
  markers,
  viewWidth,
  viewHeight,
  markerArchPath,
  onMarkerMouseDown
}: AlignmentMarkersProps) {
  return (
    <>
      {/* Smooth spline through sorted markers */}
      {markerArchPath && (
        <path
          d={markerArchPath}
          fill="none"
          stroke="#06d6a0"
          strokeWidth="2"
          strokeDasharray="8 4"
          opacity="0.6"
        />
      )}

      {/* Individual markers */}
      {markers.map((marker) => {
        const mx = (marker.x / 100) * viewWidth;
        const my = (marker.y / 100) * viewHeight;
        const color = markerColor(marker.type);
        return (
          <g key={marker.id} cursor="grab" onMouseDown={(e) => onMarkerMouseDown(marker.id, e)}>
            {/* Crosshair */}
            <line x1={mx - 8} y1={my} x2={mx + 8} y2={my} stroke={color} strokeWidth="1" opacity="0.5" />
            <line x1={mx} y1={my - 8} x2={mx} y2={my + 8} stroke={color} strokeWidth="1" opacity="0.5" />
            {/* Dot */}
            <circle cx={mx} cy={my} r="5" fill={color} opacity="0.85" stroke="#000" strokeWidth="1" />
            {/* Label */}
            <text
              x={mx}
              y={my - 10}
              textAnchor="middle"
              fill={color}
              fontSize="9"
              fontWeight="600"
            >
              {marker.type === "incisal" ? `#${marker.toothId}` : `C${marker.toothId}`}
            </text>
          </g>
        );
      })}
    </>
  );
}
