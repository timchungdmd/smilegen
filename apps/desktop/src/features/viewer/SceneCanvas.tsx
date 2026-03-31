import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { TrackballControls, PerspectiveCamera, Grid, Environment, Line, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import * as THREE from "three";
import type { ParsedStlMesh } from "../import/stlParser";
import type { GeneratedVariantDesign } from "../engine/designEngine";
import { detectCollisions } from "../geometry/collisionDetector";
import { useDesignStore } from "../../store/useDesignStore";
import { useImportStore } from "../../store/useImportStore";
import { useCanvasStore } from "../../store/useCanvasStore";
import { DentalLighting } from "./DentalLighting";
import { InteractiveTooth } from "./InteractiveTooth";
import { InteractiveArchCurve } from "./InteractiveArchCurve";
import { useViewportStore } from "../../store/useViewportStore";
import { useAlignmentStore, useAlignmentStore as useAlignmentStoreRaw, type AlignmentLandmarkId } from "../../store/useAlignmentStore";
import type { AlignmentTransform3D } from "../alignment/alignmentTypes";
import { resolveLandmarkAlignmentView } from "../alignment/photoAlignment";
import { getScanLandmarkVisualState } from "./landmarkVisuals";
import { getScanRenderStyle } from "./scanRenderStyle";
import {
  getImportedScanNoticeLabel,
  shouldShowImportedScanNotice,
} from "./importedScanNotice";
import { getImportedScanSignature } from "./importedScanSignature";
import { shouldRenderImportedPhotoOverlay } from "./viewerContent";
import { PhotoOverlay } from "../overlay/PhotoOverlay";
import { shouldEnablePhotoOverlayPointerEvents } from "../overlay/photoOverlayInteractionMode";
import { ErrorBoundary } from "../layout/ErrorBoundary";

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

// ─── Utility: Compute visual centroid from scan bounds and teeth ─────────
// IMPORTANT: The scan mesh is centered at origin by StlMeshView, so scan
// contributes position (0,0,0) to the centroid calculation, not its original bounds center.
function getVisualCentroidFromBounds(
  bounds: ParsedStlMesh["bounds"] | null,
  teeth: GeneratedVariantDesign["teeth"] | undefined
): THREE.Vector3 {
  const points: THREE.Vector3[] = [];
  
  // Scan is centered at origin by StlMeshView, so its world position is (0,0,0)
  // Only add it if there's no teeth - otherwise let teeth dominate the centroid
  if (bounds && (!teeth || teeth.length === 0)) {
    // When only scan exists, rotation should be around the scan's center (which is at origin after centering)
    points.push(new THREE.Vector3(0, 0, 0));
  }
  
  // Add teeth centroid if teeth exist - this is the primary rotation center when teeth are present
  if (teeth && teeth.length > 0) {
    const teethCenter = new THREE.Vector3();
    teeth.forEach(t => {
      teethCenter.add(new THREE.Vector3(t.positionX, t.positionY, t.positionZ ?? 0));
    });
    teethCenter.divideScalar(teeth.length);
    points.push(teethCenter);
  }
  
  // Return average of all points, or origin if none
  if (points.length === 0) return new THREE.Vector3(0, 0, 0);
  const centroid = new THREE.Vector3();
  points.forEach(p => centroid.add(p));
  return centroid.divideScalar(points.length);
}

// Hook version for use in components
function useVisualCentroid(
  archScanMesh: ParsedStlMesh | null | undefined,
  activeVariant: GeneratedVariantDesign | null | undefined
): THREE.Vector3 {
  return useMemo(() => {
    const bounds = archScanMesh?.bounds ?? null;
    const teeth = activeVariant?.teeth;
    return getVisualCentroidFromBounds(bounds, teeth);
  }, [archScanMesh?.bounds, activeVariant?.teeth]);
}

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

function AutoFrame({
  bounds,
  teeth,
  controlsRef,
}: {
  bounds: ParsedStlMesh["bounds"] | null;
  teeth: GeneratedVariantDesign["teeth"] | undefined;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const hasFramed = useRef(false);
  const prevCentroid = useRef<THREE.Vector3 | null>(null);

  // Compute visual centroid based on scan bounds and teeth positions
  const visualCentroid = useMemo(() => {
    return getVisualCentroidFromBounds(bounds, teeth);
  }, [bounds, teeth]);

  useEffect(() => {
    if (!bounds || hasFramed.current) return;
    hasFramed.current = true;

    const size = Math.max(bounds.width, bounds.depth, bounds.height);
    const dist = size * 1.8;
    camera.position.set(visualCentroid.x, visualCentroid.y + size * 0.3, visualCentroid.z + dist);
    camera.lookAt(visualCentroid);
    camera.updateProjectionMatrix();

    // Sync TrackballControls target to visual centroid so rotation
    // is around the combined center of scan + teeth
    if (controlsRef.current) {
      controlsRef.current.target.copy(visualCentroid);
      controlsRef.current.update();
    }
    prevCentroid.current = visualCentroid.clone();
  }, [bounds, visualCentroid, camera, controlsRef]);

  // Update controls target when visual centroid changes (e.g., teeth moved)
  useEffect(() => {
    if (!controlsRef.current || !prevCentroid.current) return;
    if (!visualCentroid.equals(prevCentroid.current)) {
      controlsRef.current.target.copy(visualCentroid);
      controlsRef.current.update();
      prevCentroid.current = visualCentroid.clone();
    }
  }, [visualCentroid, controlsRef]);

  // Reset flag when bounds change (new mesh loaded)
  useEffect(() => {
    hasFramed.current = false;
  }, [bounds?.width, bounds?.depth, bounds?.height]);

  return null;
}

// ─── Landmark transform helpers ──────────────────────────────────────

function applyLandmarkTransform(
  point: { x: number; y: number; z: number },
  center: THREE.Vector3,
  transform: AlignmentTransform3D | undefined
): [number, number, number] {
  if (!transform) {
    return [point.x - center.x, point.y - center.y, point.z - center.z];
  }
  const { scale, rotateX, rotateY, rotateZ, translateX, translateY, translateZ } = transform;

  const centered = new THREE.Vector3(
    point.x - center.x,
    point.y - center.y,
    point.z - center.z
  );

  const scaled = centered.clone().multiplyScalar(scale);

  const euler = new THREE.Euler(rotateX, rotateY, rotateZ, 'XYZ');
  const rotated = scaled.clone().applyEuler(euler);

  return [
    rotated.x + translateX,
    rotated.y + translateY,
    rotated.z + translateZ,
  ];
}

function inverseLandmarkTransform(
  worldPoint: THREE.Vector3,
  center: THREE.Vector3,
  transform: AlignmentTransform3D | undefined
): { x: number; y: number; z: number } {
  if (!transform) {
    return { x: worldPoint.x + center.x, y: worldPoint.y + center.y, z: worldPoint.z + center.z };
  }
  const { scale, rotateX, rotateY, rotateZ, translateX, translateY, translateZ } = transform;

  const matrix = new THREE.Matrix4();
  matrix.makeScale(scale, scale, scale);
  const rotMatrix = new THREE.Matrix4();
  const euler = new THREE.Euler(rotateX, rotateY, rotateZ, 'XYZ');
  rotMatrix.makeRotationFromEuler(euler);
  matrix.multiply(rotMatrix);
  matrix.setPosition(translateX, translateY, translateZ);

  const invMatrix = matrix.invert();

  const result = new THREE.Vector3(worldPoint.x, worldPoint.y, worldPoint.z);
  result.applyMatrix4(invMatrix);

  return { x: result.x + center.x, y: result.y + center.y, z: result.z + center.z };
}

// ─── Mesh components ─────────────────────────────────────────────────

function StlMeshView({
  mesh,
  color = "#e8ddd0",
  opacity = 1,
  metalness = 0.1,
  roughness = 0.6,
  emissive = "#111827",
  emissiveIntensity = 0,
  pickEnabled = false,
  onPickPoint,
  landmarks = [],
  activeLandmarkId = null,
  alignmentResult = null,
  setModelLandmark,
}: {
  mesh: ParsedStlMesh;
  color?: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  pickEnabled?: boolean;
  onPickPoint?: (point: { x: number; y: number; z: number }) => void;
  landmarks?: ReturnType<typeof useAlignmentStore.getState>["landmarks"];
  activeLandmarkId?: ReturnType<typeof useAlignmentStore.getState>["activeLandmarkId"];
  alignmentResult?: ReturnType<typeof useAlignmentStore.getState>["alignmentResult"];
  setModelLandmark?: (id: AlignmentLandmarkId, x: number, y: number, z: number) => void;
}) {
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
  const [draggingLandmarkId, setDraggingLandmarkId] = useState<AlignmentLandmarkId | null>(null);
  const activeLandmark = landmarks.find((landmark) => landmark.id === activeLandmarkId) ?? null;

  const transform = alignmentResult?.transform;

  const center = useMemo(() => {
    return new THREE.Vector3(
      (mesh.bounds.minX + mesh.bounds.maxX) / 2,
      (mesh.bounds.minY + mesh.bounds.maxY) / 2,
      (mesh.bounds.minZ + mesh.bounds.maxZ) / 2
    );
  }, [mesh.bounds]);

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
    
    // Shift geometry so its center is exactly at origin. This ensures scale and rotation 
    // are applied around the mesh centroid instead of world origin, matching landmark math.
    geo.translate(-center.x, -center.y, -center.z);
    
    return geo;
  }, [mesh.triangles, center]);

  // Dispose GPU memory when geometry is replaced or component unmounts
  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  return (
    <>
      <mesh
        geometry={geometry}
        scale={transform?.scale ?? 1}
        rotation={[transform?.rotateX ?? 0, transform?.rotateY ?? 0, transform?.rotateZ ?? 0]}
        position={[
          transform?.translateX ?? 0,
          transform?.translateY ?? 0,
          transform?.translateZ ?? 0
        ]}
        onPointerDown={(event) => {
          if (!pickEnabled || !onPickPoint) return;
          event.stopPropagation();
          const modelCoord = inverseLandmarkTransform(event.point, center, transform);
          onPickPoint(modelCoord);
        }}
        onPointerMove={(event) => {
          if (draggingLandmarkId && setModelLandmark) {
            const modelCoord = inverseLandmarkTransform(event.point, center, transform);
            setModelLandmark(draggingLandmarkId, modelCoord.x, modelCoord.y, modelCoord.z);
          } else if (pickEnabled && activeLandmarkId) {
            setHoverPoint(event.point.clone());
          } else {
            setHoverPoint(null);
          }
        }}
onPointerUp={() => {
  if (draggingLandmarkId) {
    setDraggingLandmarkId(null);
  }
}}
onPointerLeave={() => {
  setHoverPoint(null);
  setDraggingLandmarkId(null);
}}
      >
        <meshPhysicalMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          reflectivity={0.18}
          clearcoat={0.08}
          clearcoatRoughness={0.6}
          transparent={opacity < 1}
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
        {landmarks
          .filter((landmark) => landmark.modelCoord)
          .map((landmark) => {
            const worldPos = applyLandmarkTransform(landmark.modelCoord!, center, transform);
            const visual = getScanLandmarkVisualState(landmark, activeLandmarkId);
            
            console.log('=== Render 3D Landmark ===');
            console.log('Landmark:', landmark.id);
            console.log('modelCoord:', landmark.modelCoord!.x.toFixed(2), landmark.modelCoord!.y.toFixed(2), landmark.modelCoord!.z.toFixed(2));
            console.log('Center:', center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2));
            console.log('World pos:', worldPos[0].toFixed(2), worldPos[1].toFixed(2), worldPos[2].toFixed(2));
            console.log('=========================');
            
            return (
            <group
              key={landmark.id}
              position={worldPos}
              renderOrder={10}
            >
        {visual.showHalo && (
          <mesh renderOrder={10}>
            <sphereGeometry args={[visual.haloRadius, 16, 16]} />
            <meshStandardMaterial
              color={landmark.color}
              transparent
              opacity={visual.haloOpacity}
              emissive={landmark.color}
              emissiveIntensity={0.15}
              depthTest={false}
            />
          </mesh>
        )}
        <mesh
          renderOrder={10}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDraggingLandmarkId(landmark.id);
          }}
        >
          <sphereGeometry args={[visual.baseRadius, 12, 12]} />
          <meshStandardMaterial
            color={landmark.color}
            transparent={visual.markerOpacity < 1}
            opacity={visual.markerOpacity}
            emissive={landmark.color}
            emissiveIntensity={visual.emissiveIntensity}
            depthTest={false}
          />
        </mesh>
        {/* Invisible hit-target sphere — larger radius for easier dragging */}
        <mesh
          renderOrder={10}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDraggingLandmarkId(landmark.id);
          }}
          onPointerUp={() => setDraggingLandmarkId(null)}
        >
          <sphereGeometry args={[visual.baseRadius * 2.5, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthTest={false} />
        </mesh>
      </group>
    );
  })}
{hoverPoint && activeLandmark && (
            <mesh
              renderOrder={10}
              position={[hoverPoint.x, hoverPoint.y, hoverPoint.z]}
            >
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial
                color={activeLandmark.color}
                transparent
                opacity={0.5}
                emissive={activeLandmark.color}
                emissiveIntensity={0.3}
                depthTest={false}
              />
            </mesh>
          )}
      </>
    );
  }

// Original ToothMesh deprecated in favor of InteractiveTooth Phase B implementation.

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

// ArchCurveWireframe replaced by InteractiveArchCurve phase 2 component.

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
  const meshOpacity = useCanvasStore((s) => s.meshOpacity);
  const designTab = useCanvasStore((s) => s.designTab);
  const hiddenLayers = useViewportStore((s) => s.hiddenLayers);

  const isAlignmentMode = useAlignmentStore((s) => s.isAlignmentMode);
  const activeSurface = useAlignmentStore((s) => s.activeSurface);
  const activeLandmarkId = useAlignmentStore((s) => s.activeLandmarkId);
  const scanInteractionMode = useAlignmentStore((s) => s.scanInteractionMode);
  const landmarks = useAlignmentStore((s) => s.landmarks);
  const solvedView = useAlignmentStore((s) => s.solvedView);
  const alignmentResult = useAlignmentStore((s) => s.alignmentResult);
  const setModelLandmark = useAlignmentStore((s) => s.setModelLandmark);
  const setActiveLandmark = useAlignmentStore((s) => s.setActiveLandmark);
  const setActiveSurface = useAlignmentStore((s) => s.setActiveSurface);
  const setScanInteractionMode = useAlignmentStore((s) => s.setScanInteractionMode);
  const setSolvedView = useAlignmentStore((s) => s.setSolvedView);
  const clearSolvedView = useAlignmentStore((s) => s.clearSolvedView);
  const canSolve = useAlignmentStore((s) => s.canSolve);

  // Ref to the TrackballControls so we can sync target after camera animation
  const controlsRef = useRef<any>(null);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);
  const photoUrl = uploadedPhotos[0]?.url ?? null;
  const primaryPhoto = uploadedPhotos[0] ?? null;
  const shouldShowPhotoOverlay = shouldRenderImportedPhotoOverlay(primaryPhoto);
  const photoOverlayPointerEventsEnabled = shouldEnablePhotoOverlayPointerEvents({
    designTab,
    isAlignmentMode,
    activeSurface: activeSurface ?? "photo",
  });
  const importedScanSignature = useMemo(
    () => getImportedScanSignature(archScanMesh),
    [archScanMesh]
  );
  const scanRenderStyle = useMemo(
    () =>
      getScanRenderStyle({
        meshOpacity,
        hasActiveVariant: Boolean(activeVariant),
      }),
    [activeVariant, meshOpacity]
  );
  const activeLandmark = landmarks.find((landmark) => landmark.id === activeLandmarkId) ?? null;
  const completedPairCount = landmarks.filter(
    (landmark) => landmark.photoCoord !== null && landmark.modelCoord !== null
  ).length;

  const [photoBgAspect, setPhotoBgAspect] = useState<number | null>(null);

  useEffect(() => {
    if (!photoUrl) {
      setPhotoBgAspect(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (img.naturalHeight > 0) {
        setPhotoBgAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = photoUrl;
  }, [photoUrl]);

  // Canvas aspect ratio (updated by AspectReporter inside the Canvas)
  const [canvasAspect, setCanvasAspect] = useState(1.5);

  const [showMeasurements, setShowMeasurements] = useState(false);
  const [scanLoadNotice, setScanLoadNotice] = useState<string | null>(null);


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
    const bounds = archScanMesh?.bounds ?? null;
    const teeth = activeVariant?.teeth;
    const centroid = getVisualCentroidFromBounds(bounds, teeth);
    const scale = archScanMesh ? Math.max(archScanMesh.bounds.width, archScanMesh.bounds.depth, archScanMesh.bounds.height) * 0.04 : 1;
    const presetPos = new THREE.Vector3(...preset.position).multiplyScalar(scale);
    // Offset preset position by centroid so camera looks at visual center
    presetPos.add(centroid);
    setAnimTarget({
      pos: presetPos,
      up: new THREE.Vector3(...(preset.up ?? [0, 1, 0])),
      lookAt: centroid
    });
  }, [archScanMesh, activeVariant]);

  const resetView = useCallback(() => {
    // Compute visual centroid for rotation target
    const bounds = archScanMesh?.bounds ?? null;
    const teeth = activeVariant?.teeth;
    const centroid = getVisualCentroidFromBounds(bounds, teeth);
    if (archScanMesh) {
      const size = Math.max(archScanMesh.bounds.width, archScanMesh.bounds.depth, archScanMesh.bounds.height);
      setAnimTarget({
        pos: new THREE.Vector3(centroid.x, centroid.y + size * 0.3, centroid.z + size * 1.8),
        up: new THREE.Vector3(0, 1, 0),
        lookAt: centroid
      });
    } else {
      setAnimTarget({
        pos: DEFAULT_POSITION.clone(),
        up: new THREE.Vector3(0, 1, 0)
      });
    }
  }, [archScanMesh, activeVariant]);

  const lastImportedScanSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!importedScanSignature) {
      lastImportedScanSignatureRef.current = null;
      setScanLoadNotice(null);
      return;
    }

    const previousSignature = lastImportedScanSignatureRef.current;

    if (previousSignature === importedScanSignature) {
      return;
    }

    lastImportedScanSignatureRef.current = importedScanSignature;

    if (
      archScanMesh &&
      shouldShowImportedScanNotice({
        previousSignature,
        nextSignature: importedScanSignature,
        isAlignmentMode,
      })
    ) {
      setScanLoadNotice(getImportedScanNoticeLabel(archScanMesh.name));
    }

    if (!isAlignmentMode) {
      resetView();
    }
  }, [archScanMesh, importedScanSignature, isAlignmentMode, resetView]);

  // Sync camera to alignmentResult in Alignment Mode
  useEffect(() => {
    if (isAlignmentMode && alignmentResult) {
      setAnimTarget({
        pos: new THREE.Vector3(
          alignmentResult.cameraPosition.x,
          alignmentResult.cameraPosition.y,
          alignmentResult.cameraPosition.z
        ),
        lookAt: new THREE.Vector3(
          alignmentResult.cameraTarget.x,
          alignmentResult.cameraTarget.y,
          alignmentResult.cameraTarget.z
        ),
        up: new THREE.Vector3(0, 1, 0), // Standard up vector
      });
    }
  }, [isAlignmentMode, alignmentResult]);

  useEffect(() => {
    if (!scanLoadNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setScanLoadNotice(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [scanLoadNotice]);

  return (
    <div
      ref={containerRef}
      className="viewer-container"
      tabIndex={0}
      style={{ flex: 1, position: "relative" }}
    >
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

      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{ alpha: true }}
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* Controls scene transparency vs. solid dark background */}
        <SceneBackground transparent={false} />
        <AspectReporter onAspect={setCanvasAspect} />

        <PerspectiveCamera makeDefault position={[0, 8, 30]} fov={45} />
        <DentalLighting />

        <AutoFrame bounds={archScanMesh?.bounds ?? null} teeth={activeVariant?.teeth} controlsRef={controlsRef} />

        <CameraAnimator
          targetPos={animTarget?.pos ?? null}
          targetLookAt={animTarget?.lookAt ?? DEFAULT_TARGET}
          targetUp={animTarget?.up ?? new THREE.Vector3(0, 1, 0)}
          controlsRef={controlsRef}
          onComplete={() => setAnimTarget(null)}
        />

{archScanMesh && !hiddenLayers.has("arch-scan") && (
  <StlMeshView
    mesh={archScanMesh}
    color={scanRenderStyle.color}
    opacity={scanRenderStyle.opacity}
    metalness={scanRenderStyle.metalness}
    roughness={scanRenderStyle.roughness}
    emissive={scanRenderStyle.emissive}
    emissiveIntensity={scanRenderStyle.emissiveIntensity}
    pickEnabled={
      isAlignmentMode &&
      activeSurface === "scan" &&
      scanInteractionMode === "pick" &&
      Boolean(activeLandmarkId)
    }
    landmarks={landmarks}
    activeLandmarkId={activeLandmarkId}
    alignmentResult={alignmentResult}
    setModelLandmark={setModelLandmark}
        onPickPoint={(point) => {
          if (!activeLandmarkId) return;
          setModelLandmark(activeLandmarkId, point.x, point.y, point.z);
          const state = useAlignmentStoreRaw.getState();
          // Find next landmark that has photo but needs scan
          const next = state.landmarks.find(
            (l) => l.id !== activeLandmarkId && l.photoCoord && !l.modelCoord
          );
          if (next) {
            setActiveLandmark(next.id);
            // Stay on scan surface to continue placing scan landmarks
          } else {
            // All landmarks complete, switch to navigate mode
            setScanInteractionMode("navigate");
          }
        }}
  />
)}

        {!hiddenLayers.has("design-teeth") && activeVariant?.teeth.map((tooth) => (
          <InteractiveTooth
            key={tooth.toothId}
            tooth={tooth}
            selected={tooth.toothId === selectedToothId}
            hasCollision={collisionToothIds.has(tooth.toothId)}
            onSelect={() => onSelectTooth?.(tooth.toothId)}
          />
        ))}

        {activeVariant && !hiddenLayers.has("arch-curve") && (
          <InteractiveArchCurve
            archHalfWidth={archHalfWidthOverride ?? (archScanMesh ? Math.max(20, Math.min(50, archScanMesh.bounds.width / 2)) : 35)}
            archDepth={archDepthOverride ?? (archScanMesh ? Math.max(8, Math.min(25, (archScanMesh.bounds.maxY - archScanMesh.bounds.minY) * 0.5)) : 15)}
          />
        )}

        {!hasContent && !hiddenLayers.has("grid") && (
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
          enabled={!(isAlignmentMode && activeSurface === "scan" && scanInteractionMode === "pick")}
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
        <button
          className="btn-icon"
          title={showMeasurements ? "Hide Measurements" : "Show Measurements"}
          onClick={() => setShowMeasurements(v => !v)}
          style={{ color: showMeasurements ? "var(--accent)" : undefined }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h1V8h0v8z"/>
          </svg>
        </button>
      </div>

      {isAlignmentMode && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            padding: "8px 10px",
            background: "rgba(15, 20, 25, 0.82)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            color: "var(--text-muted)",
            fontSize: 11,
            zIndex: 10,
          }}
        >
          <div style={{ color: "var(--text-primary)", marginBottom: 4 }}>
            {activeLandmark ? `Active landmark: ${activeLandmark.label}` : "Select a landmark"}
          </div>
          {activeLandmark && (
            <div style={{ marginBottom: 4 }}>
              {`${activeLandmark.photoCoord ? "2D point placed" : "2D point missing"} · ${activeLandmark.modelCoord ? "3D point placed" : "3D point missing"}`}
            </div>
          )}
          <div>
            {activeSurface === "scan" && activeLandmarkId
              ? scanInteractionMode === "pick"
                ? "Click the scan to place the 3D point."
                : "Switch to pick mode when you are ready to place the 3D point."
              : "Switch to 'Place on Scan' to mark the active 3D landmark."}
          </div>
          <div style={{ marginTop: 4 }}>
            {completedPairCount} matched pair{completedPairCount === 1 ? "" : "s"}
          </div>
        </div>
      )}

      {scanLoadNotice && !isAlignmentMode && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(15, 20, 25, 0.88)",
            backdropFilter: "blur(8px)",
            color: "var(--text-primary)",
            fontSize: 11,
            zIndex: 10,
            pointerEvents: "none",
            boxShadow: "0 8px 20px rgba(0,0,0,0.28)",
          }}
        >
          {scanLoadNotice}
        </div>
      )}

      {/* Camera presets - right side vertical strip */}
      <div className="viewer-presets">
        {[
          CAMERA_PRESETS[0], // Front
          CAMERA_PRESETS[1], // Back
          CAMERA_PRESETS[2], // Top
        ].map((preset) => (
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
        <span>RMB: Menu</span>
        <span>Scroll: Scan zoom</span>
      </div>

      </>
      )}
    </div>
  );
}
