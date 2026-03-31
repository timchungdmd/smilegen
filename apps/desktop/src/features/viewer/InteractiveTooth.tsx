import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useCursor, Html } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { createToothMaterial } from "./materials/toothMaterial";
import type { GeneratedVariantDesign } from "../engine/designEngine";
import { useDesignStore } from "../../store/useDesignStore";

interface InteractiveToothProps {
  tooth: GeneratedVariantDesign["teeth"][number];
  selected: boolean;
  hasCollision: boolean;
  onSelect: () => void;
  suppressPosition?: boolean;
}

export function InteractiveTooth({ 
  tooth, 
  selected, 
  hasCollision, 
  onSelect, 
  suppressPosition = false 
}: InteractiveToothProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hoveredZone, setHoveredZone] = useState<"incisal" | "facial" | "gingival" | "body" | null>(null);

  // Material memory management
  const material = useMemo(
    () => createToothMaterial({ shade: (tooth as any).shadeId as "A1" | "A2" | "A3" | "B1" | "B2" || "A1" }),
    [(tooth as any).shadeId]
  );
  useEffect(() => () => { material.dispose(); }, [material]);

  const posZ = (tooth as any).positionZ ?? 0;
  const archAngle = (tooth as any).archAngle ?? 0;

  // Geometry computation
  const geometry = useMemo(() => {
    if (tooth.previewTriangles && tooth.previewTriangles.length > 0) {
      const geo = new THREE.BufferGeometry();
      const vertexCount = tooth.previewTriangles.length * 3;
      const positions = new Float32Array(vertexCount * 3);
      const normals = new Float32Array(vertexCount * 3);

      for (let i = 0; i < tooth.previewTriangles.length; i++) {
        const tri = tooth.previewTriangles[i];
        const verts = [tri.a, tri.b, tri.c];

        const edge1 = new THREE.Vector3(tri.b.x - tri.a.x, tri.b.y - tri.a.y, tri.b.z - tri.a.z);
        const edge2 = new THREE.Vector3(tri.c.x - tri.a.x, tri.c.y - tri.a.y, tri.c.z - tri.a.z);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

        for (let j = 0; j < 3; j++) {
          const idx = (i * 3 + j) * 3;
          positions[idx] = verts[j].x;
          positions[idx + 1] = verts[j].y;
          positions[idx + 2] = verts[j].z;
          normals[idx] = normal.x;
          normals[idx + 1] = normal.y;
          normals[idx + 2] = normal.z;
        }
      }

      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      geo.computeBoundingBox();
      return geo;
    }

    // Fallback cube logic from original ToothMesh
    const w = tooth.width / 2;
    const h = tooth.height / 2;
    const d = tooth.depth / 2;
    const shape = new THREE.Shape();
    const r = Math.min(w, h) * 0.25;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);

    const settings = { depth: d * 2, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.1, bevelSegments: 3 };
    return new THREE.ExtrudeGeometry(shape, settings);
  }, [tooth.width, tooth.height, tooth.depth, tooth.previewTriangles]);

  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  // Raycast Zone Resolution Logic
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!selected) return;
    
    // We compute local bounding box intersection
    if (geometry.boundingBox && meshRef.current) {
        // Convert intersection point to local coordinates
        const localPoint = meshRef.current.worldToLocal(e.point.clone());
        const { min, max } = geometry.boundingBox;
        
        const heightThreshold = (max.y - min.y) * 0.2;
        const widthThreshold = (max.x - min.x) * 0.2;

        if (localPoint.y < min.y + heightThreshold) {
            setHoveredZone("incisal");
        } else if (localPoint.y > max.y - heightThreshold) {
            setHoveredZone("gingival");
        } else if (localPoint.x > max.x - widthThreshold || localPoint.x < min.x + widthThreshold) {
            setHoveredZone("facial");
        } else {
            setHoveredZone("body");
        }
    }
  };

  // Bind Cursors contextually
  useCursor(hoveredZone === "incisal", 'ns-resize', 'auto');
  useCursor(hoveredZone === "facial", 'ew-resize', 'auto');
  useCursor(hoveredZone === "body", 'grab', 'auto');
  useCursor(!selected, 'pointer', 'auto');

  // Drag interaction state
  const isDragging = useRef(false);
  const dragStartPos = useRef<{ x: number, y: number } | null>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect();
    
    if (selected && hoveredZone) {
      isDragging.current = true;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      // we attach window events to track outside the canvas
      window.addEventListener('pointermove', handleWindowPointerMove);
      window.addEventListener('pointerup', handleWindowPointerUp);
    }
  };

  const handleWindowPointerMove = (e: PointerEvent) => {
    if (!isDragging.current || !dragStartPos.current) return;
    
    const deltaY = e.clientY - dragStartPos.current.y;
    const deltaX = e.clientX - dragStartPos.current.x;
    
    const store = useDesignStore.getState();
    const scaleFactor = 0.08;
    
    if (hoveredZone === "body") {
       store.moveTooth(tooth.toothId, { deltaX: deltaX * scaleFactor, deltaY: -deltaY * scaleFactor });
    } else if (hoveredZone === "incisal" || hoveredZone === "gingival") {
       store.adjustTooth(tooth.toothId, { height: tooth.height - deltaY * scaleFactor });
    } else if (hoveredZone === "facial") {
       store.adjustTooth(tooth.toothId, { width: tooth.width + deltaX * scaleFactor });
    }
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleWindowPointerUp = () => {
    isDragging.current = false;
    dragStartPos.current = null;
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
  };

  const useRealMesh = tooth.previewTriangles && tooth.previewTriangles.length > 0;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={suppressPosition || useRealMesh ? [0, 0, 0] : [tooth.positionX, tooth.positionY, posZ]}
      rotation={suppressPosition || useRealMesh ? [0, 0, 0] : [0, archAngle, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerOut={() => {
        setHoveredZone(null);
      }}
    >
      <primitive
        object={material}
        attach="material"
        color={hasCollision ? "#ef476f" : selected ? (hoveredZone ? "#00e6ff" : "#00b4d8") : undefined}
        emissive={hasCollision ? "#4d0015" : selected ? (hoveredZone ? "#005566" : "#003d4d") : "#000000"}
      />
      {selected && !isDragging.current && (
        <Html position={[0, tooth.height / 2 + 1.5, 0]} center zIndexRange={[100, 0]}>
          <div style={{
            background: "rgba(15, 20, 25, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(0, 180, 216, 0.3)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            borderRadius: 6,
            padding: "6px 10px",
            color: "var(--text-primary)",
            fontSize: 10,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            transform: "translate3d(0, 0, 0)", // Hardware accel
            display: "flex",
            flexDirection: "column",
            gap: 2,
            textAlign: "center"
          }}>
            <div style={{ fontWeight: 700, color: "var(--accent)" }}>#{tooth.toothId}</div>
            <div style={{ fontSize: 9, color: "var(--text-secondary)" }}>
              {tooth.width.toFixed(1)} &times; {tooth.height.toFixed(1)}
            </div>
            <div style={{ fontSize: 9, color: "var(--text-secondary)" }}>
              Ratio: {Math.round((tooth.width / tooth.height) * 100)}%
            </div>
          </div>
        </Html>
      )}
    </mesh>
  );
}
