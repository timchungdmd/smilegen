# apps/mesh/tests/test_crown.py
import trimesh
import numpy as np
from src.services.crown_generator import generate_crown


def make_test_meshes():
    # Library tooth: sphere approximation
    library = trimesh.creation.icosphere(radius=4.5, subdivisions=3)
    # Target (preparation): smaller cylinder
    target = trimesh.creation.cylinder(radius=3.5, height=6.0, sections=32)
    # Margin center at base of library tooth
    margin_center = np.array([0.0, 0.0, -2.0])
    return library, target, margin_center


def test_crown_generation_returns_watertight_mesh():
    library, target, margin_center = make_test_meshes()
    crown = generate_crown(library, target, margin_center, margin_radius=3.0)
    assert isinstance(crown, trimesh.Trimesh)
    assert len(crown.faces) > 0
    assert crown.is_watertight, "Crown mesh must be watertight for printing"
