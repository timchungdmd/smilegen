import type { MeshBounds } from "../import/stlParser";

export interface CollisionResult {
  toothA: string;
  toothB: string;
  type: "overlap" | "gap" | "contact";
  distance: number; // negative = overlap, positive = gap, ~0 = contact
}

interface ToothEntry {
  toothId: string;
  positionX: number;
  width: number;
  height: number;
  depth: number;
}

const CONTACT_THRESHOLD = 0.1; // mm

/**
 * Check collisions between all adjacent tooth pairs.
 * Uses AABB (axis-aligned bounding box) for fast detection.
 */
export function detectCollisions(
  teeth: ReadonlyArray<ToothEntry>
): CollisionResult[] {
  if (teeth.length < 2) {
    return [];
  }

  const sorted = [...teeth].sort((a, b) => a.positionX - b.positionX);
  const results: CollisionResult[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const boundsA = toothToBounds(current);
    const boundsB = toothToBounds(next);

    // Check X-axis overlap/gap between adjacent teeth
    const distance = boundsB.minX - boundsA.maxX;

    let type: CollisionResult["type"];
    if (distance < -CONTACT_THRESHOLD) {
      type = "overlap";
    } else if (Math.abs(distance) <= CONTACT_THRESHOLD) {
      type = "contact";
    } else {
      type = "gap";
    }

    results.push({
      toothA: current.toothId,
      toothB: next.toothId,
      type,
      distance: Number(distance.toFixed(3))
    });
  }

  return results;
}

function toothToBounds(tooth: ToothEntry): MeshBounds {
  const halfWidth = tooth.width / 2;
  const halfDepth = tooth.depth / 2;
  const halfHeight = tooth.height / 2;

  return {
    minX: tooth.positionX - halfWidth,
    maxX: tooth.positionX + halfWidth,
    minY: -halfDepth,
    maxY: halfDepth,
    minZ: -halfHeight,
    maxZ: halfHeight,
    width: tooth.width,
    depth: tooth.depth,
    height: tooth.height
  };
}
