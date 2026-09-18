from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.satellite.service import analyze_satellite_images

router = APIRouter(prefix="/api/satellite", tags=["Satellite Monitoring"])


@router.post("/analyze")
async def analyze_satellite(
    parcel_id: str | None = None,
    before_image: UploadFile = File(...),
    after_image: UploadFile = File(...),
):
    """Prototype endpoint for analyzing before/after parcel imagery."""
    try:
        before_bytes = await before_image.read()
        after_bytes = await after_image.read()
        if not before_bytes or not after_bytes:
            raise ValueError("Both images are required")
        result = analyze_satellite_images(before_bytes, after_bytes, parcel_id=parcel_id)
        return result
    except Exception as exc:  # pragma: no cover - error surface for the prototype
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/demo")
def demo_result():
    return {
        "parcel_id": "102",
        "change_detected": True,
        "change_percentage": 4.7,
        "change_type": "Possible new structure",
        "confidence": 0.82,
        "requires_verification": True,
        "status": "Significant change detected",
        "detection_date": "2026-09-18",
        "detected_regions": [
            {"x": 120, "y": 90, "width": 46, "height": 42, "area": 1380}
        ],
    }
