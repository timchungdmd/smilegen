# apps/vision/tests/test_masks.py
import pytest
from httpx import AsyncClient, ASGITransport
from pathlib import Path
from src.main import app

FIXTURE = Path(__file__).parent / "fixtures" / "smile_test.jpg"

@pytest.mark.anyio
async def test_mouth_mask_returns_png():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        with open(FIXTURE, "rb") as f:
            r = await client.post("/masks/mouth", files={"image": ("s.jpg", f, "image/jpeg")})
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert len(r.content) > 1000  # Should be a real PNG
