# apps/api/src/main.py
from fastapi import FastAPI
from .config import settings

app = FastAPI(title="SmileGen API", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok"}
