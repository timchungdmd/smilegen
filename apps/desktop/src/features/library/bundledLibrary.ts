import type {
  ToothLibraryCollection,
  ToothLibraryEntry,
  ToothMorphology,
  ToothPosition
} from "./toothLibraryTypes";

const POSITION_MAP: Record<string, ToothPosition> = {
  "4": "second_premolar",
  "5": "first_premolar",
  "6": "canine",
  "7": "lateral_incisor",
  "8": "central_incisor",
  "9": "central_incisor",
  "10": "lateral_incisor",
  "11": "canine",
  "12": "first_premolar",
  "13": "second_premolar"
};

function createEntry(
  collectionId: string,
  toothNumber: string,
  morphology: ToothMorphology,
  width: number,
  height: number,
  depth: number,
  labialProfile: ToothLibraryEntry["labialProfile"]
): ToothLibraryEntry {
  return {
    id: `${collectionId}-${toothNumber}`,
    toothNumber,
    position: POSITION_MAP[toothNumber],
    morphologyTag: morphology,
    dimensions: {
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
      depth: Number(depth.toFixed(2)),
      widthHeightRatio: Number((width / height).toFixed(3))
    },
    labialProfile,
    source: "bundled"
  };
}

function createCollection(
  id: string,
  name: string,
  description: string,
  morphology: ToothMorphology,
  teeth: ToothLibraryEntry[]
): ToothLibraryCollection {
  const entries: Record<string, ToothLibraryEntry> = {};

  for (const tooth of teeth) {
    entries[tooth.toothNumber] = tooth;
  }

  return { id, name, description, morphology, entries };
}

/*
 * Anatomical baseline dimensions (mm) from dental anatomy references.
 * Width and height are measured at the clinical crown.
 * Depth is the labiolingual measurement at the widest point.
 *
 * Baseline values (ovoid):
 *   Central incisors (8,9): 8.6w x 10.8h x 7.0d
 *   Lateral incisors (7,10): 6.6w x 9.2h x 6.0d
 *   Canines (6,11): 7.6w x 10.2h x 7.6d
 *   First premolars (5,12): 7.1w x 8.8h x 9.0d
 *   Second premolars (4,13): 7.1w x 8.2h x 9.2d
 */

const ovoidCollection = createCollection(
  "natural-ovoid",
  "Natural Ovoid",
  "Rounded tooth forms with balanced proportions, common in female patients",
  "ovoid",
  [
    createEntry("natural-ovoid", "4", "ovoid", 7.1, 8.2, 9.2, "convex"),
    createEntry("natural-ovoid", "5", "ovoid", 7.1, 8.8, 9.0, "convex"),
    createEntry("natural-ovoid", "6", "ovoid", 7.6, 10.2, 7.6, "convex"),
    createEntry("natural-ovoid", "7", "ovoid", 6.6, 9.2, 6.0, "convex"),
    createEntry("natural-ovoid", "8", "ovoid", 8.6, 10.8, 7.0, "convex"),
    createEntry("natural-ovoid", "9", "ovoid", 8.6, 10.8, 7.0, "convex"),
    createEntry("natural-ovoid", "10", "ovoid", 6.6, 9.2, 6.0, "convex"),
    createEntry("natural-ovoid", "11", "ovoid", 7.6, 10.2, 7.6, "convex"),
    createEntry("natural-ovoid", "12", "ovoid", 7.1, 8.8, 9.0, "convex"),
    createEntry("natural-ovoid", "13", "ovoid", 7.1, 8.2, 9.2, "convex")
  ]
);

/*
 * Square collection: +5-8% width, -3% height, flat labial profile.
 * Wider, blockier forms common in male patients.
 */
const squareCollection = createCollection(
  "natural-square",
  "Natural Square",
  "Wider, blockier tooth forms with flat labial surfaces, common in male patients",
  "square",
  [
    createEntry("natural-square", "4", "square", 7.1 * 1.06, 8.2 * 0.97, 9.2 * 1.02, "flat"),
    createEntry("natural-square", "5", "square", 7.1 * 1.06, 8.8 * 0.97, 9.0 * 1.02, "flat"),
    createEntry("natural-square", "6", "square", 7.6 * 1.07, 10.2 * 0.97, 7.6 * 1.02, "flat"),
    createEntry("natural-square", "7", "square", 6.6 * 1.05, 9.2 * 0.97, 6.0 * 1.02, "flat"),
    createEntry("natural-square", "8", "square", 8.6 * 1.08, 10.8 * 0.97, 7.0 * 1.02, "flat"),
    createEntry("natural-square", "9", "square", 8.6 * 1.08, 10.8 * 0.97, 7.0 * 1.02, "flat"),
    createEntry("natural-square", "10", "square", 6.6 * 1.05, 9.2 * 0.97, 6.0 * 1.02, "flat"),
    createEntry("natural-square", "11", "square", 7.6 * 1.07, 10.2 * 0.97, 7.6 * 1.02, "flat"),
    createEntry("natural-square", "12", "square", 7.1 * 1.06, 8.8 * 0.97, 9.0 * 1.02, "flat"),
    createEntry("natural-square", "13", "square", 7.1 * 1.06, 8.2 * 0.97, 9.2 * 1.02, "flat")
  ]
);

/*
 * Triangular collection: -5% width at cervical (modelled as overall -5% width),
 * +3% height, convex labial profile. Narrower cervical, wider incisal.
 */
const triangularCollection = createCollection(
  "natural-triangular",
  "Natural Triangular",
  "Narrower cervical with wider incisal edges, triangular profile with pronounced emergence",
  "triangular",
  [
    createEntry("natural-triangular", "4", "triangular", 7.1 * 0.95, 8.2 * 1.03, 9.2 * 0.98, "pronounced"),
    createEntry("natural-triangular", "5", "triangular", 7.1 * 0.95, 8.8 * 1.03, 9.0 * 0.98, "pronounced"),
    createEntry("natural-triangular", "6", "triangular", 7.6 * 0.95, 10.2 * 1.03, 7.6 * 0.98, "pronounced"),
    createEntry("natural-triangular", "7", "triangular", 6.6 * 0.95, 9.2 * 1.03, 6.0 * 0.98, "pronounced"),
    createEntry("natural-triangular", "8", "triangular", 8.6 * 0.95, 10.8 * 1.03, 7.0 * 0.98, "pronounced"),
    createEntry("natural-triangular", "9", "triangular", 8.6 * 0.95, 10.8 * 1.03, 7.0 * 0.98, "pronounced"),
    createEntry("natural-triangular", "10", "triangular", 6.6 * 0.95, 9.2 * 1.03, 6.0 * 0.98, "pronounced"),
    createEntry("natural-triangular", "11", "triangular", 7.6 * 0.95, 10.2 * 1.03, 7.6 * 0.98, "pronounced"),
    createEntry("natural-triangular", "12", "triangular", 7.1 * 0.95, 8.8 * 1.03, 9.0 * 0.98, "pronounced"),
    createEntry("natural-triangular", "13", "triangular", 7.1 * 0.95, 8.2 * 1.03, 9.2 * 0.98, "pronounced")
  ]
);

export const BUNDLED_COLLECTIONS: ToothLibraryCollection[] = [
  ovoidCollection,
  squareCollection,
  triangularCollection
];
