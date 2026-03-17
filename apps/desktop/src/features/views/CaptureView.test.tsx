import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("../capture/AlignmentScanViewer", () => ({
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

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({})),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  TrackballControls: () => null,
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

function setSidecarReady() {
  act(() => {
    useSidecarStore.setState({ sidecarState: "ready" });
  });
}

function setSidecarStarting() {
  act(() => {
    useSidecarStore.setState({ sidecarState: "starting" });
  });
}

function setSidecarUnavailable() {
  act(() => {
    useSidecarStore.setState({ sidecarState: "unavailable" });
  });
}

// Helper: inject a fake uploaded photo into import store
function injectPhoto() {
  act(() => {
    useImportStore.setState({
      uploadedPhotos: [
        {
          name: "test.jpg",
          url: "blob:http://localhost/test-photo",
        },
      ],
    });
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
  act(() => {
    useImportStore.getState().clearAll();
    useSidecarStore.setState({ sidecarState: "starting" });
    useViewportStore.getState().clearAlignmentMarkers();
    useViewportStore.setState({ activeView: "import" });
  });
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

describe("collapsed import and align workflow framing", () => {
  it("shows Import framing by default when the import view is active", () => {
    act(() => {
      useViewportStore.setState({ activeView: "import" });
    });

    render(<CaptureView />);

    expect(screen.getByText(/^Import$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue to align/i })).toBeInTheDocument();
  });

  it("shows Align framing when the align view is active", () => {
    act(() => {
      useViewportStore.setState({ activeView: "align" });
    });

    render(<CaptureView />);

    expect(screen.getByText(/^Align$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue to design/i })).toBeInTheDocument();
  });

  it("enables Import progression when either a photo or scan is available", () => {
    act(() => {
      useViewportStore.setState({ activeView: "import" });
      useImportStore.setState({
        uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
        archScanName: undefined,
      });
    });

    render(<CaptureView />);

    expect(screen.getByRole("button", { name: /continue to align/i })).toBeEnabled();

    act(() => {
      useImportStore.setState({
        uploadedPhotos: [],
        archScanName: "arch.stl",
      });
    });

    expect(screen.getByRole("button", { name: /continue to align/i })).toBeEnabled();
  });

  it("keeps Align progression disabled until both photo and scan are available", () => {
    act(() => {
      useViewportStore.setState({ activeView: "align" });
      useImportStore.setState({
        uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
        archScanName: undefined,
      });
    });

    render(<CaptureView />);

    expect(screen.getByRole("button", { name: /continue to design/i })).toBeDisabled();

    act(() => {
      useImportStore.setState({
        uploadedPhotos: [],
        archScanName: "arch.stl",
      });
    });

    expect(screen.getByRole("button", { name: /continue to design/i })).toBeDisabled();

    act(() => {
      useImportStore.setState({
        uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
        archScanName: "arch.stl",
      });
    });

    expect(screen.getByRole("button", { name: /continue to design/i })).toBeEnabled();
  });

  it("preserves the real wizard phase when moving from Import to Align", async () => {
    mockRect();
    act(() => {
      useViewportStore.setState({ activeView: "import" });
      useImportStore.setState({
        uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
        archScanMesh: MOCK_ARCH_SCAN_MESH as any,
        archScanName: "arch.stl",
      });
    });

    render(<CaptureView />);

    await userEvent.click(screen.getByRole("button", { name: /align photo/i }));
    const canvas = document.querySelector<HTMLElement>('[style*="crosshair"]')!;
    act(() => {
      fireEvent.click(canvas, { clientX: 300, clientY: 350 });
      fireEvent.click(canvas, { clientX: 260, clientY: 350 });
    });
    await userEvent.click(screen.getByTestId("next-btn"));

    expect(screen.getByTestId("scan-pick-btn")).toBeInTheDocument();

    act(() => {
      useViewportStore.setState({ activeView: "align" });
    });

    expect(screen.getByText(/^Align$/)).toBeInTheDocument();
    expect(screen.getByTestId("scan-pick-btn")).toBeInTheDocument();
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
