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
