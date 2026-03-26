from prisma import Prisma
from typing import TypedDict, Optional


class PhotoCoord(TypedDict):
    x: float
    y: float


class ModelCoord(TypedDict):
    x: float
    y: float
    z: float


class LandmarkData(TypedDict):
    id: str
    anatomicId: str
    photoCoord: Optional[PhotoCoord]
    modelCoord: Optional[ModelCoord]


class CameraPosition(TypedDict):
    x: float
    y: float
    z: float


class AlignmentTransform(TypedDict):
    scale: float
    rotateX: float
    rotateY: float
    rotateZ: float
    translateX: float
    translateY: float
    translateZ: float


class AlignmentResult(TypedDict):
    transform: AlignmentTransform
    cameraPosition: CameraPosition
    cameraTarget: CameraPosition
    meanErrorPx: float
    quality: str


async def save_landmark_alignment(
    case_id: str,
    photo_asset_id: str,
    scan_asset_id: str,
    landmarks: list[LandmarkData],
    result: AlignmentResult,
):
    db = Prisma()
    await db.connect()
    alignment = await db.landmarkalignment.upsert(
        where={
            "caseId_photoAssetId_scanAssetId": {
                "caseId": case_id,
                "photoAssetId": photo_asset_id,
                "scanAssetId": scan_asset_id,
            }
        },
        data={
            "update": {
                "landmarks": landmarks,
                "transform": result,
                "quality": result["quality"],
            },
            "create": {
                "caseId": case_id,
                "photoAssetId": photo_asset_id,
                "scanAssetId": scan_asset_id,
                "landmarks": landmarks,
                "transform": result,
                "quality": result["quality"],
            },
        },
    )
    await db.disconnect()
    return alignment


async def get_landmark_alignment(case_id: str, photo_asset_id: str, scan_asset_id: str):
    db = Prisma()
    await db.connect()
    alignment = await db.landmarkalignment.find_unique(
        where={
            "caseId_photoAssetId_scanAssetId": {
                "caseId": case_id,
                "photoAssetId": photo_asset_id,
                "scanAssetId": scan_asset_id,
            }
        }
    )
    await db.disconnect()
    return alignment


async def get_landmark_alignment_by_id(id: str):
    db = Prisma()
    await db.connect()
    alignment = await db.landmarkalignment.find_unique(
        where={"id": id},
        include={"photoAsset": True, "scanAsset": True},
    )
    await db.disconnect()
    return alignment


async def list_landmark_alignments(case_id: str):
    db = Prisma()
    await db.connect()
    alignments = await db.landmarkalignment.find_many(
        where={"caseId": case_id},
        include={"photoAsset": True, "scanAsset": True},
    )
    await db.disconnect()
    return alignments


async def delete_landmark_alignment(id: str):
    db = Prisma()
    await db.connect()
    alignment = await db.landmarkalignment.delete(where={"id": id})
    await db.disconnect()
    return alignment
