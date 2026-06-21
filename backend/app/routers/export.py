import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ScanResult

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/export/{scan_id}")
def export_result(scan_id: str, db: Session = Depends(get_db)):
    result = db.query(ScanResult).filter(ScanResult.scan_id == scan_id).first()
    if not result:
        raise HTTPException(status_code=404, detail=f"No result for scan_id={scan_id}")
    try:
        data = json.loads(result.result_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read result: {e}")

    json_bytes = json.dumps(data, indent=2).encode("utf-8")
    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="ats_report_{scan_id}.json"'},
    )
