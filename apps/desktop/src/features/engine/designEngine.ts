import type { SmilePlan, TreatmentType, ProportionMode } from "../smile-plan/smilePlanTypes";
import type { MeshTriangle, MeshVertex, ParsedStlMesh } from "../import/stlParser";
import type { ToothLibraryCollection } from "../library/toothLibraryTypes";
import type { VariantLabel } from "./engineTypes";
import { archDepthAtX, archTangentAngle, estimateArchFromScan } from "../alignment/archModel";
import { computeNormal } from "../geometry/meshUtils";
import { intersectOBB, type OBB } from "../geometry/collisionDetector";

interface ToothPrototype {
  width: number;
  height: number;
  depth: number;
  mesh?: ParsedStlMesh;
}

interface VariantTuning {
  widthFactor: number;
  heightFactor: number;
  facialFactor: number;
}

export interface GeneratedToothDesign {
  toothId: string;
  treatmentType: TreatmentType;
  width: number;
  height: number;
  depth: number;
  positionX: number;
  positionY: number;
  /** Z-depth along the arch curve (0 = front/closest, negative = further back) */
  positionZ: number;
  /** Rotation angle around Y-axis in radians — tooth faces outward along arch tangent */
  archAngle: number;
  facialVolume: number;
  trustState: "ready" | "needs_correction" | "blocked";
  previewTriangles: MeshTriangle[];
  sourceMesh?: ParsedStlMesh;
  isHighFidelity?: boolean;
}

export interface GeneratedVariantDesign {
  id: string;
  label: VariantLabel;
  widthTendency: string;
  lengthTendency: string;
  additiveIntensity: string;
  teeth: GeneratedToothDesign[];
}

export interface GeneratedSmileDesign {
  variants: GeneratedVariantDesign[];
}

export interface GeometryInputs {
  archScan?: ParsedStlMesh | null;
  toothLibrary?: Record<string, ParsedStlMesh>;
  /** Biometric tooth library collection — provides anatomically accurate base dimensions. */
  libraryCollection?: ToothLibraryCollection | null;
  /** User overrides for arch curve shape. Null values fall back to scan-derived or defaults. */
  archOverrides?: { archDepth?: number; archHalfWidth?: number } | null;
}

/**
 * Fallback dimensions used only when no biometric library collection is selected
 * and no uploaded tooth mesh is available.
 */
const FALLBACK_TOOTH_LIBRARY: Record<string, ToothPrototype> = {
  "4": { width: 7.2, height: 9.2, depth: 4.8 },
  "5": { width: 7.0, height: 9.6, depth: 5.0 },
  "6": { width: 7.6, height: 10.2, depth: 7.6 },
  "7": { width: 6.6, height: 9.2, depth: 6.0 },
  "8": { width: 8.6, height: 10.8, depth: 7.0 },
  "9": { width: 8.6, height: 10.8, depth: 7.0 },
  "10": { width: 6.6, height: 9.2, depth: 6.0 },
  "11": { width: 7.6, height: 10.2, depth: 7.6 },
  "12": { width: 7.0, height: 9.6, depth: 5.0 },
  "13": { width: 7.2, height: 9.2, depth: 4.8 }
};

const VARIANT_TUNING: Record<VariantLabel, VariantTuning> = {
  conservative: { widthFactor: 0.96, heightFactor: 0.97, facialFactor: 0.58 },
  balanced: { widthFactor: 1.0, heightFactor: 1.0, facialFactor: 0.74 },
  enhanced: { widthFactor: 1.06, heightFactor: 1.08, facialFactor: 0.92 }
};

const VARIANT_DESCRIPTORS: Record<
  VariantLabel,
  Pick<GeneratedVariantDesign, "widthTendency" | "lengthTendency" | "additiveIntensity">
> = {
  conservative: {
    widthTendency: "contained",
    lengthTendency: "minimal",
    additiveIntensity: "low"
  },
  balanced: {
    widthTendency: "harmonized",
    lengthTendency: "moderate",
    additiveIntensity: "medium"
  },
  enhanced: {
    widthTendency: "assertive",
    lengthTendency: "lifted",
    additiveIntensity: "high"
  }
};

const VARIANT_SEQUENCE: VariantLabel[] = ["conservative", "balanced", "enhanced"];

/**
 * Tooth category mapping (Universal Numbering System).
 * Used to apply golden ratio / percentage proportions.
 */
type ToothCategory = "central" | "lateral" | "canine" | "premolar1" | "premolar2";

const TOOTH_CATEGORY: Record<string, ToothCategory> = {
  "8": "central", "9": "central",
  "7": "lateral", "10": "lateral",
  "6": "canine", "11": "canine",
  "5": "premolar1", "12": "premolar1",
  "4": "premolar2", "13": "premolar2"
};

/**
 * Golden ratio width multipliers (relative to lateral = 1.0).
 * Central:Lateral:Canine = 1.618 : 1 : 0.618
 */
const GOLDEN_MULTIPLIERS: Record<ToothCategory, number> = {
  central: 1.618,
  lateral: 1.0,
  canine: 0.618,
  premolar1: 0.525,  // canine × 0.85
  premolar2: 0.464   // canine × 0.75
};

/**
 * Percentage of total visible smile width per tooth.
 * 2 × (23 + 15 + 12) = 100% for the 6 anterior teeth.
 * Premolars get proportional share of remaining space.
 */
const PERCENTAGE_SHARE: Record<ToothCategory, number> = {
  central: 0.23,
  lateral: 0.15,
  canine: 0.12,
  premolar1: 0.10,
  premolar2: 0.08
};

/**
 * Compute tooth widths using the chosen proportion rule.
 */
function computeProportionalWidths(
  toothIds: string[],
  prototypes: Map<string, ToothPrototype>,
  mode: ProportionMode,
  widthScale: number,
  widthFactor: number,
  archHalfWidth: number
): number[] {
  if (mode === "library") {
    return toothIds.map((id) => {
      const proto = prototypes.get(id)!;
      return proto.width * widthScale * widthFactor;
    });
  }

  if (mode === "golden") {
    // Use the central incisor prototype as reference for the lateral baseline
    const centralProto = prototypes.get("8") ?? prototypes.get("9");
    const centralWidth = centralProto
      ? centralProto.width * widthScale * widthFactor
      : 8.5 * widthScale * widthFactor;
    // Central = centralWidth, so lateral = central / 1.618
    const lateralRef = centralWidth / 1.618;

    return toothIds.map((id) => {
      const cat = TOOTH_CATEGORY[id] ?? "lateral";
      return lateralRef * GOLDEN_MULTIPLIERS[cat];
    });
  }

  // Percentage mode: each tooth gets a percentage of total smile width
  // Total smile width ≈ the sum of all teeth at natural proportions
  // We compute from archHalfWidth to get absolute mm values
  const totalSmileWidth = archHalfWidth * 2;
  return toothIds.map((id) => {
    const cat = TOOTH_CATEGORY[id] ?? "lateral";
    return totalSmileWidth * PERCENTAGE_SHARE[cat] * widthScale * widthFactor;
  });
}

export function generateSmileDesign(plan: SmilePlan, geometry: GeometryInputs = {}): GeneratedSmileDesign {
  return {
    variants: VARIANT_SEQUENCE.map((label) => 
      validateVariantCollisions(createVariantDesign(plan, label, geometry), geometry.archScan)
    )
  };
}

export function updateVariantToothDimensions(
  variant: GeneratedVariantDesign,
  toothId: string,
  updates: Partial<Pick<GeneratedToothDesign, "width" | "height" | "depth" | "facialVolume">>
): GeneratedVariantDesign {
  const teeth = variant.teeth.map((tooth) => {
    // Return unchanged teeth by reference — no rebuild needed
    if (tooth.toothId !== toothId) {
      return tooth;
    }

    return rebuildToothDesign(tooth, {
      width: updates.width ?? tooth.width,
      height: updates.height ?? tooth.height,
      depth: updates.depth ?? tooth.depth,
      facialVolume: updates.facialVolume ?? tooth.facialVolume,
      positionX: tooth.positionX,
      positionY: tooth.positionY
    });
  });

  return validateVariantCollisions({
    ...variant,
    teeth
  });
}

export function updateVariantToothPlacement(
  variant: GeneratedVariantDesign,
  toothId: string,
  offset: { deltaX?: number; deltaY?: number }
): GeneratedVariantDesign {
  const teeth = variant.teeth.map((tooth) => {
    if (tooth.toothId !== toothId) {
      return tooth;
    }

    return rebuildToothDesign(tooth, {
      width: tooth.width,
      height: tooth.height,
      depth: tooth.depth,
      facialVolume: tooth.facialVolume,
      positionX: tooth.positionX + (offset.deltaX ?? 0),
      positionY: tooth.positionY + (offset.deltaY ?? 0)
    });
  });

  return validateVariantCollisions({
    ...variant,
    teeth
  });
}

function createVariantDesign(
  plan: SmilePlan,
  label: VariantLabel,
  geometry: GeometryInputs
): GeneratedVariantDesign {
  const tuning = VARIANT_TUNING[label];
  const archScale = deriveArchScale(geometry.archScan);
  const autoArchParams = geometry.archScan
    ? estimateArchFromScan(geometry.archScan.bounds)
    : { archHalfWidth: 35, archDepth: 15 };
  const archParams = {
    archHalfWidth: geometry.archOverrides?.archHalfWidth ?? autoArchParams.archHalfWidth,
    archDepth: geometry.archOverrides?.archDepth ?? autoArchParams.archDepth
  };

  // Resolve prototypes for all selected teeth
  const prototypes = new Map<string, ToothPrototype>();
  for (const toothId of plan.selectedTeeth) {
    prototypes.set(toothId, resolveToothPrototype(toothId, geometry.toothLibrary, geometry.libraryCollection));
  }

  // Compute widths using the selected proportion mode
  const proportionMode = plan.controls.proportionMode ?? "golden";
  const positionedToothWidths = computeProportionalWidths(
    plan.selectedTeeth,
    prototypes,
    proportionMode,
    plan.controls.widthScale,
    tuning.widthFactor,
    archParams.archHalfWidth
  );

  const totalWidth = positionedToothWidths.reduce((sum, width) => sum + width, 0) * archScale;
  let cursor = -totalWidth / 2 + plan.controls.midline;

  const teeth = plan.selectedTeeth.map((toothId, index) => {
    const prototype = prototypes.get(toothId)!;
    const width = positionedToothWidths[index] * archScale;
    const height = prototype.height * plan.controls.lengthScale * tuning.heightFactor;
    const depth =
      prototype.depth + (plan.treatmentMap[toothId] === "crown" ? 0.8 : 0.25) + plan.controls.incisalCurve;
    const centerX = cursor + width / 2;
    cursor += width;

    const positionZ = archDepthAtX(centerX, archParams);
    const angle = archTangentAngle(centerX, archParams);

    return createToothDesign({
      toothId,
      treatmentType: plan.treatmentMap[toothId] ?? "veneer",
      width,
      height,
      depth,
      positionX: centerX,
      positionY: 0,
      positionZ,
      archAngle: angle,
      facialVolume: depth * tuning.facialFactor,
      additiveBias: plan.additiveBias,
      sourceMesh: prototype.mesh
    });
  });

  return {
    id: `variant-${label}`,
    label,
    ...VARIANT_DESCRIPTORS[label],
    teeth
  };
}

function resolveToothPrototype(
  toothId: string,
  toothLibrary?: Record<string, ParsedStlMesh>,
  libraryCollection?: ToothLibraryCollection | null
): ToothPrototype {
  // Priority 1: User-uploaded STL mesh for this specific tooth
  const uploaded = toothLibrary?.[toothId];
  if (uploaded) {
    return {
      width: uploaded.bounds.width,
      height: uploaded.bounds.height,
      depth: uploaded.bounds.depth,
      mesh: uploaded
    };
  }

  // Priority 2: Biometric library collection (real anatomical dimensions)
  const libraryEntry = libraryCollection?.entries[toothId];
  if (libraryEntry) {
    return {
      width: libraryEntry.dimensions.width,
      height: libraryEntry.dimensions.height,
      depth: libraryEntry.dimensions.depth
    };
  }

  // Priority 3: Fallback hardcoded dimensions
  return FALLBACK_TOOTH_LIBRARY[toothId] ?? FALLBACK_TOOTH_LIBRARY["8"];
}

function deriveArchScale(archScan?: ParsedStlMesh | null) {
  if (!archScan) {
    return 1;
  }

  const baselineArchWidth = 78;
  const rawScale = archScan.bounds.width / baselineArchWidth;
  return Math.min(1.2, Math.max(0.85, Number(rawScale.toFixed(3))));
}

function createToothDesign(input: {
  toothId: string;
  treatmentType: TreatmentType;
  width: number;
  height: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  archAngle: number;
  facialVolume: number;
  additiveBias: SmilePlan["additiveBias"];
  sourceMesh?: ParsedStlMesh;
}): GeneratedToothDesign {
  const meshResult = input.sourceMesh
    ? buildMeshBackedGeometry(input.sourceMesh, {
        width: input.width,
        height: input.height,
        depth: input.depth,
        positionX: input.positionX,
        positionY: input.positionY
      })
    : buildProceduralGeometry({
        toothId: input.toothId,
        positionX: input.positionX,
        positionY: input.positionY,
        width: input.width,
        height: input.height,
        depth: input.depth,
        facialVolume: input.facialVolume
      });
  const trustState = deriveTrustState(input.width, input.height, input.depth, input.treatmentType);

  return {
    toothId: input.toothId,
    treatmentType: input.treatmentType,
    width: round(input.width),
    height: round(input.height),
    depth: round(input.depth),
    positionX: round(input.positionX),
    positionY: round(input.positionY),
    positionZ: round(input.positionZ),
    archAngle: round(input.archAngle),
    facialVolume: round(input.facialVolume),
    trustState,
    previewTriangles: meshResult.triangles,
    sourceMesh: input.sourceMesh
  };
}

function rebuildToothDesign(
  tooth: GeneratedToothDesign,
  geometry: {
    width: number;
    height: number;
    depth: number;
    facialVolume: number;
    positionX: number;
    positionY: number;
    positionZ?: number;
    archAngle?: number;
  }
): GeneratedToothDesign {
  const meshResult = tooth.sourceMesh
    ? buildMeshBackedGeometry(tooth.sourceMesh, {
        width: geometry.width,
        height: geometry.height,
        depth: geometry.depth,
        positionX: geometry.positionX,
        positionY: geometry.positionY
      })
    : buildProceduralGeometry({
        toothId: tooth.toothId,
        positionX: geometry.positionX,
        positionY: geometry.positionY,
        width: geometry.width,
        height: geometry.height,
        depth: geometry.depth,
        facialVolume: geometry.facialVolume
      });
  const trustState = deriveTrustState(
    geometry.width,
    geometry.height,
    geometry.depth,
    tooth.treatmentType
  );

  return {
    ...tooth,
    width: round(geometry.width),
    height: round(geometry.height),
    depth: round(geometry.depth),
    positionX: round(geometry.positionX),
    positionY: round(geometry.positionY),
    positionZ: round(geometry.positionZ ?? tooth.positionZ),
    archAngle: round(geometry.archAngle ?? tooth.archAngle),
    facialVolume: round(geometry.facialVolume),
    trustState,
  previewTriangles: meshResult.triangles
  };
}

function computeToothOBB(tooth: GeneratedToothDesign): OBB {
  const angle = tooth.archAngle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    center: {
      x: tooth.positionX,
      y: tooth.positionZ,
      z: tooth.positionY + tooth.height / 2,
    },
    axes: {
      x: { x: cos, y: sin },
      y: { x: -sin, y: cos },
    },
    halfExtents: {
      x: tooth.width / 2,
      y: tooth.depth / 2,
      z: tooth.height / 2,
    },
  };
}

function deriveTrustState(
  width: number,
  height: number,
  depth: number,
  treatmentType: TreatmentType
): GeneratedToothDesign["trustState"] {
  if (depth > 7.4 || width > 10.5) {
    return "blocked";
  }

  if (treatmentType === "crown" && height > 12) {
    return "needs_correction";
  }

  if (depth > 6.6 || height > 11.6) {
    return "needs_correction";
  }

  return "ready";
}

function validateVariantCollisions(
  variant: GeneratedVariantDesign, 
  archScan?: ParsedStlMesh | null
): GeneratedVariantDesign {
  const obbs = variant.teeth.map(t => computeToothOBB(t));
  
  // Arch scan proximity proxy
  const archProxy = archScan ? estimateArchFromScan(archScan.bounds) : null;

  const updatedTeeth = variant.teeth.map((tooth, i) => {
    if (tooth.trustState === "blocked") return tooth;

    let trustState = tooth.trustState;
    
    // 1. Inter-tooth OBB check
    for (let j = 0; j < obbs.length; j++) {
      if (i === j) continue;
      if (intersectOBB(obbs[i], obbs[j])) {
        trustState = "needs_correction";
        break;
      }
    }

    // 2. Arch scan penetration check (sampling-based proxy)
    if (trustState === "ready" && archProxy) {
      const surfaceZ = archDepthAtX(tooth.positionX, archProxy);
      // If the tooth's Z (depth) is significantly deeper than the scan surface
      if (tooth.positionZ < surfaceZ - 1.5) {
        trustState = "needs_correction";
      }
    }

    return { ...tooth, trustState };
  });

  return { ...variant, teeth: updatedTeeth };
}

function createToothVertices(
  positionX: number,
  positionY: number,
  width: number,
  height: number,
  depth: number,
  facialVolume: number
): MeshVertex[] {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const taperedWidth = halfWidth * 0.82;
  const cervicalDepth = halfDepth * 0.76;
  const bulge = facialVolume * 0.14;

  return [
    { x: positionX - halfWidth, y: positionY - halfDepth - bulge, z: 0 },
    { x: positionX + halfWidth, y: positionY - halfDepth - bulge, z: 0 },
    { x: positionX + halfWidth, y: positionY + halfDepth, z: 0 },
    { x: positionX - halfWidth, y: positionY + halfDepth, z: 0 },
    { x: positionX - taperedWidth, y: positionY - cervicalDepth, z: height },
    { x: positionX + taperedWidth, y: positionY - cervicalDepth, z: height },
    { x: positionX + taperedWidth, y: positionY + cervicalDepth, z: height },
    { x: positionX - taperedWidth, y: positionY + cervicalDepth, z: height }
  ];
}

const TRIANGLES: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 3],
  [4, 6, 5],
  [4, 7, 6],
  [0, 4, 5],
  [0, 5, 1],
  [1, 5, 6],
  [1, 6, 2],
  [2, 6, 7],
  [2, 7, 3],
  [3, 7, 4],
  [3, 4, 0]
];

function buildMeshBackedGeometry(
  mesh: ParsedStlMesh,
  target: {
    width: number;
    height: number;
    depth: number;
    positionX: number;
    positionY: number;
  }
) {
  const transformedTriangles = mesh.triangles.map((triangle) =>
    transformTriangle(triangle, mesh.bounds, {
      widthScale: safeScale(target.width, mesh.bounds.width),
      depthScale: safeScale(target.depth, mesh.bounds.depth),
      heightScale: safeScale(target.height, mesh.bounds.height),
      positionX: target.positionX,
      positionY: target.positionY
    })
  );

  return {
    triangles: transformedTriangles
  };
}

function buildProceduralGeometry(input: {
  toothId: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  depth: number;
  facialVolume: number;
}) {
  const vertices = createToothVertices(
    input.positionX,
    input.positionY,
    input.width,
    input.height,
    input.depth,
    input.facialVolume
  );
  const triangles = TRIANGLES.map(([a, b, c]) => ({
    a: vertices[a],
    b: vertices[b],
    c: vertices[c]
  }));

  return {
    triangles
  };
}

import { synthesizeVeneer, synthesizeCrown } from "../../services/meshSynthesisClient";
export { synthesizeVeneer, synthesizeCrown };

import { parseStlArrayBuffer } from "../import/stlParser";

/**
 * Triggers an asynchronous high-fidelity synthesis pass for a design variant.
 * Offloads heavy mesh deformation to the meshSynthesisClient service.
 */
export async function synthesizeVariantDesign(
  variant: GeneratedVariantDesign,
  archScanStl: Blob
): Promise<GeneratedVariantDesign> {
  const synthesisPromises = variant.teeth.map(async (tooth) => {
    // Skip blocked teeth
    if (tooth.trustState === "blocked") return tooth;

    try {
      let highFidelityMesh: Blob;
      
      // We'd ideally pass the actual tooth source STL here. 
      // For this demo, we use a generic placeholder blob.
      const sourceStl = new Blob(["solid tooth\nendsolid tooth"]);

      if (tooth.treatmentType === "crown") {
        highFidelityMesh = await synthesizeCrown(
          sourceStl,
          archScanStl,
          { x: tooth.positionX, y: tooth.positionY, z: tooth.positionZ },
          tooth.width / 2
        );
      } else {
        highFidelityMesh = await synthesizeVeneer(
          sourceStl,
          archScanStl
        );
      }

      // Parse high-fidelity STL back into triangles for the viewport
      const arrayBuffer = await highFidelityMesh.arrayBuffer();
      const parsed = parseStlArrayBuffer(arrayBuffer, `${tooth.toothId}_hi_fi`);

      return { 
        ...tooth, 
        isHighFidelity: true,
        previewTriangles: parsed.triangles 
      };
    } catch (e) {
      console.error(`Synthesis failed for tooth ${tooth.toothId}:`, e);
      return tooth;
    }
  });

  const updatedTeeth = await Promise.all(synthesisPromises);
  return { ...variant, teeth: updatedTeeth };
}

export function createTriangleStl(name: string, triangles: MeshTriangle[]) {
  const lines = [`solid ${name}`];

  for (const triangle of triangles) {
    const normal = computeNormal(triangle.a, triangle.b, triangle.c);
    lines.push(`  facet normal ${normal.x} ${normal.y} ${normal.z}`);
    lines.push("    outer loop");
    lines.push(`      vertex ${formatVertex(triangle.a)}`);
    lines.push(`      vertex ${formatVertex(triangle.b)}`);
    lines.push(`      vertex ${formatVertex(triangle.c)}`);
    lines.push("    endloop");
    lines.push("  endfacet");
  }

  lines.push(`endsolid ${name}`);
  return lines.join("\n");
}

function transformTriangle(
  triangle: MeshTriangle,
  bounds: ParsedStlMesh["bounds"],
  transform: {
    widthScale: number;
    depthScale: number;
    heightScale: number;
    positionX: number;
    positionY: number;
  }
): MeshTriangle {
  return {
    a: transformVertex(triangle.a, bounds, transform),
    b: transformVertex(triangle.b, bounds, transform),
    c: transformVertex(triangle.c, bounds, transform)
  };
}

function transformVertex(
  vertex: MeshVertex,
  bounds: ParsedStlMesh["bounds"],
  transform: {
    widthScale: number;
    depthScale: number;
    heightScale: number;
    positionX: number;
    positionY: number;
  }
): MeshVertex {
  const meshCenterX = (bounds.minX + bounds.maxX) / 2;
  const meshCenterY = (bounds.minY + bounds.maxY) / 2;

  return {
    x: (vertex.x - meshCenterX) * transform.widthScale + transform.positionX,
    y: (vertex.y - meshCenterY) * transform.depthScale + transform.positionY,
    z: (vertex.z - bounds.minZ) * transform.heightScale
  };
}

function formatVertex(vertex: MeshVertex) {
  return `${round(vertex.x)} ${round(vertex.y)} ${round(vertex.z)}`;
}


function round(value: number) {
  return Number(value.toFixed(3));
}

function safeScale(target: number, source: number) {
  return source === 0 ? 1 : target / source;
}
