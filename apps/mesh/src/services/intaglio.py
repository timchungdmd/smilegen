# apps/mesh/src/services/intaglio.py
import trimesh
import numpy as np


def extract_intaglio(
    target: trimesh.Trimesh,
    margin_center: np.ndarray,
    margin_radius: float,
) -> trimesh.Trimesh:
    """
    Flood-fill from margin_center outward up to margin_radius to extract
    the preparation mesh (intaglio surface). Reverses normals.

    Args:
        target: Patient's intraoral scan mesh
        margin_center: 3D point at the center of the margin line
        margin_radius: radius defining the margin boundary

    Returns:
        Preparation mesh with reversed normals (inner cavity surface)
    """
    vertices = target.vertices
    faces = target.faces

    # Find faces whose centroid is within margin_radius of margin_center
    centroids = vertices[faces].mean(axis=1)
    distances = np.linalg.norm(centroids - margin_center, axis=1)
    mask = distances <= margin_radius

    # Extract sub-mesh
    selected_faces = faces[mask]
    unique_verts, inv = np.unique(selected_faces, return_inverse=True)
    new_faces = inv.reshape(selected_faces.shape)
    new_verts = vertices[unique_verts]

    preparation = trimesh.Trimesh(vertices=new_verts, faces=new_faces, process=True)

    # Reverse normals to form interior cavity
    preparation.faces = preparation.faces[:, ::-1]
    preparation.fix_normals()

    return preparation


def apply_cement_gap(mesh: trimesh.Trimesh, offset_mm: float = 0.05) -> trimesh.Trimesh:
    """
    Inflate mesh outward by offset_mm to simulate cement gap.
    Uses vertex normal displacement.
    """
    mesh.fix_normals()
    displaced = mesh.vertices + mesh.vertex_normals * offset_mm
    return trimesh.Trimesh(vertices=displaced, faces=mesh.faces.copy(), process=True)
