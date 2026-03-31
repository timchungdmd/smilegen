import { describe, expect, test } from "vitest";
import { applySmileArcOffsets } from "./smileArcOffsets";

describe("applySmileArcOffsets", () => {
  test("applies independent left and right smile-arc offsets", () => {
    const points = [
      { x: 100, y: 200 },
      { x: 300, y: 180 },
      { x: 500, y: 200 },
    ];

    const adjusted = applySmileArcOffsets({
      points,
      leftOffsetPercent: 10,
      rightOffsetPercent: -5,
      viewHeight: 400,
    });

    expect(adjusted[0].y).toBe(240);
    expect(adjusted[1].y).toBe(190);
    expect(adjusted[2].y).toBe(180);
  });
});
