/**
 * ============================================================================
 * MOVEMENT MODULE - DO NOT MODIFY UNLESS EXPLICITLY ASKED
 * ============================================================================
 *
 * This module contains ALL camera controls, scene navigation, and 3D movement logic.
 * It is intentionally isolated to prevent accidental breaking changes.
 *
 * Current implementation: Visual centroid-based rotation system
 * - When scan only: rotation center is at origin (0,0,0) - the centered scan
 * - When teeth exist: rotation center is average of tooth positions
 * - Camera presets and reset are all relative to this visual centroid
 *
 * EXPORTED ITEMS:
 * - useCameraControls: Main hook for camera movement
 * - VisualCentroidProvider: Context provider for centroid state
 * - CameraAnimator: Component for smooth camera transitions
 * - AutoFrame: Component for initial camera framing
 * - StlMeshView: Component for displaying the scan mesh (centered at origin)
 * - Movement-related types and constants
 *
 * ============================================================================
 */

// Re-export everything from the consolidated movement module
export * from './useCameraControls';
export * from './CameraAnimator';
export * from './AutoFrame';
export * from './StlMeshView';
export * from './types';
export * from './constants';
