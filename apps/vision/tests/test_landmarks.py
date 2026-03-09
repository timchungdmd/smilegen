# apps/vision/tests/test_landmarks.py
import pytest
from httpx import AsyncClient, ASGITransport
from pathlib import Path
from src.main import app

FIXTURE = Path(__file__).parent / "fixtures" / "smile_test.jpg"

@pytest.mark.anyio
async def test_landmarks_returns_468_points():
    with open(FIXTURE, "rb") as f:
        image_bytes = f.read()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/landmarks/detect",
            files={"image": ("smile.jpg", image_bytes, "image/jpeg")},
        )
    assert response.status_code == 200
    data = response.json()
    assert len(data["landmarks"]) == 468
    assert "midlineX" in data
    assert "interpupillaryLine" in data
    assert "lipContour" in data
