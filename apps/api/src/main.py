# apps/api/src/main.py
from fastapi import FastAPI
from .config import settings
from .routers import patients, cases, assets, alignments

app = FastAPI(title="SmileGen API", version="0.1.0")

app.include_router(patients.router)
app.include_router(cases.router)
app.include_router(assets.router)
app.include_router(alignments.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
