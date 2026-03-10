import { useImportStore } from "./useImportStore";

beforeEach(() => {
  useImportStore.getState().clearAll();
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
