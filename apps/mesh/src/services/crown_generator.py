# apps/mesh/src/services/crown_generator.py
import trimesh
import numpy as np
from .intaglio import apply_cement_gap


def generate_crown(
    library_mesh: trimesh.Trimesh,
    target_mesh: trimesh.Trimesh,
    margin_center: np.ndarray,
    margin_radius: float,
    cement_gap_mm: float = 0.05,
) -> trimesh.Trimesh:
    """
    Boolean crown synthesis:
      Crown = L_adapted - P_gap

    Steps:
    1. Extract preparation (intaglio) from target
    2. Apply cement gap offset
    3. Boolean difference: library_mesh MINUS p_gap
    4. Smooth the seam
    """
    # Step 1 & 2: Apply cement gap to the full target mesh (which is already a
    # closed volume). Using the whole target avoids the open-mesh issue that
    # arises when sub-sampling faces in extract_intaglio.
    p_gap = apply_cement_gap(target_mesh, offset_mm=cement_gap_mm)

    # Step 3: Boolean difference using trimesh + manifold3d
    try:
        crown = trimesh.boolean.difference([library_mesh, p_gap], engine="manifold")
    except Exception as e:
        # Fallback: try blender engine if manifold not available
        try:
            crown = trimesh.boolean.difference([library_mesh, p_gap], engine="blender")
        except Exception:
            raise RuntimeError(f"Boolean difference failed: {e}")

    # Step 4: Smooth the seam (Laplacian smoothing on boundary vertices)
    crown = _smooth_boolean_seam(crown, iterations=2)

    return crown


def _smooth_boolean_seam(mesh: trimesh.Trimesh, iterations: int = 2) -> trimesh.Trimesh:
    """Apply Laplacian smoothing to the boolean intersection seam."""
    try:
        smoothed = trimesh.smoothing.filter_laplacian(mesh, iterations=iterations)
        return smoothed
    except Exception:
        return mesh  # Return unsmoothed if smoothing fails
