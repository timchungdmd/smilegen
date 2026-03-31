/**
 * ============================================================================
 * MOVEMENT CONSTANTS - DO NOT MODIFY
 * ============================================================================
 */
import * as THREE from "three";
import type { CameraPreset } from "./types";

/**
 * Default camera presets - positioned relative to centroid
 */
export const CAMERA_PRESETS: CameraPreset[] = [
  { label: "Front", icon: "F", position: [0, 0, 40] },
  { label: "Back", icon: "B", position: [0, 0, -40] },
  { label: "Top", icon: "T", position: [0, 40, 0], up: [0, 0, -1] },
  { label: "Bottom", icon: "Bt", position: [0, -40, 0], up: [0, 0, 1] },
  { label: "Left", icon: "L", position: [-40, 0, 0] },
  { label: "Right", icon: "R", position: [40, 0, 0] },
  { label: "3/4 View", icon: "3/4", position: [25, 15, 30] },
];

/**
 * Default camera position when no mesh loaded
 */
export const DEFAULT_POSITION = new THREE.Vector3(0, 8, 30);

/**
 * Default camera target when no mesh loaded
 */
export const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

/**
 * Default camera up vector
 */
export const DEFAULT_UP = new THREE.Vector3(0, 1, 0);

/**
 * Camera animation speed (higher = faster)
 */
export const CAMERA_ANIM_SPEED = 3.5;

/**
 * Distance multiplier from mesh size
 */
export const CAMERA_DISTANCE_MULTIPLIER = 1.8;

/**
 * Height offset multiplier from mesh size
 */
export const CAMERA_HEIGHT_MULTIPLIER = 0.3;

/**
 * Preset scale multiplier
 */
export const PRESET_SCALE_MULTIPLIER = 0.04;

/**
 * Minimum camera distance
 */
export const MIN_CAMERA_DISTANCE = 3;

/**
 * Maximum camera distance
 */
export const MAX_CAMERA_DISTANCE = 200;

/**
 * Trackball controls settings
 */
export const TRACKBALL_CONTROLS_CONFIG = {
  rotateSpeed: 2.5,
  zoomSpeed: 1.2,
  panSpeed: 0.8,
  staticMoving: false,
  dynamicDampingFactor: 0.15,
  minDistance: MIN_CAMERA_DISTANCE,
  maxDistance: MAX_CAMERA_DISTANCE,
};
