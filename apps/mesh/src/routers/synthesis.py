# apps/mesh/src/routers/synthesis.py
from fastapi import APIRouter, UploadFile, HTTPException, Form
from fastapi.responses import Response
import trimesh
import numpy as np
import io
from ..services.crown_generator import generate_crown
from ..services.veneer_generator import generate_veneer

router = APIRouter(prefix="/synthesis", tags=["synthesis"])


def load_mesh_from_bytes(data: bytes, filename: str) -> trimesh.Trimesh:
    ext = filename.rsplit(".", 1)[-1].lower()
    mesh = trimesh.load(io.BytesIO(data), file_type=ext, force="mesh")
    if not isinstance(mesh, trimesh.Trimesh):
        raise HTTPException(400, f"Could not parse mesh from {filename}")
    return mesh


def export_mesh(mesh: trimesh.Trimesh, fmt: str = "ply") -> bytes:
    buf = io.BytesIO()
    mesh.export(buf, file_type=fmt)
    return buf.getvalue()


@router.post("/crown")
async def synthesize_crown(
    library: UploadFile,
    target: UploadFile,
    margin_x: float = Form(0.0),
    margin_y: float = Form(0.0),
    margin_z: float = Form(0.0),
    margin_radius: float = Form(3.5),
    export_format: str = Form("ply"),
):
    lib_bytes = await library.read()
    tgt_bytes = await target.read()
    lib_mesh = load_mesh_from_bytes(lib_bytes, library.filename or "library.stl")
    tgt_mesh = load_mesh_from_bytes(tgt_bytes, target.filename or "target.stl")
    margin_center = np.array([margin_x, margin_y, margin_z])

    crown = generate_crown(lib_mesh, tgt_mesh, margin_center, margin_radius)

    if not crown.is_watertight:
        trimesh.repair.fix_winding(crown)
        trimesh.repair.fill_holes(crown)

    content = export_mesh(crown, fmt=export_format)
    media = "model/x.stl-binary" if export_format == "stl" else "application/octet-stream"
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f"attachment; filename=crown.{export_format}"},
    )


@router.post("/veneer")
async def synthesize_veneer(
    library: UploadFile,
    target: UploadFile,
    shell_thickness: float = Form(0.3),
    export_format: str = Form("ply"),
):
    lib_bytes = await library.read()
    tgt_bytes = await target.read()
    lib_mesh = load_mesh_from_bytes(lib_bytes, library.filename or "library.stl")
    tgt_mesh = load_mesh_from_bytes(tgt_bytes, target.filename or "target.stl")

    veneer = generate_veneer(lib_mesh, tgt_mesh, shell_thickness_mm=shell_thickness)
    content = export_mesh(veneer, fmt=export_format)
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=veneer.{export_format}"},
    )
