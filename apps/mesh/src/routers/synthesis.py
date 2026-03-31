# apps/mesh/src/routers/synthesis.py
from fastapi import APIRouter, UploadFile, HTTPException, Form, Request, File
from fastapi.responses import Response
from typing import Optional
import trimesh
import numpy as np
import io
import os
import tempfile
import uuid
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


@router.post("/stage")
async def stage_file(request: Request):
    """
    Stage a raw file body into a temporary file, returning an ID.
    Bypasses FormData memory limits for massive 300MB+ STL files.
    """
    file_id = str(uuid.uuid4())
    temp_path = os.path.join(tempfile.gettempdir(), f"smilegen_{file_id}.blob")
    with open(temp_path, "wb") as f:
        async for chunk in request.stream():
            f.write(chunk)
    return {"id": file_id}


async def _resolve_bytes(file_upload: Optional[UploadFile], file_id: Optional[str]) -> bytes:
    if file_id:
        temp_path = os.path.join(tempfile.gettempdir(), f"smilegen_{file_id}.blob")
        if not os.path.exists(temp_path):
            raise HTTPException(404, f"Staged file {file_id} not found")
        with open(temp_path, "rb") as f:
            data = f.read()
        os.remove(temp_path)
        return data
    elif file_upload:
        return await file_upload.read()
    else:
        raise HTTPException(400, "Must provide either file upload or staged file ID")


@router.post("/crown")
async def synthesize_crown(
    library: Optional[UploadFile] = File(None),
    target: Optional[UploadFile] = File(None),
    library_id: Optional[str] = Form(None),
    target_id: Optional[str] = Form(None),
    margin_x: float = Form(0.0),
    margin_y: float = Form(0.0),
    margin_z: float = Form(0.0),
    margin_radius: float = Form(3.5),
    export_format: str = Form("ply"),
):
    lib_bytes = await _resolve_bytes(library, library_id)
    tgt_bytes = await _resolve_bytes(target, target_id)
    
    lib_name = library.filename if library else "library.stl"
    tgt_name = target.filename if target else "target.stl"
    
    lib_mesh = load_mesh_from_bytes(lib_bytes, lib_name)
    tgt_mesh = load_mesh_from_bytes(tgt_bytes, tgt_name)
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
    library: Optional[UploadFile] = File(None),
    target: Optional[UploadFile] = File(None),
    library_id: Optional[str] = Form(None),
    target_id: Optional[str] = Form(None),
    shell_thickness: float = Form(0.3),
    export_format: str = Form("ply"),
):
    lib_bytes = await _resolve_bytes(library, library_id)
    tgt_bytes = await _resolve_bytes(target, target_id)
    
    lib_name = library.filename if library else "library.stl"
    tgt_name = target.filename if target else "target.stl"

    lib_mesh = load_mesh_from_bytes(lib_bytes, lib_name)
    tgt_mesh = load_mesh_from_bytes(tgt_bytes, tgt_name)

    veneer = generate_veneer(lib_mesh, tgt_mesh, shell_thickness_mm=shell_thickness)
    content = export_mesh(veneer, fmt=export_format)
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=veneer.{export_format}"},
    )
