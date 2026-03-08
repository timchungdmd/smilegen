import { render, screen, waitFor, act } from "@testing-library/react";
import App from "./App";
import { useSmileStore } from "./store/useSmileStore";

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
  // Reset zustand store
  useSmileStore.setState({
    activeView: "import",
    caseRecord: null,
    generationRequest: null,
    generatedDesign: null,
    mappingState: null,
    variants: [],
    activeVariantId: null,
    selectedToothId: null,
    trustSummary: null,
    readyForDoctor: false,
    uploadedPhotos: [],
    archScanMesh: null,
    archScanName: undefined,
    uploadedToothModels: [],
    importError: null,
    selectedShadeId: "A2",
    leftCommissureX: 20,
    rightCommissureX: 80,
    facialLandmarks: null,
    photoZoom: 1,
    photoPanX: 0,
    photoPanY: 0,
    alignmentMarkers: [],
    activeCollectionId: null,
    annotations: [],
    archPreset: "auto",
    archDepthOverride: null,
    archHalfWidthOverride: null,
    cameraDistance: 250,
    expertMode: false
  });
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
  expect(screen.getByText("Cases")).toBeInTheDocument();
  expect(screen.getByText("Settings")).toBeInTheDocument();
});

test("starts on the import view with upload zones", () => {
  render(<App />);
  expect(screen.getAllByText("Import Assets").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("Patient Photos")).toBeInTheDocument();
  expect(screen.getByText("Arch Scan")).toBeInTheDocument();
  expect(screen.getByText("Tooth Library")).toBeInTheDocument();
});

test("imports an arch scan and updates store", async () => {
  const archFile = createTestFile(sampleStl, "maxillary.stl", "model/stl");

  await act(async () => {
    await useSmileStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  expect(useSmileStore.getState().archScanMesh).not.toBeNull();
  expect(useSmileStore.getState().archScanName).toBe("maxillary.stl");
});

test("generates variants from valid imports", async () => {
  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");

  act(() => {
    useSmileStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });
  await act(async () => {
    await useSmileStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  await waitFor(() => {
    expect(useSmileStore.getState().archScanMesh).not.toBeNull();
  });

  act(() => {
    useSmileStore.getState().quickGenerate();
  });

  const state = useSmileStore.getState();
  expect(state.activeView).toBe("design");
  expect(state.generatedDesign).not.toBeNull();
  expect(state.generatedDesign!.variants.length).toBe(3);
  expect(state.caseRecord).not.toBeNull();
  expect(state.caseRecord!.workflowState).toBe("mapped");
});

test("selecting a variant updates the active variant", async () => {
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");
  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");

  act(() => {
    useSmileStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });
  await act(async () => {
    await useSmileStore.getState().handleArchScanSelected(createFileList([archFile]));
  });
  act(() => {
    useSmileStore.getState().quickGenerate();
  });

  const variants = useSmileStore.getState().generatedDesign!.variants;
  act(() => {
    useSmileStore.getState().selectVariant(variants[0].id);
  });

  expect(useSmileStore.getState().activeVariantId).toBe(variants[0].id);
});

test("adjusting tooth dimensions updates the design", async () => {
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");
  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");

  act(() => {
    useSmileStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });
  await act(async () => {
    await useSmileStore.getState().handleArchScanSelected(createFileList([archFile]));
  });
  act(() => {
    useSmileStore.getState().quickGenerate();
  });

  const activeId = useSmileStore.getState().activeVariantId!;
  const tooth = useSmileStore
    .getState()
    .generatedDesign!.variants.find((v) => v.id === activeId)!
    .teeth.find((t) => t.toothId === "8");

  expect(tooth).toBeDefined();
  const originalWidth = tooth!.width;

  act(() => {
    useSmileStore.getState().adjustTooth("8", { width: 9.9 });
  });

  const updatedTooth = useSmileStore
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
    useSmileStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });
  await act(async () => {
    await useSmileStore.getState().handleArchScanSelected(createFileList([archFile]));
  });
  act(() => {
    useSmileStore.getState().quickGenerate();
  });

  expect(useSmileStore.getState().generatedDesign).not.toBeNull();

  act(() => {
    useSmileStore.getState().changeBias("conservative");
  });

  expect(useSmileStore.getState().plan.additiveBias).toBe("conservative");
  expect(useSmileStore.getState().generatedDesign).toBeNull();
  expect(useSmileStore.getState().variants).toEqual([]);
});
