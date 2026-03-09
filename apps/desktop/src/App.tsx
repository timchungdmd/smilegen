import { useEffect } from "react";
import { AppShell } from "./features/layout/AppShell";
import { initAutoSave } from "./store/autoSave";

export default function App() {
  useEffect(() => {
    const unsub = initAutoSave();
    return unsub;
  }, []);

  return <AppShell />;
}
