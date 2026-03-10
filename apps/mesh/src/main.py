# apps/mesh/src/main.py
from fastapi import FastAPI
from .routers import synthesis

app = FastAPI(title="SmileGen Mesh Service", version="0.1.0")

app.include_router(synthesis.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mesh"}
