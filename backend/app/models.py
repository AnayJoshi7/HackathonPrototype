from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Parcel(Base):
    __tablename__ = "parcels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    khasra_no: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    owner_name: Mapped[str] = mapped_column(String(120))
    land_type: Mapped[str] = mapped_column(String(40))
    circle_rate: Mapped[float] = mapped_column(Float)
    area_sq_m: Mapped[float] = mapped_column(Float)
    district: Mapped[str] = mapped_column(String(80), default="Pune")
    geometry = mapped_column(Geometry("POLYGON", srid=4326, spatial_index=True))


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(60))
    payload: Mapped[str] = mapped_column(Text)
    entry_hash: Mapped[str] = mapped_column(String(64), unique=True)
    previous_hash: Mapped[str] = mapped_column(String(64), default="0" * 64)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())