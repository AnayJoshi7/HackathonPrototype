from fastapi import APIRouter

from app.schemas import CompensationOut, CompensationRequest
from app.services.compensation import calculate_compensation

router = APIRouter(prefix="/api/compensation", tags=["Compensation"])


@router.post("/calculate", response_model=CompensationOut)
def calculate(request: CompensationRequest):
    return calculate_compensation(**request.model_dump())


@router.get("/integrations")
def integrations():
    return {
        "pfms": {"status": "ready", "label": "PFMS disbursement", "reference": "PFMS-DEMO-2026-001"},
        "e_courts": {"status": "clear", "label": "e-Courts litigation check", "reference": "EC-SEARCH-8842"},
        "digilocker": {"status": "verified", "label": "DigiLocker KYC", "reference": "DL-KYC-22091"},
    }