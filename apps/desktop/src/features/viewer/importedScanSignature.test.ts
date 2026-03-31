import { describe, expect, test } from "vitest";
import { getImportedScanSignature } from "./importedScanSignature";

describe("getImportedScanSignature", () => {
  test("returns null when no scan is loaded", () => {
    expect(getImportedScanSignature(null)).toBeNull();
  });

  test("changes when a different imported scan arrives", () => {
    const a = getImportedScanSignature({
      name: "scan-a.stl",
      vertexCount: 120,
      triangles: [],
      bounds: {
        minX: -1,
        maxX: 1,
        minY: -2,
        maxY: 2,
        minZ: -3,
        maxZ: 3,
        width: 2,
        depth: 4,
        height: 6,
      },
    });

    const b = getImportedScanSignature({
      name: "scan-b.stl",
      vertexCount: 120,
      triangles: [],
      bounds: {
        minX: -1,
        maxX: 1,
        minY: -2,
        maxY: 2,
        minZ: -3,
        maxZ: 3,
        width: 2,
        depth: 4,
        height: 6,
      },
    });

    expect(a).not.toBe(b);
  });
});
