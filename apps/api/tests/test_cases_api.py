# apps/api/tests/test_cases_api.py
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app

@pytest.mark.anyio
async def test_create_and_list_cases():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create patient
        r = await client.post("/patients", json={"name": "Jane Doe", "dateOfBirth": "1990-01-01"})
        assert r.status_code == 201
        patient_id = r.json()["id"]

        # Create case
        r = await client.post("/cases", json={"patientId": patient_id, "title": "Veneer Consult"})
        assert r.status_code == 201
        case_id = r.json()["id"]
        assert r.json()["status"] == "DRAFT"

        # List cases for patient
        r = await client.get(f"/cases?patientId={patient_id}")
        assert r.status_code == 200
        assert any(c["id"] == case_id for c in r.json())
