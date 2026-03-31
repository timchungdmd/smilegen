interface Point {
  x: number;
  y: number;
}

interface ApplySmileArcOffsetsInput {
  points: Point[];
  leftOffsetPercent: number;
  rightOffsetPercent: number;
  viewHeight: number;
}

export function applySmileArcOffsets({
  points,
  leftOffsetPercent,
  rightOffsetPercent,
  viewHeight,
}: ApplySmileArcOffsetsInput): Point[] {
  if (points.length <= 1) {
    return points;
  }

  return points.map((point, index) => {
    const t = index / (points.length - 1);
    const offsetPercent =
      leftOffsetPercent + (rightOffsetPercent - leftOffsetPercent) * t;

    return {
      ...point,
      y: point.y + (offsetPercent / 100) * viewHeight,
    };
  });
}
