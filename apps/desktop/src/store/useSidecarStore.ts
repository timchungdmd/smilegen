// apps/desktop/src/store/useSidecarStore.ts
import { create } from "zustand";

export type SidecarState = "starting" | "ready" | "unavailable";

interface SidecarStore {
  state: SidecarState;
  setState: (s: SidecarState) => void;
}

export const useSidecarStore = create<SidecarStore>((set) => ({
  state: "starting",
  setState: (state) => set({ state }),
}));

// Wire Tauri events in Tauri runtime; fall back to "ready" after 30 s in dev mode.
// This IIFE runs once when the module is first imported.
(async function initSidecarListeners() {
  // Tauri v2 sets window.__TAURI_INTERNALS__ when running inside the Tauri webview
  const isTauri =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  if (isTauri) {
    try {
      // Dynamic import avoids bundling @tauri-apps/api in dev/test environments
      const { listen } = await import("@tauri-apps/api/event");
      await listen("sidecars-ready", () =>
        useSidecarStore.getState().setState("ready")
      );
      await listen("sidecars-unavailable", () =>
        useSidecarStore.getState().setState("unavailable")
      );
    } catch {
      // Tauri API failed (shouldn't happen) — mark unavailable
      useSidecarStore.getState().setState("unavailable");
    }
  } else {
    // Plain Vite dev mode: no Tauri runtime.
    // Fall back to "ready" after 30 s so the button works against a local service.
    setTimeout(() => {
      if (useSidecarStore.getState().state === "starting") {
        useSidecarStore.getState().setState("ready");
      }
    }, 30_000);
  }
})();
