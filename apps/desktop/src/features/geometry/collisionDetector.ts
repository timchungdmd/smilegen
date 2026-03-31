import type { MeshBounds } from "../import/stlParser";

export interface CollisionResult {
  toothA: string;
  toothB: string;
  type: "overlap" | "gap" | "contact";
  distance: number;
}

export interface OBB {
  center: { x: number; y: number; z: number };
  axes: { x: { x: number; y: number }; y: { x: number; y: number } };
  halfExtents: { x: number; y: number; z: number };
}

interface ToothEntry {
  toothId: string;
  positionX: number;
  width: number;
  height: number;
  depth: number;
}

const CONTACT_THRESHOLD = 0.1;

export function intersectOBB(a: OBB, b: OBB): boolean {
  const distZ = Math.abs(a.center.z - b.center.z);
  const sumHalfZ = a.halfExtents.z + b.halfExtents.z;
  if (distZ > sumHalfZ) return false;

  const relP = { x: b.center.x - a.center.x, y: b.center.y - a.center.y };
  const axes = [a.axes.x, a.axes.y, b.axes.x, b.axes.y];

  for (const axis of axes) {
    const projA = a.halfExtents.x * Math.abs(axis.x * a.axes.x.x + axis.y * a.axes.x.y) +
      a.halfExtents.y * Math.abs(axis.x * a.axes.y.x + axis.y * a.axes.y.y);
    const projB = b.halfExtents.x * Math.abs(axis.x * b.axes.x.x + axis.y * b.axes.x.y) +
      b.halfExtents.y * Math.abs(axis.x * b.axes.y.x + axis.y * b.axes.y.y);
    const dist = Math.abs(relP.x * axis.x + relP.y * axis.y);

    if (dist > projA + projB) return false;
  }

  return true;
}

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
