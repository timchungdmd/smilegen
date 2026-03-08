export type ThemeMode = "dark" | "light";
export type ToothNumbering = "universal" | "fdi";

export interface AppSettings {
  theme: ThemeMode;
  toothNumbering: ToothNumbering;
  defaultArchDepth: number;       // mm
  defaultArchHalfWidth: number;   // mm
  defaultCameraDistance: number;   // mm
  exportFormat: "stl_ascii" | "stl_binary" | "obj";
  autoSave: boolean;
  autoDetectLandmarks: boolean;
  expertMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  toothNumbering: "universal",
  defaultArchDepth: 15,
  defaultArchHalfWidth: 35,
  defaultCameraDistance: 250,
  exportFormat: "stl_binary",
  autoSave: true,
  autoDetectLandmarks: true,
  expertMode: false
};
