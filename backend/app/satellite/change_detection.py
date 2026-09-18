from __future__ import annotations

import cv2
import numpy as np


def detect_changes(before: np.ndarray, after: np.ndarray, parcel_id: str) -> dict:
    """Simple OpenCV-based prototype for change detection between before and after imagery."""
    if before.shape[:2] != after.shape[:2]:
        after = cv2.resize(after, (before.shape[1], before.shape[0]))

    before_gray = cv2.cvtColor(before, cv2.COLOR_BGR2GRAY)
    after_gray = cv2.cvtColor(after, cv2.COLOR_BGR2GRAY)

    before_blur = cv2.GaussianBlur(before_gray, (5, 5), 0)
    after_blur = cv2.GaussianBlur(after_gray, (5, 5), 0)

    diff = cv2.absdiff(before_blur, after_blur)
    _, thresholded = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
    kernel = np.ones((3, 3), np.uint8)
    cleaned = cv2.morphologyEx(thresholded, cv2.MORPH_OPEN, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    significant_regions = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area > 50:
            x, y, w, h = cv2.boundingRect(contour)
            significant_regions.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h), "area": int(area)})

    changed_pixels = float(np.count_nonzero(cleaned))
    change_percentage = (changed_pixels / cleaned.size) * 100.0
    confidence = min(0.95, max(0.5, change_percentage / 10.0))

    if change_percentage > 1.5:
        change_type = "Possible new structure"
        change_detected = True
    elif change_percentage > 0.5:
        change_type = "Minor vegetation change"
        change_detected = True
    else:
        change_type = "No significant change"
        change_detected = False

    if not change_detected:
        change_type = "No significant change"
        confidence = 0.12

    return {
        "parcel_id": str(parcel_id),
        "change_detected": change_detected,
        "change_percentage": round(change_percentage, 2),
        "change_type": change_type,
        "confidence": round(float(confidence), 2),
        "requires_verification": change_detected,
        "status": "Significant change detected" if change_detected else "No significant change detected",
        "detected_regions": significant_regions,
        "method": "absolute-difference + Gaussian blur + threshold + morphology",
    }
