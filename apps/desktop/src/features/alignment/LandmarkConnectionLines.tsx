import { useMemo, useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { useAlignmentStore } from "../../store/useAlignmentStore";
import { useImportStore } from "../../store/useImportStore";

interface LandmarkConnectionLinesProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function LandmarkConnectionLines({ canvasRef }: LandmarkConnectionLinesProps) {
  const landmarks = useAlignmentStore((s) => s.landmarks);
  const isAlignmentMode = useAlignmentStore((s) => s.isAlignmentMode);
  const archScanMesh = useImportStore((s) => s.archScanMesh);
  const uploadedPhotos = useImportStore((s) => s.uploadedPhotos);

  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  const [projectedPoints, setProjectedPoints] = useState<
    Map<string, { photo: { x: number; y: number }; scan: { x: number; y: number }; color: string }>
  >(new Map());

  // Update canvas rect on resize
  useEffect(() => {
    const updateRect = () => {
      if (canvasRef.current) {
        setCanvasRect(canvasRef.current.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [canvasRef]);

  // Project 3D landmark positions to 2D screen coordinates
  useEffect(() => {
    if (!isAlignmentMode || !canvasRect || !archScanMesh) {
      setProjectedPoints(new Map());
      return;
    }

    const points = new Map<
      string,
      { photo: { x: number; y: number }; scan: { x: number; y: number }; color: string }
    >();

    // Simple orthographic projection for demo
    // In a real implementation, you'd use the camera's projection matrix
    landmarks.forEach((landmark) => {
      if (!landmark.photoCoord || !landmark.modelCoord) return;

      // Photo coordinates are already 0-1 normalized
      const photoX = landmark.photoCoord.x * canvasRect.width;
      const photoY = landmark.photoCoord.y * canvasRect.height;

      // Project 3D scan coordinates to 2D
      // Using a simple front-facing orthographic projection
      const scale = 8; // pixels per mm
      const centerX = canvasRect.width / 2;
      const centerY = canvasRect.height / 2;

      // Scan Y is inverted relative to screen Y
      const scanX = centerX + landmark.modelCoord.x * scale;
      const scanY = centerY - landmark.modelCoord.y * scale;

      points.set(landmark.id, {
        photo: { x: photoX, y: photoY },
        scan: { x: scanX, y: scanY },
        color: landmark.color,
      });
    });

    setProjectedPoints(points);
  }, [landmarks, isAlignmentMode, canvasRect, archScanMesh]);

  if (!isAlignmentMode || projectedPoints.size === 0) {
    return null;
  }

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 15,
      }}
    >
      {Array.from(projectedPoints.entries()).map(([id, points]) => (
        <g key={id}>
          <line
            x1={points.photo.x}
            y1={points.photo.y}
            x2={points.scan.x}
            y2={points.scan.y}
            stroke={points.color}
            strokeWidth={1}
            strokeDasharray="4 2"
            opacity={0.6}
          />
          {/* Photo landmark dot */}
          <circle
            cx={points.photo.x}
            cy={points.photo.y}
            r={4}
            fill={points.color}
            stroke="#fff"
            strokeWidth={1.5}
          />
          {/* Scan landmark dot */}
          <circle
            cx={points.scan.x}
            cy={points.scan.y}
            r={4}
            fill={points.color}
            stroke="#fff"
            strokeWidth={1.5}
            opacity={0.7}
          />
        </g>
      ))}
    </svg>
  );
}
