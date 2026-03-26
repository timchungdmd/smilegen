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
  decayRate: number;
  decaySteps: number;
  minLearningRate: number;
  rotationRange: [number, number];
  translationRange: [number, number];
}

const DEFAULT_CONFIG: SolverConfig = {
  maxIterations: 30,
  convergenceThreshold: 0.01,
  learningRate: 0.01,
  scaleRange: [0.7, 1.3],
  decayRate: 0.9,
  decaySteps: 5,
  minLearningRate: 0.001,
  rotationRange: [-0.5, 0.5],
  translationRange: [-50, 50],
};

interface Gradients9DOF {
  dScale: number;
  dRotateX: number;
  dRotateY: number;
  dRotateZ: number;
  dTranslateX: number;
  dTranslateY: number;
  dTranslateZ: number;
  dCameraX: number;
  dCameraY: number;
  dCameraZ: number;
}

const EPSILONS = {
  scale: 0.001,
  rotate: 0.001,
  translate: 0.01,
  camera: 0.1,
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

  const scaleSeeds = [0.9, 1.0, 1.1];
  const rollSeeds = [-0.05, 0, 0.05];

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

  bestTransform = enforceBounds(bestTransform, cfg);

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

  const baseLearningRate = config.learningRate;

  for (let iter = 0; iter < config.maxIterations; iter++) {
    const decayFactor = Math.pow(config.decayRate, Math.floor(iter / config.decaySteps));
    const learningRate = Math.max(config.minLearningRate, baseLearningRate * decayFactor);

    const gradients = computeGradients(
      correspondences,
      transform,
      cameraPos,
      cameraTarget,
      params
    );

    transform.scale -= gradients.dScale * learningRate;
    transform.rotateX -= gradients.dRotateX * learningRate;
    transform.rotateY -= gradients.dRotateY * learningRate;
    transform.rotateZ -= gradients.dRotateZ * learningRate;
    transform.translateX -= gradients.dTranslateX * learningRate;
    transform.translateY -= gradients.dTranslateY * learningRate;
    transform.translateZ -= gradients.dTranslateZ * learningRate;
    cameraPos.x -= gradients.dCameraX * learningRate;
    cameraPos.y -= gradients.dCameraY * learningRate;
    cameraPos.z -= gradients.dCameraZ * learningRate;

    transform = enforceBounds(transform, config);

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

function gradientForParam(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  params: ProjectionParams,
  baseError: number,
  param: keyof AlignmentTransform3D,
  epsilon: number
): number {
  const modified = { ...transform, [param]: transform[param] + epsilon };
  return (
    (computeTotalError(correspondences, modified, cameraPos, cameraTarget, params) - baseError) /
    epsilon
  );
}

function computeGradients(
  correspondences: LandmarkCorrespondence[],
  transform: AlignmentTransform3D,
  cameraPos: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  params: ProjectionParams
): Gradients9DOF {
  const baseError = computeTotalError(
    correspondences,
    transform,
    cameraPos,
    cameraTarget,
    params
  );

  return {
    dScale: gradientForParam(
      correspondences,
      transform,
      cameraPos,
      cameraTarget,
      params,
      baseError,
      "scale",
      EPSILONS.scale
    ),
    dRotateX: gradientForParam(
      correspondences,
      transform,
      cameraPos,
      cameraTarget,
      params,
      baseError,
      "rotateX",
      EPSILONS.rotate
    ),
    dRotateY: gradientForParam(
      correspondences,
      transform,
      cameraPos,
      cameraTarget,
      params,
      baseError,
      "rotateY",
      EPSILONS.rotate
    ),
    dRotateZ: gradientForParam(
      correspondences,
      transform,
      cameraPos,
      cameraTarget,
      params,
      baseError,
      "rotateZ",
      EPSILONS.rotate
    ),
    dTranslateX: gradientForParam(
      correspondences,
      transform,
      cameraPos,
      cameraTarget,
      params,
      baseError,
      "translateX",
      EPSILONS.translate
    ),
    dTranslateY: gradientForParam(
      correspondences,
      transform,
      cameraPos,
      cameraTarget,
      params,
      baseError,
      "translateY",
      EPSILONS.translate
    ),
    dTranslateZ: gradientForParam(
      correspondences,
      transform,
      cameraPos,
      cameraTarget,
      params,
      baseError,
      "translateZ",
      EPSILONS.translate
    ),
    dCameraX:
      (computeTotalError(
        correspondences,
        transform,
        { ...cameraPos, x: cameraPos.x + EPSILONS.camera },
        cameraTarget,
        params
      ) -
        baseError) /
      EPSILONS.camera,
    dCameraY:
      (computeTotalError(
        correspondences,
        transform,
        { ...cameraPos, y: cameraPos.y + EPSILONS.camera },
        cameraTarget,
        params
      ) -
        baseError) /
      EPSILONS.camera,
    dCameraZ:
      (computeTotalError(
        correspondences,
        transform,
        { ...cameraPos, z: cameraPos.z + EPSILONS.camera },
        cameraTarget,
        params
      ) -
        baseError) /
      EPSILONS.camera,
  };
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

function enforceBounds(
  transform: AlignmentTransform3D,
  config: SolverConfig
): AlignmentTransform3D {
  return {
    scale: Math.max(config.scaleRange[0], Math.min(config.scaleRange[1], transform.scale)),
    rotateX: Math.max(
      config.rotationRange[0],
      Math.min(config.rotationRange[1], transform.rotateX)
    ),
    rotateY: Math.max(
      config.rotationRange[0],
      Math.min(config.rotationRange[1], transform.rotateY)
    ),
    rotateZ: Math.max(
      config.rotationRange[0],
      Math.min(config.rotationRange[1], transform.rotateZ)
    ),
    translateX: Math.max(
      config.translationRange[0],
      Math.min(config.translationRange[1], transform.translateX)
    ),
    translateY: Math.max(
      config.translationRange[0],
      Math.min(config.translationRange[1], transform.translateY)
    ),
    translateZ: Math.max(
      config.translationRange[0],
      Math.min(config.translationRange[1], transform.translateZ)
    ),
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
