# apps/mesh/tests/test_synthesis_api.py
import pytest
import trimesh
import io
from httpx import AsyncClient, ASGITransport
from src.main import app


def mesh_to_bytes(mesh: trimesh.Trimesh) -> bytes:
    buf = io.BytesIO()
    mesh.export(buf, file_type="stl")
    return buf.getvalue()


@pytest.mark.anyio
async def test_crown_synthesis_returns_ply():
    library = trimesh.creation.icosphere(radius=4.5, subdivisions=2)
    target = trimesh.creation.cylinder(radius=3.5, height=6.0, sections=16)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/synthesis/crown",
            data={
                "margin_x": "0",
                "margin_y": "0",
                "margin_z": "-1",
                "margin_radius": "3.0",
                "export_format": "ply",
            },
            files={
                "library": ("lib.stl", mesh_to_bytes(library), "application/octet-stream"),
                "target": ("tgt.stl", mesh_to_bytes(target), "application/octet-stream"),
            },
        )
    assert r.status_code == 200
    assert len(r.content) > 100


@pytest.mark.anyio
async def test_veneer_synthesis_returns_ply():
    library = trimesh.creation.icosphere(radius=4.5, subdivisions=2)
    target = trimesh.creation.icosphere(radius=4.0, subdivisions=2)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/synthesis/veneer",
            data={"shell_thickness": "0.3", "export_format": "ply"},
            files={
                "library": ("lib.stl", mesh_to_bytes(library), "application/octet-stream"),
                "target": ("tgt.stl", mesh_to_bytes(target), "application/octet-stream"),
            },
        )
    assert r.status_code == 200
    assert len(r.content) > 100


@pytest.mark.anyio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "service": "mesh"}
