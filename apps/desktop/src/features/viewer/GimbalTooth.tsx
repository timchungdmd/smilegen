// apps/desktop/src/features/viewer/GimbalTooth.tsx
import { useRef, useEffect } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import type { GeneratedToothDesign } from "../engine/designEngine";

interface Props {
  tooth: GeneratedToothDesign;
  isSelected: boolean;
  gimbalMode: "translate" | "rotate" | "scale";
  onTransformEnd: (toothId: string, deltaX: number, deltaY: number) => void;
  children: React.ReactNode;
}

/**
 * Wraps a tooth mesh with a Three.js TransformControls gimbal when selected.
 * When not selected, renders children in a positioned group (no overhead).
 *
 * Positioning is handled here — children should render at local origin [0,0,0].
 */
export function GimbalTooth({
  tooth,
  isSelected,
  gimbalMode,
  onTransformEnd,
  children,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);

  // Store initial world position so we can compute the delta on mouseUp
  const initialPos = useRef(
    new THREE.Vector3(tooth.positionX, tooth.positionY, tooth.positionZ)
  );

  // Keep initialPos in sync when tooth data updates (e.g. after moveTooth)
  useEffect(() => {
    initialPos.current.set(tooth.positionX, tooth.positionY, tooth.positionZ);
  }, [tooth.positionX, tooth.positionY, tooth.positionZ]);

  useEffect(() => {
    if (!transformRef.current) return;
    const controls = transformRef.current;

    const handleMouseUp = () => {
      if (!groupRef.current) return;
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);
      onTransformEnd(
        tooth.toothId,
        worldPos.x - initialPos.current.x,
        worldPos.y - initialPos.current.y
      );
    };

    controls.addEventListener("mouseUp", handleMouseUp);
    return () => {
      controls.removeEventListener("mouseUp", handleMouseUp);
    };
  }, [tooth.toothId, onTransformEnd]);

  if (!isSelected) {
    return (
      <group
        position={[tooth.positionX, tooth.positionY, tooth.positionZ]}
        rotation={[0, tooth.archAngle, 0]}
      >
        {children}
      </group>
    );
  }

  return (
    <TransformControls
      ref={transformRef}
      mode={gimbalMode}
      size={0.6}
      showX
      showY
      showZ
    >
      <group
        ref={groupRef}
        position={[tooth.positionX, tooth.positionY, tooth.positionZ]}
        rotation={[0, tooth.archAngle, 0]}
      >
        {children}
      </group>
    </TransformControls>
  );
}
