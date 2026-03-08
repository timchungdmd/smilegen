import { create } from "zustand";
import { withTemporalMiddleware } from "./undoMiddleware";
import { createEmptyCase } from "../features/cases/caseStore";
import type { CaseRecord } from "../features/cases/types";
import { saveCase, loadCase as loadCaseFromDb, type SavedCase } from "../services/caseDb";
import { DEFAULT_SHADE } from "../features/color/shadeGuide";
import { createVariantGenerationRequest } from "../features/engine/engineClient";
import {
  generateSmileDesign,
  type GeneratedSmileDesign,
  type GeneratedVariantDesign,
  updateVariantToothDimensions,
  updateVariantToothPlacement
} from "../features/engine/designEngine";
import type { VariantGenerationRequest } from "../features/engine/engineTypes";
import { canMarkReadyForDoctor } from "../features/handoff/handoffStore";
import {
  inferToothIdFromFilename,
  validateImportSet,
  type ImportValidationResult
} from "../features/import/importService";
import { type ParsedStlMesh } from "../features/import/stlParser";
import { parseMeshBuffer } from "../features/import/meshParser";
import type { ToothLibraryCollection } from "../features/library/toothLibraryTypes";
import { BUNDLED_COLLECTIONS } from "../features/library/bundledLibrary";
import { applyMappingResult, type ToothMappingState } from "../features/review/toothMappingStore";
import {
  createDefaultSmilePlan,
  updateAdditiveBias,
  updatePlanControls,
  toggleTooth,
  setTreatmentType
} from "../features/smile-plan/smilePlanStore";
import type { AdditiveBias, SmilePlan, SmilePlanControls, TreatmentType } from "../features/smile-plan/smilePlanTypes";
import { parseSmilePlan, parseGeneratedSmileDesign } from "../features/cases/caseValidators";
import { summarizeTrustState, type TrustSummary } from "../features/trust/trustEngine";
import type { VariantSummary } from "../features/variants/variantStore";
import { transitionCaseState } from "../features/workflow/workflowState";
import type { FacialLandmarks } from "../features/analysis/analysisTypes";
import type { Annotation } from "../features/collaboration/annotationTypes";

export type ViewId = "import" | "design" | "compare" | "export" | "cases" | "settings";

export interface UploadedPhoto {
  name: string;
  url: string;
}

export interface UploadedToothModel {
  name: string;
  toothId: string;
  mesh: ParsedStlMesh;
}

export type AlignmentMarkerType = "incisal" | "cusp";

export interface AlignmentMarker {
  id: string;
  type: AlignmentMarkerType;
  /** Tooth number (Universal) this marker corresponds to, e.g. "8", "6" */
  toothId: string;
  /** X position as percent of photo width (0-100) */
  x: number;
  /** Y position as percent of photo height (0-100) */
  y: number;
}

interface SmileState {
  // Navigation
  activeView: ViewId;

  // Case
  caseRecord: CaseRecord | null;

  // Plan
  plan: SmilePlan;
  generationRequest: VariantGenerationRequest | null;
  generatedDesign: GeneratedSmileDesign | null;

  // Mapping
  mappingState: ToothMappingState | null;

  // Variants
  variants: VariantSummary[];
  activeVariantId: string | null;

  // Selection
  selectedToothId: string | null;

  // Trust
  trustSummary: TrustSummary | null;

  // Handoff
  readyForDoctor: boolean;

  // Import
  uploadedPhotos: UploadedPhoto[];
  archScanMesh: ParsedStlMesh | null;
  archScanName: string | undefined;
  uploadedToothModels: UploadedToothModel[];
  importError: string | null;

  // Overlay
  showOverlay: boolean;
  overlayOpacity: number;
  showSmileArc: boolean;
  showMidline: boolean;
  showGingivalLine: boolean;
  midlineX: number;
  smileArcY: number;
  gingivalLineY: number;

  // Shade
  selectedShadeId: string;

  // Commissure guides (smile corners — used for scan-to-photo alignment)
  leftCommissureX: number;   // % of photo width
  rightCommissureX: number;  // % of photo width

  // Facial landmarks
  facialLandmarks: FacialLandmarks | null;

  // Photo viewport
  photoZoom: number;
  photoPanX: number;
  photoPanY: number;

  // Alignment markers — user places these on the photo to align scan-to-photo
  // Each marker is a { x, y } in percent of photo dimensions (0-100)
  alignmentMarkers: AlignmentMarker[];

  // Library
  activeCollectionId: string | null;

  // Annotations
  annotations: Annotation[];

  // Arch curve
  archPreset: "auto" | "narrow" | "average" | "wide" | "custom";
  archDepthOverride: number | null;
  archHalfWidthOverride: number | null;
  cameraDistance: number;

  // Expert mode
  expertMode: boolean;
}

interface SmileActions {
  setActiveView: (view: ViewId) => void;
  createCase: () => void;
  confirmMapping: () => void;
  changeBias: (bias: AdditiveBias) => void;
  updatePlanControls: (controls: Partial<SmilePlanControls>) => void;
  toggleTooth: (toothId: string) => void;
  setTreatmentType: (toothId: string, type: TreatmentType) => void;
  generateDesign: () => void;
  quickGenerate: () => void;
  selectVariant: (id: string) => void;
  selectTooth: (id: string | null) => void;
  adjustTooth: (
    toothId: string,
    updates: Partial<Pick<GeneratedVariantDesign["teeth"][number], "width" | "height" | "depth">>
  ) => void;
  moveTooth: (toothId: string, delta: { deltaX: number; deltaY: number }) => void;
  downloadActiveStl: () => void;
  markReadyForDoctor: () => void;
  handlePhotosSelected: (files: FileList | null) => void;
  handleArchScanSelected: (files: FileList | null) => Promise<void>;
  handleToothModelsSelected: (files: FileList | null) => Promise<void>;
  setShowOverlay: (show: boolean) => void;
  setOverlayOpacity: (opacity: number) => void;
  setShowSmileArc: (show: boolean) => void;
  setShowMidline: (show: boolean) => void;
  setShowGingivalLine: (show: boolean) => void;
  setMidlineX: (x: number) => void;
  setSmileArcY: (y: number) => void;
  setGingivalLineY: (y: number) => void;
  setSelectedShadeId: (id: string) => void;
  setLeftCommissureX: (x: number) => void;
  setRightCommissureX: (x: number) => void;
  setFacialLandmarks: (landmarks: FacialLandmarks | null) => void;
  setPhotoZoom: (zoom: number) => void;
  setPhotoPan: (x: number, y: number) => void;
  addAlignmentMarker: (marker: AlignmentMarker) => void;
  updateAlignmentMarker: (id: string, updates: Partial<Pick<AlignmentMarker, "x" | "y">>) => void;
  removeAlignmentMarker: (id: string) => void;
  clearAlignmentMarkers: () => void;
  setActiveCollectionId: (id: string | null) => void;
  removePhoto: (name: string) => void;
  clearPhotos: () => void;
  clearArchScan: () => void;
  removeToothModel: (toothId: string) => void;
  clearToothModels: () => void;
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  setExpertMode: (enabled: boolean) => void;
  setArchPreset: (preset: SmileState["archPreset"]) => void;
  setArchDepthOverride: (depth: number | null) => void;
  setArchHalfWidthOverride: (halfWidth: number | null) => void;
  setCameraDistance: (distance: number) => void;
  applyLibraryCollection: (collection: ToothLibraryCollection) => void;
  saveCaseToDB: () => Promise<void>;
  loadCaseFromDB: (id: string) => Promise<void>;
  newCase: () => void;
}

export type SmileStore = SmileState & SmileActions;

// Derived selectors
export function selectImportValidation(state: SmileStore): ImportValidationResult {
  const photoNames = state.uploadedPhotos.map((p) => p.name);
  const toothModelNames = state.uploadedToothModels.map((m) => m.name);
  return validateImportSet({
    photos: photoNames,
    archScan: state.archScanName,
    toothLibrary: toothModelNames
  });
}

export function selectToothLibraryMeshes(state: SmileStore): Record<string, ParsedStlMesh> {
  return state.uploadedToothModels.reduce<Record<string, ParsedStlMesh>>((lib, m) => {
    lib[m.toothId] = m.mesh;
    return lib;
  }, {});
}

export function selectActiveVariant(state: SmileStore): GeneratedVariantDesign | null {
  return state.generatedDesign?.variants.find((v) => v.id === state.activeVariantId) ?? null;
}

export function selectCanPreviewGeneration(state: SmileStore): boolean {
  return state.caseRecord?.workflowState === "mapped" && selectImportValidation(state).ok;
}

export function selectCanQuickGenerate(state: SmileStore): boolean {
  return selectImportValidation(state).ok;
}

export function selectCanMarkReady(state: SmileStore): boolean {
  return canMarkReadyForDoctor({
    hasImports: Boolean(state.caseRecord),
    mappingConfirmed: state.caseRecord?.workflowState === "mapped",
    savedVariantCount: state.variants.length
  });
}

export function selectStatusLabel(state: SmileStore): string {
  return state.caseRecord?.workflowState ?? "draft";
}

function buildMappingPreview(uploadedToothIds: string[]) {
  const defaultTeeth = ["8", "9"];
  const teeth = uploadedToothIds.length > 0 ? uploadedToothIds : defaultTeeth;
  return teeth.map((toothId) => ({
    toothId,
    confidence: uploadedToothIds.includes(toothId) ? 0.91 : 0.42
  }));
}

function updateTrustFromVariant(variant: GeneratedVariantDesign | null): TrustSummary | null {
  if (!variant) return null;
  return summarizeTrustState(
    variant.teeth.map((t) => ({ toothId: t.toothId, state: t.trustState }))
  );
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Response(file).arrayBuffer();
}

export const useSmileStore = create<SmileStore>()(
  withTemporalMiddleware((set, get) => ({
  // Initial state
  activeView: "import",
  caseRecord: null,
  plan: createDefaultSmilePlan(),
  generationRequest: null,
  generatedDesign: null,
  mappingState: null,
  variants: [],
  activeVariantId: null,
  selectedToothId: null,
  trustSummary: null,
  readyForDoctor: false,
  uploadedPhotos: [],
  archScanMesh: null,
  archScanName: undefined,
  uploadedToothModels: [],
  importError: null,
  showOverlay: true,
  overlayOpacity: 0.7,
  showSmileArc: true,
  showMidline: true,
  showGingivalLine: false,
  midlineX: 50,
  smileArcY: 60,
  gingivalLineY: 40,
  selectedShadeId: DEFAULT_SHADE,
  leftCommissureX: 20,
  rightCommissureX: 80,
  facialLandmarks: null,
  photoZoom: 1,
  photoPanX: 0,
  photoPanY: 0,
  alignmentMarkers: [],
  activeCollectionId: null,
  annotations: [],
  archPreset: "auto",
  archDepthOverride: null,
  archHalfWidthOverride: null,
  cameraDistance: 250,
  expertMode: false,

  // Actions
  setActiveView: (view) => set({ activeView: view }),

  createCase: () => {
    const state = get();
    const toothLibrary = selectToothLibraryMeshes(state);
    const title = state.archScanName
      ? state.archScanName.replace(/\.stl$/i, "")
      : "Demo Consult 001";
    const demoCase = createEmptyCase(title);

    set({
      caseRecord: {
        ...demoCase,
        workflowState: transitionCaseState("draft", { hasRequiredImports: true })
      },
      mappingState: applyMappingResult({
        teeth: buildMappingPreview(Object.keys(toothLibrary))
      }),
      generationRequest: null,
      generatedDesign: null,
      variants: [],
      activeVariantId: null,
      trustSummary: null,
      readyForDoctor: false,
      selectedToothId: null,
      importError: null
    });
  },

  confirmMapping: () => {
    const { caseRecord } = get();
    if (!caseRecord) return;

    set({
      caseRecord: {
        ...caseRecord,
        workflowState: transitionCaseState(caseRecord.workflowState, {
          orientationConfirmed: true,
          mappingConfirmed: true
        })
      },
      readyForDoctor: false,
      selectedToothId: null,
      importError: null
    });
  },

  changeBias: (bias) => {
    set((state) => ({
      plan: updateAdditiveBias(state.plan, bias),
      generationRequest: null,
      generatedDesign: null,
      variants: [],
      activeVariantId: null,
      trustSummary: null,
      readyForDoctor: false,
      selectedToothId: null,
      importError: null
    }));
  },

  updatePlanControls: (controls) => {
    set((state) => ({
      plan: updatePlanControls(state.plan, controls),
      // Don't clear design — let user regenerate manually
    }));
  },

  toggleTooth: (toothId) => {
    set((state) => ({
      plan: toggleTooth(state.plan, toothId),
      generatedDesign: null,
      variants: [],
      activeVariantId: null,
      trustSummary: null,
      readyForDoctor: false,
    }));
  },

  setTreatmentType: (toothId, type) => {
    set((state) => ({
      plan: setTreatmentType(state.plan, toothId, type),
      generatedDesign: null,
      variants: [],
      activeVariantId: null,
      trustSummary: null,
      readyForDoctor: false,
    }));
  },

  generateDesign: () => {
    const state = get();
    const validation = selectImportValidation(state);
    if (!validation.ok || !state.caseRecord || state.caseRecord.workflowState !== "mapped") return;
    applyGeneration(set, get);
  },

  quickGenerate: () => {
    const state = get();
    const validation = selectImportValidation(state);
    if (!validation.ok) return;

    const toothLibrary = selectToothLibraryMeshes(state);
    const fallbackTitle = state.archScanName
      ? state.archScanName.replace(/\.stl$/i, "")
      : "Imported Consult";
    const mappedCase: CaseRecord = state.caseRecord
      ? { ...state.caseRecord, workflowState: "mapped" }
      : { ...createEmptyCase(fallbackTitle), workflowState: "mapped" as const };

    set({
      caseRecord: mappedCase,
      mappingState: applyMappingResult({
        teeth: buildMappingPreview(Object.keys(toothLibrary))
      })
    });

    applyGeneration(set, get);
  },

  selectVariant: (id) => {
    const { generatedDesign } = get();
    const variant = generatedDesign?.variants.find((v) => v.id === id);
    set({
      activeVariantId: id,
      trustSummary: variant ? updateTrustFromVariant(variant) : null
    });
  },

  selectTooth: (id) => set({ selectedToothId: id }),

  adjustTooth: (toothId, updates) => {
    const { generatedDesign, activeVariantId } = get();
    if (!generatedDesign || !activeVariantId) return;

    const nextDesign: GeneratedSmileDesign = {
      variants: generatedDesign.variants.map((v) =>
        v.id === activeVariantId ? updateVariantToothDimensions(v, toothId, updates) : v
      )
    };
    const activeV = nextDesign.variants.find((v) => v.id === activeVariantId) ?? null;

    set({
      generatedDesign: nextDesign,
      trustSummary: updateTrustFromVariant(activeV),
      readyForDoctor: false
    });
  },

  moveTooth: (toothId, delta) => {
    const { generatedDesign, activeVariantId } = get();
    if (!generatedDesign || !activeVariantId) return;

    const nextDesign: GeneratedSmileDesign = {
      variants: generatedDesign.variants.map((v) =>
        v.id === activeVariantId ? updateVariantToothPlacement(v, toothId, delta) : v
      )
    };
    const activeV = nextDesign.variants.find((v) => v.id === activeVariantId) ?? null;

    set({
      generatedDesign: nextDesign,
      trustSummary: updateTrustFromVariant(activeV),
      readyForDoctor: false
    });
  },

  downloadActiveStl: () => {
    const activeVariant = selectActiveVariant(get());
    if (!activeVariant || typeof document === "undefined") return;

    const blob = new Blob([activeVariant.combinedStl], { type: "model/stl" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeVariant.id}.stl`;
    link.click();
    URL.revokeObjectURL(url);
  },

  markReadyForDoctor: () => {
    const state = get();
    if (!state.caseRecord || !selectCanMarkReady(state)) return;

    set({
      caseRecord: { ...state.caseRecord, workflowState: "prepared" },
      readyForDoctor: true
    });
  },

  handlePhotosSelected: (files) => {
    const { uploadedPhotos } = get();
    uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    set({
      uploadedPhotos: Array.from(files ?? []).map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f)
      })),
      importError: null
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
      set({
        archScanMesh: parseMeshBuffer(buffer, file.name),
        archScanName: file.name,
        importError: null
      });
    } catch (error) {
      set({
        archScanMesh: null,
        archScanName: undefined,
        importError: `Failed to parse arch scan STL "${file.name}". ${error instanceof Error ? error.message : ""}`.trim()
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
          mesh: parseMeshBuffer(await readFileAsArrayBuffer(file), file.name)
        });
      } catch {
        failed.push(`${file.name} (parse failed)`);
      }
    }

    set({
      uploadedToothModels: nextModels,
      importError: failed.length > 0 ? `Failed: ${failed.join(", ")}` : null
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
    set({ uploadedPhotos: [] });
  },
  clearArchScan: () => {
    set({ archScanMesh: null, archScanName: undefined, importError: null });
  },
  removeToothModel: (toothId) => {
    set({ uploadedToothModels: get().uploadedToothModels.filter((m) => m.toothId !== toothId) });
  },
  clearToothModels: () => {
    set({ uploadedToothModels: [], importError: null });
  },

  setShowOverlay: (show) => set({ showOverlay: show }),
  setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),
  setShowSmileArc: (show) => set({ showSmileArc: show }),
  setShowMidline: (show) => set({ showMidline: show }),
  setShowGingivalLine: (show) => set({ showGingivalLine: show }),
  setMidlineX: (x) => set({ midlineX: x }),
  setSmileArcY: (y) => set({ smileArcY: y }),
  setGingivalLineY: (y) => set({ gingivalLineY: y }),
  setSelectedShadeId: (id) => set({ selectedShadeId: id }),
  setLeftCommissureX: (x) => set({ leftCommissureX: x }),
  setRightCommissureX: (x) => set({ rightCommissureX: x }),
  setFacialLandmarks: (landmarks) => set({ facialLandmarks: landmarks }),
  setPhotoZoom: (zoom) => set({ photoZoom: Math.max(0.25, Math.min(5, zoom)) }),
  setPhotoPan: (x, y) => set({ photoPanX: x, photoPanY: y }),
  addAlignmentMarker: (marker) => set({ alignmentMarkers: [...get().alignmentMarkers, marker] }),
  updateAlignmentMarker: (id, updates) => set({
    alignmentMarkers: get().alignmentMarkers.map((m) => m.id === id ? { ...m, ...updates } : m)
  }),
  removeAlignmentMarker: (id) => set({
    alignmentMarkers: get().alignmentMarkers.filter((m) => m.id !== id)
  }),
  clearAlignmentMarkers: () => set({ alignmentMarkers: [] }),
  setActiveCollectionId: (id) => set({ activeCollectionId: id }),
  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),
  removeAnnotation: (id) =>
    set((state) => ({ annotations: state.annotations.filter((a) => a.id !== id) })),
  clearAnnotations: () => set({ annotations: [] }),
  setExpertMode: (enabled) => set({ expertMode: enabled }),

  setArchPreset: (preset) => {
    const PRESETS: Record<string, { depth: number | null; halfWidth: number | null }> = {
      auto: { depth: null, halfWidth: null },
      narrow: { depth: 18, halfWidth: 28 },
      average: { depth: 15, halfWidth: 35 },
      wide: { depth: 12, halfWidth: 42 },
      custom: { depth: get().archDepthOverride, halfWidth: get().archHalfWidthOverride }
    };
    const p = PRESETS[preset] ?? PRESETS.auto;
    set({
      archPreset: preset,
      archDepthOverride: p.depth,
      archHalfWidthOverride: p.halfWidth
    });
  },

  setArchDepthOverride: (depth) => set({ archDepthOverride: depth, archPreset: "custom" }),
  setArchHalfWidthOverride: (halfWidth) => set({ archHalfWidthOverride: halfWidth, archPreset: "custom" }),
  setCameraDistance: (distance) => set({ cameraDistance: distance }),

  applyLibraryCollection: (collection) => {
    // Update the plan's treatment map with library entry dimensions as hints
    // and regenerate the design if one exists
    set({ activeCollectionId: collection.id });
    const state = get();
    if (state.generatedDesign) {
      applyGeneration(set, get);
    }
  },

  saveCaseToDB: async () => {
    const state = get();
    if (!state.caseRecord) return;

    const savedCase: SavedCase = {
      id: state.caseRecord.id,
      title: state.caseRecord.title,
      workflowState: state.caseRecord.workflowState,
      planJson: JSON.stringify(state.plan),
      designJson: state.generatedDesign ? JSON.stringify(state.generatedDesign) : null,
      overlaySettings: {
        midlineX: state.midlineX,
        smileArcY: state.smileArcY,
        gingivalLineY: state.gingivalLineY,
        overlayOpacity: state.overlayOpacity,
      },
      createdAt: state.caseRecord.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await saveCase(savedCase);
  },

  loadCaseFromDB: async (id: string) => {
    const saved = await loadCaseFromDb(id);
    if (!saved) return;

    let plan: SmilePlan;
    try {
      plan = parseSmilePlan(JSON.parse(saved.planJson));
    } catch (e) {
      console.error("Corrupted plan data in DB, using defaults:", e);
      plan = createDefaultSmilePlan();
    }

    let generatedDesign: GeneratedSmileDesign | null = null;
    if (saved.designJson) {
      try {
        generatedDesign = parseGeneratedSmileDesign(JSON.parse(saved.designJson)) as GeneratedSmileDesign;
      } catch (e) {
        console.error("Corrupted design data in DB, discarding:", e);
        generatedDesign = null;
      }
    }

    const firstVariant = generatedDesign?.variants[1] ?? generatedDesign?.variants[0] ?? null;

    set({
      caseRecord: {
        id: saved.id,
        title: saved.title,
        workflowState: saved.workflowState as CaseRecord["workflowState"],
        presentationReady: false,
        exportBlocked: false,
        activeDesignVersionId: "",
        assets: [],
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
      plan,
      generatedDesign,
      variants: generatedDesign?.variants ?? [],
      activeVariantId: firstVariant?.id ?? null,
      trustSummary: firstVariant ? updateTrustFromVariant(firstVariant) : null,
      midlineX: saved.overlaySettings.midlineX,
      smileArcY: saved.overlaySettings.smileArcY,
      gingivalLineY: saved.overlaySettings.gingivalLineY,
      overlayOpacity: saved.overlaySettings.overlayOpacity,
      activeView: generatedDesign ? "design" : "import",
      readyForDoctor: saved.workflowState === "prepared",
      importError: null,
      selectedToothId: null,
    });
  },

  newCase: () => {
    // Revoke existing photo URLs
    get().uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.url));

    set({
      activeView: "import",
      caseRecord: null,
      plan: createDefaultSmilePlan(),
      generationRequest: null,
      generatedDesign: null,
      mappingState: null,
      variants: [],
      activeVariantId: null,
      selectedToothId: null,
      trustSummary: null,
      readyForDoctor: false,
      uploadedPhotos: [],
      archScanMesh: null,
      archScanName: undefined,
      uploadedToothModels: [],
      importError: null,
      activeCollectionId: null,
      annotations: [],
    });
  },
}))
);

function applyGeneration(
  set: (partial: Partial<SmileState>) => void,
  get: () => SmileStore
) {
  const state = get();
  const validation = selectImportValidation(state);
  if (!validation.ok) return;

  const toothLibrary = selectToothLibraryMeshes(state);
  const libraryCollection = state.activeCollectionId
    ? BUNDLED_COLLECTIONS.find((c) => c.id === state.activeCollectionId) ?? null
    : null;
  const nextRequest = createVariantGenerationRequest({
    selectedTeeth: state.plan.selectedTeeth,
    treatmentMap: state.plan.treatmentMap,
    additiveBias: state.plan.additiveBias
  });
  const archOverrides =
    state.archDepthOverride != null || state.archHalfWidthOverride != null
      ? {
          archDepth: state.archDepthOverride ?? undefined,
          archHalfWidth: state.archHalfWidthOverride ?? undefined
        }
      : null;
  const nextDesign = generateSmileDesign(state.plan, {
    archScan: state.archScanMesh,
    toothLibrary,
    libraryCollection,
    archOverrides
  });
  const nextVariants = nextDesign.variants;
  const defaultVariantId = nextVariants[1]?.id ?? nextVariants[0]?.id ?? null;
  const defaultVariant = nextVariants.find((v) => v.id === defaultVariantId) ?? null;

  set({
    generationRequest: nextRequest,
    generatedDesign: nextDesign,
    variants: nextVariants,
    activeVariantId: defaultVariantId,
    selectedToothId: state.plan.selectedTeeth[4] ?? state.plan.selectedTeeth[0] ?? null,
    trustSummary: updateTrustFromVariant(defaultVariant),
    readyForDoctor: false,
    importError: null,
    activeView: "design"
  });
}

// ── Auto-save to IndexedDB ──────────────────────────────────────────
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

useSmileStore.subscribe((state) => {
  if (!state.caseRecord) return;

  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    state.saveCaseToDB();
  }, 1000);
});
