export interface LandmarkCorrespondence {
  id: string;
  anatomicId: AnatomicLandmarkId;
  photoPoint: { x: number; y: number }; // Normalized 0-1
  modelPoint: { x: number; y: number; z: number }; // mm in STL space
  weight: number;
}

export type AnatomicLandmarkId =
  | "midline"
  | "right-central-incisor"
  | "left-central-incisor"
  | "right-lateral-incisor"
  | "left-lateral-incisor"
  | "right-canine"
  | "left-canine"
  | "right-first-premolar"
  | "left-first-premolar"
  | "right-second-premolar"
  | "left-second-premolar";

export interface AnatomicOrientation {
  /** Expected position relative to dental midline (normalized -1 to 1) */
  lateralPosition: number;
  /** Whether this landmark helps determine arch curvature */
  definesArchCurve: boolean;
  /** Whether this landmark defines the occlusal plane */
  definesOcclusalPlane: boolean;
}

export const ANATOMIC_ORIENTATIONS: Record<AnatomicLandmarkId, AnatomicOrientation> = {
  "midline": { lateralPosition: 0, definesArchCurve: true, definesOcclusalPlane: true },
  "right-central-incisor": { lateralPosition: -0.5, definesArchCurve: true, definesOcclusalPlane: true },
  "left-central-incisor": { lateralPosition: 0.5, definesArchCurve: true, definesOcclusalPlane: true },
  "right-lateral-incisor": { lateralPosition: -1.0, definesArchCurve: true, definesOcclusalPlane: true },
  "left-lateral-incisor": { lateralPosition: 1.0, definesArchCurve: true, definesOcclusalPlane: true },
  "right-canine": { lateralPosition: -1.5, definesArchCurve: true, definesOcclusalPlane: true },
  "left-canine": { lateralPosition: 1.5, definesArchCurve: true, definesOcclusalPlane: true },
  "right-first-premolar": { lateralPosition: -2.0, definesArchCurve: true, definesOcclusalPlane: false },
  "left-first-premolar": { lateralPosition: 2.0, definesArchCurve: true, definesOcclusalPlane: false },
  "right-second-premolar": { lateralPosition: -2.5, definesArchCurve: false, definesOcclusalPlane: false },
  "left-second-premolar": { lateralPosition: 2.5, definesArchCurve: false, definesOcclusalPlane: false },
};

export interface AlignmentTransform3D {
  /** Model scale factor (1.0 = no change) */
  scale: number;
  /** Rotation around X axis (pitch) in radians */
  rotateX: number;
  /** Rotation around Y axis (yaw) in radians */
  rotateY: number;
  /** Rotation around Z axis (roll) in radians */
  rotateZ: number;
  /** Translation in model space (mm) */
  translateX: number;
  translateY: number;
  translateZ: number;
}

export interface AlignmentResult {
  transform: AlignmentTransform3D;
  /** Camera position for 3D preview */
  cameraPosition: { x: number; y: number; z: number };
  /** Camera look-at target */
  cameraTarget: { x: number; y: number; z: number };
  /** Mean reprojection error in pixels */
  meanErrorPx: number;
  /** Per-landmark errors */
  landmarkErrors: Map<string, number>;
  /** Quality assessment */
  quality: "excellent" | "good" | "acceptable" | "poor";
}

export interface ProjectionParams {
  /** Field of view in degrees */
  fov: number;
  /** Image width in pixels */
  imageWidth: number;
  /** Image height in pixels */
  imageHeight: number;
  /** Principal point offset (normalized 0-1, default 0.5, 0.5) */
  principalPoint: { x: number; y: number };
}
