import { inferToothIdFromFilename, validateImportSet } from "./importService";

test("accepts one arch stl, one photo, and optional tooth library stls", () => {
  const result = validateImportSet({
    photos: ["face.jpg"],
    archScan: "maxillary_scan.stl",
    toothLibrary: ["8.stl", "9.stl"]
  });

  expect(result.ok).toBe(true);
});

test("infers premolar-to-premolar teeth from FDI filenames", () => {
  expect(inferToothIdFromFilename("case_15.stl")).toBe("4");
  expect(inferToothIdFromFilename("case_14.stl")).toBe("5");
  expect(inferToothIdFromFilename("case_21.stl")).toBe("9");
  expect(inferToothIdFromFilename("case_25.stl")).toBe("13");
});

test("infers premolar-to-premolar teeth from UR/UL filenames", () => {
  expect(inferToothIdFromFilename("UR5_prep.stl")).toBe("4");
  expect(inferToothIdFromFilename("UR1_scan.stl")).toBe("8");
  expect(inferToothIdFromFilename("UL1_scan.stl")).toBe("9");
  expect(inferToothIdFromFilename("UL5_prep.stl")).toBe("13");
});
