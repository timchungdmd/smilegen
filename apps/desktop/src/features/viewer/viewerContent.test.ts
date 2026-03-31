import { describe, expect, test } from "vitest";
import { shouldRenderImportedPhotoOverlay } from "./viewerContent";

describe("shouldRenderImportedPhotoOverlay", () => {
  test("keeps the imported photo overlay in the constant viewer whenever a photo exists", () => {
    expect(shouldRenderImportedPhotoOverlay(null)).toBe(false);
    expect(
      shouldRenderImportedPhotoOverlay({
        name: "portrait.jpg",
        url: "blob:portrait",
      })
    ).toBe(true);
  });
});
