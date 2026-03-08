import { serializeToBinaryStl } from "./binaryStl";
import { parseStlArrayBuffer } from "../import/stlParser";
import type { MeshTriangle } from "../import/stlParser";

function makeTriangle(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number
): MeshTriangle {
  return {
    a: { x: ax, y: ay, z: az },
    b: { x: bx, y: by, z: bz },
    c: { x: cx, y: cy, z: cz }
  };
}

test("output has correct header size and total length", () => {
  const triangles = [makeTriangle(0, 0, 0, 1, 0, 0, 0, 1, 0)];
  const buffer = serializeToBinaryStl("test", triangles);

  // 80 header + 4 count + 1 * 50 = 134
  expect(buffer.byteLength).toBe(134);

  // Verify header is 80 bytes by checking that triangle count starts at offset 80
  const view = new DataView(buffer);
  expect(view.getUint32(80, true)).toBe(1);
});

test("triangle count matches input", () => {
  const triangles = [
    makeTriangle(0, 0, 0, 1, 0, 0, 0, 1, 0),
    makeTriangle(1, 0, 0, 1, 1, 0, 0, 1, 0),
    makeTriangle(0, 0, 0, 0, 0, 1, 1, 0, 0)
  ];
  const buffer = serializeToBinaryStl("multi", triangles);
  const view = new DataView(buffer);

  expect(view.getUint32(80, true)).toBe(3);
  expect(buffer.byteLength).toBe(80 + 4 + 3 * 50);
});

test("round-trip: binary STL parsed back gives same triangles", () => {
  const original = [
    makeTriangle(0, 0, 0, 2, 0, 0, 0, 3, 4),
    makeTriangle(1, 2, 3, 4, 5, 6, 7, 8, 9)
  ];
  const buffer = serializeToBinaryStl("roundtrip", original);
  const parsed = parseStlArrayBuffer(buffer, "roundtrip.stl");

  expect(parsed.triangles).toHaveLength(2);

  // Compare vertex values (float32 precision)
  for (let i = 0; i < original.length; i++) {
    expect(parsed.triangles[i].a.x).toBeCloseTo(original[i].a.x, 3);
    expect(parsed.triangles[i].a.y).toBeCloseTo(original[i].a.y, 3);
    expect(parsed.triangles[i].a.z).toBeCloseTo(original[i].a.z, 3);
    expect(parsed.triangles[i].b.x).toBeCloseTo(original[i].b.x, 3);
    expect(parsed.triangles[i].b.y).toBeCloseTo(original[i].b.y, 3);
    expect(parsed.triangles[i].b.z).toBeCloseTo(original[i].b.z, 3);
    expect(parsed.triangles[i].c.x).toBeCloseTo(original[i].c.x, 3);
    expect(parsed.triangles[i].c.y).toBeCloseTo(original[i].c.y, 3);
    expect(parsed.triangles[i].c.z).toBeCloseTo(original[i].c.z, 3);
  }
});

test("empty triangle array produces valid binary STL", () => {
  const buffer = serializeToBinaryStl("empty", []);

  expect(buffer.byteLength).toBe(84); // header + count only
  const view = new DataView(buffer);
  expect(view.getUint32(80, true)).toBe(0);
});

test("header contains the name string", () => {
  const buffer = serializeToBinaryStl("SmileGen_Export", []);
  const header = new Uint8Array(buffer, 0, 80);
  const decoder = new TextDecoder("utf-8");
  const headerStr = decoder.decode(header);

  expect(headerStr).toContain("SmileGen_Export");
});
