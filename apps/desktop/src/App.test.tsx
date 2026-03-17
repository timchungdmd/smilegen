import { render, screen, waitFor, act, fireEvent, within } from "@testing-library/react";
import App from "./App";
import {
  getCaseWorkflowStage,
  normalizeViewId,
  useViewportStore,
} from "./store/useViewportStore";
import { useImportStore } from "./store/useImportStore";
import { useDesignStore } from "./store/useDesignStore";
import { useCaseStore } from "./store/useCaseStore";
import {
  getEffectiveWorkspaceVariant,
  useWorkspaceVariantStore,
} from "./features/experiments/workspaceVariantStore";
import { ValidateView } from "./features/views/ValidateView";
import { PresentView } from "./features/views/PresentView";
import { ImportView } from "./features/views/ImportView";
import { DesignSidebar } from "./features/design/DesignSidebar";

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

vi.mock("./features/views/CaseListView", () => ({
  CaseListView: () => <div data-testid="mock-case-list">Cases Mock</div>
}));

// Mock 3D components which use R3F (not available in jsdom)
vi.mock("./features/viewer/SceneCanvas", () => ({
  SceneCanvas: () => <div data-testid="scene-canvas">3D Viewer Mock</div>
}));

vi.mock("./features/overlay/PhotoOverlay", () => ({
  PhotoOverlay: () => <div data-testid="photo-overlay">Photo Overlay Mock</div>
}));

vi.mock("./features/capture/AlignmentCalibrationWizard", () => ({
  AlignmentCalibrationWizard: () => (
    <div data-testid="mock-alignment-wizard">Alignment Wizard Mock</div>
  )
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({}))
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  TrackballControls: () => null,
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

function resetWorkspaceVariantState(requestedVariant: "workspace" | "guided" = "workspace") {
  useWorkspaceVariantStore.setState({
    requestedVariant,
    variant: getEffectiveWorkspaceVariant(requestedVariant),
  });
}

async function renderAppAndWait() {
  const rendered = render(<App />);
  await waitFor(() => {
    expect(screen.queryByTestId("workspace-loading-fallback")).not.toBeInTheDocument();
  });
  return rendered;
}

async function waitForWorkspaceToSettle() {
  await waitFor(() => {
    expect(screen.queryByTestId("workspace-loading-fallback")).not.toBeInTheDocument();
  });
}

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
    designTab: "3d",
    gimbalMode: "translate",
    showPhotoIn3D: false,
    scanReferencePoints: null,
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
  resetWorkspaceVariantState();
});

afterEach(() => {
  createObjectUrlMock.mockClear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("renders the dental CAD shell with sidebar navigation", async () => {
  await renderAppAndWait();
  expect(screen.getByTestId("mock-case-list")).toBeInTheDocument();
  expect(screen.getByText("SmileGen")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Import" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Align" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Design" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Review" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Present" })).toBeInTheDocument();
  expect(screen.getAllByText("Cases").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
});

test("starts on the import view with upload zones", async () => {
  await renderAppAndWait();
  expect(screen.getAllByText("Import Assets").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Patient Photos").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Arch Scan").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Tooth Library").length).toBeGreaterThanOrEqual(1);
});

test("workspace exposes a loading fallback when a new lazy stage is opened", async () => {
  await renderAppAndWait();

  fireEvent.click(screen.getByRole("tab", { name: "Design" }));

  expect(screen.getByTestId("workspace-loading-fallback")).toBeInTheDocument();
  await waitForWorkspaceToSettle();
});

test("shared shell exposes the case studio landmark and header action zone", async () => {
  await renderAppAndWait();

  expect(screen.getByTestId("case-studio-landmark")).toBeInTheDocument();
  expect(screen.getByTestId("header-action-zone")).toBeInTheDocument();
});

test("import workspace exposes shared status chips and a dedicated action zone", () => {
  render(<ImportView />);

  expect(screen.getByTestId("import-workspace-shell")).toBeInTheDocument();
  expect(screen.getByTestId("import-action-zone")).toBeInTheDocument();
  expect(screen.getAllByTestId("shared-status-chip").length).toBeGreaterThanOrEqual(3);
});

test("design sidebar groups controls into inspector cards", async () => {
  const photoFile = createTestFile("photo", "design-face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "design-arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });

  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  act(() => {
    useDesignStore.getState().quickGenerate();
  });

  render(<DesignSidebar />);

  expect(screen.getByTestId("design-inspector-stack")).toBeInTheDocument();
  expect(screen.getAllByTestId("design-inspector-card").length).toBeGreaterThanOrEqual(4);
});

test("present workspace reuses the shared status chip treatment and action zone", () => {
  const photoFile = createTestFile("photo", "present-face.jpg", "image/jpeg");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });

  useDesignStore.setState({
    generatedDesign: {
      id: "design-present",
      variants: [],
      createdAt: new Date().toISOString(),
    } as any,
    readyForDoctor: true,
    variants: [
      {
        id: "variant-1",
        label: "Primary",
        teeth: [],
      },
    ] as any,
  });
  useCaseStore.setState({
    caseRecord: {
      id: "case-present-shell",
      title: "Present Shell Case",
      workflowState: "prepared",
      presentationReady: false,
      updatedAt: new Date("2026-03-12T10:00:00.000Z").toISOString(),
    } as any,
    mappingState: null,
  });

  render(<PresentView />);

  const presentShell = screen.getByTestId("present-workspace-shell");
  expect(presentShell).toBeInTheDocument();
  expect(screen.getByTestId("present-action-zone")).toBeInTheDocument();
  expect(within(presentShell).getAllByTestId("shared-status-chip").length).toBeGreaterThanOrEqual(2);
});

test("present stays blocked until review approval exists", () => {
  useDesignStore.setState({
    generatedDesign: {
      id: "design-pending-review",
      variants: [],
      createdAt: new Date().toISOString(),
    } as any,
    readyForDoctor: false,
  });
  useViewportStore.setState({ activeView: "present" });

  render(<PresentView />);

  expect(screen.getByText("Complete Review before presenting to the patient.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /go to review/i }));
  expect(useViewportStore.getState().activeView).toBe("review");
});

test("canonical design route enables photo-in-3d after calibration", () => {
  useViewportStore.setState({
    showPhotoIn3D: false,
    scanReferencePoints: {
      centralR: { photoX: 60, photoY: 40, scanX: 1, scanY: 2, scanZ: 3 },
      centralL: { photoX: 40, photoY: 40, scanX: -1, scanY: 2, scanZ: 3 },
    },
  });

  act(() => {
    useViewportStore.getState().setActiveView("design");
  });

  expect(useViewportStore.getState().showPhotoIn3D).toBe(true);
});

test("overview route renders overview dashboard content instead of import assets", async () => {
  useCaseStore.setState({
    caseRecord: {
      id: "case-overview",
      title: "Overview Route Case",
      workflowState: "mapped",
      updatedAt: new Date("2026-03-12T10:00:00.000Z").toISOString(),
    } as any,
    mappingState: null,
  });
  useViewportStore.setState({ activeView: "align" });

  await renderAppAndWait();

  expect(screen.getByText(/stages complete/i)).toBeInTheDocument();
  expect(screen.queryByText("Import Assets")).not.toBeInTheDocument();
});

test("legacy collaborate route normalizes to present workspace", async () => {
  const photoFile = createTestFile("photo", "collab-face.jpg", "image/jpeg");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });

  useCaseStore.setState({
    caseRecord: {
      id: "case-collaborate",
      title: "Collaborate Route Case",
      workflowState: "prepared",
      updatedAt: new Date("2026-03-12T10:00:00.000Z").toISOString(),
    } as any,
    mappingState: null,
  });
  useDesignStore.setState({
    generatedDesign: {
      id: "design-collab",
      variants: [],
      createdAt: new Date().toISOString(),
    } as any,
    readyForDoctor: true,
    variants: [
      {
        id: "variant-collab",
        label: "Primary",
        teeth: [],
      },
    ] as any,
  });
  useViewportStore.setState({ activeView: "present" });

  await renderAppAndWait();

  expect(screen.getByTestId("present-action-zone")).toBeInTheDocument();
});

test("present route still renders the present workspace instead of collaborate controls", async () => {
  const photoFile = createTestFile("photo", "present-route-face.jpg", "image/jpeg");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });

  useCaseStore.setState({
    caseRecord: {
      id: "case-present",
      title: "Present Route Case",
      workflowState: "prepared",
      updatedAt: new Date("2026-03-12T10:00:00.000Z").toISOString(),
    } as any,
    mappingState: null,
  });
  useDesignStore.setState({
    generatedDesign: {
      id: "design-present-route",
      variants: [],
      createdAt: new Date().toISOString(),
    } as any,
    variants: [
      {
        id: "variant-present-route",
        label: "Primary",
        teeth: [],
      },
    ] as any,
  });
  useViewportStore.setState({ activeView: "present" });

  await renderAppAndWait();

  expect(screen.getByTestId("present-action-zone")).toBeInTheDocument();
  expect(screen.queryByText("Archive")).not.toBeInTheDocument();
});

test("keeps the workspace experiment toggle hidden by default", async () => {
  await renderAppAndWait();

  expect(screen.getByText("Case Studio")).toBeInTheDocument();
  expect(document.querySelector('[data-workspace-variant="guided"]')).not.toBeNull();
  expect(screen.queryByRole("button", { name: "Workspace" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Guided" })).not.toBeInTheDocument();
});

test("renders the workspace experiment toggle when enabled and updates the shell variant", async () => {
  vi.stubEnv("VITE_ENABLE_WORKSPACE_EXPERIMENTS", "1");
  resetWorkspaceVariantState();

  await renderAppAndWait();

  const workspaceButton = screen.getByRole("button", { name: "Workspace" });
  const guidedButton = screen.getByRole("button", { name: "Guided" });

  expect(workspaceButton).toBeInTheDocument();
  expect(guidedButton).toBeInTheDocument();
  expect(document.querySelector('[data-workspace-variant="workspace"]')).not.toBeNull();

  fireEvent.click(guidedButton);
  expect(useWorkspaceVariantStore.getState().variant).toBe("guided");
  expect(document.querySelector('[data-workspace-variant="guided"]')).not.toBeNull();

  fireEvent.click(workspaceButton);
  expect(useWorkspaceVariantStore.getState().variant).toBe("workspace");
  expect(document.querySelector('[data-workspace-variant="workspace"]')).not.toBeNull();
});

test("falls back to the guided baseline framing when the experiment flag is off", async () => {
  await renderAppAndWait();

  expect(document.querySelector('[data-workspace-variant="guided"]')).not.toBeNull();
  expect(screen.queryByTestId("workspace-sidebar-rail")).not.toBeInTheDocument();
  expect(screen.getByTestId("header-progress-chrome")).toBeInTheDocument();
});

test("workspace variant uses studio navigation and minimal progress chrome", async () => {
  vi.stubEnv("VITE_ENABLE_WORKSPACE_EXPERIMENTS", "1");
  resetWorkspaceVariantState();

  await renderAppAndWait();

  expect(screen.getByTestId("workspace-sidebar-rail")).toBeInTheDocument();
  expect(screen.queryByTestId("header-progress-chrome")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Design" }));
  await waitForWorkspaceToSettle();
  expect(useViewportStore.getState().activeView).toBe("design");

  fireEvent.click(screen.getByRole("tab", { name: "Present" }));
  await waitForWorkspaceToSettle();
  expect(useViewportStore.getState().activeView).toBe("present");
});

test("guided sidebar keeps Align and Review active for canonical stage routes", async () => {
  vi.stubEnv("VITE_ENABLE_WORKSPACE_EXPERIMENTS", "1");
  resetWorkspaceVariantState("guided");
  useViewportStore.setState({ activeView: "align" });

  await renderAppAndWait();

  expect(screen.getByRole("tab", { name: "Align" })).toHaveAttribute("aria-current", "page");

  act(() => {
    useViewportStore.setState({ activeView: "review" });
  });
  await waitForWorkspaceToSettle();

  expect(screen.getByRole("tab", { name: "Review" })).toHaveAttribute("aria-current", "page");
});

test("guided mode keeps progress chrome and hides workspace-only studio strips", async () => {
  vi.stubEnv("VITE_ENABLE_WORKSPACE_EXPERIMENTS", "1");
  resetWorkspaceVariantState("guided");

  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });

  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  act(() => {
    useDesignStore.getState().quickGenerate();
    useViewportStore.setState({ activeView: "present" });
  });

  await renderAppAndWait();

  expect(screen.getByTestId("header-progress-chrome")).toBeInTheDocument();
  expect(screen.queryByTestId("workspace-sidebar-rail")).not.toBeInTheDocument();
  expect(screen.queryByTestId("design-studio-strip")).not.toBeInTheDocument();
  expect(screen.queryByTestId("present-studio-strip")).not.toBeInTheDocument();
});

test("guided mode marks future workflow stages as locked until prerequisites are met", async () => {
  await renderAppAndWait();

  expect(screen.getByTestId("guided-progress-step-import")).toHaveAttribute(
    "data-state",
    "active",
  );
  expect(screen.getByTestId("guided-progress-step-align")).toHaveAttribute(
    "data-state",
    "available",
  );
  expect(screen.getByTestId("guided-progress-step-design")).toHaveAttribute(
    "data-state",
    "locked",
  );
  expect(screen.getByTestId("guided-progress-step-review")).toHaveAttribute(
    "data-state",
    "locked",
  );
  expect(screen.getByTestId("guided-progress-step-present")).toHaveAttribute(
    "data-state",
    "locked",
  );
});

test("guided import stage surfaces readiness cues and a single recommended next action", async () => {
  await renderAppAndWait();
  const [guidedPanel] = screen.getAllByTestId("guided-context-panel");

  expect(guidedPanel).toBeInTheDocument();
  expect(guidedPanel).toHaveTextContent("Recommended next");
  expect(guidedPanel).toHaveTextContent(
    "Upload a patient photo or arch scan to start the case.",
  );
  const [importReadiness] = screen.getAllByTestId("guided-import-readiness");
  expect(importReadiness).toHaveTextContent("Photo needed");
  expect(importReadiness).toHaveTextContent("Scan needed");
  expect(screen.getByRole("button", { name: "Continue to Align" })).toBeDisabled();
});

test("import to align navigates to the align view", async () => {
  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });

  await renderAppAndWait();

  fireEvent.click(screen.getByRole("button", { name: "Align Photo" }));
  expect(screen.getByRole("button", { name: "Hide Alignment" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Continue to Align" }));

  expect(useViewportStore.getState().activeView).toBe("align");
  await waitForWorkspaceToSettle();
});

test("guided design stage emphasizes a single next action once a concept exists", async () => {
  vi.stubEnv("VITE_ENABLE_WORKSPACE_EXPERIMENTS", "1");
  resetWorkspaceVariantState("guided");

  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });

  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  act(() => {
    useDesignStore.getState().quickGenerate();
    useViewportStore.setState({ activeView: "design" });
  });

  await renderAppAndWait();

  expect(screen.getByTestId("guided-context-panel")).toHaveTextContent("Ready for review");
  expect(screen.getByTestId("guided-context-panel")).toHaveTextContent(
    "Compare the proposal, check measurements, and approve it for presentation.",
  );
  expect(screen.getByRole("button", { name: "Continue to Review" })).toBeEnabled();
});

test("guided progress marks Review completed once approval is ready in Present", async () => {
  useViewportStore.setState({ activeView: "present" });
  useCaseStore.setState({
    caseRecord: {
      id: "case-2",
      title: "Approved Case",
      workflowState: "prepared",
      presentationReady: true,
    } as any,
    mappingState: null,
  });
  useDesignStore.setState({
    generatedDesign: {
      id: "design-2",
      variants: [],
      createdAt: new Date().toISOString(),
    } as any,
    readyForDoctor: true,
  });

  await renderAppAndWait();

  expect(screen.getByTestId("guided-progress-step-review")).toHaveAttribute(
    "data-state",
    "completed",
  );
});

test("guided progress marks Design completed once Review is active", async () => {
  vi.stubEnv("VITE_ENABLE_WORKSPACE_EXPERIMENTS", "1");
  resetWorkspaceVariantState("guided");

  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });

  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  act(() => {
    useDesignStore.getState().quickGenerate();
    useViewportStore.setState({ activeView: "review" });
  });

  await renderAppAndWait();

  expect(screen.getByTestId("guided-progress-step-design")).toHaveAttribute(
    "data-state",
    "completed",
  );
  expect(screen.getByTestId("guided-progress-step-review")).toHaveAttribute(
    "data-state",
    "active",
  );
});

test("review blocker routes back to the canonical Design destination", () => {
  render(<ValidateView />);

  fireEvent.click(screen.getByRole("button", { name: /go to design/i }));

  expect(useViewportStore.getState().activeView).toBe("design");
});

test("present actions stay on the canonical Present destination", () => {
  useDesignStore.setState({
    generatedDesign: {
      id: "design-1",
      variants: [],
      createdAt: new Date().toISOString(),
    } as any,
    readyForDoctor: true,
  });
  useCaseStore.setState({
    caseRecord: {
      id: "case-present-actions",
      title: "Present Actions Case",
      workflowState: "prepared",
      presentationReady: false,
    } as any,
    mappingState: null,
  });
  useViewportStore.setState({ activeView: "present" });

  render(<PresentView />);

  fireEvent.click(screen.getByRole("button", { name: /share with team/i }));

  expect(useViewportStore.getState().activeView).toBe("present");
});

describe("workflow alias normalization", () => {
  test.each([
    ["import", "import", "import"],
    ["capture", "import", "import"],
    ["align", "align", "align"],
    ["overview", "align", "align"],
    ["design", "design", "design"],
    ["simulate", "design", "design"],
    ["plan", "design", "design"],
    ["review", "review", "review"],
    ["compare", "review", "review"],
    ["validate", "review", "review"],
    ["present", "present", "present"],
    ["collaborate", "present", "present"],
    ["export", "present", "present"],
  ] as const)(
    "maps %s to normalized %s and stage %s",
    (input, normalized, stage) => {
      expect(normalizeViewId(input)).toBe(normalized);
      expect(getCaseWorkflowStage(input as any)).toBe(stage);
    }
  );
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
