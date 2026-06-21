import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ScanResult, ScanRecord

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/compare/{scan_id_1}/{scan_id_2}")
def compare_scans(scan_id_1: str, scan_id_2: str, db: Session = Depends(get_db)):
    r1 = db.query(ScanResult).filter(ScanResult.scan_id == scan_id_1).first()
    r2 = db.query(ScanResult).filter(ScanResult.scan_id == scan_id_2).first()

    if not r1:
        raise HTTPException(status_code=404, detail=f"scan_id_1={scan_id_1} not found")
    if not r2:
        raise HTTPException(status_code=404, detail=f"scan_id_2={scan_id_2} not found")

    try:
        d1 = json.loads(r1.result_json)
        d2 = json.loads(r2.result_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not deserialize results: {e}")

    rec1 = db.query(ScanRecord).filter(ScanRecord.scan_id == scan_id_1).first()
    rec2 = db.query(ScanRecord).filter(ScanRecord.scan_id == scan_id_2).first()

    def _sub_score(data: dict, key: str) -> float:
        return data.get("sub_scores", {}).get(key, {}).get("score", 0)

    scan_1 = {
        "scan_id": scan_id_1,
        "filename": d1.get("filename"),
        "timestamp": d1.get("timestamp"),
        "overall_score": d1.get("overall_score"),
        "letter_grade": d1.get("letter_grade"),
        "sub_scores": d1.get("sub_scores"),
    }
    scan_2 = {
        "scan_id": scan_id_2,
        "filename": d2.get("filename"),
        "timestamp": d2.get("timestamp"),
        "overall_score": d2.get("overall_score"),
        "letter_grade": d2.get("letter_grade"),
        "sub_scores": d2.get("sub_scores"),
    }

    delta_overall = round((d2.get("overall_score", 0) - d1.get("overall_score", 0)), 1)
    sub_keys = ["keyword_match", "semantic_relevance", "section_completeness", "format_compliance", "impact_quantification"]
    delta = {"overall_score": delta_overall}
    improved_areas = []
    regressed_areas = []

    for key in sub_keys:
        d = round(_sub_score(d2, key) - _sub_score(d1, key), 1)
        delta[key] = d
        if d > 0:
            improved_areas.append(key)
        elif d < 0:
            regressed_areas.append(key)

    best_gain = max(((k, v) for k, v in delta.items() if k != "overall_score"), key=lambda x: x[1], default=("N/A", 0))
    summary = f"Score {'improved' if delta_overall >= 0 else 'dropped'} by {abs(delta_overall)} points."
    if improved_areas:
        summary += f" Strongest gain: {best_gain[0].replace('_', ' ')} (+{best_gain[1]})."

    return {
        "scan_1": scan_1,
        "scan_2": scan_2,
        "delta": delta,
        "improved_areas": improved_areas,
        "regressed_areas": regressed_areas,
        "summary": summary,
    }
