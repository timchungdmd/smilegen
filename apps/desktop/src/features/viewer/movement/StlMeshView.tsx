/**
 * ============================================================================
 * STL MESH VIEW COMPONENT - DO NOT MODIFY
 * ============================================================================
 *
 * Renders the imported 3D scan mesh.
 * 
 * CRITICAL: This component centers the mesh at the origin by applying
 * position=[-center.x, -center.y, -center.z]. This means:
 * - The scan's centroid in world space is always (0,0,0)
 * - Camera rotation center when only scan: (0,0,0)
 * 
 * DO NOT CHANGE the centering logic without updating visualCentroid.ts
 */
import { useMemo, useEffect } from "react";
import * as THREE from "three";
import type { StlMeshViewProps } from "./types";

/**
 * StlMeshView - Renders a centered scan mesh
 * 
 * Place this inside the <Canvas> component.
 * The mesh is automatically centered at origin.
 */
export function StlMeshView({
  mesh,
  color = "#e8ddd0",
  opacity = 1,
  metalness = 0.1,
  roughness = 0.6,
}: StlMeshViewProps) {
  // Build geometry from mesh triangles
  const geometry = useMemo(() => {
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
  }, [mesh.triangles]);

  // Dispose GPU memory when geometry is replaced or component unmounts
  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  // Calculate center for positioning
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
