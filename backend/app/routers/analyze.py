import re
import time
import json
import asyncio
import logging
from html import unescape
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
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
from backend.app.engine.matching.certification_matcher import match_certifications
from backend.app.engine.matching.education_matcher import match_education
from backend.app.engine.scoring import scorer
from backend.app.engine.scoring.seniority_analyzer import analyze_jd_seniority, analyze_resume_seniority, compute_seniority_gap
from backend.app.engine.scoring.role_fit_engine import generate_role_fit_verdict
from backend.app.engine.intelligence import career_analyzer, feedback_engine
from pydantic import BaseModel
from typing import Optional

# Shared thread-pool for running CPU-bound tasks in parallel without
# blocking the FastAPI event loop.
_THREAD_POOL = ThreadPoolExecutor(max_workers=4)


def _strip_links_block(text: str) -> str:
    """Remove the [EXTRACTED LINKS] block that the parser appends to raw_text.

    The parser appends extracted hyperlink URLs at the bottom of the raw text
    so they can be displayed in the UI.  That block must NOT reach keyword
    extraction or scoring: URL fragments look like keywords and inflate or
    deflate scores relative to the copy-paste path (which never has this block).
    """
    for marker in ("\n\n[EXTRACTED LINKS]", "\n[EXTRACTED LINKS]", "[EXTRACTED LINKS]"):
        idx = text.find(marker)
        if idx != -1:
            return text[:idx].rstrip()
    return text


def _strip_html(html: str) -> str:
    """Convert HTML from the rich-text editor to plain text.

    Preserves line structure so that section headers (h1-h6, p, li …)
    each land on their own line — which is what the section detector,
    keyword extractor and scoring modules all expect.
    """
    if not html or not html.strip():
        return html or ""
    if not re.search(r"<[a-zA-Z]", html):
        return html
    text = re.sub(r"<(br\s*/?)>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(
        r"</?(?:h[1-6]|p|div|li|ul|ol|tr|section|article|header|footer|blockquote)[^>]*>",
        "\n",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class AnalyzeRequest(BaseModel):
    resume_text: Optional[str] = None

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/analyze/{scan_id}")
async def analyze_resume(scan_id: str, request: Optional[AnalyzeRequest] = None, db: Session = Depends(get_db)):
    record = db.query(ScanRecord).filter(ScanRecord.scan_id == scan_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

    t_start = time.time()

    try:
        parsed = parser.parse_resume(str(record.file_path))
    except Exception as e:
        logger.error("Parse error for %s: %s", scan_id, e)
        raise HTTPException(status_code=422, detail=f"Could not parse resume: {e}")

    if request and request.resume_text:
        raw_resume_text = request.resume_text
    else:
        # Strip the [EXTRACTED LINKS] block before scoring so URL fragments
        # don't pollute keyword extraction and cause a score mismatch vs the
        # copy-paste / Smart-Editor path which never contains that block.
        raw_resume_text = _strip_links_block(parsed["raw_text"])
    resume_text = _strip_html(raw_resume_text)
    jd_text = _strip_html(str(record.jd_text or ""))
    file_metadata = parsed["metadata"]
    file_metadata["page_count"] = parsed["page_count"]
    file_metadata["file_type"] = parsed["file_type"]

    loop = asyncio.get_event_loop()

    # --- 1. Base Extraction  (JD + resume in parallel) ---
    raw_jd_kws, resume_kws = await asyncio.gather(
        loop.run_in_executor(_THREAD_POOL, extractor.extract_jd_keywords, jd_text),
        loop.run_in_executor(_THREAD_POOL, extractor.extract_resume_keywords, resume_text),
    )

    # --- 2. New Normalization Engine (Filter Noise) ---
    skill_concepts, noise_filtered = normalize_and_group_skills(raw_jd_kws)
    jd_kws_clean = list(skill_concepts.values())

    # --- 3. Base Matching ---
    base_match_result = matcher.match_all_layers(resume_kws, jd_kws_clean, resume_text, jd_text)

    # --- 4. Semantic Grouping + Section Detection + Format Check (in parallel) ---
    enhanced_matches, sections, formatting = await asyncio.gather(
        loop.run_in_executor(
            _THREAD_POOL, group_aware_match, jd_kws_clean, resume_kws, base_match_result.get("matched", [])
        ),
        loop.run_in_executor(
            _THREAD_POOL, section_detector.detect_sections, resume_text, file_metadata
        ),
        loop.run_in_executor(
            _THREAD_POOL, format_checker.check_formatting, str(record.file_path), file_metadata
        ),
    )

    match_result = base_match_result.copy()
    unique_matched_kws = set()
    deduped_matches = []
    for m in enhanced_matches:
        kw = str(m.get("keyword", "")).lower()
        if kw not in unique_matched_kws:
            unique_matched_kws.add(kw)
            deduped_matches.append(m)

    match_result["matched"] = deduped_matches

    total_jd = max(1, len(jd_kws_clean))
    matched_count = len(deduped_matches)
    match_result["match_rate"] = min(1.0, matched_count / total_jd)
    match_result["matched_count"] = matched_count

    matched_kws = set()
    for m in enhanced_matches:
        jk = m.get("jd_keyword", "")
        if isinstance(jk, dict):
            jk = jk.get("keyword", "") or jk.get("term", "")
        matched_kws.add(str(jk).lower())

    missing_kws = [m for m in base_match_result.get("missing", [])
                   if (m.get("keyword", "") if isinstance(m, dict) else m).lower() not in matched_kws]
    match_result["missing"] = missing_kws

    # --- 5. Evidence Scoring ---
    matched_skill_names = [m.get("resume_keyword", "") for m in enhanced_matches]
    evidence_quality = score_all_evidence(matched_skill_names, resume_text, sections)

    for m in match_result["matched"]:
        skill_name = m.get("resume_keyword", "")
        if skill_name in evidence_quality.get("skills", {}):
            if evidence_quality["skills"][skill_name].get("evidence_type") == "keyword_only":
                m["match_type"] = "unsupported_claim"

    # --- 6. Seniority Analysis ---
    career = career_analyzer.analyze_career_signals(resume_text, jd_text, match_result)
    jd_seniority = analyze_jd_seniority(jd_text)
    resume_seniority = analyze_resume_seniority(resume_text, career)
    seniority_gap = compute_seniority_gap(jd_seniority, resume_seniority)

    # --- 7. Cert + Education matching in parallel ---
    def _safe_cert():
        try:
            return match_certifications(resume_text, jd_text)
        except Exception as e:
            logger.warning("Certification matching failed: %s", e)
            return {"matched": [], "missing": [], "bonus": [], "matched_count": 0, "missing_count": 0, "bonus_count": 0, "score": 100.0}

    def _safe_edu():
        try:
            return match_education(resume_text, jd_text)
        except Exception as e:
            logger.warning("Education matching failed: %s", e)
            return {"score": 80.0, "degree_level_match": "unknown", "recognized_universities": []}

    cert_match, edu_match = await asyncio.gather(
        loop.run_in_executor(_THREAD_POOL, _safe_cert),
        loop.run_in_executor(_THREAD_POOL, _safe_edu),
    )

    # --- 10. Enhanced Scoring Model ---
    scoring = scorer.calculate_score_v2(
        match_result, sections, formatting, career, resume_text, jd_text, 
        seniority_gap, evidence_quality, cert_match, edu_match
    )

    # --- 11. Role-Fit Verdict ---
    role_fit = generate_role_fit_verdict(
        scoring["overall_score"], seniority_gap, evidence_quality, 
        skill_concepts, noise_filtered, match_result, career
    )

    # Additional standard analyses
    action_verbs = feedback_engine.analyze_action_verbs(resume_text, sections)
    feedback = feedback_engine.generate_feedback(match_result, sections, formatting, career, scoring, action_verbs, resume_text, jd_text)
    cyber = feedback_engine.check_cybersecurity_vertical(match_result, resume_text)
    skill_prediction = _build_skill_prediction(career)
    category_scores = scorer.compute_category_scores(
        match_result, sections, formatting, career, resume_text, jd_text, action_verbs
    )

    processing_time = round(time.time() - t_start, 2)
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # Extract soft skills early
    def is_soft(m):
        cat = m.get("category") or ""
        return cat.lower() in ("soft_skill", "transversal", "social", "competency")
        
    def is_other(m):
        cat = m.get("category") or ""
        return cat.lower() in ("other_skill", "other")
    
    soft_skills = {
        "matched": [m for m in match_result.get("matched", []) if is_soft(m)],
        "missing": [m for m in match_result.get("missing", []) if is_soft(m)]
    }
    
    other_skills = {
        "matched": [m for m in match_result.get("matched", []) if is_other(m)],
        "missing": [m for m in match_result.get("missing", []) if is_other(m)]
    }

    result = {
        "scan_id": scan_id,
        "filename": record.filename,
        "file_type": record.file_type,
        "timestamp": timestamp,
        "processing_time_seconds": processing_time,
        "overall_score": scoring["overall_score"],
        "letter_grade": scoring["letter_grade"],
        # ── 7 top-level scoring dimensions ──
        "parsing_quality": scoring.get("parsing_quality", 0),
        "formatting_quality": scoring.get("formatting_quality", 0),
        "keyword_match": scoring.get("keyword_match", 0),
        "semantic_match": scoring.get("semantic_match", 0),
        "evidence_strength": scoring.get("evidence_strength", 0),
        "seniority_fit": scoring.get("seniority_fit", 0),
        "overall_fit": scoring.get("overall_fit", 0),
        # ── Detailed breakdowns ──
        "sub_scores": scoring["sub_scores"],
        "category_scores": category_scores,
        "keywords": match_result,
        "role_fit": role_fit,
        "seniority_analysis": {
            "jd_level": jd_seniority,
            "resume_level": resume_seniority,
            "gap": seniority_gap
        },
        "evidence_quality": evidence_quality,
        "certifications": cert_match,
        "education": edu_match,
        "skill_concepts": skill_concepts,
        "noise_filtered": noise_filtered,
        "career_intelligence": career,
        "action_verbs": action_verbs,
        "sections": sections,
        "formatting": formatting,
        "skill_prediction": skill_prediction,
        "cybersecurity_analysis": cyber,
        "feedback": feedback,
        "resume_preview": resume_text[:600],
        "jd_preview": jd_text[:300],
        "jd_full": jd_text,
        "jd_html": str(record.jd_text or ""),
        "resume_full": resume_text,
        "resume_html": parsed.get("rich_text", ""),
        "soft_skills": soft_skills,
        "other_skills": other_skills,
        "extracted_links": parsed.get("links", []),
    }

    existing = db.query(ScanResult).filter(ScanResult.scan_id == scan_id).first()
    if existing:
        existing.overall_score = scoring["overall_score"]
        existing.letter_grade = scoring["letter_grade"]
        existing.result_json = json.dumps(result)  # type: ignore
    else:
        db_result = ScanResult(
            scan_id=scan_id,
            overall_score=scoring["overall_score"],
            letter_grade=scoring["letter_grade"],
            result_json=json.dumps(result),
        )
        db.add(db_result)

    record.status = "complete"  # type: ignore
    db.commit()

    logger.info("Analysis complete for %s: score=%.1f, grade=%s, time=%.2fs",
                scan_id, scoring["overall_score"], scoring["letter_grade"], processing_time)

    return result

class QuickScoreRequest(BaseModel):
    resume_text: str

@router.post("/quick_score/{scan_id}")
async def quick_score(scan_id: str, request: QuickScoreRequest, db: Session = Depends(get_db)):
    """Lightweight rescore after Smart Editor edits — skips file-parse, cert, format-check and AI steps."""
    record = db.query(ScanRecord).filter(ScanRecord.scan_id == scan_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

    resume_text = _strip_html(request.resume_text)
    jd_text = _strip_html(str(record.jd_text or ""))

    loop = asyncio.get_event_loop()

    raw_jd_kws, resume_kws = await asyncio.gather(
        loop.run_in_executor(_THREAD_POOL, extractor.extract_jd_keywords, jd_text),
        loop.run_in_executor(_THREAD_POOL, extractor.extract_resume_keywords, resume_text),
    )

    skill_concepts, _ = normalize_and_group_skills(raw_jd_kws)
    jd_kws_clean = list(skill_concepts.values())

    base_match_result = matcher.match_all_layers(resume_kws, jd_kws_clean, resume_text, jd_text)

    enhanced_matches, sections = await asyncio.gather(
        loop.run_in_executor(_THREAD_POOL, group_aware_match, jd_kws_clean, resume_kws, base_match_result.get("matched", [])),
        loop.run_in_executor(_THREAD_POOL, section_detector.detect_sections, resume_text, {}),
    )

    match_result = base_match_result.copy()
    seen = set()
    deduped = []
    for m in enhanced_matches:
        kw = str(m.get("keyword", "")).lower()
        if kw not in seen:
            seen.add(kw)
            deduped.append(m)

    match_result["matched"] = deduped
    total_jd = max(1, len(jd_kws_clean))
    match_result["match_rate"] = min(1.0, len(deduped) / total_jd)
    match_result["matched_count"] = len(deduped)

    matched_kws = set()
    for m in enhanced_matches:
        jk = m.get("jd_keyword", "")
        if isinstance(jk, dict):
            jk = jk.get("keyword", "") or jk.get("term", "")
        matched_kws.add(str(jk).lower())
    match_result["missing"] = [m for m in base_match_result.get("missing", [])
                                if (m.get("keyword", "") if isinstance(m, dict) else m).lower() not in matched_kws]

    matched_skill_names = [m.get("resume_keyword", "") for m in enhanced_matches]
    evidence_quality = score_all_evidence(matched_skill_names, resume_text, sections)

    career = career_analyzer.analyze_career_signals(resume_text, jd_text, match_result)
    jd_seniority = analyze_jd_seniority(jd_text)
    resume_seniority = analyze_resume_seniority(resume_text, career)
    seniority_gap = compute_seniority_gap(jd_seniority, resume_seniority)

    # Re-use the formatting result from the original full analysis so that the
    # quick rescore doesn't diverge from the file-based score due to a fake
    # formatting stub.  Falls back to a neutral (no-issues) dict if no prior
    # result is found.
    stored_formatting: Dict = {"issues": []}
    try:
        existing_for_fmt = db.query(ScanResult).filter(ScanResult.scan_id == scan_id).first()
        if existing_for_fmt and existing_for_fmt.result_json:
            stored_formatting = json.loads(str(existing_for_fmt.result_json)).get("formatting", stored_formatting)
    except Exception:
        pass

    dummy_cert = {"matched": [], "missing": [], "bonus": [], "matched_count": 0, "missing_count": 0, "bonus_count": 0, "score": 100.0}
    dummy_edu = {"score": 80.0, "degree_level_match": "unknown", "recognized_universities": []}

    scoring = scorer.calculate_score_v2(
        match_result, sections, stored_formatting, career, resume_text, jd_text,
        seniority_gap, evidence_quality, dummy_cert, dummy_edu,
    )
    action_verbs = feedback_engine.analyze_action_verbs(resume_text, sections)
    category_scores = scorer.compute_category_scores(
        match_result, sections, stored_formatting, career, resume_text, jd_text, action_verbs
    )

    def is_soft(m): return (m.get("category") or "").lower() in ("soft_skill", "transversal", "social", "competency")
    def is_other(m): return (m.get("category") or "").lower() in ("other_skill", "other")

    return {
        "overall_score": scoring["overall_score"],
        "letter_grade": scoring["letter_grade"],
        "keyword_match": scoring.get("keyword_match", 0),
        "semantic_match": scoring.get("semantic_match", 0),
        "evidence_strength": scoring.get("evidence_strength", 0),
        "seniority_fit": scoring.get("seniority_fit", 0),
        "parsing_quality": scoring.get("parsing_quality", 0),
        "formatting_quality": scoring.get("formatting_quality", 0),
        "sub_scores": scoring["sub_scores"],
        "category_scores": category_scores,
        "keywords": match_result,
        "soft_skills": {
            "matched": [m for m in match_result.get("matched", []) if is_soft(m)],
            "missing": [m for m in match_result.get("missing", []) if is_soft(m)],
        },
        "other_skills": {
            "matched": [m for m in match_result.get("matched", []) if is_other(m)],
            "missing": [m for m in match_result.get("missing", []) if is_other(m)],
        },
    }


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
