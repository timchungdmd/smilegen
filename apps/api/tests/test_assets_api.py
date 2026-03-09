# apps/api/tests/test_assets_api.py
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app

@pytest.mark.anyio
async def test_presign_upload_returns_url(monkeypatch):
    # Mock storage service to avoid real AWS calls in tests
    from src.services import storage
    monkeypatch.setattr(storage, "generate_upload_url", lambda key, ct, **kw: f"https://s3.test/{key}")
    monkeypatch.setattr(storage, "ensure_bucket_exists", lambda: None)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First create a case
        r = await client.post("/patients", json={"name": "P", "dateOfBirth": "1990-01-01"})
        pid = r.json()["id"]
        r = await client.post("/cases", json={"patientId": pid, "title": "T"})
        case_id = r.json()["id"]

        r = await client.post("/assets/presign", json={
            "caseId": case_id,
            "assetType": "PHOTO_FRONTAL_SMILE",
            "filename": "smile.jpg",
            "sizeBytes": 204800,
        })
        assert r.status_code == 200
        data = r.json()
        assert "uploadUrl" in data
        assert "assetId" in data
