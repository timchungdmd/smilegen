import { useEffect } from "react";
import { matchShortcut } from "./keyboardShortcuts";
import { useSmileStore } from "../../store/useSmileStore";
import type { ViewId } from "../../store/useSmileStore";
import { undo, redo, type TemporalSmileStore } from "../../store/undoMiddleware";

const VIEW_ACTIONS: Record<string, ViewId> = {
  "view:import": "import",
  "view:design": "design",
  "view:compare": "compare",
  "view:export": "export"
};

/**
 * Hook that registers global keyboard shortcut handlers.
 * Call once at the app root level.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Skip when user is typing in an input/textarea
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const action = matchShortcut(event);
      if (!action) return;

      event.preventDefault();
      const state = useSmileStore.getState();

      // View navigation
      const viewTarget = VIEW_ACTIONS[action];
      if (viewTarget) {
        state.setActiveView(viewTarget);
        return;
      }

      switch (action) {
        case "deselect":
          state.selectTooth(null);
          break;

        case "toggleOverlay":
          state.setShowOverlay(!state.showOverlay);
          break;

        case "nextTooth": {
          const plan = state.plan;
          const teeth = plan.selectedTeeth;
          if (teeth.length === 0) break;
          const currentIndex = state.selectedToothId
            ? teeth.indexOf(state.selectedToothId)
            : -1;
          const nextIndex = (currentIndex + 1) % teeth.length;
          state.selectTooth(teeth[nextIndex]);
          break;
        }

        case "prevVariant":
        case "nextVariant": {
          const variants = state.variants;
          if (variants.length === 0) break;
          const currentVarIndex = state.activeVariantId
            ? variants.findIndex((v) => v.id === state.activeVariantId)
            : -1;
          const delta = action === "nextVariant" ? 1 : -1;
          const nextVarIndex =
            (currentVarIndex + delta + variants.length) % variants.length;
          state.selectVariant(variants[nextVarIndex].id);
          break;
        }

        case "save":
          state.saveCaseToDB();
          break;

        case "export":
          state.downloadActiveStl();
          break;

        case "generate":
          state.generateDesign();
          break;

        case "undo":
          undo(useSmileStore as unknown as TemporalSmileStore);
          break;

        case "redo":
          redo(useSmileStore as unknown as TemporalSmileStore);
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
