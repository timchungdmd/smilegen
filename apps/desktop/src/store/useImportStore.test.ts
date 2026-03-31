import { useImportStore } from "./useImportStore";
import { useAlignmentStore } from "./useAlignmentStore";

beforeEach(() => {
  useImportStore.getState().clearAll();
  useAlignmentStore.getState().resetAlignment();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("mouthMaskUrl is null initially", () => {
  expect(useImportStore.getState().mouthMaskUrl).toBeNull();
});

test("setMouthMaskUrl stores the URL", () => {
  useImportStore.getState().setMouthMaskUrl("blob:http://localhost/abc");
  expect(useImportStore.getState().mouthMaskUrl).toBe("blob:http://localhost/abc");
});

test("clearAll revokes the object URL and clears mouthMaskUrl", () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  useImportStore.getState().setMouthMaskUrl("blob:http://localhost/xyz");
  useImportStore.getState().clearAll();
  expect(revoke).toHaveBeenCalledWith("blob:http://localhost/xyz");
  expect(useImportStore.getState().mouthMaskUrl).toBeNull();
});

test("clearAll with null mouthMaskUrl does not call revokeObjectURL for mask", () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  // No mask set, so no mask revocation should happen
  useImportStore.getState().clearAll();
  // (Photos are also empty, so revokeObjectURL shouldn't be called at all)
  expect(revoke).not.toHaveBeenCalled();
});

test("selecting new photos resets persisted alignment landmarks", () => {
  useAlignmentStore.getState().setAlignmentMode(true);
  useAlignmentStore.getState().setPhotoLandmark("midline", 0.5, 0.5);

  const file = new File(["photo"], "face.jpg", { type: "image/jpeg" });
  const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo");

  useImportStore.getState().handlePhotosSelected({
    0: file,
    length: 1,
    item: () => file,
    [Symbol.iterator]: function* () {
      yield file;
    },
  } as unknown as FileList);

  expect(createObjectUrl).toHaveBeenCalled();
  expect(useAlignmentStore.getState().getCompletedPairCount()).toBe(0);
  expect(useAlignmentStore.getState().isAlignmentMode).toBe(false);
});
