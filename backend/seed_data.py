"""Seed a compact contiguous cadastral block for the hackathon demo."""

from shapely.geometry import Polygon
from sqlalchemy import delete
from geoalchemy2 import WKTElement

from app.db import Base, SessionLocal, engine
from app.models import LedgerEntry, Parcel
from app.services.ledger import append_entry


OWNERS = ["Asha Patil", "Ramesh Jadhav", "Meena Shinde", "Sanjay More", "Kavita Pawar"]
LAND_TYPES = ["Agricultural", "Residential", "Orchard", "Barren"]


def seed() -> None:
    with engine.begin() as connection:
        from sqlalchemy import text
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.execute(delete(LedgerEntry))
        db.execute(delete(Parcel))
        for index in range(18):
            column, row = index % 6, index // 6
            west, south = 73.78 + column * 0.0022, 18.52 + row * 0.0022
            east, north = west + 0.002, south + 0.002
            polygon = Polygon([(west, south), (east, south), (east, north), (west, north), (west, south)])
            parcel = Parcel(
                khasra_no=f"KSR-{1041 + index}", owner_name=OWNERS[index % len(OWNERS)],
                land_type=LAND_TYPES[index % len(LAND_TYPES)], circle_rate=1650 + (index % 4) * 325,
                area_sq_m=round(polygon.area * 111_000**2, 2), district="Pune",
                geometry=WKTElement(polygon.wkt, srid=4326),
            )
            db.add(parcel)
        db.commit()
        append_entry(db, "SEED_DATASET_CREATED", {"parcel_count": 18, "district": "Pune", "source": "N-LAMS demo seed"})
        print("Seeded 18 cadastral parcels and initialized the audit ledger.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()