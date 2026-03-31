import { useEffect } from "react";
import { AppShell } from "./features/layout/AppShell";
import { initAutoSave } from "./store/autoSave";
import { loadSettings } from "./features/settings/settingsStore";

export default function App() {
  useEffect(() => {
    // Apply persisted theme before first render flicker
    const { theme } = loadSettings();
    document.documentElement.setAttribute("data-theme", theme);

    const unsub = initAutoSave();
    return unsub;
  }, []);

  return <AppShell />;
}
