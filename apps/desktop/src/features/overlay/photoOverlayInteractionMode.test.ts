import { describe, expect, test } from "vitest";
import { shouldEnablePhotoOverlayPointerEvents } from "./photoOverlayInteractionMode";

describe("shouldEnablePhotoOverlayPointerEvents", () => {
  test("disables photo overlay hit-testing in 3D tab", () => {
    expect(
      shouldEnablePhotoOverlayPointerEvents({
        designTab: "3d",
        isAlignmentMode: false,
        activeSurface: "photo",
      })
    ).toBe(false);
  });

  test("enables photo overlay hit-testing in photo tab", () => {
    expect(
      shouldEnablePhotoOverlayPointerEvents({
        designTab: "photo",
        isAlignmentMode: false,
        activeSurface: "photo",
      })
    ).toBe(true);
  });

  test("disables photo overlay hit-testing during scan-side alignment", () => {
    expect(
      shouldEnablePhotoOverlayPointerEvents({
        designTab: "photo",
        isAlignmentMode: true,
        activeSurface: "scan",
      })
    ).toBe(false);
  });
});
