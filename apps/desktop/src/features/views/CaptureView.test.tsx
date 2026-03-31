import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useImportStore } from "../../store/useImportStore";
import { useViewportStore } from "../../store/useViewportStore";
import { useDesignStore } from "../../store/useDesignStore";
import { CaptureView } from "./CaptureView";

// Mock heavy components that CaptureView pulls in transitively
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

beforeEach(() => {
  act(() => {
    useImportStore.getState().clearAll();
    useViewportStore.getState().clearAlignmentMarkers();
    useViewportStore.setState({ activeView: "import" });
  });
  vi.clearAllMocks();
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

describe("CaptureView (Import stage wrapper)", () => {
  it("renders with Import header", () => {
    render(<CaptureView />);
    expect(screen.getByText(/^Import$/)).toBeInTheDocument();
  });

  it("shows Import Assets heading in the panel", () => {
    render(<CaptureView />);
    expect(screen.getByText(/Import Assets/)).toBeInTheDocument();
  });

  it("shows upload progress indicator", () => {
    render(<CaptureView />);
    expect(screen.getByText(/0\/2 required/)).toBeInTheDocument();
  });

  it("shows photo drop zone", () => {
    render(<CaptureView />);
    expect(screen.getByText(/Drop photos here or click to browse/i)).toBeInTheDocument();
  });

  it("shows arch scan drop zone", () => {
    render(<CaptureView />);
    expect(screen.getByText(/Drop 3D scan here or click to browse/i)).toBeInTheDocument();
  });

  it("shows tooth library section", () => {
    render(<CaptureView />);
    expect(screen.getByText(/Tooth Library/)).toBeInTheDocument();
  });
});

describe("Import panel upload state", () => {
  it("shows 1/2 required when photo is uploaded", () => {
    act(() => {
      useImportStore.setState({
        uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
      });
    });
    render(<CaptureView />);
    expect(screen.getByText(/1\/2 required/)).toBeInTheDocument();
  });

  it("shows 1/2 required when scan is uploaded", () => {
    act(() => {
      useImportStore.setState({
        archScanName: "arch.stl",
        archScanMesh: MOCK_ARCH_SCAN_MESH as any,
      });
    });
    render(<CaptureView />);
    expect(screen.getByText(/1\/2 required/)).toBeInTheDocument();
  });

  it("shows 2/2 required when both photo and scan are uploaded", () => {
    act(() => {
      useImportStore.setState({
        uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
        archScanName: "arch.stl",
        archScanMesh: MOCK_ARCH_SCAN_MESH as any,
      });
    });
    render(<CaptureView />);
    expect(screen.getByText(/2\/2 required/)).toBeInTheDocument();
  });

  it("shows Generate Design button when both photo and scan are uploaded", () => {
    act(() => {
      useImportStore.setState({
        uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
        archScanName: "arch.stl",
        archScanMesh: MOCK_ARCH_SCAN_MESH as any,
      });
    });
    render(<CaptureView />);
    expect(screen.getByRole("button", { name: /Generate Design/i })).toBeInTheDocument();
  });

  // Generate Design button is inside ImportPanel and requires:
  // 1. validation.ok (photos + scan uploaded)
  // 2. activeCollectionId selected (from tooth morphology dropdown)
  // This is tested at the IntegrationTest level in App.test.tsx
});

describe("Continue button navigation", () => {
  it("continue button is disabled when no scan is uploaded", () => {
    render(<CaptureView />);
    const btn = screen.getByRole("button", { name: /^Continue$/i });
    expect(btn).toBeDisabled();
  });

  it("continue button is disabled when no photo is uploaded", () => {
    act(() => {
      useImportStore.setState({
        archScanName: "arch.stl",
        archScanMesh: MOCK_ARCH_SCAN_MESH as any,
      });
    });
    render(<CaptureView />);
    const btn = screen.getByRole("button", { name: /^Continue$/i });
    expect(btn).toBeDisabled();
  });

  it("continue button is enabled when both photo and scan are available", () => {
    act(() => {
      useImportStore.setState({
        uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
        archScanName: "arch.stl",
        archScanMesh: MOCK_ARCH_SCAN_MESH as any,
      });
    });
    render(<CaptureView />);
    const btn = screen.getByRole("button", { name: /^Continue$/i });
    expect(btn).toBeEnabled();
  });

  it("continue button navigates to design view", async () => {
    act(() => {
      useImportStore.setState({
        uploadedPhotos: [{ name: "smile.jpg", url: "blob:smile" }],
        archScanName: "arch.stl",
        archScanMesh: MOCK_ARCH_SCAN_MESH as any,
      });
    });
    render(<CaptureView />);

    await userEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

    await waitFor(() => {
      expect(useViewportStore.getState().activeView).toBe("design");
    });
  });
});
