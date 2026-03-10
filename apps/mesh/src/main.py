# apps/mesh/src/main.py
from fastapi import FastAPI

app = FastAPI(title="SmileGen Mesh Service", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mesh"}
