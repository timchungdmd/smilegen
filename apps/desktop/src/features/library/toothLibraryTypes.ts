export type ToothMorphology = "ovoid" | "square" | "triangular" | "barrel";
export type ToothPosition = "central_incisor" | "lateral_incisor" | "canine" | "first_premolar" | "second_premolar";

export interface ToothLibraryEntry {
  id: string;
  toothNumber: string;
  position: ToothPosition;
  morphologyTag: ToothMorphology;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    widthHeightRatio: number;
  };
  labialProfile: "flat" | "convex" | "pronounced";
  source: "bundled" | "imported";
}

export interface ToothLibraryCollection {
  id: string;
  name: string;
  description: string;
  morphology: ToothMorphology;
  entries: Record<string, ToothLibraryEntry>;
}

export interface ToothMatchCriteria {
  toothNumber: string;
  targetWidth: number;
  targetHeight: number;
  targetDepth: number;
  morphologyPreference?: ToothMorphology;
}

export interface ToothMatchResult {
  entry: ToothLibraryEntry;
  score: number;
  scaleFactor: {
    width: number;
    height: number;
    depth: number;
  };
  distortion: number;
}
