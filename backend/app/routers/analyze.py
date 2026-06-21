import time
import json
import logging
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ScanRecord, ScanResult
from backend.app.engine.parsing import parser, section_detector, format_checker
from backend.app.engine.extraction import extractor
from backend.app.engine.extraction.skill_normalizer import normalize_and_group_skills
from backend.app.engine.matching import matcher
from backend.app.engine.matching.semantic_grouper import group_aware_match
from backend.app.engine.matching.evidence_scorer import score_all_evidence
from backend.app.engine.scoring import scorer
from backend.app.engine.scoring.seniority_analyzer import analyze_jd_seniority, analyze_resume_seniority, compute_seniority_gap
from backend.app.engine.scoring.role_fit_engine import generate_role_fit_verdict
from backend.app.engine.intelligence import career_analyzer, feedback_engine

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/analyze/{scan_id}")
async def analyze_resume(scan_id: str, db: Session = Depends(get_db)):
    record = db.query(ScanRecord).filter(ScanRecord.scan_id == scan_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

    t_start = time.time()

    try:
        parsed = parser.parse_resume(record.file_path)
    except Exception as e:
        logger.error("Parse error for %s: %s", scan_id, e)
        raise HTTPException(status_code=422, detail=f"Could not parse resume: {e}")

    resume_text = parsed["raw_text"]
    jd_text = record.jd_text or ""
    file_metadata = parsed["metadata"]
    file_metadata["page_count"] = parsed["page_count"]
    file_metadata["file_type"] = parsed["file_type"]

    # --- 1. Base Extraction ---
    raw_jd_kws = extractor.extract_jd_keywords(jd_text)
    resume_kws = extractor.extract_resume_keywords(resume_text)
    match_result = matcher.match_all_layers(resume_kws, jd_kws, resume_text, jd_text)
    sections = section_detector.detect_sections(resume_text, file_metadata)
    formatting = format_checker.check_formatting(record.file_path, file_metadata)
    career = career_analyzer.analyze_career_signals(resume_text, jd_text, match_result)
    scoring = scorer.calculate_score(match_result, sections, formatting, career, resume_text, jd_text)
    action_verbs = feedback_engine.analyze_action_verbs(resume_text, sections)
    feedback = feedback_engine.generate_feedback(match_result, sections, formatting, career, scoring, action_verbs, resume_text, jd_text)
    cyber = feedback_engine.check_cybersecurity_vertical(match_result, resume_text)
    skill_prediction = _build_skill_prediction(career)
    category_scores = scorer.compute_category_scores(
        match_result, sections, formatting, career, resume_text, jd_text, action_verbs
    )

    processing_time = round(time.time() - t_start, 2)
    timestamp = datetime.utcnow().isoformat() + "Z"

    result = {
        "scan_id": scan_id,
        "filename": record.filename,
        "file_type": record.file_type,
        "timestamp": timestamp,
        "processing_time_seconds": processing_time,
        "overall_score": scoring["overall_score"],
        "letter_grade": scoring["letter_grade"],
        "sub_scores": scoring["sub_scores"],
        "category_scores": category_scores,
        "keywords": match_result,
        "career_intelligence": career,
        "action_verbs": action_verbs,
        "sections": sections,
        "formatting": formatting,
        "skill_prediction": skill_prediction,
        "cybersecurity_analysis": cyber,
        "feedback": feedback,
        "resume_preview": resume_text[:5000],
        "jd_preview": jd_text[:8000],
    }

    existing = db.query(ScanResult).filter(ScanResult.scan_id == scan_id).first()
    if existing:
        existing.overall_score = scoring["overall_score"]
        existing.letter_grade = scoring["letter_grade"]
        existing.result_json = json.dumps(result)
    else:
        db_result = ScanResult(
            scan_id=scan_id,
            overall_score=scoring["overall_score"],
            letter_grade=scoring["letter_grade"],
            result_json=json.dumps(result),
        )
        db.add(db_result)

    record.status = "complete"
    db.commit()

    logger.info("Analysis complete for %s: score=%.1f, grade=%s, time=%.2fs",
                scan_id, scoring["overall_score"], scoring["letter_grade"], processing_time)

    return result

def _build_skill_prediction(career: Dict) -> Dict:
    onet = career.get("onet_matched_occupation", {})
    predictions = []
    for skill in onet.get("occupation_expected_missing_skills", []):
        predictions.append({
            "skill": skill,
            "confidence": onet.get("match_confidence", 0.7),
            "reason": f"Co-occurs with matched skills in {int(onet.get('match_confidence', 0.7) * 100)}%+ of {onet.get('title', 'this occupation')} roles",
        })

    return {
        "source": "onet_cooccurrence",
        "occupation_matched": f"{onet.get('title', 'Unknown')} (SOC: {onet.get('soc_code', 'N/A')})",
        "predictions": predictions[:5],
    }
