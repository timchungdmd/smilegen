import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PhotoOverlay } from "./PhotoOverlay";
import { useOverlayStore } from "../../store/useOverlayStore";
import { useAlignmentStore } from "../../store/useAlignmentStore";
import { useCanvasStore } from "../../store/useCanvasStore";
import { useImportStore } from "../../store/useImportStore";
import { useDesignStore } from "../../store/useDesignStore";

class MockImage {
  onload: null | (() => void) = null;
  naturalWidth = 1200;
  naturalHeight = 800;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe("PhotoOverlay alignment guidance", () => {
  beforeEach(() => {
    vi.stubGlobal("Image", MockImage);

    useOverlayStore.getState().resetOverlay();
    useAlignmentStore.getState().resetAlignment();
    useCanvasStore.getState().resetCanvas();
    useImportStore.setState({
      uploadedPhotos: [],
      archScanMesh: null,
      archScanName: undefined,
      uploadedToothModels: [],
      importError: null,
      mouthMaskUrl: null,
    });
    useDesignStore.getState().resetDesign();

    useOverlayStore.setState({ showOverlay: true });
    useAlignmentStore.setState({
      isAlignmentMode: true,
      activeSurface: "photo",
      activeLandmarkId: "left-central",
    });
  });

  test("shows active landmark guidance and per-landmark status in alignment mode", async () => {
    act(() => {
      useAlignmentStore.getState().setPhotoLandmark("midline", 0.5, 0.4);
      useAlignmentStore.getState().setModelLandmark("midline", 0, 0, 0);
      useAlignmentStore.getState().setPhotoLandmark("left-central", 0.42, 0.44);
    });

    render(
      <PhotoOverlay
        photo={{ name: "portrait.jpg", url: "blob:portrait" }}
        activeVariant={null}
        selectedToothId={null}
        onSelectTooth={() => undefined}
        onMoveTooth={() => undefined}
      />
    );

    expect(await screen.findByTestId("photo-overlay-alignment-status")).toHaveTextContent(
      "Active landmark: Left Central"
    );
    expect(screen.getByTestId("photo-overlay-alignment-instruction")).toHaveTextContent(
      "Click the photo to place the 2D point."
    );
    expect(screen.getByTestId("photo-overlay-point-state")).toHaveTextContent(
      "2D point placed · 3D point missing"
    );
    expect(screen.getByTestId("photo-overlay-placement-target")).toBeInTheDocument();
    expect(screen.getByTestId("photo-overlay-landmark-midline")).toHaveTextContent("Matched");
    expect(screen.getByTestId("photo-overlay-landmark-left-central")).toHaveTextContent("Photo only");
    expect(screen.getByTestId("photo-overlay-landmark-right-central")).toHaveTextContent("Pending");
  });

  test("keeps the photo landmark placement surface available during alignment even when projected teeth are hidden", async () => {
    act(() => {
      useOverlayStore.getState().setShowOverlay(false);
      useAlignmentStore.getState().setAlignmentMode(true);
      useAlignmentStore.getState().setActiveSurface("photo");
      useAlignmentStore.getState().setActiveLandmark("midline");
    });

    render(
      <PhotoOverlay
        photo={{ name: "portrait.jpg", url: "blob:portrait" }}
        activeVariant={null}
        selectedToothId={null}
        onSelectTooth={() => undefined}
        onMoveTooth={() => undefined}
      />
    );

    expect(await screen.findByTestId("photo-overlay-placement-target")).toBeInTheDocument();
  });

  test("uses toolbar-only photo zoom and keeps the photo layer transparent over the scan", async () => {
    act(() => {
      useAlignmentStore.getState().setAlignmentMode(false);
      useOverlayStore.getState().setOverlayOpacity(0.55);
      useCanvasStore.getState().setPhotoPan(24, -12);
      useCanvasStore.getState().setPhotoZoom(1);
    });

    const { container } = render(
      <PhotoOverlay
        photo={{ name: "portrait.jpg", url: "blob:portrait" }}
        activeVariant={null}
        selectedToothId={null}
        onSelectTooth={() => undefined}
        onMoveTooth={() => undefined}
      />
    );

    await screen.findByAltText("portrait.jpg");

    expect(screen.getByTestId("photo-overlay-root")).toHaveStyle({
      background: "transparent",
    });

    fireEvent.click(screen.getByTitle("Zoom in"));

    expect(useCanvasStore.getState().photoZoom).toBeGreaterThan(1);
    expect(useCanvasStore.getState().photoPanX).toBe(24);
    expect(useCanvasStore.getState().photoPanY).toBe(-12);
    expect(screen.getByText("Shift+drag: pan · Use +/- to zoom")).toBeInTheDocument();

    const image = screen.getByAltText("portrait.jpg");
    expect(image).toHaveStyle({ opacity: "0.396" });
    expect(container.querySelector("img")).not.toBeNull();
  });
});
