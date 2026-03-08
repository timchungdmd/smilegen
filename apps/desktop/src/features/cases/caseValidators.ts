import { z } from "zod";
import type { SmilePlan } from "../smile-plan/smilePlanTypes";
import type { AppSettings } from "../settings/settingsTypes";
import type { CaseRecord } from "./types";

const SmilePlanControlsSchema = z.object({
  midline: z.number(),
  widthScale: z.number(),
  lengthScale: z.number(),
  incisalCurve: z.number(),
  proportionMode: z.enum(["golden", "percentage", "library"]),
});

const SmilePlanSchema = z.object({
  workingRange: z.enum(["premolar_to_premolar"]),
  additiveBias: z.enum(["conservative", "balanced", "enhanced"]),
  symmetryMode: z.enum(["soft", "strict"]),
  selectedTeeth: z.array(z.string()),
  treatmentMap: z.record(z.string(), z.enum(["veneer", "crown"])),
  controls: SmilePlanControlsSchema,
});

const AppSettingsSchema = z
  .object({
    theme: z.enum(["dark", "light"]),
    toothNumbering: z.enum(["universal", "fdi"]),
    defaultArchDepth: z.number(),
    defaultArchHalfWidth: z.number(),
    defaultCameraDistance: z.number(),
    exportFormat: z.enum(["stl_ascii", "stl_binary", "obj"]),
    autoSave: z.boolean(),
    autoDetectLandmarks: z.boolean(),
    expertMode: z.boolean(),
  })
  .strict(); // .strict() rejects unknown keys, defeating prototype pollution via __proto__

const AssetRecordSchema = z.object({
  id: z.string(),
  type: z.string(),
  localPath: z.string(),
});

const CaseRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  workflowState: z.enum([
    "draft",
    "imported",
    "mapped",
    "prepared",
    "needs_doctor_review",
    "doctor_approved",
    "exported",
  ]),
  presentationReady: z.boolean(),
  exportBlocked: z.boolean(),
  activeDesignVersionId: z.string(),
  assets: z.array(AssetRecordSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// GeneratedSmileDesign — lightweight structural check; geometry arrays validated by presence only
const GeneratedToothDesignSchema = z.object({
  toothId: z.string(),
  treatmentType: z.enum(["veneer", "crown"]),
  width: z.number(),
  height: z.number(),
  depth: z.number(),
  positionX: z.number(),
  positionY: z.number(),
  positionZ: z.number(),
  archAngle: z.number(),
  facialVolume: z.number(),
  trustState: z.enum(["ready", "needs_correction", "blocked"]),
  stl: z.string(),
  previewTriangles: z.array(z.any()),
});

const GeneratedVariantDesignSchema = z.object({
  id: z.string(),
  label: z.string(),
  widthTendency: z.string(),
  lengthTendency: z.string(),
  additiveIntensity: z.string(),
  teeth: z.array(GeneratedToothDesignSchema),
  combinedStl: z.string(),
});

const GeneratedSmileDesignSchema = z.object({
  variants: z.array(GeneratedVariantDesignSchema),
});

export function parseSmilePlan(data: unknown): SmilePlan {
  return SmilePlanSchema.parse(data) as SmilePlan;
}

export function parseAppSettings(data: unknown): AppSettings {
  return AppSettingsSchema.parse(data) as AppSettings;
}

export function parseCaseRecord(data: unknown): CaseRecord {
  return CaseRecordSchema.parse(data) as CaseRecord;
}

export function parseGeneratedSmileDesign(data: unknown) {
  return GeneratedSmileDesignSchema.parse(data);
}
