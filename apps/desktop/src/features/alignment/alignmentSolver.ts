import type {
  LandmarkCorrespondence,
  ProjectionParams,
  AlignmentResult,
  AlignmentTransform3D,
} from "./alignmentTypes";
import { project3Dto2D, applyTransform } from "./projection";

interface SolverConfig {
  maxIterations: number;
  convergenceThreshold: number;
  learningRate: number;
  scaleRange: [number, number];
}

const DEFAULT_CONFIG: SolverConfig = {
  maxIterations: 100,
  convergenceThreshold: 0.001,
  learningRate: 0.01,
  scaleRange: [0.7, 1.3],
};

export function solveAlignment(
  correspondences: LandmarkCorrespondence[],
  projectionParams: ProjectionParams,
  config: Partial<SolverConfig> = {}
): AlignmentResult {
  if (correspondences.length < 3) {
    throw new Error("Minimum 3 correspondences required for alignment");
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };

  const centroid = computeCentroid(correspondences);
  const initialDistance = estimateInitialCameraDistance(
    correspondences,
    projectionParams
  );
  const initialCameraPos = {
    x: centroid.x,
    y: centroid.y,
    z: -initialDistance,
  };

  let bestTransform: AlignmentTransform3D = {
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
  };
  let bestError = Infinity;
  let bestCameraPos = initialCameraPos;

  const scaleSeeds = [0.8, 0.9, 1.0, 1.1, 1.2];
  const rollSeeds = [-0.1, -0.05, 0, 0.05, 0.1];

  for (const scaleSeed of scaleSeeds) {
    for (const rollSeed of rollSeeds) {
      const result = refineAlignment(
        correspondences,
        projectionParams,
        {
          scale: scaleSeed,
          rotateX: 0,
          rotateY: 0,
          rotateZ: rollSeed,
          translateX: 0,
          translateY: 0,
          translateZ: 0,
        },
        initialCameraPos,
        centroid,
        cfg
      );

      if (result.error < bestError) {
        bestError = result.error;
        bestTransform = result.transform;
        bestCameraPos = result.cameraPos;
      }
    }
  }

  bestTransform = enforceScaleBounds(bestTransform, cfg.scaleRange);

  const landmarkErrors = computeLandmarkErrors(
    correspondences,
    bestTransform,
    bestCameraPos,
    centroid,
    projectionParams
  );

  const quality = assessQuality(bestError);

  return {
    transform: bestTransform,
    cameraPosition: bestCameraPos,
    cameraTarget: centroid,
    meanErrorPx: bestError,
    landmarkErrors,
    quality,
  };
}

function computeCentroid(
  correspondences: LandmarkCorrespondence[]
): { x: number; y: number; z: number } {
  let sumX = 0,
    sumY = 0,
    sumZ = 0;
  for (const c of correspondences) {
    sumX += c.modelPoint.x;
    sumY += c.modelPoint.y;
    sumZ += c.modelPoint.z;
  }
  return {
    x: sumX / correspondences.length,
    y: sumY / correspondences.length,
    z: sumZ / correspondences.length,
  };
}

function estimateInitialCameraDistance(
  correspondences: LandmarkCorrespondence[],
  params: ProjectionParams
): number {
  let maxModelSpread = 0;
  let maxPhotoSpread = 0;

  for (let i = 0; i < correspondences.length; i++) {
    for (let j = i + 1; j < correspondences.length; j++) {
      const c1 = correspondences[i];
      const c2 = correspondences[j];

      const modelDx = c1.modelPoint.x - c2.modelPoint.x;
      const modelDy = c1.modelPoint.y - c2.modelPoint.y;
      const modelSpread = Math.sqrt(modelDx * modelDx + modelDy * modelDy);
      maxModelSpread = Math.max(maxModelSpread, modelSpread);

      const photoDx = c1.photoPoint.x - c2.photoPoint.x;
      const photoDy = c1.photoPoint.y - c2.photoPoint.y;
      const photoSpread = Math.sqrt(photoDx * photoDx + photoDy * photoDy);
      maxPhotoSpread = Math.max(maxPhotoSpread, photoSpread);
    }
  }

  const fovRad = (params.fov * Math.PI) / 180;
  const aspect = params.imageWidth / params.imageHeight;

  if (maxPhotoSpread > 0 && maxModelSpread > 0) {
    const halfFovTan = Math.tan(fovRad / 2);
    const distance = maxModelSpread / (2 * maxPhotoSpread * aspect * halfFovTan);
    return Math.max(50, Math.min(500, distance));
  }

  return (maxModelSpread * 2) / Math.tan(fovRad / 2);
}

function refineAlignment(
  correspondences: LandmarkCorrespondence[],
  params: ProjectionParams,
  initialTransform: AlignmentTransform3D,
  initialCameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  config: SolverConfig
): {
  transform: AlignmentTransform3D;
  cameraPos: { x: number; y: number; z: number };
  error: number;
} {
  let transform = { ...initialTransform };
  let cameraPos = { ...initialCameraPos };
  let prevError = computeTotalError(
    correspondences,
    transform,
    cameraPos,
    cameraTarget,
    params
  );

  for (let iter = 0; iter < config.maxIterations; iter++) {
    const gradients = computeGradients(
      correspondences,
      transform,
      cameraPos,
      cameraTarget,
      params
    );

    transform.scale -= gradients.dScale * config.learningRate;
    transform.rotateZ -= gradients.dRoll * config.learningRate;
    transform.translateX -= gradients.dTx * config.learningRate;
    transform.translateY -= gradients.dTy * config.learningRate;
    cameraPos.z -= gradients.dDist * config.learningRate;

    const error = computeTotalError(correspondences, transform, cameraPos, cameraTarget, params);

    if (Math.abs(prevError - error) < config.convergenceThreshold) {
      break;
    }
    prevError = error;
  }

  return { transform, cameraPos, error: prevError };
}

function computeTotalError(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  params: ProjectionParams
): number {
  let totalError = 0;
  let totalWeight = 0;

  for (const c of correspondences) {
    const transformed = applyTransform(c.modelPoint, transform);
    const projected = project3Dto2D(
      transformed,
      cameraPos,
      cameraTarget,
      { x: 0, y: 1, z: 0 },
      params
    );

    const dx = (projected.x - c.photoPoint.x) * params.imageWidth;
    const dy = (projected.y - c.photoPoint.y) * params.imageHeight;
    const error = Math.sqrt(dx * dx + dy * dy);

    totalError += error * error * c.weight;
    totalWeight += c.weight;
  }

  return Math.sqrt(totalError / totalWeight);
}

function computeGradients(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  params: ProjectionParams,
  epsilon = 0.001
): {
  dScale: number;
  dRoll: number;
  dTx: number;
  dTy: number;
  dDist: number;
} {
  const baseError = computeTotalError(
    correspondences,
    transform,
    cameraPos,
    cameraTarget,
    params
  );

  const dScale =
    (computeTotalError(
      correspondences,
      { ...transform, scale: transform.scale + epsilon },
      cameraPos,
      cameraTarget,
      params
    ) -
      baseError) /
    epsilon;

  const dRoll =
    (computeTotalError(
      correspondences,
      { ...transform, rotateZ: transform.rotateZ + epsilon },
      cameraPos,
      cameraTarget,
      params
    ) -
      baseError) /
    epsilon;

  const dTx =
    (computeTotalError(
      correspondences,
      { ...transform, translateX: transform.translateX + epsilon },
      cameraPos,
      cameraTarget,
      params
    ) -
      baseError) /
    epsilon;

  const dTy =
    (computeTotalError(
      correspondences,
      { ...transform, translateY: transform.translateY + epsilon },
      cameraPos,
      cameraTarget,
      params
    ) -
      baseError) /
    epsilon;

  const dDist =
    (computeTotalError(
      correspondences,
      transform,
      { ...cameraPos, z: cameraPos.z + epsilon },
      cameraTarget,
      params
    ) -
      baseError) /
    epsilon;

  return { dScale, dRoll, dTx, dTy, dDist };
}

function computeLandmarkErrors(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  params: ProjectionParams
): Map<string, number> {
  const errors = new Map<string, number>();

  for (const c of correspondences) {
    const transformed = applyTransform(c.modelPoint, transform);
    const projected = project3Dto2D(
      transformed,
      cameraPos,
      cameraTarget,
      { x: 0, y: 1, z: 0 },
      params
    );

    const dx = (projected.x - c.photoPoint.x) * params.imageWidth;
    const dy = (projected.y - c.photoPoint.y) * params.imageHeight;
    errors.set(c.id, Math.sqrt(dx * dx + dy * dy));
  }

  return errors;
}

function enforceScaleBounds(
  transform: AlignmentTransform3D,
  bounds: [number, number]
): AlignmentTransform3D {
  return {
    ...transform,
    scale: Math.max(bounds[0], Math.min(bounds[1], transform.scale)),
  };
}

function assessQuality(
  meanErrorPx: number
): "excellent" | "good" | "acceptable" | "poor" {
  if (meanErrorPx < 3) return "excellent";
  if (meanErrorPx < 8) return "good";
  if (meanErrorPx < 15) return "acceptable";
  return "poor";
}
