# apps/vision/src/main.py
from fastapi import FastAPI
from .routers import landmarks

app = FastAPI(title="SmileGen Vision Service", version="0.1.0")

app.include_router(landmarks.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "vision"}
