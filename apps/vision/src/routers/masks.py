# apps/vision/src/routers/masks.py
from fastapi import APIRouter, UploadFile, HTTPException
from fastapi.responses import Response
from ..services.landmark_detector import detect_landmarks
from ..services.mask_generator import generate_mouth_mask

router = APIRouter(prefix="/masks", tags=["masks"])

@router.post("/mouth")
async def generate_mask(image: UploadFile):
    image_bytes = await image.read()
    result = detect_landmarks(image_bytes)
    if result is None:
        raise HTTPException(422, "No face detected")
    masked_png = generate_mouth_mask(image_bytes, result.lipContour["inner"])
    return Response(content=masked_png, media_type="image/png")
