# apps/vision/src/services/landmark_detector.py
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision as mp_vision
import cv2
import numpy as np
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

# Path to the bundled model (downloaded at project setup)
_MODEL_PATH = Path(__file__).parent / "face_landmarker.task"

# MediaPipe landmark indices for key anatomical features
# https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
LEFT_EYE_CENTER = 468  # iris center (landmark 468 with 478-point model)
RIGHT_EYE_CENTER = 473  # iris center
UPPER_LIP_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]
LOWER_LIP_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291]
UPPER_LIP_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]
LOWER_LIP_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308]
NOSE_TIP = 1
CHIN = 152


@dataclass
class LandmarkResult:
    landmarks: list[dict]  # 468 standard mesh points {x, y, z}
    midlineX: float  # Normalized x of facial midline
    interpupillaryLine: dict  # {leftX, leftY, rightX, rightY}
    lipContour: dict  # {outer: [...], inner: [...]}
    mouthMaskBbox: dict  # {xMin, yMin, xMax, yMax} normalized


def detect_landmarks(image_bytes: bytes) -> Optional[LandmarkResult]:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    base_options = python.BaseOptions(model_asset_path=str(_MODEL_PATH))
    options = mp_vision.FaceLandmarkerOptions(
        base_options=base_options,
        num_faces=1,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )

    with mp_vision.FaceLandmarker.create_from_options(options) as landmarker:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        detection_result = landmarker.detect(mp_image)

    if not detection_result.face_landmarks:
        return None

    # The 478-point model: first 468 are standard mesh, last 10 are iris
    all_lms = [
        {"x": lm.x, "y": lm.y, "z": lm.z} for lm in detection_result.face_landmarks[0]
    ]
    lms = all_lms[:468]  # Standard 468 face mesh points

    # For iris centers use the extra landmarks if available
    left_iris = all_lms[468] if len(all_lms) > 468 else all_lms[33]
    right_iris = all_lms[473] if len(all_lms) > 473 else all_lms[263]

    midline_x = (lms[NOSE_TIP]["x"] + lms[CHIN]["x"]) / 2

    outer = [lms[i] for i in UPPER_LIP_OUTER] + [
        lms[i] for i in reversed(LOWER_LIP_OUTER)
    ]
    inner = [lms[i] for i in UPPER_LIP_INNER] + [
        lms[i] for i in reversed(LOWER_LIP_INNER)
    ]

    xs = [p["x"] for p in inner]
    ys = [p["y"] for p in inner]

    return LandmarkResult(
        landmarks=lms,
        midlineX=midline_x,
        interpupillaryLine={
            "leftX": left_iris["x"],
            "leftY": left_iris["y"],
            "rightX": right_iris["x"],
            "rightY": right_iris["y"],
        },
        lipContour={"outer": outer, "inner": inner},
        mouthMaskBbox={
            "xMin": min(xs),
            "yMin": min(ys),
            "xMax": max(xs),
            "yMax": max(ys),
        },
    )
