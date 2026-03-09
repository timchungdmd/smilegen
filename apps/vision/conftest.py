import pytest

# Restrict all tests to asyncio backend (mediapipe/cv2 are asyncio-compatible only)
@pytest.fixture(params=["asyncio"])
def anyio_backend():
    return "asyncio"
