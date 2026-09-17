from io import BytesIO

import cv2
import numpy as np
from fastapi import APIRouter, File, UploadFile

router = APIRouter(prefix="/api/monitor", tags=["Monitoring"])


@router.post("/change-detection")
async def change_detection(before: UploadFile = File(...), after: UploadFile = File(...)):
    before_image = cv2.imdecode(np.frombuffer(await before.read(), np.uint8), cv2.IMREAD_GRAYSCALE)
    after_image = cv2.imdecode(np.frombuffer(await after.read(), np.uint8), cv2.IMREAD_GRAYSCALE)
    if before_image is None or after_image is None:
        return {"status": "error", "detail": "Both files must be readable images"}
    after_image = cv2.resize(after_image, (before_image.shape[1], before_image.shape[0]))
    delta = cv2.absdiff(before_image, after_image)
    _, mask = cv2.threshold(delta, 35, 255, cv2.THRESH_BINARY)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    changed_pixels = int(np.count_nonzero(mask))
    return {"status": "complete", "changed_pixels": changed_pixels, "change_percent": round(changed_pixels / mask.size * 100, 2), "threshold": 35, "method": "absolute-difference + morphological opening"}