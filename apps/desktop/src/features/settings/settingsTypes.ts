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

import { ARCH_DEFAULTS } from "../shared/archDefaults";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  toothNumbering: "universal",
  defaultArchDepth: ARCH_DEFAULTS.archDepth,
  defaultArchHalfWidth: ARCH_DEFAULTS.archHalfWidth,
  defaultCameraDistance: ARCH_DEFAULTS.cameraDistance,
  exportFormat: "stl_binary",
  autoSave: true,
  autoDetectLandmarks: true,
  expertMode: false
};
