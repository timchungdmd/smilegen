# apps/api/src/routers/cases.py
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from prisma import Prisma

router = APIRouter(prefix="/cases", tags=["cases"])

class CaseCreate(BaseModel):
    patientId: str
    title: str = "New Case"

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
