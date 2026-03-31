/**
 * ============================================================================
 * MOVEMENT TYPES - DO NOT MODIFY
 * ============================================================================
 */
import * as THREE from "three";
import type { ParsedStlMesh } from "../../import/stlParser";
import type { GeneratedVariantDesign } from "../../engine/designEngine";

/**
 * Camera preset configuration
 */
export interface CameraPreset {
  label: string;
  icon: string;
  position: [number, number, number];
  up?: [number, number, number];
}

/**
 * Animation target for camera transitions
 */
export interface CameraAnimTarget {
  pos: THREE.Vector3;
  up: THREE.Vector3;
  lookAt?: THREE.Vector3;
}

/**
 * Parameters for computing visual centroid
 */
export interface VisualCentroidParams {
  bounds: ParsedStlMesh["bounds"] | null;
  teeth: GeneratedVariantDesign["teeth"] | undefined;
}

/**
 * Context value for visual centroid provider
 */
export interface VisualCentroidContextValue {
  centroid: THREE.Vector3;
  isReady: boolean;
}

/**
 * Props for AutoFrame component
 */
export interface AutoFrameProps {
  bounds: ParsedStlMesh["bounds"] | null;
  teeth: GeneratedVariantDesign["teeth"] | undefined;
  controlsRef: React.RefObject<any>;
  onComplete?: () => void;
}

/**
 * Props for CameraAnimator component
 */
export interface CameraAnimatorProps {
  targetPos: THREE.Vector3 | null;
  targetLookAt: THREE.Vector3;
  targetUp: THREE.Vector3;
  controlsRef: React.RefObject<any>;
  onComplete: () => void;
}

/**
 * Props for StlMeshView component
 */
export interface StlMeshViewProps {
  mesh: ParsedStlMesh;
  color?: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
}
