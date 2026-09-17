from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping, shape
from shapely.ops import transform
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Parcel
from app.schemas import CorridorRequest, CorridorResponse, ParcelOut
from app.services.compensation import calculate_compensation

router = APIRouter(prefix="/api/gis", tags=["GIS"])


def parcel_json(parcel: Parcel) -> dict:
    return {
        "id": parcel.id,
        "khasra_no": parcel.khasra_no,
        "owner_name": parcel.owner_name,
        "land_type": parcel.land_type,
        "circle_rate": parcel.circle_rate,
        "area_sq_m": parcel.area_sq_m,
        "district": parcel.district,
        "geometry": mapping(to_shape(parcel.geometry)),
    }


@router.get("/parcels", response_model=list[ParcelOut])
def list_parcels(db: Session = Depends(get_db)):
    return [parcel_json(parcel) for parcel in db.scalars(select(Parcel).order_by(Parcel.khasra_no))]


@router.post("/corridor", response_model=CorridorResponse)
def analyze_corridor(request: CorridorRequest, db: Session = Depends(get_db)):
    if len(request.coordinates) < 2:
        raise HTTPException(status_code=422, detail="A corridor needs at least two points")
    line = shape({"type": "LineString", "coordinates": request.coordinates})
    corridor = line.buffer(request.width_m / 111_000)
    corridor_wkt = WKTElement(corridor.wkt, srid=4326)
    parcels = db.scalars(select(Parcel).where(func.ST_Intersects(Parcel.geometry, corridor_wkt))).all()
    affected = []
    for parcel in parcels:
        geometry = to_shape(parcel.geometry)
        clipped = geometry.intersection(corridor)
        affected_area = parcel.area_sq_m * (clipped.area / geometry.area) if geometry.area else 0
        estimate = calculate_compensation(parcel.circle_rate * affected_area)["total"]
        affected.append({"khasra_no": parcel.khasra_no, "owner_name": parcel.owner_name, "affected_area_sq_m": round(affected_area, 2), "estimated_compensation": estimate, "geometry": mapping(clipped)})
    return {"corridor": mapping(corridor), "affected_parcels": affected, "total_compensation": round(sum(item["estimated_compensation"] for item in affected), 2)}