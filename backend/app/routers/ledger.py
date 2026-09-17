import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import LedgerEntry
from app.schemas import LedgerOut
from app.services.ledger import append_entry

router = APIRouter(prefix="/api/ledger", tags=["Ledger"])


@router.get("/entries", response_model=list[LedgerOut])
def entries(db: Session = Depends(get_db)):
    result = []
    for entry in db.scalars(select(LedgerEntry).order_by(LedgerEntry.id.desc()).limit(30)):
        result.append({"id": entry.id, "event_type": entry.event_type, "payload": json.loads(entry.payload), "entry_hash": entry.entry_hash, "previous_hash": entry.previous_hash, "created_at": entry.created_at})
    return result


@router.post("/entries", response_model=LedgerOut)
def create_entry(event_type: str, payload: dict, db: Session = Depends(get_db)):
    entry = append_entry(db, event_type, payload)
    return {"id": entry.id, "event_type": entry.event_type, "payload": payload, "entry_hash": entry.entry_hash, "previous_hash": entry.previous_hash, "created_at": entry.created_at}