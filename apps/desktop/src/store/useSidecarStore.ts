// apps/desktop/src/store/useSidecarStore.ts
import { create } from "zustand";

export type SidecarState = "starting" | "ready" | "unavailable";

/** Dev-mode fallback delay in ms. Override via VITE_SIDECAR_FALLBACK_DELAY_MS env var. */
const DEV_FALLBACK_DELAY_MS = Number(
  import.meta.env.VITE_SIDECAR_FALLBACK_DELAY_MS ?? 5_000
);

interface SidecarStoreState {
  sidecarState: SidecarState;
}

interface SidecarStoreActions {
  setSidecarState: (s: SidecarState) => void;
}

type SidecarStore = SidecarStoreState & SidecarStoreActions;

export const useSidecarStore = create<SidecarStore>()((set) => ({
  sidecarState: "starting",
  setSidecarState: (sidecarState) => set({ sidecarState }),
}));

// Wire Tauri events in Tauri runtime; fall back to "ready" after DEV_FALLBACK_DELAY_MS in dev mode.
// This IIFE runs once when the module is first imported.
(async function initSidecarListeners() {
  // Skip all side effects in the Vitest test environment
  if (import.meta.env.VITEST) return;

  // Tauri v2 sets window.__TAURI_INTERNALS__ when running inside the Tauri webview
  const isTauri =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  if (isTauri) {
    try {
      // Dynamic import avoids bundling @tauri-apps/api in dev/test environments
      const { listen } = await import("@tauri-apps/api/event");
      const _unlistenReady = await listen("sidecars-ready", () =>
        useSidecarStore.getState().setSidecarState("ready")
      );
      const _unlistenUnavailable = await listen("sidecars-unavailable", () =>
        useSidecarStore.getState().setSidecarState("unavailable")
      );
      // Listeners are intentionally long-lived; handles stored to suppress lint warnings
      void _unlistenReady;
      void _unlistenUnavailable;
    } catch {
      // Tauri API failed (shouldn't happen) — mark unavailable
      useSidecarStore.getState().setSidecarState("unavailable");
    }
  } else {
    // Plain Vite dev mode: no Tauri runtime.
    // Fall back to "ready" after DEV_FALLBACK_DELAY_MS so the button works against a local service.
    const _devFallbackTimer = setTimeout(() => {
      if (useSidecarStore.getState().sidecarState === "starting") {
        useSidecarStore.getState().setSidecarState("ready");
      }
    }, DEV_FALLBACK_DELAY_MS);
    void _devFallbackTimer;
  }
})();
