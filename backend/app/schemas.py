from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ParcelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    khasra_no: str
    owner_name: str
    land_type: str
    circle_rate: float
    area_sq_m: float
    district: str
    geometry: dict[str, Any]


class CorridorRequest(BaseModel):
    coordinates: list[list[float]] = Field(min_length=2)
    width_m: float = Field(default=30, gt=0, le=500)


class AffectedParcel(BaseModel):
    khasra_no: str
    owner_name: str
    affected_area_sq_m: float
    estimated_compensation: float
    geometry: dict[str, Any]


class CorridorResponse(BaseModel):
    corridor: dict[str, Any]
    affected_parcels: list[AffectedParcel]
    total_compensation: float


class CompensationRequest(BaseModel):
    market_value: float = Field(gt=0)
    rural_multiplier: float = Field(default=2.0, ge=1, le=2)
    solatium_rate: float = Field(default=1.0, ge=0, le=1)
    assets_value: float = Field(default=0, ge=0)
    rehabilitation_allowance: float = Field(default=0, ge=0)


class CompensationOut(BaseModel):
    market_value: float
    multiplied_value: float
    solatium: float
    assets_value: float
    rehabilitation_allowance: float
    total: float


class LedgerOut(BaseModel):
    id: int
    event_type: str
    payload: dict[str, Any]
    entry_hash: str
    previous_hash: str
    created_at: datetime