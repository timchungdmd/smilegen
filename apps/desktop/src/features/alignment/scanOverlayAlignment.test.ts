import { describe, it, expect } from "vitest";
import { computeScanOverlayTransform } from "../scanOverlayAlignment";

describe("scanOverlayAlignment", () => {
  it("returns null for empty landmarks", () => {
    const result = computeScanOverlayTransform([], 600, 400);
    expect(result).toBeNull();
  });
});
