# apps/vision/src/routers/landmarks.py
from fastapi import APIRouter, UploadFile, HTTPException
from ..services.landmark_detector import detect_landmarks

router = APIRouter(prefix="/landmarks", tags=["landmarks"])

@router.post("/detect")
async def detect(image: UploadFile):
    if not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    image_bytes = await image.read()
    result = detect_landmarks(image_bytes)
    if result is None:
        raise HTTPException(422, "No face detected in image")
    return {
        "landmarks": result.landmarks,
        "midlineX": result.midlineX,
        "interpupillaryLine": result.interpupillaryLine,
        "lipContour": result.lipContour,
        "mouthMaskBbox": result.mouthMaskBbox,
    }
