import { useDesignStore } from "./useDesignStore";
import { useCaseStore } from "./useCaseStore";

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Subscribes to design store changes and debounces saves to IndexedDB.
 * Only triggers when a caseRecord exists.
 * Returns an unsubscribe function for cleanup.
 */
export function initAutoSave(): () => void {
  const unsub = useDesignStore.subscribe(() => {
    if (!useCaseStore.getState().caseRecord) return;

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      await useCaseStore.getState().saveCaseToDB();
    }, 1000);
  });
  return unsub;
}
