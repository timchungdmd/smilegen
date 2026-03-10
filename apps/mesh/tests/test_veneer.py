# apps/mesh/tests/test_veneer.py
import trimesh
from src.services.veneer_generator import generate_veneer


def test_veneer_generation():
    library = trimesh.creation.icosphere(radius=4.5, subdivisions=3)
    target = trimesh.creation.icosphere(radius=4.0, subdivisions=3)
    veneer = generate_veneer(library, target, shell_thickness_mm=0.3)
    assert isinstance(veneer, trimesh.Trimesh)
    assert veneer.is_watertight
