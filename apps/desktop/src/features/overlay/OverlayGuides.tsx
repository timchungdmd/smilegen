import type { AlignmentCalibration } from "../alignment/archModel";

type GuideType =
  | "midline"
  | "smileArc"
  | "smileArcLeft"
  | "smileArcRight"
  | "gingival"
  | "commissureL"
  | "commissureR";

interface SmileArcData {
  points: { x: number; y: number }[];
  centerY: number;
}

interface OverlayGuidesProps {
  showMidline: boolean;
  showSmileArc: boolean;
  showGingivalLine: boolean;
  viewWidth: number;
  viewHeight: number;
  calibration: AlignmentCalibration;
  smileArcPath: string;
  smileArcData: SmileArcData;
  /** Percent value 0-100 */
  gingivalLineY: number;
  leftCommissureX: number;
  rightCommissureX: number;
  onGuideMouseDown: (type: GuideType, e: React.MouseEvent<SVGElement>) => void;
}

/**
 * Renders calibration guides: smile arc, midline, gingival line, and
 * commissure markers. Pure presentational SVG — all drag state lives in
 * PhotoOverlay.
 */
export function OverlayGuides({
  showMidline,
  showSmileArc,
  showGingivalLine,
  viewWidth,
  viewHeight,
  calibration,
  smileArcPath,
  smileArcData,
  gingivalLineY,
  leftCommissureX,
  rightCommissureX,
  onGuideMouseDown
}: OverlayGuidesProps) {
  const lx = (leftCommissureX / 100) * viewWidth;
  const rx = (rightCommissureX / 100) * viewWidth;
  const sideLabelRightX = viewWidth - 12;
  const sideLabelLeftX = 12;
  const midlineLabelX = calibration.midlineX > viewWidth / 2 ? sideLabelLeftX : sideLabelRightX;

  return (
    <>
      {/* Smile arc */}
      {showSmileArc && smileArcPath && (() => {
        const pts = smileArcData.points;
        const leftPt = pts[0];
        const rightPt = pts[pts.length - 1];
        const midPt = pts[Math.floor(pts.length / 2)];
        return (
          <g>
            <path
              data-testid="guide-drag-smileArc"
              d={smileArcPath}
              fill="none"
              stroke="transparent"
              strokeWidth="18"
              cursor="ns-resize"
              onMouseDown={(e) => onGuideMouseDown("smileArc", e)}
            />
            {/* Glow */}
            <path d={smileArcPath} fill="none" stroke="#00b4d8" strokeWidth="5" opacity="0.1" strokeLinecap="round" />
            {/* Main arc */}
            <path d={smileArcPath} fill="none" stroke="#00b4d8" strokeWidth="2" opacity="0.8" strokeLinecap="round" />
            <g
              data-testid="guide-handle-smileArc-left"
              cursor="ns-resize"
              onMouseDown={(e) => onGuideMouseDown("smileArcLeft", e)}
            >
              <circle cx={leftPt.x} cy={leftPt.y} r="10" fill="transparent" />
              <circle cx={leftPt.x} cy={leftPt.y} r="4" fill="#00b4d8" opacity="0.8" stroke="#fff" strokeWidth="1.2" />
            </g>
            {/* Center drag handle */}
            <g
              data-testid="guide-handle-smileArc-center"
              cursor="ns-resize"
              onMouseDown={(e) => onGuideMouseDown("smileArc", e)}
            >
              <circle cx={midPt.x} cy={midPt.y} r="10" fill="transparent" />
              <circle cx={midPt.x} cy={midPt.y} r="5" fill="#00b4d8" opacity="0.9" stroke="#fff" strokeWidth="1.5" />
            </g>
            <g
              data-testid="guide-handle-smileArc-right"
              cursor="ns-resize"
              onMouseDown={(e) => onGuideMouseDown("smileArcRight", e)}
            >
              <circle cx={rightPt.x} cy={rightPt.y} r="10" fill="transparent" />
              <circle cx={rightPt.x} cy={rightPt.y} r="4" fill="#00b4d8" opacity="0.8" stroke="#fff" strokeWidth="1.2" />
            </g>
            <text
              data-testid="guide-label-smileArc"
              x={sideLabelRightX}
              y={Math.max(18, rightPt.y - 10)}
              textAnchor="end"
              fill="#00b4d8"
              fontSize="9"
              fontWeight="600"
              opacity="0.82"
            >
              Smile Arc
            </text>
          </g>
        );
      })()}

      {/* Midline */}
      {showMidline && (() => {
        const mx = calibration.midlineX;
        const y1 = viewHeight * 0.08;
        const y2 = viewHeight * 0.92;
        return (
          <g>
            <line
              data-testid="guide-drag-midline"
              x1={mx}
              y1={y1}
              x2={mx}
              y2={y2}
              stroke="transparent"
              strokeWidth="18"
              cursor="ew-resize"
              onMouseDown={(e) => onGuideMouseDown("midline", e)}
            />
            <line x1={mx} y1={y1} x2={mx} y2={y2} stroke="#ef476f" strokeWidth="1" strokeDasharray="6 4" opacity="0.5" />
            {/* Top handle */}
            <g cursor="ew-resize" onMouseDown={(e) => onGuideMouseDown("midline", e)}>
              <circle cx={mx} cy={y1} r="10" fill="transparent" />
              <circle cx={mx} cy={y1} r="5" fill="#ef476f" opacity="0.85" stroke="#fff" strokeWidth="1.5" />
            </g>
            {/* Bottom handle */}
            <g cursor="ew-resize" onMouseDown={(e) => onGuideMouseDown("midline", e)}>
              <circle cx={mx} cy={y2} r="10" fill="transparent" />
              <circle cx={mx} cy={y2} r="4" fill="#ef476f" opacity="0.5" />
            </g>
            <text
              data-testid="guide-label-midline"
              x={midlineLabelX}
              y={18}
              textAnchor={midlineLabelX === sideLabelLeftX ? "start" : "end"}
              fill="#ef476f"
              fontSize="9"
              fontWeight="600"
              opacity="0.82"
            >
              Midline
            </text>
          </g>
        );
      })()}

      {/* Gingival line */}
      {showGingivalLine && (() => {
        const gy = (gingivalLineY / 100) * viewHeight;
        return (
          <g>
            <line
              data-testid="guide-drag-gingival"
              x1={lx}
              y1={gy}
              x2={rx}
              y2={gy}
              stroke="transparent"
              strokeWidth="18"
              cursor="ns-resize"
              onMouseDown={(e) => onGuideMouseDown("gingival", e)}
            />
            <line x1={lx} y1={gy} x2={rx} y2={gy} stroke="#d4736c" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
            {/* Left handle */}
            <g
              data-testid="guide-handle-gingival-left"
              cursor="ns-resize"
              onMouseDown={(e) => onGuideMouseDown("gingival", e)}
            >
              <circle cx={lx} cy={gy} r="10" fill="transparent" />
              <circle cx={lx} cy={gy} r="5" fill="#d4736c" opacity="0.85" stroke="#fff" strokeWidth="1.5" />
            </g>
            <g
              data-testid="guide-handle-gingival-right"
              cursor="ns-resize"
              onMouseDown={(e) => onGuideMouseDown("gingival", e)}
            >
              <circle cx={rx} cy={gy} r="10" fill="transparent" />
              <circle cx={rx} cy={gy} r="4" fill="#d4736c" opacity="0.72" stroke="#fff" strokeWidth="1.2" />
            </g>
            <text
              data-testid="guide-label-gingival"
              x={sideLabelRightX}
              y={Math.max(18, gy - 10)}
              textAnchor="end"
              fill="#d4736c"
              fontSize="9"
              fontWeight="600"
              opacity="0.82"
            >
              Gingival
            </text>
          </g>
        );
      })()}

      {/* Commissure guides (smile corners) */}
      {(() => {
        const cy = calibration.incisalY;
        return (
          <g>
            {/* Connecting line */}
            <line x1={lx} y1={cy} x2={rx} y2={cy} stroke="#ffd166" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.25" />
            {/* Left commissure */}
            <line x1={lx} y1={cy - 24} x2={lx} y2={cy + 24} stroke="#ffd166" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
            <g cursor="ew-resize" onMouseDown={(e) => onGuideMouseDown("commissureL", e)}>
              <circle cx={lx} cy={cy} r="10" fill="transparent" />
              <circle cx={lx} cy={cy} r="5" fill="#ffd166" opacity="0.85" stroke="#000" strokeWidth="1" />
            </g>
            <text x={lx} y={cy - 28} fill="#ffd166" fontSize="8" fontWeight="600" textAnchor="middle" opacity="0.7">L</text>
            {/* Right commissure */}
            <line x1={rx} y1={cy - 24} x2={rx} y2={cy + 24} stroke="#ffd166" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
            <g cursor="ew-resize" onMouseDown={(e) => onGuideMouseDown("commissureR", e)}>
              <circle cx={rx} cy={cy} r="10" fill="transparent" />
              <circle cx={rx} cy={cy} r="5" fill="#ffd166" opacity="0.85" stroke="#000" strokeWidth="1" />
            </g>
            <text x={rx} y={cy - 28} fill="#ffd166" fontSize="8" fontWeight="600" textAnchor="middle" opacity="0.7">R</text>
          </g>
        );
      })()}
    </>
  );
}
