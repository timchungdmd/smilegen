/**
 * AlignmentCalibrationWizard tests
 *
 * Covers:
 *   - No-photo guard (upload prompt)
 *   - Midline click → marker placed, step advances to commissure
 *   - Commissure click → marker placed, step advances to review
 *   - Apply Calibration → viewport store updated with correct percentages
 *   - Reset → state cleared, returns to midline step
 *   - Clicks ignored in review step
 *   - getBoundingClientRect with zero dimensions is handled gracefully
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { AlignmentCalibrationWizard } from "./AlignmentCalibrationWizard";
import { useImportStore } from "../../store/useImportStore";
import { useViewportStore } from "../../store/useViewportStore";

// Prevent IndexedDB errors (same pattern as App.test.tsx)
vi.mock("idb-keyval", () => ({
  createStore: vi.fn(() => ({})),
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  entries: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue(undefined),
}));

// ── helpers ────────────────────────────────────────────────────────────────

const MOCK_RECT: DOMRect = {
  left: 100,
  top: 200,
  width: 400,
  height: 300,
  right: 500,
  bottom: 500,
  x: 100,
  y: 200,
  toJSON: () => ({}),
};

function mockRect() {
  return vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(MOCK_RECT);
}

// Click at (px, py) in viewport coords; component converts to percent
function clickAt(element: Element, px: number, py: number) {
  fireEvent.click(element, { clientX: px, clientY: py });
}

// ── store resets ───────────────────────────────────────────────────────────

beforeEach(() => {
  useImportStore.setState({
    uploadedPhotos: [],
    archScanMesh: null,
    archScanName: undefined,
    uploadedToothModels: [],
    importError: null,
  });
  useViewportStore.setState({
    midlineX: 50,
    smileArcY: 60,
    leftCommissureX: 25,
    rightCommissureX: 75,
    alignmentMarkers: [],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── tests ──────────────────────────────────────────────────────────────────

test("shows upload prompt when no photo is loaded", () => {
  render(<AlignmentCalibrationWizard />);
  expect(
    screen.getByText(/upload a patient photo to start the alignment wizard/i)
  ).toBeInTheDocument();
});

test("shows wizard header when a photo is loaded", () => {
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);
  expect(screen.getByText(/photo alignment wizard/i)).toBeInTheDocument();
  expect(screen.getByText(/2-point calibration/i)).toBeInTheDocument();
});

test("starts on the midline step with correct instruction", () => {
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);
  expect(
    screen.getByText(/click the tip of the upper central incisor/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/click to place midline/i)).toBeInTheDocument();
});

test("clicking photo during midline step advances to commissure step", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  // Get the clickable photo canvas container (the div with crosshair cursor)
  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;
  expect(canvas).not.toBeNull();

  // Click at viewport (300, 350) → xPercent=(300-100)/400*100=50, yPercent=(350-200)/300*100=50
  act(() => {
    clickAt(canvas, 300, 350);
  });

  // Should now be on commissure step
  expect(
    screen.getByText(/click the right corner of the mouth/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/click to place commissure/i)).toBeInTheDocument();
});

test("clicking photo during commissure step advances to review step", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Place midline
  act(() => clickAt(canvas, 300, 350));
  // Place commissure
  act(() => clickAt(canvas, 450, 350));

  // Should be on review step — Apply Calibration button visible
  expect(
    screen.getByRole("button", { name: /apply calibration/i })
  ).toBeInTheDocument();
  // Hint overlay is gone in review step
  expect(screen.queryByText(/click to place/i)).not.toBeInTheDocument();
});

test("marker coordinates computed correctly from getBoundingClientRect", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Click at (300, 350): xPercent = (300-100)/400*100 = 50, yPercent = (350-200)/300*100 = 50
  act(() => clickAt(canvas, 300, 350));

  // After midline click, verify SVG shows a marker circle
  const svg = document.querySelector("svg[viewBox='0 0 100 100']")!;
  const circles = svg.querySelectorAll("circle");
  expect(circles.length).toBeGreaterThanOrEqual(1);

  // The midline circle should be at (50, 50)
  const midlineCircle = circles[0];
  expect(Number(midlineCircle.getAttribute("cx"))).toBeCloseTo(50, 1);
  expect(Number(midlineCircle.getAttribute("cy"))).toBeCloseTo(50, 1);
});

test("apply calibration writes midline and commissure to viewport store", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Midline click at center: (300,350) → 50%, 50%
  act(() => clickAt(canvas, 300, 350));
  // Commissure click at right quarter: (450,350) → 87.5%, 50%
  act(() => clickAt(canvas, 450, 350));

  act(() => {
    screen.getByRole("button", { name: /apply calibration/i }).click();
  });

  const vp = useViewportStore.getState();
  // midlineX set to xPercent of midline click = 50
  expect(vp.midlineX).toBeCloseTo(50, 1);
  // smileArcY set to yPercent of midline click = 50
  expect(vp.smileArcY).toBeCloseTo(50, 1);
  // rightCommissureX set to xPercent of commissure click = 87.5
  expect(vp.rightCommissureX).toBeCloseTo(87.5, 1);
  // leftCommissureX mirrored: midlineX - (rightCommissureX - midlineX) = 50 - 37.5 = 12.5
  expect(vp.leftCommissureX).toBeCloseTo(12.5, 1);
  // Two alignment markers stored
  expect(vp.alignmentMarkers).toHaveLength(2);
  expect(vp.alignmentMarkers[0].id).toBe("calibration-midline");
  expect(vp.alignmentMarkers[1].id).toBe("calibration-commissure");
});

test("shows success banner after applying calibration", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;
  act(() => clickAt(canvas, 300, 350));
  act(() => clickAt(canvas, 450, 350));
  act(() => {
    screen.getByRole("button", { name: /apply calibration/i }).click();
  });

  expect(screen.getByText(/calibration applied/i)).toBeInTheDocument();
});

test("reset clears markers and returns to midline step", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;
  act(() => clickAt(canvas, 300, 350));
  act(() => clickAt(canvas, 450, 350));

  // Now reset
  act(() => {
    screen.getByRole("button", { name: /reset/i }).click();
  });

  // Should be back on midline step
  expect(
    screen.getByText(/click the tip of the upper central incisor/i)
  ).toBeInTheDocument();
  // SVG markers should be gone
  const svg = document.querySelector("svg[viewBox='0 0 100 100']")!;
  expect(svg.querySelectorAll("circle")).toHaveLength(0);
});

test("clicks in review step are ignored (no additional marker)", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;
  act(() => clickAt(canvas, 300, 350)); // midline
  act(() => clickAt(canvas, 450, 350)); // commissure → now in review

  const svg = document.querySelector("svg[viewBox='0 0 100 100']")!;
  const circlesBefore = svg.querySelectorAll("circle").length;

  // Click again — should be ignored (review step)
  const reviewCanvas = document.querySelector<HTMLElement>('[style*="default"]')!;
  act(() => clickAt(reviewCanvas, 200, 300));

  expect(svg.querySelectorAll("circle")).toHaveLength(circlesBefore);
});

test("zero-dimension container is handled gracefully (no crash)", () => {
  // Simulate broken layout where element has zero dimensions
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, width: 0, height: 0,
    right: 0, bottom: 0, x: 0, y: 0,
    toJSON: () => ({}),
  });

  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;
  // Should not throw; click should be silently ignored
  expect(() => {
    act(() => clickAt(canvas, 50, 50));
  }).not.toThrow();
  // Still on midline step (marker not placed due to NaN coords)
  expect(
    screen.getByText(/click the tip of the upper central incisor/i)
  ).toBeInTheDocument();
});
