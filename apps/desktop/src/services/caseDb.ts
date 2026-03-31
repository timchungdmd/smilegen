import { createStore, get, set, del, keys, entries } from "idb-keyval";

// ── IndexedDB stores ───────────────────────────────────────────────

const caseStore = createStore("smilegen-cases", "cases");
const assetStore = createStore("smilegen-assets", "assets");

// ── Types ──────────────────────────────────────────────────────────

export interface SavedCase {
  id: string;
  title: string;
  workflowState: string;
  caseRecordJson: string | null;
  planJson: string;
  designJson: string | null;
  overlaySettings: {
    midlineX: number;
    smileArcY: number;
    smileArcLeftOffset?: number;
    smileArcRightOffset?: number;
    gingivalLineY: number;
    overlayOpacity: number;
    leftCommissureX?: number;
    rightCommissureX?: number;
    alignmentMarkers?: Array<{
      id: string;
      type: "incisal" | "cusp";
      toothId: string;
      x: number;
      y: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SavedCaseSummary {
  id: string;
  title: string;
  workflowState: string;
  createdAt: string;
  updatedAt: string;
}

// ── Case CRUD ──────────────────────────────────────────────────────

export async function saveCase(caseData: SavedCase): Promise<void> {
  await set(caseData.id, caseData, caseStore);
}

export async function loadCase(id: string): Promise<SavedCase | undefined> {
  return get<SavedCase>(id, caseStore);
}

export async function listCases(): Promise<SavedCaseSummary[]> {
  const allEntries = await entries<string, SavedCase>(caseStore);
  return allEntries.map(([, value]) => ({
    id: value.id,
    title: value.title,
    workflowState: value.workflowState,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }));
}

export async function deleteCase(id: string): Promise<void> {
  // Delete the case record
  await del(id, caseStore);

  // Delete all assets associated with this case
  const allAssetKeys = await keys(assetStore);
  const prefix = `${id}:`;
  for (const key of allAssetKeys) {
    if (typeof key === "string" && key.startsWith(prefix)) {
      await del(key, assetStore);
    }
  }
}

// ── Binary asset storage ───────────────────────────────────────────

function assetKey(caseId: string, assetId: string): string {
  return `${caseId}:${assetId}`;
}

export async function saveCaseAsset(
  caseId: string,
  assetId: string,
  data: ArrayBuffer
): Promise<void> {
  await set(assetKey(caseId, assetId), data, assetStore);
}

export async function loadCaseAsset(
  caseId: string,
  assetId: string
): Promise<ArrayBuffer | undefined> {
  return get<ArrayBuffer>(assetKey(caseId, assetId), assetStore);
}
