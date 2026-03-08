import { parseStlArrayBuffer } from "./stlParser";

test("parses ascii stl bounds and dimensions", () => {
  const asciiStl = `solid test
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 2 0 0
    vertex 0 3 4
  endloop
endfacet
endsolid test`;

  const parsed = parseStlArrayBuffer(
    new TextEncoder().encode(asciiStl).buffer,
    "arch_scan.stl"
  );

  expect(parsed.bounds.width).toBe(2);
  expect(parsed.bounds.depth).toBe(3);
  expect(parsed.bounds.height).toBe(4);
  expect(parsed.triangles).toHaveLength(1);
  expect(parsed.triangles[0]?.c.z).toBe(4);
});

test("parses binary stl bounds and dimensions", () => {
  const buffer = new ArrayBuffer(84 + 50);
  const view = new DataView(buffer);
  view.setUint32(80, 1, true);

  const values = [
    0, 0, 1,
    0, 0, 0,
    1, 0, 0,
    0, 2, 3
  ];

  values.forEach((value, index) => {
    view.setFloat32(84 + index * 4, value, true);
  });

  const parsed = parseStlArrayBuffer(buffer, "tooth_8.stl");

  expect(parsed.bounds.width).toBe(1);
  expect(parsed.bounds.depth).toBe(2);
  expect(parsed.bounds.height).toBe(3);
  expect(parsed.triangles).toHaveLength(1);
  expect(parsed.triangles[0]?.c.z).toBe(3);
});

test("falls back to binary parsing when header includes solid-like text", () => {
  const buffer = new ArrayBuffer(84 + 50);
  const headerText = new TextEncoder().encode("solid suspicious vertex header");
  new Uint8Array(buffer).set(headerText, 0);

  const view = new DataView(buffer);
  view.setUint32(80, 1, true);
  const values = [0, 0, 1, 0, 0, 0, 4, 0, 0, 0, 3, 2];
  values.forEach((value, index) => {
    view.setFloat32(84 + index * 4, value, true);
  });

  const parsed = parseStlArrayBuffer(buffer, "binary_weird_header.stl");

  expect(parsed.bounds.width).toBe(4);
  expect(parsed.bounds.depth).toBe(3);
  expect(parsed.bounds.height).toBe(2);
  expect(parsed.triangles).toHaveLength(1);
});

test("rejects binary STL claiming more than MAX_TRIANGLES", () => {
  const buf = new ArrayBuffer(84);
  const view = new DataView(buf);
  view.setUint32(80, 3_000_000, true); // exceeds MAX_TRIANGLES = 2_000_000
  expect(() => parseStlArrayBuffer(buf, "big.stl")).toThrow(/too many triangles/i);
});

test("parses large binary stl without stack overflow", () => {
  const triangleCount = 70000;
  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  const view = new DataView(buffer);
  view.setUint32(80, triangleCount, true);

  for (let index = 0; index < triangleCount; index += 1) {
    const offset = 84 + index * 50;
    view.setFloat32(offset + 0, 0, true);
    view.setFloat32(offset + 4, 0, true);
    view.setFloat32(offset + 8, 1, true);
    view.setFloat32(offset + 12, index, true);
    view.setFloat32(offset + 16, 0, true);
    view.setFloat32(offset + 20, 0, true);
    view.setFloat32(offset + 24, index + 1, true);
    view.setFloat32(offset + 28, 0, true);
    view.setFloat32(offset + 32, 0, true);
    view.setFloat32(offset + 36, index, true);
    view.setFloat32(offset + 40, 1, true);
    view.setFloat32(offset + 44, 1, true);
  }

  const parsed = parseStlArrayBuffer(buffer, "large_arch.stl");

  expect(parsed.bounds.width).toBe(triangleCount);
  expect(parsed.bounds.depth).toBe(1);
  expect(parsed.bounds.height).toBe(1);
  expect(parsed.triangles).toHaveLength(triangleCount);
});
