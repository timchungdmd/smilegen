import { render, screen, waitFor, act } from "@testing-library/react";
import App from "./App";
import { useViewportStore } from "./store/useViewportStore";
import { useImportStore } from "./store/useImportStore";
import { useDesignStore } from "./store/useDesignStore";
import { useCaseStore } from "./store/useCaseStore";

// Prevent IndexedDB errors: all views are now mounted simultaneously (display:none
// persistence), which means the auto-save subscription can fire during tests and
// attempt a real IndexedDB write (unavailable in jsdom).
vi.mock("idb-keyval", () => ({
  createStore: vi.fn(() => ({})),
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  entries: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue(undefined)
}));

// Mock 3D components which use R3F (not available in jsdom)
vi.mock("./features/viewer/SceneCanvas", () => ({
  SceneCanvas: () => <div data-testid="scene-canvas">3D Viewer Mock</div>
}));

vi.mock("./features/overlay/PhotoOverlay", () => ({
  PhotoOverlay: () => <div data-testid="photo-overlay">Photo Overlay Mock</div>
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({}))
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
  Grid: () => null,
  Environment: () => null
}));

const sampleStl = `solid tooth
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 1
  endloop
endfacet
endsolid tooth`;

function createTestFile(contents: string, name: string, type: string) {
  const file = new File([contents], name, { type });
  const buffer = new TextEncoder().encode(contents).buffer;
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => buffer
  });
  return file;
}

function createFileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      for (const f of files) yield f;
    }
  };
  for (let i = 0; i < files.length; i++) {
    (list as Record<number, File>)[i] = files[i];
  }
  return list as unknown as FileList;
}

const createObjectUrlMock = vi.fn(() => "blob:mock");

beforeEach(() => {
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: vi.fn()
    })
  );

  // Reset all split stores so each test starts fresh
  useViewportStore.setState({
    activeView: "import",
    showOverlay: false,
    overlayOpacity: 0.7,
    showSmileArc: true,
    showMidline: true,
    showGingivalLine: false,
    midlineX: 50,
    smileArcY: 60,
    gingivalLineY: 30,
    leftCommissureX: 25,
    rightCommissureX: 75,
    photoZoom: 1,
    photoPanX: 0,
    photoPanY: 0,
    alignmentMarkers: [],
    cameraDistance: 200,
    activeCollectionId: null,
  });
  useImportStore.setState({
    uploadedPhotos: [],
    archScanMesh: null,
    archScanName: undefined,
    uploadedToothModels: [],
    importError: null,
  });
  useDesignStore.getState().resetDesign();
  useDesignStore.temporal.getState().clear();
  useCaseStore.setState({ caseRecord: null, mappingState: null });
});

afterEach(() => {
  createObjectUrlMock.mockClear();
  vi.unstubAllGlobals();
});

test("renders the dental CAD shell with sidebar navigation", () => {
  render(<App />);
  expect(screen.getByText("SmileGen")).toBeInTheDocument();
  expect(screen.getAllByText("Import").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Compare").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Export").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Cases").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
});

test("starts on the import view with upload zones", () => {
  render(<App />);
  expect(screen.getAllByText("Import Assets").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("Patient Photos")).toBeInTheDocument();
  expect(screen.getByText("Arch Scan")).toBeInTheDocument();
  expect(screen.getAllByText("Tooth Library").length).toBeGreaterThanOrEqual(1);
});

test("imports an arch scan and updates store", async () => {
  const archFile = createTestFile(sampleStl, "maxillary.stl", "model/stl");

  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  expect(useImportStore.getState().archScanMesh).not.toBeNull();
  expect(useImportStore.getState().archScanName).toBe("maxillary.stl");
});

test("generates variants from valid imports", async () => {
  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });
  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  await waitFor(() => {
    expect(useImportStore.getState().archScanMesh).not.toBeNull();
  });

  act(() => {
    useDesignStore.getState().quickGenerate();
  });

  expect(useViewportStore.getState().activeView).toBe("design");
  expect(useDesignStore.getState().generatedDesign).not.toBeNull();
  expect(useDesignStore.getState().generatedDesign!.variants.length).toBe(3);
  expect(useCaseStore.getState().caseRecord).not.toBeNull();
  expect(useCaseStore.getState().caseRecord!.workflowState).toBe("mapped");
});

test("selecting a variant updates the active variant", async () => {
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");
  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });
  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });
  act(() => {
    useDesignStore.getState().quickGenerate();
  });

  const variants = useDesignStore.getState().generatedDesign!.variants;
  act(() => {
    useDesignStore.getState().selectVariant(variants[0].id);
  });

  expect(useDesignStore.getState().activeVariantId).toBe(variants[0].id);
});

test("adjusting tooth dimensions updates the design", async () => {
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");
  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });
  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });
  act(() => {
    useDesignStore.getState().quickGenerate();
  });

  const activeId = useDesignStore.getState().activeVariantId!;
  const tooth = useDesignStore
    .getState()
    .generatedDesign!.variants.find((v) => v.id === activeId)!
    .teeth.find((t) => t.toothId === "8");

  expect(tooth).toBeDefined();
  const originalWidth = tooth!.width;

  act(() => {
    useDesignStore.getState().adjustTooth("8", { width: 9.9 });
  });

  const updatedTooth = useDesignStore
    .getState()
    .generatedDesign!.variants.find((v) => v.id === activeId)!
    .teeth.find((t) => t.toothId === "8");

  expect(updatedTooth!.width).toBeCloseTo(9.9, 1);
  expect(updatedTooth!.width).not.toBeCloseTo(originalWidth, 1);
});

test("changing additive bias resets the generation", async () => {
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");
  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });
  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });
  act(() => {
    useDesignStore.getState().quickGenerate();
  });

  expect(useDesignStore.getState().generatedDesign).not.toBeNull();

  act(() => {
    useDesignStore.getState().changeBias("conservative");
  });

  expect(useDesignStore.getState().plan.additiveBias).toBe("conservative");
  expect(useDesignStore.getState().generatedDesign).toBeNull();
  expect(useDesignStore.getState().variants).toEqual([]);
});
