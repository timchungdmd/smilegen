/**
 * AlignmentCalibrationWizard tests
 *
 * Tests the two-phase full-screen modal alignment wizard:
 *   Phase 1 (photo) — user clicks reference points on the patient photo
 *   Phase 2 (scan)  — user clicks matching points on the 3D arch scan (mocked)
 */

// AlignmentScanViewer uses R3F Canvas which cannot render in jsdom — mock it
vi.mock("./AlignmentScanViewer", () => ({
  AlignmentScanViewer: ({
    onPickPoint,
    isPicking,
  }: {
    onPickPoint: (p: { x: number; y: number; z: number }) => void;
    isPicking: boolean;
  }) => (
    <button
      data-testid="scan-pick-btn"
      onClick={() => isPicking && onPickPoint({ x: 4, y: 0, z: 0 })}
    >
      Mock Scan
    </button>
  ),
}));

// Prevent IndexedDB errors from Zustand persist middleware
vi.mock("idb-keyval", () => ({
  createStore: vi.fn(() => ({})),
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  entries: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue(undefined),
}));

import { render, screen, fireEvent, act } from "@testing-library/react";
import { AlignmentCalibrationWizard } from "./AlignmentCalibrationWizard";
import { useImportStore } from "../../store/useImportStore";
import { useViewportStore } from "../../store/useViewportStore";

// ── helpers ────────────────────────────────────────────────────────────────

// Minimal arch scan mesh so AlignmentScanViewer is rendered (not the "no scan" placeholder)
const MOCK_ARCH_SCAN_MESH = {
  name: "test.stl",
  bounds: {
    minX: -30, maxX: 30, minY: -20, maxY: 20,
    minZ: -5, maxZ: 5,
    width: 60, depth: 40, height: 10,
  },
  vertexCount: 3,
  triangles: [
    { a: { x: 0, y: 0, z: 0 }, b: { x: 1, y: 0, z: 0 }, c: { x: 0, y: 1, z: 0 } },
  ],
};

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
  return vi
    .spyOn(Element.prototype, "getBoundingClientRect")
    .mockReturnValue(MOCK_RECT);
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

test("renders modal with Phase 1 and Phase 2 chips when photo is loaded", () => {
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);
  expect(screen.getByText(/phase 1: mark photo/i)).toBeInTheDocument();
  expect(screen.getByText(/phase 2: mark scan/i)).toBeInTheDocument();
});

test("clicking photo in phase 1 places first marker (right central)", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  // In phase 1 with nextPhotoPointId set, cursor is "crosshair"
  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;
  expect(canvas).not.toBeNull();

  // Click at viewport (300, 350) → xPercent=50, yPercent=50
  act(() => {
    fireEvent.click(canvas, { clientX: 300, clientY: 350 });
  });

  const circles = document.querySelectorAll("circle");
  expect(circles.length).toBeGreaterThanOrEqual(1);
});

test("after two required photo clicks Next button enables", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Click central-R at (340, 365) → xPercent=60, yPercent=55
  act(() => {
    fireEvent.click(canvas, { clientX: 340, clientY: 365 });
  });

  // Click central-L at (260, 365) → xPercent=40, yPercent=55
  act(() => {
    fireEvent.click(canvas, { clientX: 260, clientY: 365 });
  });

  const nextBtn = screen.getByTestId("next-btn");
  expect(nextBtn).not.toBeDisabled();
});

test("undo button removes last placed photo marker", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Place one marker
  act(() => {
    fireEvent.click(canvas, { clientX: 300, clientY: 350 });
  });

  expect(document.querySelectorAll("circle").length).toBeGreaterThanOrEqual(1);

  // Click the Undo button
  const undoBtn = screen.getByTitle("Undo last point (Cmd/Ctrl+Z)");
  act(() => {
    fireEvent.click(undoBtn);
  });

  expect(document.querySelectorAll("circle").length).toBe(0);
});

test("Cmd+Z keyboard shortcut triggers undo", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Place one marker
  act(() => {
    fireEvent.click(canvas, { clientX: 300, clientY: 350 });
  });

  expect(document.querySelectorAll("circle").length).toBeGreaterThanOrEqual(1);

  // Trigger Cmd+Z
  act(() => {
    fireEvent.keyDown(window, { key: "z", metaKey: true });
  });

  expect(document.querySelectorAll("circle").length).toBe(0);
});

test("switching to scan phase locks the photo panel", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Place both required photo points
  act(() => {
    fireEvent.click(canvas, { clientX: 340, clientY: 365 });
  });
  act(() => {
    fireEvent.click(canvas, { clientX: 260, clientY: 365 });
  });

  // Click Next to switch to scan phase
  act(() => {
    fireEvent.click(screen.getByTestId("next-btn"));
  });

  const circlesBefore = document.querySelectorAll("circle").length;

  // In scan phase, the photo panel is locked (activePhotoPointId=null → cursor=default)
  // Try clicking any element in the photo area — should not add more circles
  const photoArea = document.querySelector<HTMLElement>(
    '[style*="crosshair"],[style*="default"]'
  );
  if (photoArea) {
    act(() => {
      fireEvent.click(photoArea, { clientX: 300, clientY: 350 });
    });
  }

  expect(document.querySelectorAll("circle").length).toBe(circlesBefore);
});

test("Apply Calibration updates viewport store with correct midlineX and smileArcY", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
    // Provide a non-null archScanMesh so AlignmentScanViewer (the mock) renders
    archScanMesh: MOCK_ARCH_SCAN_MESH as any,
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Phase 1: place central-R at (340, 365) → xPercent=60, yPercent=55
  act(() => {
    fireEvent.click(canvas, { clientX: 340, clientY: 365 });
  });
  // Phase 1: place central-L at (260, 365) → xPercent=40, yPercent=55
  act(() => {
    fireEvent.click(canvas, { clientX: 260, clientY: 365 });
  });

  // Click Next to enter scan phase
  act(() => {
    fireEvent.click(screen.getByTestId("next-btn"));
  });

  // Phase 2: pick scan points via the mock button
  // First pick is for central-R (nextScanPointId), second for central-L
  const scanPickBtn = screen.getByTestId("scan-pick-btn");

  act(() => {
    fireEvent.click(scanPickBtn);
  });
  act(() => {
    fireEvent.click(scanPickBtn);
  });

  // Now Apply should be enabled
  const applyBtn = screen.getByTestId("apply-btn");
  act(() => {
    fireEvent.click(applyBtn);
  });

  const vp = useViewportStore.getState();
  // midlineX = midpoint of 60 and 40 = 50 (viewWidth=100 so midlineX IS percent)
  expect(vp.midlineX).toBeCloseTo(50, 1);
  // smileArcY = midpoint of 55 and 55 = 55 (viewHeight=100 so incisalY IS percent)
  expect(vp.smileArcY).toBeCloseTo(55, 1);
  // Two alignment markers for the two photo-marked points
  expect(vp.alignmentMarkers).toHaveLength(2);
  expect(vp.alignmentMarkers[0].id).toBe("alignment-central-R");
  expect(vp.alignmentMarkers[1].id).toBe("alignment-central-L");
});

test("Reset clears all points and returns to photo phase", () => {
  mockRect();
  useImportStore.setState({
    uploadedPhotos: [{ name: "face.jpg", url: "blob:mock-photo" }],
  });
  render(<AlignmentCalibrationWizard />);

  const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;

  // Place a couple of photo points
  act(() => {
    fireEvent.click(canvas, { clientX: 340, clientY: 365 });
  });
  act(() => {
    fireEvent.click(canvas, { clientX: 260, clientY: 365 });
  });

  expect(document.querySelectorAll("circle").length).toBeGreaterThanOrEqual(2);

  // Click Reset
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
  });

  // Circles should be gone
  expect(document.querySelectorAll("circle").length).toBe(0);

  // Phase 1 chip should still be visible (we are back in photo phase)
  expect(screen.getByText(/phase 1: mark photo/i)).toBeInTheDocument();

  // Next button should exist (back in photo phase) and be disabled (no points placed)
  const nextBtn = screen.getByTestId("next-btn");
  expect(nextBtn).toBeDisabled();
});
