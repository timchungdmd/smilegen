# SmileGen Cloud-Native Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the existing SmileGen desktop app into a full cloud-native Digital Smile Design platform by adding a FastAPI backend, PostgreSQL persistence, S3 asset storage, an AI/CV facial landmark microservice, PBR dental materials, a Gimbal tooth manipulation UI, and a crown/veneer boolean mesh generation engine.

**Architecture:** Five sequential phases — cloud infrastructure first (unblocks everything), then AI/CV (unblocks auto-alignment), then renderer enhancements, then Gimbal UI, then the mesh synthesis engine. Each phase delivers independently runnable software. The backend lives in `apps/api` (FastAPI/Python), the AI service in `apps/vision` (Python microservice), and the frontend stays in `apps/desktop` (Vite/React/TypeScript).

**Tech Stack:** FastAPI, Prisma (Python via `prisma` package), PostgreSQL, AWS S3 (boto3), MediaPipe, OpenCV, PyTorch, trimesh + PyMesh (boolean ops), Three.js `TransformControls` + `@react-three/drei`, pnpm workspaces, Docker Compose (local dev)

---

## Phase 1 — Cloud Infrastructure & Data Ingestion

### Task 1.1: Bootstrap FastAPI app in apps/api

**Files:**
- Create: `apps/api/pyproject.toml`
- Create: `apps/api/src/__init__.py`
- Create: `apps/api/src/main.py`
- Create: `apps/api/src/config.py`
- Create: `apps/api/tests/__init__.py`
- Create: `apps/api/tests/test_health.py`

**Step 1: Create pyproject.toml**

```toml
# apps/api/pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "smilegen-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.29",
    "prisma>=0.13",
    "boto3>=1.34",
    "python-multipart>=0.0.9",
    "python-jose[cryptography]>=3.3",
    "passlib[bcrypt]>=1.7",
    "pydantic-settings>=2.2",
    "httpx>=0.27",  # for test client
]

[tool.hatch.envs.default.scripts]
dev = "uvicorn src.main:app --reload --port 8000"
test = "pytest tests/ -v"
```

**Step 2: Write the failing health-check test**

```python
# apps/api/tests/test_health.py
from httpx import AsyncClient, ASGITransport
import pytest
from src.main import app

@pytest.mark.anyio
async def test_health_returns_ok():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Step 3: Run test to verify it fails**

```bash
cd apps/api
pip install -e ".[dev]" 2>/dev/null || pip install hatchling && pip install -e .
pytest tests/test_health.py -v
```
Expected: FAIL with "ModuleNotFoundError: No module named 'src'"

**Step 4: Create src/main.py**

```python
# apps/api/src/main.py
from fastapi import FastAPI
from .config import settings

app = FastAPI(title="SmileGen API", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 5: Create src/config.py**

```python
# apps/api/src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://smilegen:smilegen@localhost:5432/smilegen"
    aws_bucket: str = "smilegen-assets"
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    secret_key: str = "dev-secret-change-in-prod"

    class Config:
        env_file = ".env"

settings = Settings()
```

**Step 6: Run test to verify it passes**

```bash
pytest tests/test_health.py -v
```
Expected: PASS

**Step 7: Commit**

```bash
git add apps/api/
git commit -m "feat: bootstrap FastAPI app with health endpoint"
```

---

### Task 1.2: Docker Compose for local PostgreSQL + S3 (LocalStack)

**Files:**
- Create: `docker-compose.yml` (project root)
- Create: `apps/api/.env.example`

**Step 1: Create docker-compose.yml**

```yaml
# docker-compose.yml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: smilegen
      POSTGRES_PASSWORD: smilegen
      POSTGRES_DB: smilegen
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  localstack:
    image: localstack/localstack:3
    environment:
      SERVICES: s3
      DEFAULT_REGION: us-east-1
      AWS_ACCESS_KEY_ID: test
      AWS_SECRET_ACCESS_KEY: test
    ports:
      - "4566:4566"
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  postgres_data:
  localstack_data:
```

**Step 2: Create .env.example**

```bash
# apps/api/.env.example
DATABASE_URL=postgresql://smilegen:smilegen@localhost:5432/smilegen
AWS_BUCKET=smilegen-assets
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
# For localstack:
AWS_ENDPOINT_URL=http://localhost:4566
SECRET_KEY=dev-secret-change-in-prod
```

**Step 3: Start services and verify**

```bash
cp apps/api/.env.example apps/api/.env
docker compose up -d
docker compose ps
```
Expected: Both `db` and `localstack` show status `running`.

**Step 4: Commit**

```bash
git add docker-compose.yml apps/api/.env.example
git commit -m "chore: add Docker Compose for local PostgreSQL and LocalStack S3"
```

---

### Task 1.3: Define Prisma schema (Patient, Case, Asset)

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/tests/test_db_models.py`

**Step 1: Create schema.prisma**

```prisma
// apps/api/prisma/schema.prisma
generator client {
  provider             = "prisma-client-py"
  interface            = "asyncio"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Patient {
  id          String   @id @default(cuid())
  name        String
  dateOfBirth DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  cases       Case[]
}

model Case {
  id        String     @id @default(cuid())
  patientId String
  patient   Patient    @relation(fields: [patientId], references: [id], onDelete: Cascade)
  status    CaseStatus @default(DRAFT)
  title     String     @default("New Case")
  planJson  String?    @db.Text
  designJson String?   @db.Text
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  assets    Asset[]
}

enum CaseStatus {
  DRAFT
  IN_PROGRESS
  READY
  ARCHIVED
}

model Asset {
  id        String    @id @default(cuid())
  caseId    String
  case      Case      @relation(fields: [caseId], references: [id], onDelete: Cascade)
  type      AssetType
  filename  String
  s3Key     String
  sizeBytes BigInt
  mimeType  String
  createdAt DateTime  @default(now())
}

enum AssetType {
  PHOTO_FRONTAL_SMILE
  PHOTO_RETRACTED
  SCAN_UPPER_JAW
  SCAN_LOWER_JAW
  SCAN_TOOTH_LIBRARY
  CBCT
  EXPORT_STL
  EXPORT_PLY
  LANDMARK_JSON
}
```

**Step 2: Run migration**

```bash
cd apps/api
pip install prisma
prisma generate
prisma db push
```
Expected: "Your database is now in sync with your Prisma schema"

**Step 3: Write test for model creation**

```python
# apps/api/tests/test_db_models.py
import pytest
from prisma import Prisma

@pytest.fixture
async def db():
    client = Prisma()
    await client.connect()
    yield client
    await client.disconnect()

@pytest.mark.anyio
async def test_create_patient_and_case(db: Prisma):
    patient = await db.patient.create(data={
        "name": "Test Patient",
        "dateOfBirth": "1985-06-15T00:00:00Z",
    })
    assert patient.id is not None

    case = await db.case.create(data={
        "patientId": patient.id,
        "title": "Full Smile Makeover",
    })
    assert case.status == "DRAFT"

    # cleanup
    await db.case.delete(where={"id": case.id})
    await db.patient.delete(where={"id": patient.id})
```

**Step 4: Run test**

```bash
pytest tests/test_db_models.py -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/prisma/ apps/api/tests/test_db_models.py
git commit -m "feat: define Prisma schema for Patient, Case, Asset with PostgreSQL"
```

---

### Task 1.4: CRUD REST endpoints for Patients and Cases

**Files:**
- Create: `apps/api/src/routers/patients.py`
- Create: `apps/api/src/routers/cases.py`
- Modify: `apps/api/src/main.py`
- Create: `apps/api/tests/test_cases_api.py`

**Step 1: Write failing tests**

```python
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
```

**Step 2: Run test — verify it fails**

```bash
pytest tests/test_cases_api.py -v
```
Expected: FAIL with 404

**Step 3: Create patients router**

```python
# apps/api/src/routers/patients.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
from prisma import Prisma

router = APIRouter(prefix="/patients", tags=["patients"])

class PatientCreate(BaseModel):
    name: str
    dateOfBirth: date

@router.post("", status_code=201)
async def create_patient(body: PatientCreate):
    db = Prisma()
    await db.connect()
    patient = await db.patient.create(data={
        "name": body.name,
        "dateOfBirth": body.dateOfBirth.isoformat() + "T00:00:00Z",
    })
    await db.disconnect()
    return patient

@router.get("")
async def list_patients():
    db = Prisma()
    await db.connect()
    patients = await db.patient.find_many()
    await db.disconnect()
    return patients
```

**Step 4: Create cases router**

```python
# apps/api/src/routers/cases.py
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from prisma import Prisma

router = APIRouter(prefix="/cases", tags=["cases"])

class CaseCreate(BaseModel):
    patientId: str
    title: str = "New Case"

@router.post("", status_code=201)
async def create_case(body: CaseCreate):
    db = Prisma()
    await db.connect()
    case = await db.case.create(data={"patientId": body.patientId, "title": body.title})
    await db.disconnect()
    return case

@router.get("")
async def list_cases(patientId: Optional[str] = Query(None)):
    db = Prisma()
    await db.connect()
    where = {"patientId": patientId} if patientId else {}
    cases = await db.case.find_many(where=where)
    await db.disconnect()
    return cases

@router.get("/{case_id}")
async def get_case(case_id: str):
    db = Prisma()
    await db.connect()
    case = await db.case.find_unique(where={"id": case_id})
    await db.disconnect()
    return case
```

**Step 5: Register routers in main.py**

```python
# Add to apps/api/src/main.py
from .routers import patients, cases
app.include_router(patients.router)
app.include_router(cases.router)
```

**Step 6: Run tests**

```bash
pytest tests/test_cases_api.py -v
```
Expected: PASS

**Step 7: Commit**

```bash
git add apps/api/src/routers/ apps/api/src/main.py apps/api/tests/test_cases_api.py
git commit -m "feat: add CRUD REST endpoints for patients and cases"
```

---

### Task 1.5: S3 signed-URL asset upload pipeline

**Files:**
- Create: `apps/api/src/services/storage.py`
- Create: `apps/api/src/routers/assets.py`
- Create: `apps/api/tests/test_assets_api.py`

**Step 1: Create storage service**

```python
# apps/api/src/services/storage.py
import boto3
from botocore.config import Config
from ..config import settings

def get_s3_client():
    kwargs = dict(
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        config=Config(signature_version="s3v4"),
    )
    # Support LocalStack endpoint override
    if hasattr(settings, "aws_endpoint_url") and settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client("s3", **kwargs)

def generate_upload_url(s3_key: str, content_type: str, expires: int = 3600) -> str:
    """Return a pre-signed PUT URL for direct browser-to-S3 upload."""
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.aws_bucket,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )

def generate_download_url(s3_key: str, expires: int = 3600) -> str:
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.aws_bucket, "Key": s3_key},
        ExpiresIn=expires,
    )

def ensure_bucket_exists():
    """Create bucket if it doesn't exist (for LocalStack dev)."""
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=settings.aws_bucket)
    except Exception:
        s3.create_bucket(Bucket=settings.aws_bucket)
```

**Step 2: Create assets router**

```python
# apps/api/src/routers/assets.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from prisma import Prisma
from ..services.storage import generate_upload_url, generate_download_url, ensure_bucket_exists
import uuid

router = APIRouter(prefix="/assets", tags=["assets"])

ALLOWED_ASSET_TYPES = {
    "PHOTO_FRONTAL_SMILE", "PHOTO_RETRACTED",
    "SCAN_UPPER_JAW", "SCAN_LOWER_JAW",
    "SCAN_TOOTH_LIBRARY", "CBCT"
}

CONTENT_TYPE_MAP = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "stl": "application/octet-stream", "ply": "application/octet-stream",
    "obj": "application/octet-stream",
}

class PresignRequest(BaseModel):
    caseId: str
    assetType: str
    filename: str
    sizeBytes: int

@router.post("/presign")
async def presign_upload(body: PresignRequest):
    if body.assetType not in ALLOWED_ASSET_TYPES:
        raise HTTPException(400, f"Invalid asset type: {body.assetType}")

    ext = body.filename.rsplit(".", 1)[-1].lower()
    content_type = CONTENT_TYPE_MAP.get(ext, "application/octet-stream")
    s3_key = f"cases/{body.caseId}/{body.assetType}/{uuid.uuid4()}/{body.filename}"

    ensure_bucket_exists()
    upload_url = generate_upload_url(s3_key, content_type)

    # Register asset record (before upload completes)
    db = Prisma()
    await db.connect()
    asset = await db.asset.create(data={
        "caseId": body.caseId,
        "type": body.assetType,
        "filename": body.filename,
        "s3Key": s3_key,
        "sizeBytes": body.sizeBytes,
        "mimeType": content_type,
    })
    await db.disconnect()

    return {"uploadUrl": upload_url, "assetId": asset.id, "s3Key": s3_key}

@router.get("/{asset_id}/download-url")
async def get_download_url(asset_id: str):
    db = Prisma()
    await db.connect()
    asset = await db.asset.find_unique(where={"id": asset_id})
    await db.disconnect()
    if not asset:
        raise HTTPException(404, "Asset not found")
    url = generate_download_url(asset.s3Key)
    return {"downloadUrl": url, "filename": asset.filename}
```

**Step 3: Register router in main.py**

```python
from .routers import assets
app.include_router(assets.router)
```

**Step 4: Write integration test**

```python
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
```

**Step 5: Run tests**

```bash
pytest tests/test_assets_api.py -v
```
Expected: PASS

**Step 6: Commit**

```bash
git add apps/api/src/services/ apps/api/src/routers/assets.py apps/api/tests/test_assets_api.py
git commit -m "feat: S3 signed-URL asset upload pipeline with Prisma asset records"
```

---

## Phase 2 — AI/CV Facial Landmark Detection

### Task 2.1: Bootstrap apps/vision Python microservice

**Files:**
- Create: `apps/vision/pyproject.toml`
- Create: `apps/vision/src/__init__.py`
- Create: `apps/vision/src/main.py`
- Create: `apps/vision/tests/__init__.py`

**Step 1: Create pyproject.toml**

```toml
# apps/vision/pyproject.toml
[project]
name = "smilegen-vision"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.29",
    "mediapipe>=0.10",
    "opencv-python-headless>=4.9",
    "numpy>=1.26",
    "Pillow>=10.3",
    "httpx>=0.27",
    "boto3>=1.34",
]
```

**Step 2: Create src/main.py**

```python
# apps/vision/src/main.py
from fastapi import FastAPI

app = FastAPI(title="SmileGen Vision Service", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "vision"}
```

**Step 3: Commit**

```bash
git add apps/vision/
git commit -m "feat: bootstrap vision microservice (FastAPI + MediaPipe)"
```

---

### Task 2.2: MediaPipe 468-point facial landmark detection endpoint

**Files:**
- Create: `apps/vision/src/services/landmark_detector.py`
- Create: `apps/vision/src/routers/landmarks.py`
- Create: `apps/vision/tests/test_landmarks.py`
- Add test fixture: `apps/vision/tests/fixtures/smile_test.jpg` (any frontal face photo)

**Step 1: Write failing test**

```python
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
```

**Step 2: Run to verify it fails**

```bash
cd apps/vision
pip install -e .
pytest tests/test_landmarks.py -v
```
Expected: FAIL with 404 (route not defined)

**Step 3: Create landmark_detector.py**

```python
# apps/vision/src/services/landmark_detector.py
import mediapipe as mp
import cv2
import numpy as np
from dataclasses import dataclass
from typing import Optional

mp_face_mesh = mp.solutions.face_mesh

# MediaPipe landmark indices for key anatomical features
# https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
LEFT_EYE_CENTER = 468   # iris center (with refine_landmarks=True)
RIGHT_EYE_CENTER = 473  # iris center
UPPER_LIP_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]
LOWER_LIP_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291]
UPPER_LIP_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]
LOWER_LIP_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308]
NOSE_TIP = 1
CHIN = 152

@dataclass
class LandmarkResult:
    landmarks: list[dict]          # All 468 points {x, y, z}
    midlineX: float                # Normalized x of facial midline
    interpupillaryLine: dict       # {leftX, leftY, rightX, rightY}
    lipContour: dict               # {outer: [...], inner: [...]}
    mouthMaskBbox: dict            # {xMin, yMin, xMax, yMax} normalized

def detect_landmarks(image_bytes: bytes) -> Optional[LandmarkResult]:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]

    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,    # enables iris landmarks 468-477
        min_detection_confidence=0.5
    ) as face_mesh:
        results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return None

    face = results.multi_face_landmarks[0]
    lms = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in face.landmark]

    # Facial midline: average of nose tip and chin
    midline_x = (lms[NOSE_TIP]["x"] + lms[CHIN]["x"]) / 2

    # Interpupillary line (iris centers, indices 468 & 473 with refine_landmarks)
    left_iris = lms[468] if len(lms) > 468 else lms[33]   # fallback
    right_iris = lms[473] if len(lms) > 473 else lms[263]

    # Lip contours
    outer = [lms[i] for i in UPPER_LIP_OUTER] + [lms[i] for i in reversed(LOWER_LIP_OUTER)]
    inner = [lms[i] for i in UPPER_LIP_INNER] + [lms[i] for i in reversed(LOWER_LIP_INNER)]

    # Mouth bounding box from inner lip contour
    xs = [p["x"] for p in inner]
    ys = [p["y"] for p in inner]

    return LandmarkResult(
        landmarks=lms,
        midlineX=midline_x,
        interpupillaryLine={
            "leftX": left_iris["x"], "leftY": left_iris["y"],
            "rightX": right_iris["x"], "rightY": right_iris["y"],
        },
        lipContour={"outer": outer, "inner": inner},
        mouthMaskBbox={"xMin": min(xs), "yMin": min(ys), "xMax": max(xs), "yMax": max(ys)},
    )
```

**Step 4: Create landmarks router**

```python
# apps/vision/src/routers/landmarks.py
from fastapi import APIRouter, UploadFile, HTTPException
from ..services.landmark_detector import detect_landmarks

router = APIRouter(prefix="/landmarks", tags=["landmarks"])

@router.post("/detect")
async def detect(image: UploadFile):
    if not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    image_bytes = await image.read()
    result = detect_landmarks(image_bytes)
    if result is None:
        raise HTTPException(422, "No face detected in image")
    return {
        "landmarks": result.landmarks,
        "midlineX": result.midlineX,
        "interpupillaryLine": result.interpupillaryLine,
        "lipContour": result.lipContour,
        "mouthMaskBbox": result.mouthMaskBbox,
    }
```

**Step 5: Register router in vision main.py**

```python
from .routers import landmarks
app.include_router(landmarks.router)
```

**Step 6: Add a small test fixture image**

Download any public-domain frontal face photo (or use a synthetic face) and save to `apps/vision/tests/fixtures/smile_test.jpg`.

```bash
# Using a royalty-free test face from thispersondoesnotexist equivalent
curl -L "https://picsum.photos/400/500" -o apps/vision/tests/fixtures/smile_test.jpg
```

**Step 7: Run tests**

```bash
pytest tests/test_landmarks.py -v
```
Expected: PASS — 468 landmarks detected

**Step 8: Commit**

```bash
git add apps/vision/src/ apps/vision/tests/
git commit -m "feat: MediaPipe 468-point facial landmark detection endpoint"
```

---

### Task 2.3: Mouth mask generation endpoint

**Files:**
- Create: `apps/vision/src/services/mask_generator.py`
- Create: `apps/vision/src/routers/masks.py`
- Create: `apps/vision/tests/test_masks.py`

**Step 1: Create mask generator**

```python
# apps/vision/src/services/mask_generator.py
import cv2
import numpy as np
from PIL import Image
import io

def generate_mouth_mask(image_bytes: bytes, lip_contour_inner: list[dict]) -> bytes:
    """
    Returns a PNG with the mouth interior alpha-masked out (set to transparent).
    The output is RGBA — the interior of the inner lip contour is transparent.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    h, w = bgr.shape[:2]

    # Convert normalized coordinates to pixel coordinates
    pts = np.array(
        [[int(p["x"] * w), int(p["y"] * h)] for p in lip_contour_inner],
        dtype=np.int32,
    )

    # Create alpha mask: 255 everywhere, 0 inside mouth
    alpha = np.ones((h, w), dtype=np.uint8) * 255
    cv2.fillPoly(alpha, [pts], 0)

    # Build RGBA image
    rgba = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = alpha

    # Encode as PNG
    pil_img = Image.fromarray(rgba)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return buf.getvalue()
```

**Step 2: Create masks router**

```python
# apps/vision/src/routers/masks.py
from fastapi import APIRouter, UploadFile, HTTPException
from fastapi.responses import Response
from ..services.landmark_detector import detect_landmarks
from ..services.mask_generator import generate_mouth_mask

router = APIRouter(prefix="/masks", tags=["masks"])

@router.post("/mouth")
async def generate_mask(image: UploadFile):
    image_bytes = await image.read()
    result = detect_landmarks(image_bytes)
    if result is None:
        raise HTTPException(422, "No face detected")
    masked_png = generate_mouth_mask(image_bytes, result.lipContour["inner"])
    return Response(content=masked_png, media_type="image/png")
```

**Step 3: Write test**

```python
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
```

**Step 4: Run test**

```bash
pytest tests/test_masks.py -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add apps/vision/src/services/mask_generator.py apps/vision/src/routers/masks.py
git add apps/vision/tests/test_masks.py apps/vision/src/main.py
git commit -m "feat: mouth alpha-mask generation from inner lip contour"
```

---

## Phase 3 — PBR Dental Material Enhancements

### Task 3.1: Custom PBR tooth shader (enamel translucency)

**Files:**
- Create: `apps/desktop/src/features/viewer/materials/toothMaterial.ts`
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

**Step 1: Create tooth material**

```typescript
// apps/desktop/src/features/viewer/materials/toothMaterial.ts
import * as THREE from "three";

/** PBR-approximating dental enamel material.
 *  Uses MeshPhysicalMaterial for transmission (translucency) and clearcoat (gloss).
 */
export function createToothMaterial(options?: {
  shade?: "A1" | "A2" | "A3" | "B1" | "B2";
}): THREE.MeshPhysicalMaterial {
  const shadeColors: Record<string, THREE.ColorRepresentation> = {
    A1: 0xf5f0e8, A2: 0xf0e8d5, A3: 0xe8d9b8, B1: 0xf8f2e4, B2: 0xf0e8d0,
  };
  const color = shadeColors[options?.shade ?? "A2"] ?? shadeColors.A2;

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.15,          // Polished enamel — low roughness
    metalness: 0.0,
    transmission: 0.08,       // Slight translucency — light passes through enamel
    thickness: 1.5,           // Enamel thickness for transmission depth
    ior: 1.65,                // Enamel refractive index
    clearcoat: 0.4,           // Gloss layer
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.8,
  });
}

/** Gingival (gum tissue) material with subsurface scattering approximation. */
export function createGingivalMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe8748a,
    roughness: 0.55,
    metalness: 0.0,
    transmission: 0.04,       // Very slight SSS approximation
    thickness: 0.8,
    clearcoat: 0.05,
  });
}
```

**Step 2: Use tooth material in SceneCanvas.tsx**

In `ToothMesh` component, replace the existing material with:
```typescript
import { createToothMaterial } from "./materials/toothMaterial";

// Inside ToothMesh:
const material = useMemo(() => createToothMaterial({ shade: tooth.shadeId as "A1" }), [tooth.shadeId]);
useEffect(() => () => material.dispose(), [material]);

// In JSX:
<mesh geometry={geometry}>
  <primitive object={material} attach="material" />
</mesh>
```

**Step 3: Commit**

```bash
git add apps/desktop/src/features/viewer/materials/ apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "feat: PBR dental enamel material with transmission and clearcoat"
```

---

### Task 3.2: Studio lighting setup for 3D dental viewport

**Files:**
- Create: `apps/desktop/src/features/viewer/DentalLighting.tsx`
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

**Step 1: Create DentalLighting component**

```typescript
// apps/desktop/src/features/viewer/DentalLighting.tsx
import { useRef } from "react";
import * as THREE from "three";

/** Dental studio lighting: key + fill + rim + ambient.
 *  Optimized to highlight line angles, surface texture, and translucency.
 */
export function DentalLighting() {
  return (
    <>
      {/* Ambient — prevents total black shadows */}
      <ambientLight intensity={0.35} color={0xfff8f0} />

      {/* Key light — main frontal illumination, slightly warm */}
      <directionalLight
        position={[0, 2, 3]}
        intensity={1.8}
        color={0xfff5e8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />

      {/* Fill light — soft from left, neutral */}
      <directionalLight position={[-2, 1, 1]} intensity={0.6} color={0xf0f4ff} />

      {/* Rim light — upper back, defines tooth silhouette */}
      <directionalLight position={[1, 3, -2]} intensity={0.4} color={0xffffff} />

      {/* Environment map for PBR reflections */}
      <mesh visible={false}>
        {/* Fallback: hemisphere light for IBL approximation when no env map */}
      </mesh>
      <hemisphereLight args={[0xfff8f0, 0x8090a0, 0.5]} />
    </>
  );
}
```

**Step 2: Replace existing lights in SceneCanvas.tsx**

Find `<ambientLight>` and `<directionalLight>` tags in SceneCanvas.tsx. Replace them with:
```typescript
import { DentalLighting } from "./DentalLighting";
// In Scene component:
<DentalLighting />
```

**Step 3: Commit**

```bash
git add apps/desktop/src/features/viewer/DentalLighting.tsx apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "feat: dental studio lighting setup (key+fill+rim+hemisphere)"
```

---

## Phase 4 — Gimbal UI & Parametric Tooth Manipulation

### Task 4.1: TransformControls Gimbal wrapper per tooth

**Files:**
- Create: `apps/desktop/src/features/viewer/GimbalTooth.tsx`
- Modify: `apps/desktop/src/features/viewer/SceneCanvas.tsx`

**Step 1: Install drei (if not already present)**

```bash
cd apps/desktop
pnpm add @react-three/drei
```

**Step 2: Create GimbalTooth.tsx**

```typescript
// apps/desktop/src/features/viewer/GimbalTooth.tsx
import { useRef, useEffect } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import type { GeneratedToothDesign } from "../engine/designEngine";

interface Props {
  tooth: GeneratedToothDesign;
  isSelected: boolean;
  gimbalMode: "translate" | "rotate" | "scale";
  onTransformEnd: (toothId: number, matrix: THREE.Matrix4) => void;
  children: React.ReactNode;
}

export function GimbalTooth({ tooth, isSelected, gimbalMode, onTransformEnd, children }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);

  useEffect(() => {
    if (!transformRef.current) return;
    const controls = transformRef.current;

    const handleChange = () => {
      if (!groupRef.current) return;
    };

    const handleMouseUp = () => {
      if (!groupRef.current) return;
      onTransformEnd(tooth.toothId, groupRef.current.matrix.clone());
    };

    controls.addEventListener("change", handleChange);
    controls.addEventListener("mouseUp", handleMouseUp);
    return () => {
      controls.removeEventListener("change", handleChange);
      controls.removeEventListener("mouseUp", handleMouseUp);
    };
  }, [tooth.toothId, onTransformEnd]);

  if (!isSelected) {
    return (
      <group
        position={[tooth.position.x, tooth.position.y, tooth.position.z]}
        rotation={[0, tooth.angle, 0]}
      >
        {children}
      </group>
    );
  }

  return (
    <TransformControls
      ref={transformRef}
      mode={gimbalMode}
      size={0.6}
      showX
      showY
      showZ
    >
      <group
        ref={groupRef}
        position={[tooth.position.x, tooth.position.y, tooth.position.z]}
        rotation={[0, tooth.angle, 0]}
      >
        {children}
      </group>
    </TransformControls>
  );
}
```

**Step 3: Add gimbalMode state to useViewportStore**

In `useViewportStore.ts`, add:
```typescript
gimbalMode: "translate" | "rotate" | "scale";
setGimbalMode: (m: "translate" | "rotate" | "scale") => void;
// In create():
gimbalMode: "translate",
setGimbalMode: (m) => set({ gimbalMode: m }),
```

**Step 4: Integrate GimbalTooth in SceneCanvas.tsx**

In the tooth rendering loop, wrap each `ToothMesh` with `<GimbalTooth>`:
```typescript
import { GimbalTooth } from "./GimbalTooth";

// In tooth render:
{variant.teeth.map((tooth) => (
  <GimbalTooth
    key={tooth.toothId}
    tooth={tooth}
    isSelected={selectedToothId === tooth.toothId}
    gimbalMode={gimbalMode}
    onTransformEnd={(id, matrix) => {
      // Extract translation and apply via moveTooth
      const pos = new THREE.Vector3();
      matrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
      moveTooth(id, pos.x - tooth.position.x, pos.y - tooth.position.y);
    }}
  >
    <ToothMesh tooth={tooth} />
  </GimbalTooth>
))}
```

**Step 5: Add Gimbal mode toolbar buttons in DesignToolbar.tsx**

```typescript
// In DesignToolbar.tsx, add gimbal controls:
const gimbalMode = useViewportStore((s) => s.gimbalMode);
const setGimbalMode = useViewportStore((s) => s.setGimbalMode);

<div style={{ display: "flex", gap: 4 }}>
  {(["translate", "rotate", "scale"] as const).map((mode) => (
    <button
      key={mode}
      aria-label={`Gimbal: ${mode}`}
      title={`${mode} (${mode[0].toUpperCase()})`}
      onClick={() => setGimbalMode(mode)}
      style={{
        background: gimbalMode === mode ? "var(--accent)" : "var(--surface-2)",
        border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer",
        color: "var(--text-primary)", fontSize: 11, textTransform: "capitalize",
      }}
    >
      {mode[0].toUpperCase()}
    </button>
  ))}
</div>
```

**Step 6: Commit**

```bash
git add apps/desktop/src/features/viewer/GimbalTooth.tsx
git add apps/desktop/src/store/useViewportStore.ts
git add apps/desktop/src/features/design/DesignToolbar.tsx
git add apps/desktop/src/features/viewer/SceneCanvas.tsx
git commit -m "feat: TransformControls Gimbal UI for per-tooth translate/rotate/scale"
```

---

## Phase 5 — Crown & Veneer Mesh Synthesis Engine

### Task 5.1: Bootstrap Python mesh-processing service in apps/mesh

**Files:**
- Create: `apps/mesh/pyproject.toml`
- Create: `apps/mesh/src/__init__.py`
- Create: `apps/mesh/src/main.py`
- Create: `apps/mesh/tests/__init__.py`

**Step 1: Create pyproject.toml**

```toml
# apps/mesh/pyproject.toml
[project]
name = "smilegen-mesh"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.29",
    "trimesh>=4.3",
    "numpy>=1.26",
    "scipy>=1.13",
    "httpx>=0.27",
]
```

Note: `trimesh` provides boolean operations via its `boolean` module (requires `manifold3d` or `blender` backend).

```bash
# For boolean ops, also install:
pip install manifold3d  # lightweight boolean engine used by trimesh
```

**Step 2: Create src/main.py**

```python
# apps/mesh/src/main.py
from fastapi import FastAPI

app = FastAPI(title="SmileGen Mesh Service", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "mesh"}
```

**Step 3: Commit**

```bash
git add apps/mesh/
git commit -m "feat: bootstrap mesh synthesis service (trimesh + manifold3d)"
```

---

### Task 5.2: Flood-fill margin line and intaglio extraction

**Files:**
- Create: `apps/mesh/src/services/intaglio.py`
- Create: `apps/mesh/tests/test_intaglio.py`

**Step 1: Write failing test**

```python
# apps/mesh/tests/test_intaglio.py
import pytest
import trimesh
import numpy as np
from src.services.intaglio import extract_intaglio, apply_cement_gap

def make_cylinder_mesh():
    """A simple cylinder to represent a prepared tooth stump."""
    return trimesh.creation.cylinder(radius=4.0, height=8.0, sections=32)

def test_intaglio_extraction_returns_valid_mesh():
    target = make_cylinder_mesh()
    # Margin: a circle at z=0 (midpoint of cylinder)
    margin_center = np.array([0.0, 0.0, 0.0])
    preparation = extract_intaglio(target, margin_center, margin_radius=3.5)
    assert isinstance(preparation, trimesh.Trimesh)
    assert len(preparation.faces) > 0

def test_cement_gap_inflates_mesh():
    target = make_cylinder_mesh()
    gap = apply_cement_gap(target, offset_mm=0.05)
    # Volume of gap mesh should be slightly larger than original
    assert gap.volume > target.volume
```

**Step 2: Run to verify it fails**

```bash
cd apps/mesh
pip install -e .
pytest tests/test_intaglio.py -v
```
Expected: FAIL with ModuleNotFoundError

**Step 3: Create intaglio.py**

```python
# apps/mesh/src/services/intaglio.py
import trimesh
import numpy as np
from trimesh.graph import connected_components

def extract_intaglio(
    target: trimesh.Trimesh,
    margin_center: np.ndarray,
    margin_radius: float,
) -> trimesh.Trimesh:
    """
    Flood-fill from margin_center outward up to margin_radius to extract
    the preparation mesh (intaglio surface). Reverses normals.

    Args:
        target: Patient's intraoral scan mesh
        margin_center: 3D point at the center of the margin line
        margin_radius: radius defining the margin boundary

    Returns:
        Preparation mesh with reversed normals (inner cavity surface)
    """
    vertices = target.vertices
    faces = target.faces

    # Find faces whose centroid is within margin_radius of margin_center
    centroids = vertices[faces].mean(axis=1)
    distances = np.linalg.norm(centroids - margin_center, axis=1)
    mask = distances <= margin_radius

    # Extract sub-mesh
    selected_faces = faces[mask]
    unique_verts, inv = np.unique(selected_faces, return_inverse=True)
    new_faces = inv.reshape(selected_faces.shape)
    new_verts = vertices[unique_verts]

    preparation = trimesh.Trimesh(vertices=new_verts, faces=new_faces, process=True)

    # Reverse normals to form interior cavity
    preparation.faces = preparation.faces[:, ::-1]
    preparation.fix_normals()

    return preparation


def apply_cement_gap(mesh: trimesh.Trimesh, offset_mm: float = 0.05) -> trimesh.Trimesh:
    """
    Inflate mesh outward by offset_mm to simulate cement gap.
    Uses vertex normal displacement.
    """
    mesh.fix_normals()
    displaced = mesh.vertices + mesh.vertex_normals * offset_mm
    return trimesh.Trimesh(vertices=displaced, faces=mesh.faces.copy(), process=True)
```

**Step 4: Run tests**

```bash
pytest tests/test_intaglio.py -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mesh/src/services/intaglio.py apps/mesh/tests/test_intaglio.py
git commit -m "feat: flood-fill intaglio extraction and cement gap inflation"
```

---

### Task 5.3: Crown boolean synthesis (CSG)

**Files:**
- Create: `apps/mesh/src/services/crown_generator.py`
- Create: `apps/mesh/tests/test_crown.py`

**Step 1: Write failing test**

```python
# apps/mesh/tests/test_crown.py
import trimesh
import numpy as np
from src.services.crown_generator import generate_crown

def make_test_meshes():
    # Library tooth: sphere approximation
    library = trimesh.creation.icosphere(radius=4.5, subdivisions=3)
    # Target (preparation): smaller cylinder
    target = trimesh.creation.cylinder(radius=3.5, height=6.0, sections=32)
    # Margin center at base of library tooth
    margin_center = np.array([0.0, 0.0, -2.0])
    return library, target, margin_center

def test_crown_generation_returns_watertight_mesh():
    library, target, margin_center = make_test_meshes()
    crown = generate_crown(library, target, margin_center, margin_radius=3.0)
    assert isinstance(crown, trimesh.Trimesh)
    assert len(crown.faces) > 0
    assert crown.is_watertight, "Crown mesh must be watertight for printing"
```

**Step 2: Create crown_generator.py**

```python
# apps/mesh/src/services/crown_generator.py
import trimesh
import numpy as np
from .intaglio import extract_intaglio, apply_cement_gap

def generate_crown(
    library_mesh: trimesh.Trimesh,
    target_mesh: trimesh.Trimesh,
    margin_center: np.ndarray,
    margin_radius: float,
    cement_gap_mm: float = 0.05,
) -> trimesh.Trimesh:
    """
    Boolean crown synthesis:
      Crown = L_adapted - P_gap

    Steps:
    1. Extract preparation (intaglio) from target
    2. Apply cement gap offset
    3. Boolean difference: library_mesh MINUS p_gap
    4. Smooth the seam
    """
    # Step 1: Extract intaglio
    preparation = extract_intaglio(target_mesh, margin_center, margin_radius)

    # Step 2: Apply cement gap
    p_gap = apply_cement_gap(preparation, offset_mm=cement_gap_mm)

    # Step 3: Boolean difference using trimesh + manifold3d
    try:
        crown = trimesh.boolean.difference([library_mesh, p_gap], engine="manifold")
    except Exception as e:
        # Fallback: try blender engine if manifold not available
        try:
            crown = trimesh.boolean.difference([library_mesh, p_gap], engine="blender")
        except Exception:
            raise RuntimeError(f"Boolean difference failed: {e}")

    # Step 4: Smooth the seam (Laplacian smoothing on boundary vertices)
    crown = _smooth_boolean_seam(crown, iterations=2)

    return crown


def _smooth_boolean_seam(mesh: trimesh.Trimesh, iterations: int = 2) -> trimesh.Trimesh:
    """Apply Laplacian smoothing to the boolean intersection seam."""
    # trimesh's smoothing via laplacian filter
    try:
        smoothed = trimesh.smoothing.filter_laplacian(mesh, iterations=iterations)
        return smoothed
    except Exception:
        return mesh  # Return unsmoothed if smoothing fails
```

**Step 3: Run tests**

```bash
pip install manifold3d
pytest tests/test_crown.py -v
```
Expected: PASS (crown is watertight)

**Step 4: Commit**

```bash
git add apps/mesh/src/services/crown_generator.py apps/mesh/tests/test_crown.py
git commit -m "feat: crown boolean synthesis (CSG) with cement gap and seam smoothing"
```

---

### Task 5.4: Veneer / mockup shell generation

**Files:**
- Create: `apps/mesh/src/services/veneer_generator.py`
- Create: `apps/mesh/tests/test_veneer.py`

**Step 1: Write failing test**

```python
# apps/mesh/tests/test_veneer.py
import trimesh
from src.services.veneer_generator import generate_veneer

def test_veneer_generation():
    library = trimesh.creation.icosphere(radius=4.5, subdivisions=3)
    target = trimesh.creation.icosphere(radius=4.0, subdivisions=3)
    veneer = generate_veneer(library, target, shell_thickness_mm=0.3)
    assert isinstance(veneer, trimesh.Trimesh)
    assert veneer.is_watertight
```

**Step 2: Create veneer_generator.py**

```python
# apps/mesh/src/services/veneer_generator.py
import trimesh
import numpy as np
from .intaglio import apply_cement_gap

def block_out_undercuts(mesh: trimesh.Trimesh, insertion_axis: np.ndarray = None) -> trimesh.Trimesh:
    """
    Project undercut vertices along the insertion axis to eliminate concavities.
    Insertion axis defaults to +Z (occlusal direction).
    """
    if insertion_axis is None:
        insertion_axis = np.array([0.0, 0.0, 1.0])
    insertion_axis = insertion_axis / np.linalg.norm(insertion_axis)

    mesh.fix_normals()
    normals = mesh.vertex_normals
    # Dot product: negative means face opposes insertion (undercut)
    dots = normals @ insertion_axis
    undercut_mask = dots < -0.01

    blocked_vertices = mesh.vertices.copy()
    # Project undercut vertices onto insertion axis plane (flatten along axis)
    if undercut_mask.any():
        verts = blocked_vertices[undercut_mask]
        projections = (verts @ insertion_axis)[:, np.newaxis] * insertion_axis
        blocked_vertices[undercut_mask] = verts - projections + (verts @ insertion_axis).min() * insertion_axis

    return trimesh.Trimesh(vertices=blocked_vertices, faces=mesh.faces.copy(), process=True)


def generate_veneer(
    library_mesh: trimesh.Trimesh,
    target_mesh: trimesh.Trimesh,
    shell_thickness_mm: float = 0.3,
    insertion_axis: np.ndarray = None,
) -> trimesh.Trimesh:
    """
    Veneer = L - T_inflated

    Steps:
    1. Block out undercuts in target
    2. Inflate target by shell_thickness to get inner boundary
    3. Boolean difference: library MINUS inflated_target
    """
    # Step 1: Block undercuts
    t_blocked = block_out_undercuts(target_mesh, insertion_axis)

    # Step 2: Inflate by shell thickness
    t_inflated = apply_cement_gap(t_blocked, offset_mm=shell_thickness_mm)

    # Step 3: Boolean difference
    try:
        veneer = trimesh.boolean.difference([library_mesh, t_inflated], engine="manifold")
    except Exception as e:
        raise RuntimeError(f"Veneer boolean failed: {e}")

    return veneer
```

**Step 3: Run tests**

```bash
pytest tests/test_veneer.py -v
```
Expected: PASS

**Step 4: Commit**

```bash
git add apps/mesh/src/services/veneer_generator.py apps/mesh/tests/test_veneer.py
git commit -m "feat: veneer shell generation with undercut block-out and boolean shelling"
```

---

### Task 5.5: REST endpoints for crown/veneer generation + PLY export

**Files:**
- Create: `apps/mesh/src/routers/synthesis.py`
- Create: `apps/mesh/tests/test_synthesis_api.py`
- Modify: `apps/mesh/src/main.py`

**Step 1: Create synthesis router**

```python
# apps/mesh/src/routers/synthesis.py
from fastapi import APIRouter, UploadFile, HTTPException, Form
from fastapi.responses import Response
import trimesh
import numpy as np
import io
from ..services.crown_generator import generate_crown
from ..services.veneer_generator import generate_veneer

router = APIRouter(prefix="/synthesis", tags=["synthesis"])

def load_mesh_from_bytes(data: bytes, filename: str) -> trimesh.Trimesh:
    ext = filename.rsplit(".", 1)[-1].lower()
    mesh = trimesh.load(io.BytesIO(data), file_type=ext, force="mesh")
    if not isinstance(mesh, trimesh.Trimesh):
        raise HTTPException(400, f"Could not parse mesh from {filename}")
    return mesh

def export_mesh(mesh: trimesh.Trimesh, format: str = "stl") -> bytes:
    buf = io.BytesIO()
    mesh.export(buf, file_type=format)
    return buf.getvalue()

@router.post("/crown")
async def synthesize_crown(
    library: UploadFile,
    target: UploadFile,
    margin_x: float = Form(0.0),
    margin_y: float = Form(0.0),
    margin_z: float = Form(0.0),
    margin_radius: float = Form(3.5),
    export_format: str = Form("ply"),
):
    lib_bytes = await library.read()
    tgt_bytes = await target.read()
    lib_mesh = load_mesh_from_bytes(lib_bytes, library.filename)
    tgt_mesh = load_mesh_from_bytes(tgt_bytes, target.filename)
    margin_center = np.array([margin_x, margin_y, margin_z])

    crown = generate_crown(lib_mesh, tgt_mesh, margin_center, margin_radius)

    if not crown.is_watertight:
        trimesh.repair.fix_winding(crown)
        trimesh.repair.fill_holes(crown)

    content = export_mesh(crown, format=export_format)
    media = "model/x.stl-binary" if export_format == "stl" else "application/octet-stream"
    return Response(content=content, media_type=media,
                    headers={"Content-Disposition": f"attachment; filename=crown.{export_format}"})

@router.post("/veneer")
async def synthesize_veneer(
    library: UploadFile,
    target: UploadFile,
    shell_thickness: float = Form(0.3),
    export_format: str = Form("ply"),
):
    lib_bytes = await library.read()
    tgt_bytes = await target.read()
    lib_mesh = load_mesh_from_bytes(lib_bytes, library.filename)
    tgt_mesh = load_mesh_from_bytes(tgt_bytes, target.filename)

    veneer = generate_veneer(lib_mesh, tgt_mesh, shell_thickness_mm=shell_thickness)
    content = export_mesh(veneer, format=export_format)
    return Response(content=content, media_type="application/octet-stream",
                    headers={"Content-Disposition": f"attachment; filename=veneer.{export_format}"})
```

**Step 2: Register router and update main.py**

```python
from .routers import synthesis
app.include_router(synthesis.router)
```

**Step 3: Write API test with synthetic meshes**

```python
# apps/mesh/tests/test_synthesis_api.py
import pytest
import trimesh
import io
from httpx import AsyncClient, ASGITransport
from src.main import app

def mesh_to_bytes(mesh: trimesh.Trimesh) -> bytes:
    buf = io.BytesIO()
    mesh.export(buf, file_type="stl")
    return buf.getvalue()

@pytest.mark.anyio
async def test_crown_synthesis_returns_ply():
    library = trimesh.creation.icosphere(radius=4.5, subdivisions=2)
    target = trimesh.creation.cylinder(radius=3.5, height=6.0, sections=16)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post("/synthesis/crown", data={
            "margin_x": "0", "margin_y": "0", "margin_z": "-1",
            "margin_radius": "3.0", "export_format": "ply",
        }, files={
            "library": ("lib.stl", mesh_to_bytes(library), "application/octet-stream"),
            "target":  ("tgt.stl", mesh_to_bytes(target),  "application/octet-stream"),
        })
    assert r.status_code == 200
    assert len(r.content) > 100
```

**Step 4: Run tests**

```bash
pytest tests/test_synthesis_api.py -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mesh/src/routers/synthesis.py apps/mesh/src/main.py
git add apps/mesh/tests/test_synthesis_api.py
git commit -m "feat: REST endpoints for crown and veneer synthesis with PLY/STL export"
```

---

### Task 5.6: Wire frontend export button to mesh synthesis API

**Files:**
- Create: `apps/desktop/src/services/meshSynthesisClient.ts`
- Modify: `apps/desktop/src/features/views/ExportView.tsx`

**Step 1: Create API client**

```typescript
// apps/desktop/src/services/meshSynthesisClient.ts
const MESH_API_URL = import.meta.env.VITE_MESH_API_URL ?? "http://localhost:8002";

export async function synthesizeCrown(
  libraryStlBlob: Blob,
  targetStlBlob: Blob,
  marginCenter: { x: number; y: number; z: number },
  marginRadius: number,
  format: "stl" | "ply" = "ply",
): Promise<Blob> {
  const form = new FormData();
  form.append("library", libraryStlBlob, "library.stl");
  form.append("target", targetStlBlob, "target.stl");
  form.append("margin_x", String(marginCenter.x));
  form.append("margin_y", String(marginCenter.y));
  form.append("margin_z", String(marginCenter.z));
  form.append("margin_radius", String(marginRadius));
  form.append("export_format", format);

  const res = await fetch(`${MESH_API_URL}/synthesis/crown`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Crown synthesis failed: ${res.status}`);
  return await res.blob();
}

export async function synthesizeVeneer(
  libraryStlBlob: Blob,
  targetStlBlob: Blob,
  shellThickness: number = 0.3,
  format: "stl" | "ply" = "ply",
): Promise<Blob> {
  const form = new FormData();
  form.append("library", libraryStlBlob, "library.stl");
  form.append("target", targetStlBlob, "target.stl");
  form.append("shell_thickness", String(shellThickness));
  form.append("export_format", format);

  const res = await fetch(`${MESH_API_URL}/synthesis/veneer`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Veneer synthesis failed: ${res.status}`);
  return await res.blob();
}
```

**Step 2: Add synthesis buttons in ExportView.tsx**

In `ExportView.tsx`, add two new export buttons:
```typescript
import { synthesizeCrown, synthesizeVeneer } from "../../services/meshSynthesisClient";
import { serializeToBinaryStl } from "../export/binaryStl";

async function handleExportCrown() {
  const variant = generatedDesign?.variants.find(v => v.id === activeVariantId);
  if (!variant || !archScanMesh) return;
  const allTriangles = variant.teeth.flatMap(t => t.previewTriangles);
  const libraryStl = new Blob([serializeToBinaryStl(allTriangles, "library")]);
  const targetStl = new Blob([serializeToBinaryStl(archScanMesh.triangles, "target")]);
  const ply = await synthesizeCrown(libraryStl, targetStl, { x: 0, y: 0, z: 0 }, 3.5);
  const url = URL.createObjectURL(ply);
  const a = document.createElement("a");
  a.href = url; a.download = "crown.ply"; a.click();
  URL.revokeObjectURL(url);
}
```

**Step 3: Commit**

```bash
git add apps/desktop/src/services/meshSynthesisClient.ts
git add apps/desktop/src/features/views/ExportView.tsx
git commit -m "feat: wire ExportView to mesh synthesis API for crown/veneer PLY export"
```

---

## Summary

| Phase | Tasks | New Services |
|-------|-------|-------------|
| 1. Cloud Infrastructure | 1.1–1.5 | `apps/api` (FastAPI + PostgreSQL + S3) |
| 2. AI/CV | 2.1–2.3 | `apps/vision` (MediaPipe + OpenCV) |
| 3. PBR Materials | 3.1–3.2 | `apps/desktop` materials + lighting |
| 4. Gimbal UI | 4.1 | `apps/desktop` TransformControls |
| 5. Mesh Synthesis | 5.1–5.6 | `apps/mesh` (trimesh + manifold3d) |
| **Total** | **17 tasks** | **3 new backend services** |

All phases are independently runnable. Start each service locally:
```bash
# Terminal 1: API
cd apps/api && uvicorn src.main:app --reload --port 8000
# Terminal 2: Vision
cd apps/vision && uvicorn src.main:app --reload --port 8001
# Terminal 3: Mesh
cd apps/mesh && uvicorn src.main:app --reload --port 8002
# Terminal 4: Frontend
cd apps/desktop && pnpm dev
```
