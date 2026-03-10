import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useImportStore } from "../../store/useImportStore";
import { useSidecarStore } from "../../store/useSidecarStore";
import { useViewportStore } from "../../store/useViewportStore";
import { CaptureView } from "./CaptureView";

// Mock vision client
vi.mock("../../services/visionClient", () => ({
  detectLandmarks: vi.fn(),
  getMouthMask: vi.fn(),
}));

import { detectLandmarks, getMouthMask } from "../../services/visionClient";
const mockDetectLandmarks = detectLandmarks as ReturnType<typeof vi.fn>;
const mockGetMouthMask = getMouthMask as ReturnType<typeof vi.fn>;

// Mock 3D / heavy components that CaptureView pulls in transitively
vi.mock("../../features/viewer/SceneCanvas", () => ({
  SceneCanvas: () => <div data-testid="scene-canvas">3D Viewer Mock</div>,
}));

vi.mock("../../features/overlay/PhotoOverlay", () => ({
  PhotoOverlay: () => <div data-testid="photo-overlay">Photo Overlay Mock</div>,
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({})),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
  Grid: () => null,
  Environment: () => null,
}));

// Prevent IndexedDB errors from auto-save subscriptions
vi.mock("idb-keyval", () => ({
  createStore: vi.fn(() => ({})),
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  entries: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue(undefined),
}));

// Helper: set sidecar state directly
function setSidecarReady() {
  useSidecarStore.setState({ sidecarState: "ready" });
}

function setSidecarStarting() {
  useSidecarStore.setState({ sidecarState: "starting" });
}

function setSidecarUnavailable() {
  useSidecarStore.setState({ sidecarState: "unavailable" });
}

// Helper: inject a fake uploaded photo into import store
function injectPhoto() {
  useImportStore.setState({
    uploadedPhotos: [
      {
        name: "test.jpg",
        url: "blob:http://localhost/test-photo",
      },
    ],
  });
}

// Helper: build a mock VisionLandmarkResult
function makeLandmarkResult() {
  return {
    midlineX: 0.5,
    commissureLeft: { x: 0.2, y: 0.6 },
    commissureRight: { x: 0.8, y: 0.6 },
    smileArcY: 0.55,
    gingivalLineY: 0.45,
    lipContour: {
      outer: Array.from({ length: 22 }, () => ({ x: 0.5, y: 0.55 })),
      inner: Array.from({ length: 22 }, () => ({ x: 0.5, y: 0.58 })),
    },
    mouthMaskBbox: { xMin: 0.2, yMin: 0.5, xMax: 0.8, yMax: 0.7 },
  };
}

beforeEach(() => {
  // Reset all stores to clean state
  useImportStore.getState().clearAll();
  useSidecarStore.setState({ sidecarState: "starting" });
  useViewportStore.getState().clearAlignmentMarkers();
  vi.clearAllMocks();

  // Stub fetch for blob URL reads
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      blob: async () => new Blob(["fake-image"], { type: "image/jpeg" }),
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Auto-detect button disabled states", () => {
  it("is disabled when sidecar is starting (no photos)", () => {
    setSidecarStarting();
    render(<CaptureView />);
    const btn = screen.getByRole("button", { name: /services loading/i });
    expect(btn).toBeDisabled();
  });

  it("is disabled when sidecar is ready but no photos uploaded", () => {
    setSidecarReady();
    render(<CaptureView />);
    const btn = screen.getByRole("button", { name: /auto-detect/i });
    expect(btn).toBeDisabled();
  });

  it("is disabled when sidecar is unavailable", () => {
    setSidecarUnavailable();
    render(<CaptureView />);
    const btn = screen.getByRole("button", { name: /vision offline/i });
    expect(btn).toBeDisabled();
  });
});

describe("Auto-detect error handling", () => {
  it("shows error banner when detectLandmarks throws", async () => {
    setSidecarReady();
    injectPhoto();
    mockDetectLandmarks.mockRejectedValueOnce(
      new Error("No face detected in the uploaded photo.")
    );
    mockGetMouthMask.mockResolvedValue(new Blob(["mask"]));

    render(<CaptureView />);
    const btn = screen.getByRole("button", { name: /auto-detect/i });
    await userEvent.click(btn);

    await waitFor(() => {
      expect(
        screen.getByText(/No face detected in the uploaded photo./i)
      ).toBeInTheDocument();
    });
  });
});

describe("Auto-detect success", () => {
  it("updates viewport store with 100x-scaled landmark values on success", async () => {
    setSidecarReady();
    injectPhoto();
    mockDetectLandmarks.mockResolvedValueOnce(makeLandmarkResult());
    mockGetMouthMask.mockResolvedValueOnce(new Blob(["mask-png"], { type: "image/png" }));

    render(<CaptureView />);
    const btn = screen.getByRole("button", { name: /auto-detect/i });
    await userEvent.click(btn);

    await waitFor(() => {
      const vpState = useViewportStore.getState();
      expect(vpState.midlineX).toBeCloseTo(50); // 0.5 * 100
      expect(vpState.smileArcY).toBeCloseTo(55); // 0.55 * 100
    });
  });
});
