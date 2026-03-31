import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { OverlayGuides } from "./OverlayGuides";

describe("OverlayGuides", () => {
  test("moves guide labels to the side and exposes broader drag targets", () => {
    const onGuideMouseDown = vi.fn();

    render(
      <svg>
        <OverlayGuides
          showMidline
          showSmileArc
          showGingivalLine
          viewWidth={600}
          viewHeight={400}
          calibration={{
            midlineX: 300,
            incisalY: 220,
            scale: 4,
            archDepth: 15,
            archHalfWidth: 35,
            cameraDistance: 250,
          }}
          smileArcPath="M 100 200 C 200 180, 400 180, 500 200"
          smileArcData={{
            points: [
              { x: 100, y: 200 },
              { x: 300, y: 180 },
              { x: 500, y: 200 },
            ],
            centerY: 180,
          }}
          gingivalLineY={30}
          leftCommissureX={25}
          rightCommissureX={75}
          onGuideMouseDown={onGuideMouseDown}
        />
      </svg>
    );

    expect(screen.getByTestId("guide-label-smileArc")).toHaveAttribute("x", "588");
    expect(screen.getByTestId("guide-label-gingival")).toHaveAttribute("x", "588");
    expect(screen.getByTestId("guide-label-midline")).toHaveAttribute("x", "588");

    expect(screen.getByTestId("guide-drag-smileArc")).toBeInTheDocument();
    expect(screen.getByTestId("guide-drag-midline")).toBeInTheDocument();
    expect(screen.getByTestId("guide-drag-gingival")).toBeInTheDocument();
    expect(screen.getByTestId("guide-handle-smileArc-left")).toBeInTheDocument();
    expect(screen.getByTestId("guide-handle-smileArc-right")).toBeInTheDocument();
    expect(screen.getByTestId("guide-handle-gingival-right")).toBeInTheDocument();
  });
});
