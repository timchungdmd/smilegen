import { isPhotoFile, isMeshFile } from "./fileValidation";

export interface ImportSet {
  photos: string[];
  archScan?: string;
  toothLibrary?: string[];
}

export interface ImportValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const FDI_TO_UNIVERSAL_TOOTH_ID: Record<string, string> = {
  "11": "8",
  "12": "7",
  "13": "6",
  "14": "5",
  "15": "4",
  "21": "9",
  "22": "10",
  "23": "11",
  "24": "12",
  "25": "13"
};

const UPPER_RIGHT_TO_UNIVERSAL_TOOTH_ID: Record<string, string> = {
  "1": "8",
  "2": "7",
  "3": "6",
  "4": "5",
  "5": "4"
};

const UPPER_LEFT_TO_UNIVERSAL_TOOTH_ID: Record<string, string> = {
  "1": "9",
  "2": "10",
  "3": "11",
  "4": "12",
  "5": "13"
};

export function inferToothIdFromFilename(filename: string) {
  const normalized = filename.toLowerCase();
  const quadrantToothId = inferFromQuadrantNotation(normalized);

  if (quadrantToothId) {
    return quadrantToothId;
  }

  const fdiMatch = normalized.match(/(?:^|[^0-9])(1[1-5]|2[1-5])(?:[^0-9]|$)/);
  const fdiToothId = fdiMatch ? FDI_TO_UNIVERSAL_TOOTH_ID[fdiMatch[1]] : null;

  if (fdiToothId) {
    return fdiToothId;
  }

  const universalMatch = normalized.match(/(?:^|[^0-9])(1[0-3]|[4-9])(?:[^0-9]|$)/);
  return universalMatch?.[1] ?? null;
}

function inferFromQuadrantNotation(filename: string) {
  const upperRightMatch = filename.match(
    /(?:^|[^a-z0-9])(?:ur|upperright)[\s_-]*([1-5])(?=$|[^a-z0-9])/
  );

  if (upperRightMatch?.[1]) {
    return UPPER_RIGHT_TO_UNIVERSAL_TOOTH_ID[upperRightMatch[1]] ?? null;
  }

  const upperLeftMatch = filename.match(
    /(?:^|[^a-z0-9])(?:ul|upperleft)[\s_-]*([1-5])(?=$|[^a-z0-9])/
  );

  if (upperLeftMatch?.[1]) {
    return UPPER_LEFT_TO_UNIVERSAL_TOOTH_ID[upperLeftMatch[1]] ?? null;
  }

  return null;
}

export function validateImportSet(input: ImportSet): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.photos.length === 0) {
    errors.push("At least one photo is required.");
  }

  if (input.photos.some((photo) => !isPhotoFile(photo))) {
    errors.push("Photos must use jpg, jpeg, png, or webp formats.");
  }

  if (!input.archScan) {
    errors.push("A single arch scan is required (STL, OBJ, or PLY).");
  } else if (!isMeshFile(input.archScan)) {
    errors.push("The arch scan must be a 3D mesh file (STL, OBJ, or PLY).");
  }

  if ((input.toothLibrary ?? []).some((file) => !isMeshFile(file))) {
    errors.push("Each tooth library asset must be a 3D mesh file (STL, OBJ, or PLY).");
  }

  if (input.photos.length === 1) {
    warnings.push("Only one consultation photo is attached.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}
