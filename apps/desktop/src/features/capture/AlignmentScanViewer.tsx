// apps/desktop/src/features/capture/AlignmentScanViewer.tsx
/**
 * AlignmentScanViewer — minimal 3D scan viewer for the alignment wizard.
 *
 * Shows the arch scan STL mesh with OrbitControls.
 * When isPicking is true, clicking the mesh fires onPickPoint with the
 * 3D intersection point in model-space mm coordinates.
 * Placed reference markers are rendered as small colored spheres.
 */

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import * as THREE from "three";
import type { ParsedStlMesh } from "../import/stlParser";

export interface ScanPickPoint {
  x: number;
  y: number;
  z: number;
}

export interface ScanMarker {
  id: string;
  color: string;
  position: ScanPickPoint;
}

interface AlignmentScanViewerProps {
  archScanMesh: ParsedStlMesh;
  markers: ScanMarker[];
  onPickPoint: (point: ScanPickPoint) => void;
  isPicking: boolean;
  /** When true, OrbitControls are active and clicks do NOT place points */
  isNavigating?: boolean;
}

// ── Converts ParsedStlMesh triangles to a THREE.BufferGeometry ─────────────
// Same pattern as SceneCanvas/StlMeshView.
function buildGeometry(mesh: ParsedStlMesh): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const vertexCount = mesh.triangles.length * 3;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);

  for (let i = 0; i < mesh.triangles.length; i++) {
    const tri = mesh.triangles[i];
    const verts = [tri.a, tri.b, tri.c];
    const edge1 = new THREE.Vector3(
      tri.b.x - tri.a.x,
      tri.b.y - tri.a.y,
      tri.b.z - tri.a.z
    );
    const edge2 = new THREE.Vector3(
      tri.c.x - tri.a.x,
      tri.c.y - tri.a.y,
      tri.c.z - tri.a.z
    );
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

// ── Scan mesh + marker spheres ─────────────────────────────────────────────

function ScanScene({
  archScanMesh,
  markers,
  onPickPoint,
  isPicking,
  isNavigating = false,
}: AlignmentScanViewerProps) {
  const geometry = useMemo(() => buildGeometry(archScanMesh), [archScanMesh]);

  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  useEffect(() => {
    return () => {
      // Reset cursor on unmount (in case pointer was over mesh when modal closed)
      document.body.style.cursor = "default";
    };
  }, []);

  // Clicking picks a point only when in pick mode (not navigate mode)
  const activePicking = isPicking && !isNavigating;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!activePicking) return;
    e.stopPropagation();
    onPickPoint({ x: e.point.x, y: e.point.y, z: e.point.z });
  };

  // Auto-frame on mesh change
  const { center, size } = useMemo(() => {
    const b = archScanMesh.bounds;
    return {
      center: new THREE.Vector3(
        (b.minX + b.maxX) / 2,
        (b.minY + b.maxY) / 2,
        (b.minZ + b.maxZ) / 2
      ),
      size: Math.max(b.width, b.depth, b.height),
    };
  }, [archScanMesh.bounds]);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[
          center.x,
          center.y + size * 0.3,
          center.z + size * 1.8,
        ]}
      />
      {/* Disable orbit while in pick mode so clicks don't accidentally rotate */}
      <OrbitControls
        target={[center.x, center.y, center.z]}
        enabled={!isPicking || isNavigating}
        enableDamping={false}
      />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />

      {/* Arch scan mesh */}
      <mesh
        geometry={geometry}
        onPointerDown={handlePointerDown}
        onPointerOver={() => {
          document.body.style.cursor = activePicking ? "crosshair" : "grab";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <meshStandardMaterial
          color="#e8ddd0"
          roughness={0.6}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Reference point markers */}
      {markers.map((m) => (
        <mesh
          key={m.id}
          position={[m.position.x, m.position.y, m.position.z]}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial
            color={m.color}
            emissive={m.color}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </>
  );
}

// ── Exported component ────────────────────────────────────────────────────

export function AlignmentScanViewer(props: AlignmentScanViewerProps) {
  const activePicking = props.isPicking && !props.isNavigating;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#111827",
      }}
    >
      <Canvas>
        <ScanScene {...props} />
      </Canvas>
      {activePicking && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: 11,
            padding: "4px 12px",
            borderRadius: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          Click the tooth tip on the scan
        </div>
      )}
    </div>
  );
}
