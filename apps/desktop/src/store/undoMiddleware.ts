import type { StateCreator, StoreApi } from "zustand";
import { temporal, type TemporalState, type ZundoOptions } from "zundo";
import type { SmileStore } from "./useSmileStore";

/**
 * Fields tracked by the undo/redo system.
 * Large binary fields (photos, meshes, models) are excluded to keep
 * the history stack lightweight.
 */
export interface TrackedFields {
  generatedDesign: SmileStore["generatedDesign"];
  plan: SmileStore["plan"];
  activeVariantId: SmileStore["activeVariantId"];
  selectedToothId: SmileStore["selectedToothId"];
  variants: SmileStore["variants"];
}

function partialize(state: SmileStore): TrackedFields {
  return {
    generatedDesign: state.generatedDesign,
    plan: state.plan,
    activeVariantId: state.activeVariantId,
    selectedToothId: state.selectedToothId,
    variants: state.variants,
  };
}

function equality(pastState: TrackedFields, currentState: TrackedFields): boolean {
  return JSON.stringify(pastState) === JSON.stringify(currentState);
}

/**
 * Zundo temporal middleware options configured for SmileGen.
 * Exported for testing or external configuration access.
 */
export const temporalOptions: ZundoOptions<SmileStore, TrackedFields> = {
  partialize,
  equality,
  limit: 50,
};

/**
 * Wraps a SmileStore state creator with zundo temporal middleware.
 *
 * Usage — when integrating into useSmileStore.ts, replace:
 *
 * ```ts
 * export const useSmileStore = create<SmileStore>((set, get) => ({ ... }));
 * ```
 *
 * with:
 *
 * ```ts
 * import { withTemporalMiddleware } from "./undoMiddleware";
 * export const useSmileStore = create<SmileStore>()(
 *   withTemporalMiddleware((set, get) => ({ ... }))
 * );
 * ```
 *
 * Then access undo/redo via `useSmileStore.temporal.getState()`.
 */
export function withTemporalMiddleware(
  stateCreator: StateCreator<SmileStore, [["temporal", unknown]], []>
) {
  return temporal(stateCreator, temporalOptions);
}

// ── Type for a store wrapped with temporal middleware ───────────────

export type TemporalSmileStore = StoreApi<SmileStore> & {
  temporal: StoreApi<TemporalState<TrackedFields>>;
};

// ── Helper functions ───────────────────────────────────────────────
// These operate on any store that has been wrapped with zundo's temporal
// middleware.  The caller passes the store reference so this module
// stays decoupled from the concrete store instance.

export function undo(store: TemporalSmileStore): void {
  store.temporal.getState().undo();
}

export function redo(store: TemporalSmileStore): void {
  store.temporal.getState().redo();
}

export function canUndo(store: TemporalSmileStore): boolean {
  return store.temporal.getState().pastStates.length > 0;
}

export function canRedo(store: TemporalSmileStore): boolean {
  return store.temporal.getState().futureStates.length > 0;
}

/**
 * React hook that reads the temporal store and returns undo/redo
 * state and actions.  Must be called inside a component.
 *
 * ```tsx
 * const { undo, redo, canUndo, canRedo } = useTemporalStore(useSmileStore);
 * ```
 */
export function useTemporalStore(store: TemporalSmileStore) {
  const temporalState = store.temporal.getState();

  return {
    undo: temporalState.undo,
    redo: temporalState.redo,
    canUndo: temporalState.pastStates.length > 0,
    canRedo: temporalState.futureStates.length > 0,
    clear: temporalState.clear,
  };
}
