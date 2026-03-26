import * as THREE from "three";
import type { ProjectionParams } from "./alignmentTypes";

export function createProjectionMatrix(params: ProjectionParams): number[] {
  const { fov, imageWidth, imageHeight, principalPoint } = params;
  const aspect = imageWidth / imageHeight;
  const near = 0.1;
  const far = 10000;

  const matrix = new THREE.Matrix4();
  matrix.makePerspective(-aspect / 2, aspect / 2, 0.5, -0.5, near, far);

  const fovScale = 1 / Math.tan((fov * Math.PI) / 360);
  const proj = new Float32Array(16);
  proj[0] = fovScale;
  proj[5] = fovScale * aspect;
  proj[10] = -(far + near) / (far - near);
  proj[11] = -1;
  proj[14] = -(2 * far * near) / (far - near);

  return Array.from(proj);
}

export function project3Dto2D(
  point: { x: number; y: number; z: number },
  cameraPosition: { x: number; y: number; z: number },
  cameraTarget: { x: number; y: number; z: number },
  cameraUp: { x: number; y: number; z: number },
  params: ProjectionParams
): { x: number; y: number; depth: number } {
  const camera = new THREE.PerspectiveCamera(
    params.fov,
    params.imageWidth / params.imageHeight,
    0.1,
    10000
  );
  camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
  camera.lookAt(new THREE.Vector3(cameraTarget.x, cameraTarget.y, cameraTarget.z));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const vector = new THREE.Vector3(point.x, point.y, point.z);
  vector.project(camera);

  const ndcX = (vector.x + 1) / 2;
  const ndcY = (1 - vector.y) / 2;

  const ppOffsetX = (params.principalPoint.x - 0.5) * 2;
  const ppOffsetY = (params.principalPoint.y - 0.5) * 2;

  return {
    x: Math.max(0, Math.min(1, ndcX + ppOffsetX * 0.1)),
    y: Math.max(0, Math.min(1, ndcY + ppOffsetY * 0.1)),
    depth: vector.z,
  };
}

export function applyTransform(
  point: { x: number; y: number; z: number },
  transform: {
    scale: number;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    translateX: number;
    translateY: number;
    translateZ: number;
  }
): { x: number; y: number; z: number } {
  const vector = new THREE.Vector3(point.x, point.y, point.z);

  const matrix = new THREE.Matrix4();
  matrix.makeScale(transform.scale, transform.scale, transform.scale);

  const rotMatrix = new THREE.Matrix4();
  const euler = new THREE.Euler(
    transform.rotateX,
    transform.rotateY,
    transform.rotateZ,
    "XYZ"
  );
  rotMatrix.makeRotationFromEuler(euler);
  matrix.multiply(rotMatrix);

  matrix.setPosition(
    transform.translateX,
    transform.translateY,
    transform.translateZ
  );

  vector.applyMatrix4(matrix);

  return { x: vector.x, y: vector.y, z: vector.z };
}
