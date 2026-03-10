# apps/mesh/tests/test_intaglio.py
import pytest
import trimesh
import numpy as np
from src.services.intaglio import extract_intaglio, apply_cement_gap


def make_cylinder_mesh():
    """A simple cylinder to represent a prepared tooth stump."""
    return trimesh.creation.cylinder(radius=4.0, height=8.0, sections=32)


def test_intaglio_extraction_returns_valid_mesh():
    target = make_cylinder_mesh()
    # Margin: a circle at z=0 (midpoint of cylinder)
    margin_center = np.array([0.0, 0.0, 0.0])
    preparation = extract_intaglio(target, margin_center, margin_radius=5.0)
    assert isinstance(preparation, trimesh.Trimesh)
    assert len(preparation.faces) > 0


def test_cement_gap_inflates_mesh():
    target = make_cylinder_mesh()
    gap = apply_cement_gap(target, offset_mm=0.05)
    # Volume of gap mesh should be slightly larger than original
    assert gap.volume > target.volume
