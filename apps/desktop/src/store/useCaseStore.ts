import { create } from "zustand";
import type { CaseRecord } from "../features/cases/types";
import { createEmptyCase } from "../features/cases/caseStore";
import { saveCase, loadCase as loadCaseFromDb, type SavedCase } from "../services/caseDb";
import { applyMappingResult, type ToothMappingState } from "../features/review/toothMappingStore";
import { createDefaultSmilePlan } from "../features/smile-plan/smilePlanStore";
import { parseSmilePlan, parseGeneratedSmileDesign } from "../features/cases/caseValidators";
import type { SmilePlan } from "../features/smile-plan/smilePlanTypes";
import type { GeneratedSmileDesign } from "../features/engine/designEngine";
import { transitionCaseState } from "../features/workflow/workflowState";
import { useImportStore } from "./useImportStore";
import { useViewportStore } from "./useViewportStore";
// NOTE: useDesignStore is imported lazily inside action bodies to avoid
// circular-module-initialization issues (useCaseStore ↔ useDesignStore).
import { useDesignStore } from "./useDesignStore";

interface CaseState {
  caseRecord: CaseRecord | null;
  mappingState: ToothMappingState | null;
}

interface CaseActions {
  createCase: () => void;
  confirmMapping: () => void;
  saveCaseToDB: () => Promise<void>;
  loadCaseFromDB: (id: string) => Promise<void>;
  newCase: () => void;
}

export type CaseStore = CaseState & CaseActions;

// ── Internal helpers ───────────────────────────────────────────────────────

function buildMappingPreview(uploadedToothIds: string[]) {
  const defaultTeeth = ["8", "9"];
  const teeth = uploadedToothIds.length > 0 ? uploadedToothIds : defaultTeeth;
  return teeth.map((toothId) => ({
    toothId,
    confidence: uploadedToothIds.includes(toothId) ? 0.91 : 0.42,
  }));
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useCaseStore = create<CaseStore>((set, get) => ({
  caseRecord: null,
  mappingState: null,

  createCase: () => {
    const importState = useImportStore.getState();
    const toothIds = importState.uploadedToothModels.map((m) => m.toothId);
    const title = importState.archScanName?.replace(/\.stl$/i, "") ?? "Demo Consult 001";
    const demoCase = createEmptyCase(title);

    set({
      caseRecord: {
        ...demoCase,
        workflowState: transitionCaseState("draft", { hasRequiredImports: true }),
      },
      mappingState: applyMappingResult({
        teeth: buildMappingPreview(toothIds),
      }),
    });

    // Reset design state for the new case
    useDesignStore.getState().resetDesign();
  },

  confirmMapping: () => {
    const { caseRecord } = get();
    if (!caseRecord) return;

    set({
      caseRecord: {
        ...caseRecord,
        workflowState: transitionCaseState(caseRecord.workflowState, {
          orientationConfirmed: true,
          mappingConfirmed: true,
        }),
      },
    });
  },

  saveCaseToDB: async () => {
    const { caseRecord } = get();
    if (!caseRecord) return;

    const { plan, generatedDesign } = useDesignStore.getState();
    const { midlineX, smileArcY, gingivalLineY, overlayOpacity } =
      useViewportStore.getState();

    const savedCase: SavedCase = {
      id: caseRecord.id,
      title: caseRecord.title,
      workflowState: caseRecord.workflowState,
      planJson: JSON.stringify(plan),
      designJson: generatedDesign ? JSON.stringify(generatedDesign) : null,
      overlaySettings: { midlineX, smileArcY, gingivalLineY, overlayOpacity },
      createdAt: caseRecord.createdAt,
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
        generatedDesign = parseGeneratedSmileDesign(
          JSON.parse(saved.designJson)
        ) as GeneratedSmileDesign;
      } catch (e) {
        console.error("Corrupted design data in DB, discarding:", e);
        generatedDesign = null;
      }
    }

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
      mappingState: null,
    });

    // Restore design state
    useDesignStore.getState().applyDesignFromDB(plan, generatedDesign);

    // Restore overlay settings and navigate to appropriate view
    const vs = useViewportStore.getState();
    vs.setMidlineX(saved.overlaySettings.midlineX);
    vs.setSmileArcY(saved.overlaySettings.smileArcY);
    vs.setGingivalLineY(saved.overlaySettings.gingivalLineY);
    vs.setOverlayOpacity(saved.overlaySettings.overlayOpacity);
    vs.setActiveView(generatedDesign ? "simulate" : "capture");
  },

  newCase: () => {
    // Revoke photo object URLs and clear all import state
    useImportStore.getState().clearAll();
    // Reset all design state (plan, design, variants, etc.)
    useDesignStore.getState().resetDesign();
    // Navigate back to import view
    useViewportStore.getState().setActiveView("capture");
    set({ caseRecord: null, mappingState: null });
  },
}));
