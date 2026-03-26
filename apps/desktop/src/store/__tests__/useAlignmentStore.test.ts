import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useAlignmentStore } from "../useAlignmentStore";

describe("useAlignmentStore", () => {
  beforeEach(() => {
    act(() => {
      useAlignmentStore.getState().clearAllLandmarks();
    });
  });

  it("stores anatomic ID with landmark", () => {
    act(() => {
      useAlignmentStore.getState().setPhotoLandmark("midline", 0.5, 0.6);
    });
    const landmark = useAlignmentStore.getState().landmarks.find((l) => l.id === "midline");
    expect(landmark?.anatomicId).toBe("midline");
  });

  it("computes 3D alignment result when enough landmarks placed", () => {
    act(() => {
      useAlignmentStore.getState().setPhotoLandmark("midline", 0.5, 0.6);
      useAlignmentStore.getState().setModelLandmark("midline", 0, 0, 0);
      useAlignmentStore.getState().setPhotoLandmark("right-central", 0.45, 0.6);
      useAlignmentStore.getState().setModelLandmark("right-central", -4, 0, 0);
      useAlignmentStore.getState().setPhotoLandmark("left-central", 0.55, 0.6);
      useAlignmentStore.getState().setModelLandmark("left-central", 4, 0, 0);
    });
    const state = useAlignmentStore.getState();
    expect(state.alignmentResult).not.toBeNull();
    expect(state.alignmentResult?.transform.scale).toBeGreaterThan(0.5);
  });
});
