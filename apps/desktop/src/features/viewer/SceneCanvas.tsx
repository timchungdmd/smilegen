import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid, Environment, Line } from "@react-three/drei";
import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import * as THREE from "three";
import type { ParsedStlMesh } from "../import/stlParser";
import type { GeneratedVariantDesign } from "../engine/designEngine";
import { detectCollisions } from "../geometry/collisionDetector";
import { useDesignStore } from "../../store/useDesignStore";

interface SceneCanvasProps {
  archScanMesh?: ParsedStlMesh | null;
  activeVariant?: GeneratedVariantDesign | null;
  selectedToothId?: string | null;
  onSelectTooth?: (toothId: string) => void;
}

// ─── Preset camera views ──────────────────────────────────────────────

interface CameraPreset {
  label: string;
  icon: string;
  position: [number, number, number];
  up?: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { label: "Front", icon: "F", position: [0, 0, 40] },
  { label: "Back", icon: "B", position: [0, 0, -40] },
  { label: "Top", icon: "T", position: [0, 40, 0], up: [0, 0, -1] },
  { label: "Bottom", icon: "Bt", position: [0, -40, 0], up: [0, 0, 1] },
  { label: "Left", icon: "L", position: [-40, 0, 0] },
  { label: "Right", icon: "R", position: [40, 0, 0] },
  { label: "3/4 View", icon: "3/4", position: [25, 15, 30] },
];

const DEFAULT_POSITION = new THREE.Vector3(0, 8, 30);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

// ─── Animated camera controller ──────────────────────────────────────

function CameraAnimator({
  targetPos,
  targetLookAt,
  targetUp,
  onComplete
}: {
  targetPos: THREE.Vector3 | null;
  targetLookAt: THREE.Vector3;
  targetUp: THREE.Vector3;
  onComplete: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const animating = useRef(false);
  const progress = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const startUp = useRef(new THREE.Vector3());

  useEffect(() => {
    if (targetPos) {
      startPos.current.copy(camera.position);
      startUp.current.copy(camera.up);
      progress.current = 0;
      animating.current = true;
    }
  }, [targetPos, camera]);

  useFrame((_, delta) => {
    if (!animating.current || !targetPos) return;

    progress.current = Math.min(1, progress.current + delta * 3.5);
    const t = easeInOutCubic(progress.current);

    camera.position.lerpVectors(startPos.current, targetPos, t);
    camera.up.lerpVectors(startUp.current, targetUp, t).normalize();
    camera.lookAt(targetLookAt);
    camera.updateProjectionMatrix();

    if (progress.current >= 1) {
      animating.current = false;
      onComplete();
    }
  });

  return null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Auto-framing ────────────────────────────────────────────────────

function AutoFrame({ bounds }: { bounds: ParsedStlMesh["bounds"] | null }) {
  const { camera } = useThree();
  const hasFramed = useRef(false);

  useEffect(() => {
    if (!bounds || hasFramed.current) return;
    hasFramed.current = true;

    const size = Math.max(bounds.width, bounds.depth, bounds.height);
    const dist = size * 1.8;
    camera.position.set(0, size * 0.3, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [bounds, camera]);

  // Reset flag when bounds change (new mesh loaded)
  useEffect(() => {
    hasFramed.current = false;
  }, [bounds?.width, bounds?.depth, bounds?.height]);

  return null;
}

// ─── Mesh components ─────────────────────────────────────────────────

function StlMeshView({
  mesh,
  color = "#e8ddd0",
  opacity = 1,
  metalness = 0.1,
  roughness = 0.6
}: {
  mesh: ParsedStlMesh;
  color?: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertexCount = mesh.triangles.length * 3;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);

    for (let i = 0; i < mesh.triangles.length; i++) {
      const tri = mesh.triangles[i];
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
  }, [mesh.triangles]);

  // Dispose GPU memory when geometry is replaced or component unmounts
  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  const center = useMemo(() => {
    return new THREE.Vector3(
      (mesh.bounds.minX + mesh.bounds.maxX) / 2,
      (mesh.bounds.minY + mesh.bounds.maxY) / 2,
      (mesh.bounds.minZ + mesh.bounds.maxZ) / 2
    );
  }, [mesh.bounds]);

  return (
    <mesh geometry={geometry} position={[-center.x, -center.y, -center.z]}>
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        transparent={opacity < 1}
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ToothMesh({
  tooth,
  selected,
  hasCollision,
  onSelect
}: {
  tooth: GeneratedVariantDesign["teeth"][number];
  selected: boolean;
  hasCollision: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const posZ = (tooth as any).positionZ ?? 0;
  const archAngle = (tooth as any).archAngle ?? 0;

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

  // Dispose GPU memory when geometry is replaced or component unmounts
  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  const useRealMesh = tooth.previewTriangles && tooth.previewTriangles.length > 0;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={useRealMesh ? [0, 0, 0] : [tooth.positionX, tooth.positionY, posZ]}
      rotation={useRealMesh ? [0, 0, 0] : [0, archAngle, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (meshRef.current) {
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <meshStandardMaterial
        color={hasCollision ? "#ef476f" : selected ? "#00b4d8" : "#f0e8d8"}
        emissive={hasCollision ? "#4d0015" : selected ? "#003d4d" : "#000000"}
        metalness={0.05}
        roughness={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ArchCurveWireframe({ archHalfWidth = 35, archDepth = 15 }: { archHalfWidth?: number; archDepth?: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 - 1;
      const x = t * archHalfWidth;
      const tNorm = Math.min(1, Math.abs(t));
      const z = -archDepth * tNorm * tNorm;
      pts.push([x, 0, z]);
    }
    return pts;
  }, [archHalfWidth, archDepth]);

  return <Line points={points} color="#00b4d8" lineWidth={1.5} opacity={0.4} transparent />;
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#b8d4e8" />
      <directionalLight position={[0, -2, 5]} intensity={0.15} color="#ffe0c0" />
    </>
  );
}

// ─── Axis indicator (bottom-left orientation gizmo) ──────────────────

function AxisIndicator() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    // Mirror camera rotation onto the indicator
    groupRef.current.quaternion.copy(camera.quaternion).invert();
  });

  const axisLen = 0.7;

  return (
    <group ref={groupRef}>
      {/* X - Red */}
      <Line points={[[0, 0, 0], [axisLen, 0, 0]]} color="#ef476f" lineWidth={2} />
      {/* Y - Green */}
      <Line points={[[0, 0, 0], [0, axisLen, 0]]} color="#06d6a0" lineWidth={2} />
      {/* Z - Blue */}
      <Line points={[[0, 0, 0], [0, 0, axisLen]]} color="#58a6ff" lineWidth={2} />
    </group>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function SceneCanvas({ archScanMesh, activeVariant, selectedToothId, onSelectTooth }: SceneCanvasProps) {
  const hasContent = Boolean(archScanMesh) || Boolean(activeVariant?.teeth.length);
  const archDepthOverride = useDesignStore((s) => s.archDepthOverride);
  const archHalfWidthOverride = useDesignStore((s) => s.archHalfWidthOverride);

  const [animTarget, setAnimTarget] = useState<{
    pos: THREE.Vector3;
    up: THREE.Vector3;
  } | null>(null);

  const collisions = useMemo(() => {
    if (!activeVariant) return [];
    return detectCollisions(activeVariant.teeth.map((t) => ({
      toothId: t.toothId,
      positionX: t.positionX,
      width: t.width,
      height: t.height,
      depth: t.depth,
    })));
  }, [activeVariant]);

  const collisionToothIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of collisions) {
      if (c.type === "overlap") {
        ids.add(c.toothA);
        ids.add(c.toothB);
      }
    }
    return ids;
  }, [collisions]);

  const overlapCount = useMemo(() => {
    return collisions.filter((c) => c.type === "overlap").length;
  }, [collisions]);

  const goToPreset = useCallback((preset: CameraPreset) => {
    const scale = archScanMesh ? Math.max(archScanMesh.bounds.width, archScanMesh.bounds.depth, archScanMesh.bounds.height) * 0.04 : 1;
    setAnimTarget({
      pos: new THREE.Vector3(...preset.position).multiplyScalar(scale),
      up: new THREE.Vector3(...(preset.up ?? [0, 1, 0]))
    });
  }, [archScanMesh]);

  const resetView = useCallback(() => {
    if (archScanMesh) {
      const size = Math.max(archScanMesh.bounds.width, archScanMesh.bounds.depth, archScanMesh.bounds.height);
      setAnimTarget({
        pos: new THREE.Vector3(0, size * 0.3, size * 1.8),
        up: new THREE.Vector3(0, 1, 0)
      });
    } else {
      setAnimTarget({
        pos: DEFAULT_POSITION.clone(),
        up: new THREE.Vector3(0, 1, 0)
      });
    }
  }, [archScanMesh]);

  return (
    <div className="viewer-container" style={{ flex: 1 }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 8, 30]} fov={45} />
        <SceneLighting />

        <AutoFrame bounds={archScanMesh?.bounds ?? null} />

        <CameraAnimator
          targetPos={animTarget?.pos ?? null}
          targetLookAt={DEFAULT_TARGET}
          targetUp={animTarget?.up ?? new THREE.Vector3(0, 1, 0)}
          onComplete={() => setAnimTarget(null)}
        />

        {archScanMesh && (
          <StlMeshView
            mesh={archScanMesh}
            color="#d4b8a0"
            opacity={activeVariant ? 0.35 : 0.9}
            metalness={0.02}
            roughness={0.8}
          />
        )}

        {activeVariant?.teeth.map((tooth) => (
          <ToothMesh
            key={tooth.toothId}
            tooth={tooth}
            selected={tooth.toothId === selectedToothId}
            hasCollision={collisionToothIds.has(tooth.toothId)}
            onSelect={() => onSelectTooth?.(tooth.toothId)}
          />
        ))}

        {activeVariant && (
          <ArchCurveWireframe
            archHalfWidth={archHalfWidthOverride ?? (archScanMesh ? Math.max(20, Math.min(50, archScanMesh.bounds.width / 2)) : 35)}
            archDepth={archDepthOverride ?? (archScanMesh ? Math.max(8, Math.min(25, (archScanMesh.bounds.maxY - archScanMesh.bounds.minY) * 0.5)) : 15)}
          />
        )}

        {!hasContent && (
          <Grid
            args={[40, 40]}
            position={[0, -0.01, 0]}
            cellSize={1}
            cellColor="#1a2332"
            sectionSize={5}
            sectionColor="#243044"
            fadeDistance={50}
            infiniteGrid
          />
        )}

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.8}
          panSpeed={0.8}
          zoomSpeed={1.2}
          minDistance={3}
          maxDistance={200}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          target={[0, 0, 0]}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
          }}
        />
        <Environment preset="studio" />
      </Canvas>

      {/* View preset buttons */}
      <div className="viewer-toolbar">
        <button className="btn-icon" title="Reset View" onClick={resetView}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
        </button>
      </div>

      {/* Camera presets - right side vertical strip */}
      <div className="viewer-presets">
        {CAMERA_PRESETS.map((preset) => (
          <button
            key={preset.label}
            className="viewer-preset-btn"
            title={preset.label}
            onClick={() => goToPreset(preset)}
          >
            {preset.icon}
          </button>
        ))}
      </div>

      {/* Axis indicator */}
      <div className="viewer-axis-indicator">
        <Canvas orthographic camera={{ zoom: 40, position: [0, 0, 5] }} style={{ background: "transparent" }}>
          <AxisIndicator />
        </Canvas>
      </div>

      {/* Info bar */}
      <div className="viewer-info">
        {archScanMesh && (
          <span>
            {archScanMesh.name} &middot; {archScanMesh.triangles.length.toLocaleString()} tris
          </span>
        )}
        {overlapCount > 0 && (
          <span style={{ color: "var(--danger)", marginLeft: 8 }}>
            {overlapCount} collision{overlapCount !== 1 ? "s" : ""}
          </span>
        )}
        {!hasContent && (
          <span style={{ color: "var(--text-muted)" }}>
            Import a 3D scan to begin
          </span>
        )}
      </div>

      {/* Controls hint */}
      <div className="viewer-controls-hint">
        <span>LMB: Rotate</span>
        <span>RMB: Pan</span>
        <span>Scroll: Zoom</span>
      </div>
    </div>
  );
}
