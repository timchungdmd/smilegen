import { DEFAULT_SETTINGS, type AppSettings } from "./settingsTypes";
import { parseAppSettings } from "../cases/caseValidators";

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
      const parsed = JSON.parse(stored);
      currentSettings = parseAppSettings({ ...DEFAULT_SETTINGS, ...parsed });
    }
  } catch {
    // Corrupted or outdated settings — fall back to defaults
    currentSettings = { ...DEFAULT_SETTINGS };
  }
  return currentSettings;
}
