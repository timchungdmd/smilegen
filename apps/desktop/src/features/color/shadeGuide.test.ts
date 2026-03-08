import {
  VITA_CLASSICAL_SHADES,
  DEFAULT_SHADE,
  getShadeById
} from "./shadeGuide";

test("getShadeById returns the correct shade entry", () => {
  const a1 = getShadeById("A1");
  expect(a1).toBeDefined();
  expect(a1!.id).toBe("A1");
  expect(a1!.group).toBe("A");
  expect(a1!.name).toContain("Light Reddish Brown");

  const b2 = getShadeById("B2");
  expect(b2).toBeDefined();
  expect(b2!.id).toBe("B2");
  expect(b2!.group).toBe("B");
});

test("getShadeById returns undefined for unknown shade ids", () => {
  expect(getShadeById("Z9")).toBeUndefined();
  expect(getShadeById("")).toBeUndefined();
  expect(getShadeById("a1")).toBeUndefined(); // case-sensitive
});

test("all shades have valid RGB values in the 0-255 range", () => {
  for (const shade of VITA_CLASSICAL_SHADES) {
    for (const color of [shade.bodyColor, shade.incisalColor, shade.cervicalColor]) {
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    }
    expect(shade.translucency).toBeGreaterThanOrEqual(0);
    expect(shade.translucency).toBeLessThanOrEqual(1);
  }
});

test("DEFAULT_SHADE references an existing shade entry", () => {
  const defaultEntry = getShadeById(DEFAULT_SHADE);
  expect(defaultEntry).toBeDefined();
  expect(defaultEntry!.id).toBe("A2");
});

test("VITA_CLASSICAL_SHADES contains all 16 expected shades", () => {
  const expectedIds = [
    "A1", "A2", "A3", "A3.5", "A4",
    "B1", "B2", "B3", "B4",
    "C1", "C2", "C3", "C4",
    "D2", "D3", "D4"
  ];
  const actualIds = VITA_CLASSICAL_SHADES.map((s) => s.id);
  expect(actualIds).toEqual(expectedIds);
  expect(VITA_CLASSICAL_SHADES).toHaveLength(16);
});

test("darker shades have lower body RGB values than lighter shades within the same group", () => {
  const a1 = getShadeById("A1")!;
  const a4 = getShadeById("A4")!;

  // A4 should be darker (lower RGB) than A1
  expect(a4.bodyColor.r).toBeLessThan(a1.bodyColor.r);
  expect(a4.bodyColor.g).toBeLessThan(a1.bodyColor.g);
  expect(a4.bodyColor.b).toBeLessThan(a1.bodyColor.b);
});
