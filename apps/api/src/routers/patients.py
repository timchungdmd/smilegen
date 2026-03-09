# apps/api/src/routers/patients.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
from prisma import Prisma

router = APIRouter(prefix="/patients", tags=["patients"])

class PatientCreate(BaseModel):
    name: str
    dateOfBirth: date

@router.post("", status_code=201)
async def create_patient(body: PatientCreate):
    db = Prisma()
    await db.connect()
    patient = await db.patient.create(data={
        "name": body.name,
        "dateOfBirth": body.dateOfBirth.isoformat() + "T00:00:00Z",
    })
    await db.disconnect()
    return patient

@router.get("")
async def list_patients():
    db = Prisma()
    await db.connect()
    patients = await db.patient.find_many()
    await db.disconnect()
    return patients
