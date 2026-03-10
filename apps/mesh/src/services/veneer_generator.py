# apps/mesh/src/services/veneer_generator.py
import trimesh
import numpy as np
from .intaglio import apply_cement_gap


def block_out_undercuts(mesh: trimesh.Trimesh, insertion_axis: np.ndarray = None) -> trimesh.Trimesh:
    """
    Project undercut vertices along the insertion axis to eliminate concavities.
    Insertion axis defaults to +Z (occlusal direction).
    """
    if insertion_axis is None:
        insertion_axis = np.array([0.0, 0.0, 1.0])
    insertion_axis = insertion_axis / np.linalg.norm(insertion_axis)

    mesh.fix_normals()
    normals = mesh.vertex_normals
    # Dot product: negative means face opposes insertion (undercut)
    dots = normals @ insertion_axis
    undercut_mask = dots < -0.01

    blocked_vertices = mesh.vertices.copy()
    # Project undercut vertices onto insertion axis plane (flatten along axis)
    if undercut_mask.any():
        verts = blocked_vertices[undercut_mask]
        projections = (verts @ insertion_axis)[:, np.newaxis] * insertion_axis
        blocked_vertices[undercut_mask] = verts - projections + (verts @ insertion_axis).min() * insertion_axis

    return trimesh.Trimesh(vertices=blocked_vertices, faces=mesh.faces.copy(), process=True)


def generate_veneer(
    library_mesh: trimesh.Trimesh,
    target_mesh: trimesh.Trimesh,
    shell_thickness_mm: float = 0.3,
    insertion_axis: np.ndarray = None,
) -> trimesh.Trimesh:
    """
    Veneer = L - T_inflated

    Steps:
    1. Block out undercuts in target
    2. Inflate target by shell_thickness to get inner boundary
    3. Boolean difference: library MINUS inflated_target
    """
    # Step 1: Block undercuts
    t_blocked = block_out_undercuts(target_mesh, insertion_axis)

    # Step 2: Inflate by shell thickness
    t_inflated = apply_cement_gap(t_blocked, offset_mm=shell_thickness_mm)

    # Step 3: Boolean difference
    try:
        veneer = trimesh.boolean.difference([library_mesh, t_inflated], engine="manifold")
    except Exception as e:
        raise RuntimeError(f"Veneer boolean failed: {e}")

    return veneer
