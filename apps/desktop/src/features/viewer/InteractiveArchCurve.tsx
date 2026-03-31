import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useCursor, Line, Sphere } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { useDesignStore } from "../../store/useDesignStore";

interface InteractiveArchCurveProps {
  archHalfWidth: number;
  archDepth: number;
  posY?: number;
}

export function InteractiveArchCurve({ archHalfWidth, archDepth, posY = -4 }: InteractiveArchCurveProps) {
  const store = useDesignStore();
  const setArchHalfWidth = useDesignStore((s) => s.setArchHalfWidthOverride);
  const setArchDepth = useDesignStore((s) => s.setArchDepthOverride);

  // Hover states for handles
  const [hoverCenter, setHoverCenter] = useState(false);
  const [hoverLeft, setHoverLeft] = useState(false);
  const [hoverRight, setHoverRight] = useState(false);

  useCursor(hoverCenter, 'ns-resize', 'auto');
  useCursor(hoverLeft || hoverRight, 'ew-resize', 'auto');

  // Curve points
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 - 1;
      const x = t * archHalfWidth;
      const tNorm = Math.min(1, Math.abs(t));
      const z = -archDepth * tNorm * tNorm;
      pts.push([x, posY, z]);
    }
    return pts;
  }, [archHalfWidth, archDepth, posY]);

  // Handle Drag logic
  const isDragging = useRef<"center" | "left" | "right" | null>(null);
  const dragStart = useRef<{ y: number, x: number } | null>(null);
  const initialValue = useRef<number>(0);

  const handlePointerDown = (type: "center" | "left" | "right", e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isDragging.current = type;
    dragStart.current = { y: e.clientY, x: e.clientX };
    initialValue.current = type === "center" ? archDepth : archHalfWidth;
    
    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
  };

  const handleWindowMove = (e: PointerEvent) => {
    if (!isDragging.current || !dragStart.current) return;

    if (isDragging.current === "center") {
       const deltaY = e.clientY - dragStart.current.y;
       // pulling down increases depth, pulling up decreases depth (negative Z)
       const newDepth = Math.max(5, Math.min(40, initialValue.current - deltaY * 0.1));
       setArchDepth(newDepth);
    } else {
       const deltaX = e.clientX - dragStart.current.x;
       // if pulling right handle, going right increases width. If left handle, going right decreases width.
       const sign = isDragging.current === "right" ? 1 : -1;
       const newWidth = Math.max(15, Math.min(60, initialValue.current + deltaX * sign * 0.1));
       setArchHalfWidth(newWidth);
    }
  };

  const handleWindowUp = () => {
    isDragging.current = null;
    dragStart.current = null;
    window.removeEventListener('pointermove', handleWindowMove);
    window.removeEventListener('pointerup', handleWindowUp);
  };

  return (
    <group>
      <Line points={points} color="#00e6ff" lineWidth={2} opacity={0.6} transparent />
      
      {/* Center Handle (Depth Control) */}
      <Sphere 
        args={[0.8, 16, 16]} 
        position={[0, posY, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHoverCenter(true); }}
        onPointerOut={() => setHoverCenter(false)}
        onPointerDown={(e) => handlePointerDown("center", e)}
      >
        <meshBasicMaterial color={hoverCenter ? "#fff" : "#00b4d8"} />
      </Sphere>

      {/* Right Handle (Width Control) */}
      <Sphere 
        args={[0.8, 16, 16]} 
        position={[archHalfWidth, posY, -archDepth]}
        onPointerOver={(e) => { e.stopPropagation(); setHoverRight(true); }}
        onPointerOut={() => setHoverRight(false)}
        onPointerDown={(e) => handlePointerDown("right", e)}
      >
        <meshBasicMaterial color={hoverRight ? "#fff" : "#00b4d8"} />
      </Sphere>

      {/* Left Handle (Width Control) */}
      <Sphere 
        args={[0.8, 16, 16]} 
        position={[-archHalfWidth, posY, -archDepth]}
        onPointerOver={(e) => { e.stopPropagation(); setHoverLeft(true); }}
        onPointerOut={() => setHoverLeft(false)}
        onPointerDown={(e) => handlePointerDown("left", e)}
      >
        <meshBasicMaterial color={hoverLeft ? "#fff" : "#00b4d8"} />
      </Sphere>
    </group>
  );
}
