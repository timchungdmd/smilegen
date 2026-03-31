import { describe, expect, test } from "vitest";
import {
  getImportedScanNoticeLabel,
  shouldShowImportedScanNotice,
} from "./importedScanNotice";

describe("importedScanNotice", () => {
  test("shows a notice when a new scan signature appears outside alignment mode", () => {
    expect(
      shouldShowImportedScanNotice({
        previousSignature: "scan-a:100:10:10:10",
        nextSignature: "scan-b:100:10:10:10",
        isAlignmentMode: false,
      })
    ).toBe(true);
  });

  test("suppresses the notice while alignment mode is active", () => {
    expect(
      shouldShowImportedScanNotice({
        previousSignature: "scan-a:100:10:10:10",
        nextSignature: "scan-b:100:10:10:10",
        isAlignmentMode: true,
      })
    ).toBe(false);
  });

  test("formats a readable loaded message", () => {
    expect(getImportedScanNoticeLabel("upper-arch.stl")).toBe(
      "Scan loaded: upper-arch.stl. View reset."
    );
  });
});
