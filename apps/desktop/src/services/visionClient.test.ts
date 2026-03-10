import { detectLandmarks, getMouthMask } from "./visionClient";

// Mock the global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Build a realistic outer lip contour (22 points):
// outer[0]  = left commissure
// outer[5]  = smile arc top (philtrum center)
// outer[10] = right commissure
function makeOuterPoints() {
  const pts = Array.from({ length: 22 }, (_, i) => ({
    x: i * 0.04,
    y: 0.5,
    z: 0,
  }));
  pts[0] = { x: 0.2, y: 0.6, z: 0 };   // left commissure
  pts[5] = { x: 0.5, y: 0.55, z: 0 };  // smile arc top
  pts[10] = { x: 0.8, y: 0.6, z: 0 };  // right commissure
  return pts;
}

function makeApiBody() {
  return {
    midlineX: 0.5,
    interpupillaryLine: { leftX: 0.35, leftY: 0.35, rightX: 0.65, rightY: 0.35 },
    lipContour: {
      outer: makeOuterPoints(),
      inner: Array.from({ length: 22 }, () => ({ x: 0.5, y: 0.58, z: 0 })),
    },
    mouthMaskBbox: { xMin: 0.2, yMin: 0.5, xMax: 0.8, yMax: 0.7 },
  };
}

beforeEach(() => mockFetch.mockReset());

describe("detectLandmarks", () => {
  it("POSTs image to /landmarks/detect and maps the result", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeApiBody(),
    });

    const result = await detectLandmarks(new Blob(["fake"], { type: "image/jpeg" }));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/landmarks/detect"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.midlineX).toBeCloseTo(0.5);
    expect(result.commissureLeft).toEqual({ x: 0.2, y: 0.6 });
    expect(result.commissureRight).toEqual({ x: 0.8, y: 0.6 });
    expect(result.smileArcY).toBeCloseTo(0.55);
    expect(result.gingivalLineY).toBeCloseTo(0.45); // smileArcY - 0.1
    expect(result.mouthMaskBbox).toEqual({ xMin: 0.2, yMin: 0.5, xMax: 0.8, yMax: 0.7 });
    expect(result.lipContour.outer).toHaveLength(22);
  });

  it("throws a user-readable message when no face detected (HTTP 422)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422 });
    await expect(detectLandmarks(new Blob(["x"]))).rejects.toThrow("No face detected");
  });

  it("throws a user-readable message on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(detectLandmarks(new Blob(["x"]))).rejects.toThrow(
      "Vision service unavailable"
    );
  });

  it("throws on other HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(detectLandmarks(new Blob(["x"]))).rejects.toThrow(
      "Vision detection failed"
    );
  });
});

describe("getMouthMask", () => {
  it("POSTs image to /masks/mouth and returns the blob", async () => {
    const pngBlob = new Blob([new Uint8Array([137, 80, 78, 71])], {
      type: "image/png",
    });
    mockFetch.mockResolvedValueOnce({ ok: true, blob: async () => pngBlob });

    const result = await getMouthMask(new Blob(["fake"]));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/masks/mouth"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toBe(pngBlob);
  });

  it("throws on HTTP error response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422 });
    await expect(getMouthMask(new Blob(["x"]))).rejects.toThrow();
  });
});
