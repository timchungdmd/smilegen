import { parseSmilePlan, parseGeneratedSmileDesign } from "../cases/caseValidators";
import type { SmilePlan } from "../smile-plan/smilePlanTypes";
import type { GeneratedSmileDesign } from "../engine/designEngine";

/**
 * Package a case into a downloadable .smilegen file.
 * Format: JSON file containing case metadata and base64-encoded assets.
 * (In production, this would be a ZIP file. For simplicity, using JSON.)
 */
export interface PackagedCase {
  version: "1.0";
  exportedAt: string;
  case: {
    title: string;
    workflowState: string;
    planJson: string;
    designJson: string | null;
  };
  assets: Array<{
    type: "photo" | "arch_scan" | "tooth_model";
    name: string;
    // In a real implementation, this would be base64-encoded file data
    // For now, just store metadata
    metadata: Record<string, unknown>;
  }>;
}

export function packageCase(caseData: {
  title: string;
  workflowState: string;
  plan: unknown;
  design: unknown | null;
  photoNames: string[];
  archScanName?: string;
  toothModelNames: string[];
}): PackagedCase {
  const assets: PackagedCase["assets"] = [];

  for (const photoName of caseData.photoNames) {
    assets.push({
      type: "photo",
      name: photoName,
      metadata: { originalFilename: photoName }
    });
  }

  if (caseData.archScanName) {
    assets.push({
      type: "arch_scan",
      name: caseData.archScanName,
      metadata: { originalFilename: caseData.archScanName }
    });
  }

  for (const modelName of caseData.toothModelNames) {
    assets.push({
      type: "tooth_model",
      name: modelName,
      metadata: { originalFilename: modelName }
    });
  }

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    case: {
      title: caseData.title,
      workflowState: caseData.workflowState,
      planJson: JSON.stringify(caseData.plan),
      designJson: caseData.design ? JSON.stringify(caseData.design) : null
    },
    assets
  };
}

export interface UnpackedCase {
  title: string;
  workflowState: string;
  plan: SmilePlan;
  design: GeneratedSmileDesign | null;
  assets: PackagedCase["assets"];
}

/**
 * Parse and validate a .smilegen JSON string.
 * Throws if the JSON is malformed or plan/design data fails Zod validation.
 */
export function unpackCase(jsonString: string): UnpackedCase {
  const pkg = JSON.parse(jsonString) as PackagedCase;

  let plan: SmilePlan;
  try {
    plan = parseSmilePlan(JSON.parse(pkg.case.planJson));
  } catch (e) {
    throw new Error(`Invalid plan data in .smilegen package: ${e instanceof Error ? e.message : String(e)}`);
  }

  let design: GeneratedSmileDesign | null = null;
  if (pkg.case.designJson) {
    try {
      design = parseGeneratedSmileDesign(JSON.parse(pkg.case.designJson)) as GeneratedSmileDesign;
    } catch (e) {
      console.error("Corrupted design data in .smilegen package, discarding:", e);
      design = null;
    }
  }

  return {
    title: pkg.case.title,
    workflowState: pkg.case.workflowState,
    plan,
    design,
    assets: pkg.assets,
  };
}

export function downloadPackagedCase(pkg: PackagedCase, filename: string): void {
  if (typeof document === "undefined") return;

  const json = JSON.stringify(pkg, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".smilegen") ? filename : `${filename}.smilegen`;
  link.click();
  URL.revokeObjectURL(url);
}
