from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.db import Base, engine
from app.routers import compensation, gis, ledger, monitor, satellite


@asynccontextmanager
async def lifespan(_: FastAPI):
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="N-LAMS API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(gis.router)
app.include_router(compensation.router)
app.include_router(monitor.router)
app.include_router(satellite.router)
app.include_router(ledger.router)


@app.get("/health")
def health():
    return {"service": "N-LAMS", "status": "operational"}