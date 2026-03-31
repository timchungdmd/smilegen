/**
 * useDesignStore — plan, generation, variants, selection, and design-editing state.
 *
 * Undo/redo is tracked via zundo with an O(1) equality check: a monotonic
 * version counter (_v) is incremented by every undo-worthy action.  The
 * equality function simply compares `a._v === b._v` instead of
 * JSON.stringify-ing the full design tree.
 */

import { create } from "zustand";
import { temporal } from "zundo";
import type {
  SmilePlan,
  SmilePlanControls,
  AdditiveBias,
  TreatmentType,
} from "../features/smile-plan/smilePlanTypes";
import {
  createDefaultSmilePlan,
  updateAdditiveBias,
  updatePlanControls as applyUpdatePlanControls,
  toggleTooth as applyToggleTooth,
  setTreatmentType as applySetTreatmentType,
} from "../features/smile-plan/smilePlanStore";
import {
  generateSmileDesign,
  type GeneratedSmileDesign,
  type GeneratedVariantDesign,
  updateVariantToothDimensions,
  updateVariantToothPlacement,
} from "../features/engine/designEngine";
import { exportVariant } from "../features/export/exportService";
import { createVariantGenerationRequest } from "../features/engine/engineClient";
import type { VariantGenerationRequest } from "../features/engine/engineTypes";
import { DEFAULT_SHADE } from "../features/color/shadeGuide";
import { BUNDLED_COLLECTIONS } from "../features/library/bundledLibrary";
import type { ToothLibraryCollection } from "../features/library/toothLibraryTypes";
import { summarizeTrustState, type TrustSummary } from "../features/trust/trustEngine";
import type { VariantSummary } from "../features/variants/variantStore";
import type { FacialLandmarks } from "../features/analysis/analysisTypes";
import type { Annotation } from "../features/collaboration/annotationTypes";
import { canMarkReadyForDoctor } from "../features/handoff/handoffStore";
import { createEmptyCase } from "../features/cases/caseStore";
import { applyMappingResult } from "../features/review/toothMappingStore";
import { validateImportSet } from "../features/import/importService";
import type { ParsedStlMesh } from "../features/import/stlParser";
import { useImportStore } from "./useImportStore";
import { useViewportStore } from "./useViewportStore";
import { useAlignmentStore } from "./useAlignmentStore";
// NOTE: useCaseStore imported inside action bodies to avoid circular-module-
// initialization issues (useDesignStore ↔ useCaseStore).
import { useCaseStore } from "./useCaseStore";
import { transitionCaseState } from "../features/workflow/workflowState";

// ── Version counter for O(1) undo equality ─────────────────────────────────
// Incremented by every action that should push a history entry.
let _vSeed = 0;
function nextV(): number {
  return ++_vSeed;
}

// ── Generation lock to prevent race conditions ──────────────────────────────
// When true, applyGeneration is already running; concurrent calls are skipped.
let _generating = false;

// ── State ──────────────────────────────────────────────────────────────────

interface DesignState {
  /** Monotonic version counter — used by zundo equality for O(1) comparison. */
  _v: number;

  // Plan
  plan: SmilePlan;
  generationRequest: VariantGenerationRequest | null;

  // Generated design & variants
  generatedDesign: GeneratedSmileDesign | null;
  variants: VariantSummary[];
  activeVariantId: string | null;

  // Selection
  selectedToothId: string | null;

  // Trust
  trustSummary: TrustSummary | null;

  // Handoff
  readyForDoctor: boolean;

  // Shade
  selectedShadeId: string;

  // Facial landmarks
  facialLandmarks: FacialLandmarks | null;

  // Collaboration
  annotations: Annotation[];

  // Arch curve overrides
  archPreset: "auto" | "narrow" | "average" | "wide" | "custom";
  archDepthOverride: number | null;
  archHalfWidthOverride: number | null;

  // Expert mode
  expertMode: boolean;
}

// ── Actions ────────────────────────────────────────────────────────────────

interface DesignActions {
  // Plan mutations (all invalidate the current design)
  changeBias: (bias: AdditiveBias) => void;
  updatePlanControls: (controls: Partial<SmilePlanControls>) => void;
  toggleTooth: (toothId: string) => void;
  setTreatmentType: (toothId: string, type: TreatmentType) => void;

  // Generation
  generateDesign: () => void;
  quickGenerate: () => void;

  // Variant & tooth selection
  selectVariant: (id: string) => void;
  selectTooth: (id: string | null) => void;

  // Tooth edits
  adjustTooth: (
    toothId: string,
    updates: Partial<Pick<GeneratedVariantDesign["teeth"][number], "width" | "height" | "depth">>
  ) => void;
  moveTooth: (toothId: string, delta: { deltaX: number; deltaY: number }) => void;

  // Export / handoff
  downloadActiveStl: () => void;
  markReadyForDoctor: () => void;

  // Misc setters
  setSelectedShadeId: (id: string) => void;
  setFacialLandmarks: (landmarks: FacialLandmarks | null) => void;
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  setExpertMode: (enabled: boolean) => void;
  setArchPreset: (preset: DesignState["archPreset"]) => void;
  setArchDepthOverride: (depth: number | null) => void;
  setArchHalfWidthOverride: (halfWidth: number | null) => void;
  applyLibraryCollection: (collection: ToothLibraryCollection) => void;

  // Cross-store lifecycle methods
  /** Called by useCaseStore.loadCaseFromDB — restores persisted plan + design. */
  applyDesignFromDB: (
    plan: SmilePlan,
    generatedDesign: GeneratedSmileDesign | null
  ) => void;
  /** Reset all design state (called by useCaseStore on createCase / newCase). */
  resetDesign: () => void;
}

export type DesignStore = DesignState & DesignActions;

// ── Selector helpers ────────────────────────────────────────────────────────

export function selectActiveVariant(state: DesignStore): GeneratedVariantDesign | null {
  return state.generatedDesign?.variants.find((v) => v.id === state.activeVariantId) ?? null;
}

// ── Private helpers ────────────────────────────────────────────────────────

function buildToothLibrary(): Record<string, ParsedStlMesh> {
  return useImportStore.getState().uploadedToothModels.reduce<Record<string, ParsedStlMesh>>(
    (lib, m) => {
      lib[m.toothId] = m.mesh;
      return lib;
    },
    {}
  );
}

function buildMappingPreview(toothIds: string[]) {
  const defaults = ["8", "9"];
  const teeth = toothIds.length > 0 ? toothIds : defaults;
  return teeth.map((toothId) => ({
    toothId,
    confidence: toothIds.includes(toothId) ? 0.91 : 0.42,
  }));
}

function trustFromVariant(variant: GeneratedVariantDesign | null): TrustSummary | null {
  if (!variant) return null;
  return summarizeTrustState(
    variant.teeth.map((t) => ({ toothId: t.toothId, state: t.trustState }))
  );
}

// ── Initial state snapshot ─────────────────────────────────────────────────

const INITIAL_STATE: DesignState = {
  _v: 0,
  plan: createDefaultSmilePlan(),
  generationRequest: null,
  generatedDesign: null,
  variants: [],
  activeVariantId: null,
  selectedToothId: null,
  trustSummary: null,
  readyForDoctor: false,
  selectedShadeId: DEFAULT_SHADE,
  facialLandmarks: null,
  annotations: [],
  archPreset: "auto",
  archDepthOverride: null,
  archHalfWidthOverride: null,
  expertMode: false,
};

// ── Store ──────────────────────────────────────────────────────────────────

export const useDesignStore = create<DesignStore>()(
  temporal(
    (set, get) => ({
      ...INITIAL_STATE,

      // ── Plan mutations ─────────────────────────────────────────────

      changeBias: (bias) => {
        set((s) => ({
          plan: updateAdditiveBias(s.plan, bias),
          generationRequest: null,
          generatedDesign: null,
          variants: [],
          activeVariantId: null,
          trustSummary: null,
          readyForDoctor: false,
          selectedToothId: null,
          _v: nextV(),
        }));
      },

      updatePlanControls: (controls) => {
        const prevVariantId = get().activeVariantId;
        set((s) => ({
          plan: applyUpdatePlanControls(s.plan, controls),
          _v: nextV(),
        }));
        // Re-run generation so slider changes immediately update the 3D design.
        // Pass navigate:false to avoid redirecting to simulate on every drag.
        if (get().generatedDesign) {
          applyGeneration(set, get, { navigate: false });
          // Restore the user's selected variant if it still exists in the new design
          const newVariants = get().generatedDesign?.variants ?? [];
          if (prevVariantId && newVariants.some((v) => v.id === prevVariantId)) {
            set({ activeVariantId: prevVariantId });
          }
        }
      },

      toggleTooth: (toothId) => {
        set((s) => ({
          plan: applyToggleTooth(s.plan, toothId),
          generatedDesign: null,
          variants: [],
          activeVariantId: null,
          trustSummary: null,
          readyForDoctor: false,
          _v: nextV(),
        }));
      },

      setTreatmentType: (toothId, type) => {
        set((s) => ({
          plan: applySetTreatmentType(s.plan, toothId, type),
          generatedDesign: null,
          variants: [],
          activeVariantId: null,
          trustSummary: null,
          readyForDoctor: false,
          _v: nextV(),
        }));
      },

      // ── Generation ─────────────────────────────────────────────────

      generateDesign: () => {
        const { caseRecord } = useCaseStore.getState();
        if (!caseRecord || caseRecord.workflowState !== "mapped") return;
        applyGeneration(set, get);
      },

      quickGenerate: () => {
        const importState = useImportStore.getState();
        const validation = validateImportSet({
          photos: importState.uploadedPhotos.map((p) => p.name),
          archScan: importState.archScanName,
          toothLibrary: importState.uploadedToothModels.map((m) => m.name),
        });
        if (!validation.ok) return;

        const toothIds = importState.uploadedToothModels.map((m) => m.toothId);
        const caseState = useCaseStore.getState();
        const mappingState = applyMappingResult({ teeth: buildMappingPreview(toothIds) });

        if (!caseState.caseRecord) {
          const title =
            importState.archScanName?.replace(/\.stl$/i, "") ?? "Imported Consult";
          useCaseStore.setState({
            caseRecord: { ...createEmptyCase(title), workflowState: "mapped" as const },
            mappingState,
          });
        } else {
          useCaseStore.setState({
            caseRecord: { ...caseState.caseRecord, workflowState: "mapped" as const },
            mappingState,
          });
        }

        applyGeneration(set, get);
      },

      // ── Variant & tooth selection ──────────────────────────────────

      selectVariant: (id) => {
        const variant =
          get().generatedDesign?.variants.find((v) => v.id === id) ?? null;
        set({ activeVariantId: id, trustSummary: trustFromVariant(variant) });
      },

      selectTooth: (id) => set({ selectedToothId: id }),

      // ── Tooth edits ────────────────────────────────────────────────

      adjustTooth: (toothId, updates) => {
        const { generatedDesign, activeVariantId } = get();
        if (!generatedDesign || !activeVariantId) return;

        const nextDesign: GeneratedSmileDesign = {
          variants: generatedDesign.variants.map((v) =>
            v.id === activeVariantId
              ? updateVariantToothDimensions(v, toothId, updates)
              : v
          ),
        };
        const activeV = nextDesign.variants.find((v) => v.id === activeVariantId) ?? null;

        set({
          generatedDesign: nextDesign,
          trustSummary: trustFromVariant(activeV),
          readyForDoctor: false,
          _v: nextV(),
        });
      },

      moveTooth: (toothId, delta) => {
        const { generatedDesign, activeVariantId } = get();
        if (!generatedDesign || !activeVariantId) return;

        const nextDesign: GeneratedSmileDesign = {
          variants: generatedDesign.variants.map((v) =>
            v.id === activeVariantId
              ? updateVariantToothPlacement(v, toothId, delta)
              : v
          ),
        };
        const activeV = nextDesign.variants.find((v) => v.id === activeVariantId) ?? null;

        set({
          generatedDesign: nextDesign,
          trustSummary: trustFromVariant(activeV),
          readyForDoctor: false,
          _v: nextV(),
        });
      },

      // ── Export / handoff ───────────────────────────────────────────

      downloadActiveStl: () => {
        const activeVariant = selectActiveVariant(get());
        if (!activeVariant || typeof document === "undefined") return;

        exportVariant(activeVariant, {
          format: "stl_binary",
          filename: `${activeVariant.id}.stl`,
          includeAllVariants: false
        });
      },

  markReadyForDoctor: () => {
    const { caseRecord } = useCaseStore.getState();
    const state = get();
    const canMark = canMarkReadyForDoctor({
      hasImports: Boolean(caseRecord),
      mappingConfirmed: caseRecord?.workflowState === "mapped",
      savedVariantCount: state.variants.length,
    });
    if (!caseRecord || !canMark) return;

    const alignmentComplete = useAlignmentStore.getState().isAlignmentComplete();
    useCaseStore.setState({
      caseRecord: {
        ...caseRecord,
        workflowState: transitionCaseState(caseRecord.workflowState, {
          hasVariants: true,
          alignmentComplete,
        }),
      },
    });
    set({ readyForDoctor: true });
  },

      // ── Misc setters ───────────────────────────────────────────────

      setSelectedShadeId: (id) => set({ selectedShadeId: id }),
      setFacialLandmarks: (landmarks) => set({ facialLandmarks: landmarks }),

      addAnnotation: (annotation) =>
        set((s) => ({ annotations: [...s.annotations, annotation] })),

      removeAnnotation: (id) =>
        set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),

      clearAnnotations: () => set({ annotations: [] }),

      setExpertMode: (enabled) => set({ expertMode: enabled }),

      setArchPreset: (preset) => {
        const PRESETS: Record<
          string,
          { depth: number | null; halfWidth: number | null }
        > = {
          auto: { depth: null, halfWidth: null },
          narrow: { depth: 18, halfWidth: 28 },
          average: { depth: 15, halfWidth: 35 },
          wide: { depth: 12, halfWidth: 42 },
          custom: {
            depth: get().archDepthOverride,
            halfWidth: get().archHalfWidthOverride,
          },
        };
        const p = PRESETS[preset] ?? PRESETS.auto;
        set({ archPreset: preset, archDepthOverride: p.depth, archHalfWidthOverride: p.halfWidth });
      },

      setArchDepthOverride: (depth) => {
        set({ archDepthOverride: depth, archPreset: "custom" });
        if (get().generatedDesign) {
          const prevVariantId = get().activeVariantId;
          applyGeneration(set, get, { navigate: false });
          const newVariants = get().generatedDesign?.variants ?? [];
          if (prevVariantId && newVariants.some((v) => v.id === prevVariantId)) {
            set({ activeVariantId: prevVariantId });
          }
        }
      },

      setArchHalfWidthOverride: (halfWidth) => {
        set({ archHalfWidthOverride: halfWidth, archPreset: "custom" });
        if (get().generatedDesign) {
          const prevVariantId = get().activeVariantId;
          applyGeneration(set, get, { navigate: false });
          const newVariants = get().generatedDesign?.variants ?? [];
          if (prevVariantId && newVariants.some((v) => v.id === prevVariantId)) {
            set({ activeVariantId: prevVariantId });
          }
        }
      },

      applyLibraryCollection: (collection) => {
        useViewportStore.getState().setActiveCollectionId(collection.id);
        if (get().generatedDesign) {
          applyGeneration(set, get);
        }
      },

      // ── Cross-store lifecycle ──────────────────────────────────────

      applyDesignFromDB: (plan, generatedDesign) => {
        const defaultVariant =
          generatedDesign?.variants[1] ?? generatedDesign?.variants[0] ?? null;
        set({
          plan,
          generatedDesign,
          variants: generatedDesign?.variants ?? [],
          activeVariantId: defaultVariant?.id ?? null,
          trustSummary: trustFromVariant(defaultVariant),
          readyForDoctor: false,
          selectedToothId: null,
          _v: nextV(),
        });
      },

      resetDesign: () => {
        set({ ...INITIAL_STATE, plan: createDefaultSmilePlan(), _v: nextV() });
      },
    }),
    {
      /**
       * O(1) undo equality: compare only the monotonic version counter.
       * zundo will push a history entry only when _v has changed,
       * avoiding the O(n) JSON.stringify of the full design tree.
       */
      partialize: (state) => ({
        _v: state._v,
        plan: state.plan,
        generatedDesign: state.generatedDesign,
        activeVariantId: state.activeVariantId,
        selectedToothId: state.selectedToothId,
        variants: state.variants,
      }),
      equality: (a, b) => a._v === b._v,
      limit: 50,
    }
  )
);

// ── Generation helper ──────────────────────────────────────────────────────

function applyGeneration(
  set: (partial: Partial<DesignState>) => void,
  get: () => DesignStore,
  options: { navigate?: boolean } = {}
): void {
  if (_generating) return;
  _generating = true;
  try {
    const { navigate = true } = options;
    const state = get();
    const importState = useImportStore.getState();
    const viewportState = useViewportStore.getState();

    const toothLibrary = buildToothLibrary();
    const libraryCollection = viewportState.activeCollectionId
      ? BUNDLED_COLLECTIONS.find((c) => c.id === viewportState.activeCollectionId) ?? null
      : null;

    const archOverrides =
      state.archDepthOverride != null || state.archHalfWidthOverride != null
        ? {
            archDepth: state.archDepthOverride ?? undefined,
            archHalfWidth: state.archHalfWidthOverride ?? undefined,
          }
        : null;

    const nextRequest = createVariantGenerationRequest({
      selectedTeeth: state.plan.selectedTeeth,
      treatmentMap: state.plan.treatmentMap,
      additiveBias: state.plan.additiveBias,
    });

    const nextDesign = generateSmileDesign(state.plan, {
      archScan: importState.archScanMesh,
      toothLibrary,
      libraryCollection,
      archOverrides,
    });

    const nextVariants = nextDesign.variants;
    const defaultVariantId = nextVariants[1]?.id ?? nextVariants[0]?.id ?? null;
    const defaultVariant = nextVariants.find((v) => v.id === defaultVariantId) ?? null;

    set({
      generationRequest: nextRequest,
      generatedDesign: nextDesign,
      variants: nextVariants,
      activeVariantId: defaultVariantId,
      selectedToothId:
        state.plan.selectedTeeth[4] ?? state.plan.selectedTeeth[0] ?? null,
      trustSummary: trustFromVariant(defaultVariant),
      readyForDoctor: false,
      _v: nextV(),
    });

    if (navigate) {
      viewportState.setActiveView("design");
    }
  } finally {
    _generating = false;
  }
}
