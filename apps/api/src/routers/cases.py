# apps/api/src/routers/cases.py
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from prisma import Prisma
from ..models import landmark as landmark_model

router = APIRouter(prefix="/cases", tags=["cases"])


class CaseCreate(BaseModel):
    patientId: str
    title: str = "New Case"


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


class AlignmentCreateBody(BaseModel):
    photoAssetId: str
    scanAssetId: str
    landmarks: list[LandmarkDataBody]
    transform: TransformBody
    cameraPosition: CameraPositionBody
    cameraTarget: CameraPositionBody
    meanErrorPx: float
    quality: str


@router.post("", status_code=201)
async def create_case(body: CaseCreate):
    db = Prisma()
    await db.connect()
    case = await db.case.create(data={"patientId": body.patientId, "title": body.title})
    await db.disconnect()
    return case


@router.get("")
async def list_cases(patientId: Optional[str] = Query(None)):
    db = Prisma()
    await db.connect()
    where = {"patientId": patientId} if patientId else {}
    cases = await db.case.find_many(where=where)
    await db.disconnect()
    return cases


@router.get("/{case_id}")
async def get_case(case_id: str):
    db = Prisma()
    await db.connect()
    case = await db.case.find_unique(where={"id": case_id})
    await db.disconnect()
    return case


@router.get("/{case_id}/alignments")
async def list_case_alignments(case_id: str):
    alignments = await landmark_model.list_landmark_alignments(case_id)
    return alignments


@router.post("/{case_id}/alignments")
async def create_case_alignment(case_id: str, body: AlignmentCreateBody):
    landmarks = [l.model_dump() for l in body.landmarks]
    result = {
        "transform": body.transform.model_dump(),
        "cameraPosition": body.cameraPosition.model_dump(),
        "cameraTarget": body.cameraTarget.model_dump(),
        "meanErrorPx": body.meanErrorPx,
        "quality": body.quality,
    }
    alignment = await landmark_model.save_landmark_alignment(
        case_id, body.photoAssetId, body.scanAssetId, landmarks, result
    )
    return alignment
