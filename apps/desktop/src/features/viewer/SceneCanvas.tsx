import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { TrackballControls, PerspectiveCamera, Grid, Environment, Line, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import * as THREE from "three";
import type { ParsedStlMesh } from "../import/stlParser";
import type { GeneratedVariantDesign } from "../engine/designEngine";
import { detectCollisions } from "../geometry/collisionDetector";
import { useDesignStore } from "../../store/useDesignStore";
import { useImportStore } from "../../store/useImportStore";
import { createToothMaterial } from "./materials/toothMaterial";
import { DentalLighting } from "./DentalLighting";
import { GimbalTooth } from "./GimbalTooth";
import { useViewportStore, type ScanReferencePoints } from "../../store/useViewportStore";
import { resolvePhotoAlignedView } from "../alignment/photoAlignment";

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
  controlsRef,
  onComplete,
}: {
  targetPos: THREE.Vector3 | null;
  targetLookAt: THREE.Vector3;
  targetUp: THREE.Vector3;
  controlsRef: React.RefObject<any>;
  onComplete: () => void;
}) {
  const { camera } = useThree();
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
      // Disable TrackballControls during animation so they don't fight
      if (controlsRef.current) controlsRef.current.enabled = false;
    }
  }, [targetPos, camera, controlsRef]);

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
  onSelect,
  suppressPosition = false,
}: {
  tooth: GeneratedVariantDesign["teeth"][number];
  selected: boolean;
  hasCollision: boolean;
  onSelect: () => void;
  /** When true, renders at local origin [0,0,0] — parent GimbalTooth group handles positioning. */
  suppressPosition?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () => createToothMaterial({ shade: (tooth as any).shadeId as "A1" | "A2" | "A3" | "B1" | "B2" }),
    [(tooth as any).shadeId]
  );
  useEffect(() => () => { material.dispose(); }, [material]);

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
      position={suppressPosition || useRealMesh ? [0, 0, 0] : [tooth.positionX, tooth.positionY, posZ]}
      rotation={suppressPosition || useRealMesh ? [0, 0, 0] : [0, archAngle, 0]}
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
      {/* PBR enamel material; override color for selection/collision states */}
      <primitive
        object={material}
        attach="material"
        color={hasCollision ? "#ef476f" : selected ? "#00b4d8" : undefined}
        emissive={hasCollision ? "#4d0015" : selected ? "#003d4d" : "#000000"}
      />
    </mesh>
  );
}

// ─── Scene background controller ─────────────────────────────────────

/**
 * Controls the Three.js scene background.
 * When transparent=true the scene bg is cleared to null so the CSS photo
 * image behind the canvas shows through.  Otherwise a solid dark colour fills
 * the canvas exactly as before.
 */
function SceneBackground({ transparent }: { transparent: boolean }) {
  const { scene, gl } = useThree();
  useEffect(() => {
    if (transparent) {
      scene.background = null;
      gl.setClearAlpha(0);
    } else {
      scene.background = new THREE.Color("#141921");
      gl.setClearAlpha(1);
    }
    return () => {
      scene.background = new THREE.Color("#141921");
      gl.setClearAlpha(1);
    };
  }, [transparent, scene, gl]);
  return null;
}

// ─── Canvas aspect ratio reporter ────────────────────────────────────

/** Reports the canvas pixel aspect ratio to parent so it can compute aligned camera. */
function AspectReporter({ onAspect }: { onAspect: (aspect: number) => void }) {
  const { size } = useThree();
  useEffect(() => {
    if (size.height > 0) onAspect(size.width / size.height);
  }, [size.width, size.height, onAspect]);
  return null;
}

// ─── Photo-aligned camera snapper (runs inside Canvas) ────────────
/**
 * Directly sets the camera to the photo-aligned position when photo mode
 * is active.  Runs inside the <Canvas> so it has access to useThree().
 * Unlike the animation-based approach, this handles:
 *   - Syncing TrackballControls target so they don't fight
 *   - Re-triggering when photoAspect becomes available (race condition fix)
 *   - Disabling AutoFrame when photo mode is on
 */
function PhotoAligner({
  active,
  refs,
  scanBounds,
  photoAspect,
  controlsRef,
}: {
  active: boolean;
  refs: ScanReferencePoints | null;
  scanBounds: ParsedStlMesh["bounds"] | null;
  photoAspect: number;
  controlsRef: React.RefObject<any>;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!active || !refs || !scanBounds) {
      if ("clearViewOffset" in camera) {
        camera.clearViewOffset();
        camera.updateProjectionMatrix();
      }
      return;
    }

    let cancelled = false;

    const applyAlignment = async () => {
      const canvasAspect = size.width / size.height;
      const result = await resolvePhotoAlignedView(refs, scanBounds, canvasAspect, 45, photoAspect);
      if (cancelled) {
        return;
      }

      if (!result) {
        if ("clearViewOffset" in camera) {
          camera.clearViewOffset();
          camera.updateProjectionMatrix();
        }
        return;
      }

      const dist = result.position.distanceTo(result.target);
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }

      // Directly set camera — no animation for alignment (instant snap)
      camera.position.copy(result.position);
      camera.up.copy(result.up);
      camera.lookAt(result.target);
      camera.setViewOffset(
        size.width,
        size.height,
        (-result.principalPointNdc.x * size.width) / 2,
        (result.principalPointNdc.y * size.height) / 2,
        size.width,
        size.height
      );
      camera.updateProjectionMatrix();

      if (controlsRef.current) {
        controlsRef.current.target.copy(result.target);
        controlsRef.current.maxDistance = Math.max(200, dist * 2);
        controlsRef.current.update();
        controlsRef.current.enabled = true;
      }
    };

    void applyAlignment();

    return () => {
      cancelled = true;
    };
  }, [active, refs, scanBounds, photoAspect, camera, size, controlsRef]);

  return null;
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

// SceneLighting replaced by DentalLighting — see DentalLighting.tsx

// ─── Visibility gate — prevents multiple WebGL contexts ─────────────
/**
 * Returns true only when the container element is actually painted
 * (i.e. not hidden via display:none by the Workspace keep-alive pattern).
 * This avoids creating a WebGL context for every mounted-but-hidden view,
 * which leads to "Context Lost" errors when the GPU runs out of contexts.
 */
function useIsVisible(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

// ─── Main component ──────────────────────────────────────────────────

export function SceneCanvas({ archScanMesh, activeVariant, selectedToothId, onSelectTooth }: SceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef);
  const hasContent = Boolean(archScanMesh) || Boolean(activeVariant?.teeth.length);
  const archDepthOverride = useDesignStore((s) => s.archDepthOverride);
  const archHalfWidthOverride = useDesignStore((s) => s.archHalfWidthOverride);
  const moveTooth = useDesignStore((s) => s.moveTooth);
  const gimbalMode = useViewportStore((s) => s.gimbalMode);

  // Photo-in-3D overlay state
  const showPhotoIn3D = useViewportStore((s) => s.showPhotoIn3D);
  const overlayOpacity = useViewportStore((s) => s.overlayOpacity);
  const scanReferencePoints = useViewportStore((s) => s.scanReferencePoints);

  // Ref to the TrackballControls so we can sync target after camera animation
  const controlsRef = useRef<any>(null);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const photoUrl = uploadedPhotos[0]?.url ?? null;

  // Canvas aspect ratio (updated by AspectReporter inside the Canvas)
  const [canvasAspect, setCanvasAspect] = useState(1.5);

  // Photo background aspect ratio (set via onLoad on the background <img>).
  // Needed to correct the letterbox/pillarbox NDC mapping in computePhotoAlignedCamera.
  const [photoBgAspect, setPhotoBgAspect] = useState<number | null>(null);

  // Reset the cached aspect when the photo changes
  useEffect(() => {
    setPhotoBgAspect(null);
  }, [photoUrl]);

  const [animTarget, setAnimTarget] = useState<{
    pos: THREE.Vector3;
    up: THREE.Vector3;
    lookAt?: THREE.Vector3;
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

  /** Snap camera to the perspective-aligned photo view using stored reference points. */
  const goToPhotoView = useCallback(async () => {
    if (!scanReferencePoints?.centralR || !scanReferencePoints?.centralL || !archScanMesh) return;
    // Use measured photo aspect if available; fall back to canvas aspect (no letterbox correction)
    const effectivePhotoAspect = photoBgAspect ?? canvasAspect;
    const result = await resolvePhotoAlignedView(
      scanReferencePoints,
      archScanMesh.bounds,
      canvasAspect,
      45,
      effectivePhotoAspect
    );
    if (result) {
      setAnimTarget({
        pos: result.position,
        up: result.up,
        lookAt: result.target,
      });
    }
  }, [scanReferencePoints, archScanMesh, canvasAspect, photoBgAspect]);

  // Photo alignment is now handled by the <PhotoAligner> component inside the
  // Canvas, which has direct access to useThree() and the controls ref.
  // It triggers when showPhotoIn3D becomes true and also when photoBgAspect
  // becomes available (fixing the race condition).

  return (
    <div ref={containerRef} className="viewer-container" tabIndex={0} style={{ flex: 1, position: "relative" }}>

      {/* Gate: only create the WebGL canvas when this container is painted.
          The Workspace keep-alive pattern hides inactive views with display:none;
          without this gate every mounted view allocates a WebGL context, quickly
          exhausting the browser's limit and triggering "Context Lost" errors. */}
      {!isVisible ? (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          <span>3D viewer paused</span>
        </div>
      ) : (
      <>

      {/* ── Photo background ────────────────────────────────────────────────────
          Patient photo is rendered as a CSS img BEHIND the transparent WebGL
          canvas so it fills the viewport as a fixed reference background.
          The 3D scan is then overlaid on top via the transparent canvas.        */}
      {showPhotoIn3D && photoUrl && (
        <img
          src={photoUrl}
          alt=""
          aria-hidden="true"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalHeight > 0) {
              setPhotoBgAspect(img.naturalWidth / img.naturalHeight);
            }
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
            opacity: overlayOpacity,
            pointerEvents: "none",
            userSelect: "none",
            background: "#000",
            zIndex: 0,
          }}
        />
      )}

      <Canvas shadows={{ type: THREE.PCFShadowMap }} gl={{ alpha: true }} style={{ position: "relative", zIndex: 1 }}>
        {/* Controls scene transparency vs. solid dark background */}
        <SceneBackground transparent={showPhotoIn3D} />
        <AspectReporter onAspect={setCanvasAspect} />

        <PerspectiveCamera makeDefault position={[0, 8, 30]} fov={45} />
        <DentalLighting />

        <AutoFrame bounds={archScanMesh?.bounds ?? null} />

        <CameraAnimator
          targetPos={animTarget?.pos ?? null}
          targetLookAt={animTarget?.lookAt ?? DEFAULT_TARGET}
          targetUp={animTarget?.up ?? new THREE.Vector3(0, 1, 0)}
          controlsRef={controlsRef}
          onComplete={() => setAnimTarget(null)}
        />

        {/* Snap camera to photo-aligned perspective when photo overlay is on */}
        <PhotoAligner
          active={showPhotoIn3D}
          refs={scanReferencePoints}
          scanBounds={archScanMesh?.bounds ?? null}
          photoAspect={photoBgAspect ?? canvasAspect}
          controlsRef={controlsRef}
        />

        {archScanMesh && (
          <StlMeshView
            mesh={archScanMesh}
            color="#5c7480"
            opacity={activeVariant ? 0.35 : 0.9}
            metalness={0.18}
            roughness={0.65}
          />
        )}

        {activeVariant?.teeth.map((tooth) => (
          <GimbalTooth
            key={tooth.toothId}
            tooth={tooth}
            isSelected={tooth.toothId === selectedToothId}
            gimbalMode={gimbalMode}
            onTransformEnd={(id, dx, dy) =>
              moveTooth(id, { deltaX: dx, deltaY: dy })
            }
          >
            <ToothMesh
              tooth={tooth}
              selected={tooth.toothId === selectedToothId}
              hasCollision={collisionToothIds.has(tooth.toothId)}
              onSelect={() => onSelectTooth?.(tooth.toothId)}
              suppressPosition
            />
          </GimbalTooth>
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

        <TrackballControls
          ref={controlsRef}
          rotateSpeed={2.5}
          zoomSpeed={1.2}
          panSpeed={0.8}
          staticMoving={false}
          dynamicDampingFactor={0.15}
          minDistance={3}
          maxDistance={200}
          noPan={false}
          noZoom={false}
          noRotate={false}
        />
        <Environment files="/studio_small_03_1k.hdr" />

        {/* Interactive orientation gizmo — bottom-right corner of the canvas */}
        <GizmoHelper alignment="bottom-right" margin={[76, 76]}>
          <GizmoViewport
            axisColors={["#ef476f", "#06d6a0", "#58a6ff"]}
            labelColor="white"
            hideNegativeAxes
          />
        </GizmoHelper>
      </Canvas>

      {/* View preset buttons */}
      <div className="viewer-toolbar">
        <button className="btn-icon" title="Reset View" onClick={resetView}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
        </button>
        {/* Photo-aligned view — only available when reference points exist */}
        {scanReferencePoints && archScanMesh && (
          <button
            className="btn-icon"
            title="Align to Photo"
            onClick={goToPhotoView}
            style={{ color: showPhotoIn3D ? "var(--accent)" : undefined }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM11 7l-5 6.5 3.5-1.5L12 15l2.5-3 3.5 4.5z"/>
            </svg>
          </button>
        )}
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
        <span>LMB: Trackball</span>
        <span>RMB: Pan</span>
        <span>Scroll: Zoom</span>
      </div>

      </>
      )}
    </div>
  );
}
