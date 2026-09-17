import hashlib
import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import LedgerEntry


def append_entry(db: Session, event_type: str, payload: dict) -> LedgerEntry:
    previous = db.scalar(select(LedgerEntry).order_by(LedgerEntry.id.desc()))
    previous_hash = previous.entry_hash if previous else "0" * 64
    created_at = datetime.now(timezone.utc)
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(f"{previous_hash}|{event_type}|{canonical}|{created_at.isoformat()}".encode()).hexdigest()
    entry = LedgerEntry(event_type=event_type, payload=canonical, entry_hash=digest, previous_hash=previous_hash, created_at=created_at)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry