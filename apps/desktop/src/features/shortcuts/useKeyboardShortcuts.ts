import { useEffect } from "react";
import { matchShortcut, type ShortcutScope } from "./keyboardShortcuts";
import { useViewportStore, type ViewId } from "../../store/useViewportStore";
import { useDesignStore } from "../../store/useDesignStore";
import { useCaseStore } from "../../store/useCaseStore";

const VIEW_ACTIONS: Record<string, ViewId> = {
  "view:import": "import",
  "view:align": "design",
  "view:design": "design",
  "view:review": "review",
  "view:present": "present",
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

      const activeView = useViewportStore.getState().activeView;
      const currentScope: ShortcutScope =
        activeView === "design" ? "design" :
        activeView === "import" ? "import" :
        activeView === "review" ? "review" :
        "global";

      const action = matchShortcut(event, currentScope);
      if (!action) return;

      event.preventDefault();
      const viewportState = useViewportStore.getState();
      const designState = useDesignStore.getState();
      const caseState = useCaseStore.getState();

      // View navigation
      const viewTarget = VIEW_ACTIONS[action];
      if (viewTarget) {
        viewportState.setActiveView(viewTarget);
        return;
      }

      switch (action) {
        case "deselect":
          designState.selectTooth(null);
          break;

        case "toggleOverlay":
          viewportState.setShowOverlay(!viewportState.showOverlay);
          break;

        case "nextTooth": {
          const plan = designState.plan;
          const teeth = plan.selectedTeeth;
          if (teeth.length === 0) break;
          const currentIndex = designState.selectedToothId
            ? teeth.indexOf(designState.selectedToothId)
            : -1;
          const nextIndex = (currentIndex + 1) % teeth.length;
          designState.selectTooth(teeth[nextIndex]);
          break;
        }

        case "prevVariant":
        case "nextVariant": {
          const variants = designState.variants;
          if (variants.length === 0) break;
          const currentVarIndex = designState.activeVariantId
            ? variants.findIndex((v) => v.id === designState.activeVariantId)
            : -1;
          const delta = action === "nextVariant" ? 1 : -1;
          const nextVarIndex =
            (currentVarIndex + delta + variants.length) % variants.length;
          designState.selectVariant(variants[nextVarIndex].id);
          break;
        }

        case "save":
          caseState.saveCaseToDB();
          break;

        case "export":
          designState.downloadActiveStl();
          break;

        case "generate":
          designState.generateDesign();
          break;

        case "undo":
          useDesignStore.temporal.getState().undo();
          break;

        case "redo":
          useDesignStore.temporal.getState().redo();
          break;

        case "gimbal:translate":
          viewportState.setGimbalMode("translate");
          break;

        case "gimbal:rotate":
          viewportState.setGimbalMode("rotate");
          break;

        case "gimbal:scale":
          viewportState.setGimbalMode("scale");
          break;

        case "frameSelected":
          console.debug("[shortcuts] frameSelected – not yet implemented");
          break;

        case "showShortcuts":
          console.debug("[shortcuts] showShortcuts – not yet implemented");
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
