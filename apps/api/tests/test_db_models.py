# apps/api/tests/test_db_models.py
import pytest
from prisma import Prisma

@pytest.fixture
async def db():
    client = Prisma()
    await client.connect()
    yield client
    await client.disconnect()

@pytest.mark.anyio
async def test_create_patient_and_case(db: Prisma):
    patient = await db.patient.create(data={
        "name": "Test Patient",
        "dateOfBirth": "1985-06-15T00:00:00Z",
    })
    assert patient.id is not None

    case = await db.case.create(data={
        "patientId": patient.id,
        "title": "Full Smile Makeover",
    })
    assert case.status == "DRAFT"

    # cleanup
    await db.case.delete(where={"id": case.id})
    await db.patient.delete(where={"id": patient.id})
