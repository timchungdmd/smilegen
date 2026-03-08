import { DEFAULT_SETTINGS, type AppSettings } from "./settingsTypes";

let currentSettings: AppSettings = { ...DEFAULT_SETTINGS };

export function getSettings(): AppSettings {
  return currentSettings;
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  currentSettings = { ...currentSettings, ...updates };
  // Persist to localStorage
  try {
    localStorage.setItem("smilegen-settings", JSON.stringify(currentSettings));
  } catch { /* ignore */ }
  return currentSettings;
}

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem("smilegen-settings");
    if (stored) {
      currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch { /* ignore */ }
  return currentSettings;
}
