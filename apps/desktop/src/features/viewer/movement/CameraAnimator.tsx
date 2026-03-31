/**
 * ============================================================================
 * CAMERA ANIMATOR COMPONENT - DO NOT MODIFY
 * ============================================================================
 *
 * Smoothly animates camera from current position to target position.
 * Also syncs TrackballControls target to prevent fighting.
 */
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CameraAnimatorProps } from "./types";
import { CAMERA_ANIM_SPEED } from "./constants";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * CameraAnimator - Animates camera to target position
 * 
 * Place this inside the <Canvas> component.
 */
export function CameraAnimator({
  targetPos,
  targetLookAt,
  targetUp,
  controlsRef,
  onComplete,
}: CameraAnimatorProps) {
  const { camera } = useThree();
  const animating = useRef(false);
  const progress = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const startUp = useRef(new THREE.Vector3());

  // Start animation when target changes
  useEffect(() => {
    if (targetPos) {
      startPos.current.copy(camera.position);
      startUp.current.copy(camera.up);
      progress.current = 0;
      animating.current = true;
      // Disable TrackballControls during animation so they don't fight
      if (controlsRef.current) controlsRef.current.enabled = false;
    }
  }, [targetPos, camera, controlsRef]);

  // Animation frame
  useFrame((_, delta) => {
    if (!animating.current || !targetPos) return;

    progress.current = Math.min(1, progress.current + delta * CAMERA_ANIM_SPEED);
    const t = easeInOutCubic(progress.current);

    camera.position.lerpVectors(startPos.current, targetPos, t);
    camera.up.lerpVectors(startUp.current, targetUp, t).normalize();
    camera.lookAt(targetLookAt);
    camera.updateProjectionMatrix();

    if (progress.current >= 1) {
      animating.current = false;
      // Sync TrackballControls to the new camera state so they don't snap back
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt);
        controlsRef.current.enabled = true;
        controlsRef.current.update();
      }
      onComplete();
    }
  });

  return null;
}
