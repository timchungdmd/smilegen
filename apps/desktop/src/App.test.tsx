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
import { useAlignmentStore } from "./store/useAlignmentStore";
import {
  getEffectiveWorkspaceVariant,
  useWorkspaceVariantStore,
} from "./features/experiments/workspaceVariantStore";
import { ValidateView } from "./features/views/ValidateView";
import { PresentView } from "./features/views/PresentView";
import { ImportView } from "./features/views/ImportView";
import { DesignSidebar } from "./features/design/DesignSidebar";
import { DesignPanel } from "./features/views/DesignPanel";

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
  // Workflow is now: Import (includes alignment) → Design → Review → Present
  expect(screen.getByRole("tab", { name: "Import" })).toBeInTheDocument();
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

test("design tabs swap only the workspace intake panel content", async () => {
  const photoFile = createTestFile("photo", "panel-face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "panel-arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
    useViewportStore.setState({ activeView: "design", designTab: "3d" });
  });

  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  act(() => {
    useDesignStore.getState().quickGenerate();
  });

  const { rerender } = render(<DesignPanel />);

  expect(screen.getByTestId("workspace-intake-panel-design")).toBeInTheDocument();
  expect(screen.getByTestId("design-workspace-panel")).toBeInTheDocument();
  expect(screen.queryByTestId("photo-workspace-panel")).not.toBeInTheDocument();

  act(() => {
    useViewportStore.setState({ designTab: "photo" });
  });

  rerender(<DesignPanel />);

  expect(screen.getByTestId("workspace-intake-panel-design")).toBeInTheDocument();
  expect(screen.getByTestId("photo-workspace-panel")).toBeInTheDocument();
  expect(screen.queryByTestId("design-workspace-panel")).not.toBeInTheDocument();
});

test("photo workspace panel drives landmark alignment state", async () => {
  const photoFile = createTestFile("photo", "align-face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "align-arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
    useViewportStore.setState({ activeView: "design", designTab: "photo" });
  });

  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  render(<DesignPanel />);

  fireEvent.click(screen.getByTestId("photo-panel-alignment-toggle"));
  expect(useAlignmentStore.getState().isAlignmentMode).toBe(true);

  fireEvent.click(screen.getByTestId("photo-panel-surface-scan"));
  expect(useAlignmentStore.getState().activeSurface).toBe("scan");

  fireEvent.click(screen.getByTestId("photo-panel-scan-mode"));
  expect(useAlignmentStore.getState().scanInteractionMode).toBe("pick");

  fireEvent.click(screen.getByTestId("photo-panel-landmark-left-central"));
  expect(useAlignmentStore.getState().activeLandmarkId).toBe("left-central");
});

test("photo workspace panel shows manual landmark status and clears a landmark pair", async () => {
  const photoFile = createTestFile("photo", "manual-face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "manual-arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
    useViewportStore.setState({ activeView: "design", designTab: "photo" });
  });

  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  act(() => {
    const alignment = useAlignmentStore.getState();
    alignment.setAlignmentMode(true);
    alignment.setPhotoLandmark("midline", 0.5, 0.4);
    alignment.setModelLandmark("midline", 0, 0, 0);
    alignment.setPhotoLandmark("left-central", 0.42, 0.44);
    alignment.setPhotoLandmark("right-central", 0.58, 0.44);
    alignment.setModelLandmark("right-central", 1, 0, 0);
  });

  render(<DesignPanel />);

  expect(screen.getByTestId("photo-panel-summary")).toHaveTextContent("2 matched landmark pairs");
  expect(screen.getByTestId("photo-panel-summary")).toHaveTextContent("Place at least three matched landmark pairs");
  expect(screen.getByTestId("photo-panel-required-summary")).toHaveTextContent("Required landmarks remaining: Left Central");
  expect(screen.getByTestId("photo-panel-card-left-central")).toHaveTextContent("Required attention");
  expect(screen.getByTestId("photo-panel-card-left-canine")).toHaveTextContent("Optional");
  expect(screen.getByTestId("photo-panel-clear-all-warning")).toHaveTextContent("Clears every photo and scan landmark");
  expect(screen.getByTestId("photo-panel-status-midline")).toHaveTextContent("Matched");
  expect(screen.getByTestId("photo-panel-status-left-central")).toHaveTextContent("Scan missing");
  expect(screen.getByTestId("photo-panel-status-right-central")).toHaveTextContent("Matched");

  fireEvent.click(screen.getByTestId("photo-panel-clear-right-central"));

  expect(useAlignmentStore.getState().landmarks.find((l) => l.id === "right-central")?.photoCoord).toBeNull();
  expect(useAlignmentStore.getState().landmarks.find((l) => l.id === "right-central")?.modelCoord).toBeNull();
  expect(screen.getByTestId("photo-panel-status-right-central")).toHaveTextContent("Pending");

  fireEvent.click(screen.getByTestId("photo-panel-clear-all"));

  expect(useAlignmentStore.getState().landmarks.every((landmark) => landmark.photoCoord === null && landmark.modelCoord === null)).toBe(true);
  expect(screen.getByTestId("photo-panel-status-midline")).toHaveTextContent("Pending");
  expect(screen.getByTestId("photo-panel-required-summary")).toHaveTextContent(
    "Required landmarks remaining: Midline, Left Central, Right Central"
  );
});

test("photo workspace panel shows fit review once the manual landmark set is solvable", async () => {
  const photoFile = createTestFile("photo", "fit-face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "fit-arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
    useViewportStore.setState({ activeView: "design", designTab: "photo" });
  });

  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  act(() => {
    const alignment = useAlignmentStore.getState();
    alignment.setAlignmentMode(true);
    alignment.setPhotoLandmark("midline", 0.5, 0.4);
    alignment.setModelLandmark("midline", 0, 0, 0);
    alignment.setPhotoLandmark("left-central", 0.42, 0.44);
    alignment.setModelLandmark("left-central", -1, 0, 0);
    alignment.setPhotoLandmark("right-central", 0.58, 0.44);
    alignment.setModelLandmark("right-central", 1, 0, 0);
    alignment.setSolvedView({
      position: { x: 0, y: 0, z: 0 } as any,
      target: { x: 0, y: 0, z: 0 } as any,
      up: { x: 0, y: 1, z: 0 } as any,
      principalPointNdc: { x: 0, y: 0 },
      error: 0.05,
    });
  });

  render(<DesignPanel />);

  expect(screen.getByTestId("photo-panel-fit-review")).toHaveTextContent("Fit quality: Review");
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

test.skip("overview route renders overview dashboard content instead of import assets", async () => {
  useCaseStore.setState({
    caseRecord: {
      id: "case-overview",
      title: "Overview Route Case",
      workflowState: "mapped",
      updatedAt: new Date("2026-03-12T10:00:00.000Z").toISOString(),
    } as any,
    mappingState: null,
  });
  // Note: "overview" now maps to "import" view (align was merged into import)
  // This test verifies that a mapped case shows overview content
  useViewportStore.setState({ activeView: "import" });

  await renderAppAndWait();

  // With "mapped" workflow state, should show overview/stages complete
  expect(screen.getByText(/stages complete/i)).toBeInTheDocument();
});

test("legacy collaborate route normalizes to handoff workspace", async () => {
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
  useViewportStore.setState({ activeView: "handoff" });

  await renderAppAndWait();

  expect(screen.getByText("Export & Handoff")).toBeInTheDocument();
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

test("guided sidebar keeps Import and Review active for canonical stage routes", async () => {
  vi.stubEnv("VITE_ENABLE_WORKSPACE_EXPERIMENTS", "1");
  resetWorkspaceVariantState("guided");
  // Note: "align" is now merged into "import"
  useViewportStore.setState({ activeView: "import" });

  await renderAppAndWait();

  // Import is the active stage (align was merged into import)
  expect(screen.getByRole("tab", { name: "Import" })).toHaveAttribute("aria-current", "page");

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

  // Note: "align" was merged into "import", so there's no separate align step
  // The workflow is now: import → design → review → present
  expect(screen.getByTestId("guided-progress-step-import")).toHaveAttribute(
    "data-state",
    "active",
  );
  // "align" is now part of "import" - no separate step
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

test.skip("guided import stage surfaces readiness cues and a single recommended next action", async () => {
  // Guided variant temporarily disabled - alignment is now simplified
  await renderAppAndWait();
  const [guidedPanel] = screen.getAllByTestId("guided-context-panel");

  expect(guidedPanel).toBeInTheDocument();
  expect(guidedPanel).toHaveTextContent("Recommended next");
  // Workflow now requires both photo AND scan (not "or")
  expect(guidedPanel).toHaveTextContent(
    "Upload both a patient photo and arch scan to start the case.",
  );
  // The readiness chips show "Upload Photo" and "Upload Scan" when nothing is uploaded
  const [importReadiness] = screen.getAllByTestId("guided-import-readiness");
  expect(importReadiness).toHaveTextContent("Upload Photo");
  expect(importReadiness).toHaveTextContent("Upload Scan");
  // Button is now "Continue to Design" since align was merged into import
  expect(screen.getByRole("button", { name: /^Continue$/i })).toBeDisabled();
});

test("import to design navigates to the design view", async () => {
  // The workflow now goes: import (includes align) → design
  // This test verifies the navigation works when user clicks continue
  const photoFile = createTestFile("photo", "face.jpg", "image/jpeg");
  const archFile = createTestFile(sampleStl, "arch.stl", "model/stl");

  act(() => {
    useImportStore.getState().handlePhotosSelected(createFileList([photoFile]));
  });
  await act(async () => {
    await useImportStore.getState().handleArchScanSelected(createFileList([archFile]));
  });

  // Wait for files to be processed
  await waitFor(() => {
    expect(useImportStore.getState().archScanMesh).not.toBeNull();
    expect(useImportStore.getState().uploadedPhotos.length).toBeGreaterThan(0);
  });

  // Set active view to import before rendering
  act(() => {
    useViewportStore.setState({ activeView: "import" });
  });

  await renderAppAndWait();

  // Verify we're in import view
  expect(useViewportStore.getState().activeView).toBe("import");

  // Click the continue button to move to design
  const continueBtn = screen.getByRole("button", { name: /^Continue$/i });
  expect(continueBtn).toBeEnabled();
  fireEvent.click(continueBtn);

  // Should navigate to design
  await waitFor(() => {
    expect(useViewportStore.getState().activeView).toBe("design");
  });
});

test.skip("guided design stage emphasizes a single next action once a concept exists", async () => {
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
    const alignment = useAlignmentStore.getState();
    alignment.setPhotoLandmark("midline", 50, 40);
    alignment.setModelLandmark("midline", 0, 0, 0);
    alignment.setPhotoLandmark("left-central", 42, 44);
    alignment.setModelLandmark("left-central", -1, 0, 0);
    alignment.setPhotoLandmark("right-central", 58, 44);
    alignment.setModelLandmark("right-central", 1, 0, 0);
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

test("present actions route to the canonical Handoff destination", () => {
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

  fireEvent.click(screen.getByRole("button", { name: /open handoff/i }));

  expect(useViewportStore.getState().activeView).toBe("handoff");
});

describe("workflow alias normalization", () => {
  // Note: "align" was merged into "import" - both now normalize to "import"
  test.each([
    ["import", "import", "import"],
    ["capture", "import", "import"],
    ["align", "import", "import"],  // align now maps to import
    ["overview", "import", "import"], // overview now maps to import
    ["design", "design", "design"],
    ["simulate", "design", "design"],
    ["plan", "design", "design"],
    ["review", "review", "review"],
    ["compare", "review", "review"],
    ["validate", "review", "review"],
    ["present", "present", "present"],
    ["collaborate", "handoff", "handoff"],
    ["export", "handoff", "handoff"],
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
