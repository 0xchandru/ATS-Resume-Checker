import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ScanRecord, ScanResult
from backend.app.config import MAX_HISTORY

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/history")
def get_history(db: Session = Depends(get_db)):
    records = (
        db.query(ScanRecord, ScanResult)
        .outerjoin(ScanResult, ScanRecord.scan_id == ScanResult.scan_id)
        .filter(ScanRecord.status == "complete")
        .order_by(ScanRecord.created_at.desc())
        .limit(MAX_HISTORY)
        .all()
    )

    result = []
    for record, scan_result in records:
        result.append({
            "scan_id": record.scan_id,
            "scan_name": getattr(record, "scan_name", None),
            "filename": record.filename,
            "overall_score": scan_result.overall_score if scan_result else 0,
            "letter_grade": scan_result.letter_grade if scan_result else "N/A",
            "timestamp": record.created_at.isoformat() + "Z" if record.created_at else "",
            "jd_preview_50_chars": (record.jd_text or "")[:50],
        })

    return result


@router.get("/history/{scan_id}")
def get_history_item(scan_id: str, db: Session = Depends(get_db)):
    result = db.query(ScanResult).filter(ScanResult.scan_id == scan_id).first()
    if not result:
        raise HTTPException(status_code=404, detail=f"No result found for scan_id={scan_id}")
    try:
        return json.loads(result.result_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not deserialize result: {e}")
