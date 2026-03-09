# apps/api/src/routers/assets.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from prisma import Prisma
from ..services import storage
import uuid

router = APIRouter(prefix="/assets", tags=["assets"])

ALLOWED_ASSET_TYPES = {
    "PHOTO_FRONTAL_SMILE", "PHOTO_RETRACTED",
    "SCAN_UPPER_JAW", "SCAN_LOWER_JAW",
    "SCAN_TOOTH_LIBRARY", "CBCT"
}

CONTENT_TYPE_MAP = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "stl": "application/octet-stream", "ply": "application/octet-stream",
    "obj": "application/octet-stream",
}

class PresignRequest(BaseModel):
    caseId: str
    assetType: str
    filename: str
    sizeBytes: int

@router.post("/presign")
async def presign_upload(body: PresignRequest):
    if body.assetType not in ALLOWED_ASSET_TYPES:
        raise HTTPException(400, f"Invalid asset type: {body.assetType}")

    ext = body.filename.rsplit(".", 1)[-1].lower()
    content_type = CONTENT_TYPE_MAP.get(ext, "application/octet-stream")
    s3_key = f"cases/{body.caseId}/{body.assetType}/{uuid.uuid4()}/{body.filename}"

    storage.ensure_bucket_exists()
    upload_url = storage.generate_upload_url(s3_key, content_type)

    # Register asset record (before upload completes)
    db = Prisma()
    await db.connect()
    asset = await db.asset.create(data={
        "caseId": body.caseId,
        "type": body.assetType,
        "filename": body.filename,
        "s3Key": s3_key,
        "sizeBytes": body.sizeBytes,
        "mimeType": content_type,
    })
    await db.disconnect()

    return {"uploadUrl": upload_url, "assetId": asset.id, "s3Key": s3_key}

@router.get("/{asset_id}/download-url")
async def get_download_url(asset_id: str):
    db = Prisma()
    await db.connect()
    asset = await db.asset.find_unique(where={"id": asset_id})
    await db.disconnect()
    if not asset:
        raise HTTPException(404, "Asset not found")
    url = storage.generate_download_url(asset.s3Key)
    return {"downloadUrl": url, "filename": asset.filename}
