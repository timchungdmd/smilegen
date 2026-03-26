from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..models import landmark as landmark_model

router = APIRouter(prefix="/alignments", tags=["alignments"])


class PhotoCoordBody(BaseModel):
    x: float
    y: float


class ModelCoordBody(BaseModel):
    x: float
    y: float
    z: float


class LandmarkDataBody(BaseModel):
    id: str
    anatomicId: str
    photoCoord: Optional[PhotoCoordBody] = None
    modelCoord: Optional[ModelCoordBody] = None


class TransformBody(BaseModel):
    scale: float
    rotateX: float
    rotateY: float
    rotateZ: float
    translateX: float
    translateY: float
    translateZ: float


class CameraPositionBody(BaseModel):
    x: float
    y: float
    z: float


class AlignmentResultBody(BaseModel):
    transform: TransformBody
    cameraPosition: CameraPositionBody
    cameraTarget: CameraPositionBody
    meanErrorPx: float
    quality: str


class AlignmentCreateBody(BaseModel):
    photoAssetId: str
    scanAssetId: str
    landmarks: list[LandmarkDataBody]
    transform: TransformBody
    quality: str


@router.get("/{alignment_id}")
async def get_alignment(alignment_id: str):
    alignment = await landmark_model.get_landmark_alignment_by_id(alignment_id)
    if not alignment:
        raise HTTPException(404, "Alignment not found")
    return alignment


@router.delete("/{alignment_id}")
async def delete_alignment(alignment_id: str):
    alignment = await landmark_model.delete_landmark_alignment(alignment_id)
    if not alignment:
        raise HTTPException(404, "Alignment not found")
    return alignment
