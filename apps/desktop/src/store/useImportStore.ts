import { create } from "zustand";
import { useAlignmentStore } from "./useAlignmentStore";
import type { ParsedStlMesh } from "../features/import/stlParser";
import { parseMeshBuffer } from "../features/import/meshParser";
import { inferToothIdFromFilename } from "../features/import/importService";

export interface UploadedPhoto {
  name: string;
  /** Object URL for use in <img> src and CSS. Created at upload time. */
  url: string;
  /**
   * The raw file data, stored at upload time so callers can send it to APIs
   * without needing to re-fetch the blob URL.
   *
   * Tauri's network layer does not handle blob: URLs, so fetch(photo.url)
   * would fail in the desktop app. Use this field instead.
   *
   * Optional for backward compatibility with test fixtures that pre-populate
   * uploadedPhotos without a real File.
   */
  blob?: Blob;
}

export interface UploadedToothModel {
  name: string;
  toothId: string;
  mesh: ParsedStlMesh;
}

interface ImportState {
  uploadedPhotos: UploadedPhoto[];
  archScanMesh: ParsedStlMesh | null;
  archScanName: string | undefined;
  uploadedToothModels: UploadedToothModel[];
  importError: string | null;
  mouthMaskUrl: string | null;
}

interface ImportActions {
  handlePhotosSelected: (files: FileList | null) => void;
  handleArchScanSelected: (files: FileList | null) => Promise<void>;
  handleToothModelsSelected: (files: FileList | null) => Promise<void>;
  removePhoto: (name: string) => void;
  clearPhotos: () => void;
  clearArchScan: () => void;
  removeToothModel: (toothId: string) => void;
  clearToothModels: () => void;
  setMouthMaskUrl: (url: string | null) => void;
  clearAll: () => void;
}

export type ImportStore = ImportState & ImportActions;

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export const useImportStore = create<ImportStore>((set, get) => ({
  uploadedPhotos: [],
  archScanMesh: null,
  archScanName: undefined,
  uploadedToothModels: [],
  importError: null,
  mouthMaskUrl: null,

  handlePhotosSelected: (files) => {
    const { uploadedPhotos } = get();
    uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    useAlignmentStore.getState().resetAlignment();
    set({
      uploadedPhotos: Array.from(files ?? []).map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        // Store the raw File (which extends Blob) so API callers can send it
        // directly without re-fetching the blob URL. Tauri's fetch intercept
        // does not support blob: protocol URLs.
        blob: f,
      })),
      importError: null,
    });
    },

  handleArchScanSelected: async (files) => {
    const file = files?.[0];
    if (!file) {
      set({ archScanMesh: null, archScanName: undefined, importError: null });
      return;
    }
    try {
      const buffer = await readFileAsArrayBuffer(file);
      useAlignmentStore.getState().resetAlignment();
      set({
        archScanMesh: parseMeshBuffer(buffer, file.name),
        archScanName: file.name,
        importError: null,
      });
      
    } catch (error) {
      set({
        archScanMesh: null,
        archScanName: undefined,
        importError: `Failed to parse arch scan "${file.name}". ${error instanceof Error ? error.message : ""}`.trim(),
      });
    }
  },

  handleToothModelsSelected: async (files) => {
    const nextModels: UploadedToothModel[] = [];
    const failed: string[] = [];

    for (const file of Array.from(files ?? [])) {
      const toothId = inferToothIdFromFilename(file.name);
      if (!toothId) {
        failed.push(`${file.name} (missing tooth id)`);
        continue;
      }
      try {
        nextModels.push({
          name: file.name,
          toothId,
          mesh: parseMeshBuffer(await readFileAsArrayBuffer(file), file.name),
        });
      } catch {
        failed.push(`${file.name} (parse failed)`);
      }
    }

    set({
      uploadedToothModels: nextModels,
      importError: failed.length > 0 ? `Failed: ${failed.join(", ")}` : null,
    });
  },

  removePhoto: (name) => {
    const { uploadedPhotos } = get();
    const photo = uploadedPhotos.find((p) => p.name === name);
    if (photo) URL.revokeObjectURL(photo.url);
    set({ uploadedPhotos: uploadedPhotos.filter((p) => p.name !== name) });
  },

  clearPhotos: () => {
    get().uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    useAlignmentStore.getState().resetAlignment();
    set({ uploadedPhotos: [] });
  },

  clearArchScan: () => {
    useAlignmentStore.getState().resetAlignment();
    set({ archScanMesh: null, archScanName: undefined, importError: null });
  },

  removeToothModel: (toothId) =>
    set((s) => ({ uploadedToothModels: s.uploadedToothModels.filter((m) => m.toothId !== toothId) })),

  clearToothModels: () => set({ uploadedToothModels: [], importError: null }),

  setMouthMaskUrl: (url) => {
    const prev = get().mouthMaskUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ mouthMaskUrl: url });
  },

  clearAll: () => {
    const { uploadedPhotos, mouthMaskUrl } = get();
    uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    if (mouthMaskUrl) URL.revokeObjectURL(mouthMaskUrl);
    useAlignmentStore.getState().resetAlignment();
    set({
      uploadedPhotos: [],
      archScanMesh: null,
      archScanName: undefined,
      uploadedToothModels: [],
      importError: null,
      mouthMaskUrl: null,
    });
  },
}));
