from __future__ import annotations

import io
from typing import Any

import cv2
import numpy as np

from app.satellite.change_detection import detect_changes


def analyze_satellite_images(before_image: bytes, after_image: bytes, parcel_id: str | int | None = None) -> dict[str, Any]:
    """Runs the prototype change-detection pipeline on two sample images."""
    try:
        before = cv2.imdecode(np.frombuffer(before_image, np.uint8), cv2.IMREAD_COLOR)
        after = cv2.imdecode(np.frombuffer(after_image, np.uint8), cv2.IMREAD_COLOR)
        if before is None or after is None:
            raise ValueError("Both files must be readable images")

        result = detect_changes(before, after, parcel_id=str(parcel_id) if parcel_id is not None else "unknown")
        if result["change_detected"]:
            result["status"] = "Significant change detected"
            result["requires_verification"] = True
        else:
            result["status"] = "No significant change detected"
            result["requires_verification"] = False
        result["detection_date"] = "2026-09-18"
        return result
    except Exception as exc:  # pragma: no cover - defensive guard for prototype
        return {
            "parcel_id": str(parcel_id) if parcel_id is not None else "unknown",
            "change_detected": False,
            "change_percentage": 0.0,
            "change_type": "Processing error",
            "confidence": 0.0,
            "requires_verification": False,
            "status": "Image processing failed",
            "detection_date": "2026-09-18",
            "error": str(exc),
        }


def encode_image_to_base64(image: np.ndarray) -> str:
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise ValueError("Unable to encode image")
    return "data:image/png;base64," + io.BufferedReader(io.BytesIO(buffer.tobytes())).read().decode("latin1")
