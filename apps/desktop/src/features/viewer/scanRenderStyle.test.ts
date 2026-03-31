import { describe, expect, test } from "vitest";
import { getScanRenderStyle } from "./scanRenderStyle";

describe("getScanRenderStyle", () => {
  test("keeps imported scan more legible when a design is present", () => {
    const style = getScanRenderStyle({
      meshOpacity: 0.9,
      hasActiveVariant: true,
    });

    expect(style.opacity).toBe(0.48);
    expect(style.color).toBe("#7d97a6");
    expect(style.roughness).toBe(0.42);
    expect(style.metalness).toBe(0.08);
    expect(style.emissiveIntensity).toBe(0.16);
  });

  test("respects user opacity while keeping bare scan readable", () => {
    const style = getScanRenderStyle({
      meshOpacity: 0.4,
      hasActiveVariant: false,
    });

    expect(style.opacity).toBe(0.4);
    expect(style.color).toBe("#9fb4c0");
    expect(style.roughness).toBe(0.34);
    expect(style.metalness).toBe(0.06);
    expect(style.emissiveIntensity).toBe(0.12);
  });
});
