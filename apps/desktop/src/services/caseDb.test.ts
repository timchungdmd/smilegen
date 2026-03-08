import { vi, beforeEach, describe, test, expect } from "vitest";
import type { SavedCase } from "./caseDb";

// ── Mock idb-keyval ────────────────────────────────────────────────

const mockStorage = new Map<string, unknown>();
const mockAssetStorage = new Map<string, unknown>();

vi.mock("idb-keyval", () => {
  // Track which store is being used via the store reference.
  // createStore returns a unique object we can compare by identity.
  const caseStoreRef = { __name: "cases" };
  const assetStoreRef = { __name: "assets" };

  function pickMap(store?: { __name: string }) {
    return store?.__name === "assets" ? mockAssetStorage : mockStorage;
  }

  return {
    createStore: (_dbName: string, storeName: string) =>
      storeName === "assets" ? assetStoreRef : caseStoreRef,
    get: (key: string, store?: { __name: string }) =>
      Promise.resolve(pickMap(store).get(key)),
    set: (key: string, value: unknown, store?: { __name: string }) => {
      pickMap(store).set(key, value);
      return Promise.resolve();
    },
    del: (key: string, store?: { __name: string }) => {
      pickMap(store).delete(key);
      return Promise.resolve();
    },
    keys: (store?: { __name: string }) =>
      Promise.resolve(Array.from(pickMap(store).keys())),
    entries: (store?: { __name: string }) =>
      Promise.resolve(Array.from(pickMap(store).entries())),
  };
});

// Import AFTER mock is registered
const { saveCase, loadCase, listCases, deleteCase, saveCaseAsset, loadCaseAsset } = await import("./caseDb");

function makeSavedCase(overrides: Partial<SavedCase> = {}): SavedCase {
  return {
    id: "case-001",
    title: "Test Patient",
    workflowState: "draft",
    planJson: '{"workingRange":"premolar_to_premolar"}',
    designJson: null,
    overlaySettings: {
      midlineX: 50,
      smileArcY: 60,
      gingivalLineY: 40,
      overlayOpacity: 0.7,
    },
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockStorage.clear();
  mockAssetStorage.clear();
});

// ── Tests ──────────────────────────────────────────────────────────

describe("saveCase and loadCase", () => {
  test("saves and retrieves a case by id", async () => {
    const data = makeSavedCase();
    await saveCase(data);

    const loaded = await loadCase("case-001");
    expect(loaded).toEqual(data);
  });

  test("returns undefined for a non-existent case", async () => {
    const loaded = await loadCase("no-such-id");
    expect(loaded).toBeUndefined();
  });
});

describe("listCases", () => {
  test("returns summaries of all saved cases", async () => {
    await saveCase(makeSavedCase({ id: "case-a", title: "Alice" }));
    await saveCase(makeSavedCase({ id: "case-b", title: "Bob", workflowState: "mapped" }));

    const summaries = await listCases();
    expect(summaries).toHaveLength(2);

    const titles = summaries.map((s) => s.title).sort();
    expect(titles).toEqual(["Alice", "Bob"]);

    // Summaries should not include heavy fields
    for (const summary of summaries) {
      expect(summary).toHaveProperty("id");
      expect(summary).toHaveProperty("title");
      expect(summary).toHaveProperty("workflowState");
      expect(summary).toHaveProperty("createdAt");
      expect(summary).toHaveProperty("updatedAt");
      expect(summary).not.toHaveProperty("planJson");
      expect(summary).not.toHaveProperty("designJson");
      expect(summary).not.toHaveProperty("overlaySettings");
    }
  });
});

describe("deleteCase", () => {
  test("removes case and its associated assets", async () => {
    await saveCase(makeSavedCase({ id: "case-del" }));
    await saveCaseAsset("case-del", "arch-scan", new ArrayBuffer(16));
    await saveCaseAsset("case-del", "photo-1", new ArrayBuffer(8));
    // Asset for a different case — should NOT be deleted
    await saveCaseAsset("case-keep", "photo-1", new ArrayBuffer(8));

    await deleteCase("case-del");

    expect(await loadCase("case-del")).toBeUndefined();
    expect(await loadCaseAsset("case-del", "arch-scan")).toBeUndefined();
    expect(await loadCaseAsset("case-del", "photo-1")).toBeUndefined();
    // Other case's asset remains
    expect(await loadCaseAsset("case-keep", "photo-1")).toBeDefined();
  });
});

describe("saveCaseAsset and loadCaseAsset", () => {
  test("stores and retrieves binary data", async () => {
    const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
    await saveCaseAsset("case-x", "mesh.stl", buffer);

    const loaded = await loadCaseAsset("case-x", "mesh.stl");
    expect(loaded).toBeDefined();
    expect(new Uint8Array(loaded!)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  test("returns undefined for non-existent asset", async () => {
    const loaded = await loadCaseAsset("case-x", "nope");
    expect(loaded).toBeUndefined();
  });
});
