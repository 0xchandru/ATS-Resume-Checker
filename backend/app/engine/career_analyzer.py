import re
import json
import logging
from typing import Dict, List, Optional
from backend.app.engine.extractor import normalize
from sqlalchemy import text as sa_text
from backend.app.database import engine

logger = logging.getLogger(__name__)

_YEAR_RE = re.compile(r"\b(\d+)\+?\s*(?:years?|yrs?)\b", re.IGNORECASE)
_SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "lead", "principal", "director", "vp", "c_suite"]


def analyze_career_signals(resume_text: str, jd_text: str, match_result: Dict) -> Dict:
    jd_seniority = _detect_seniority(jd_text, context="jd")
    resume_seniority = _detect_seniority(resume_text, context="resume")

    seniority_match = jd_seniority["inferred_level"] == resume_seniority["inferred_level"]
    gap_explanation = _explain_seniority_gap(jd_seniority, resume_seniority)

    matched_kws = [m.get("keyword", "") for m in match_result.get("matched", [])]
    onet_match = _match_onet_occupation(matched_kws)

    recognized_companies = _recognize_companies(resume_text)
    recognized_universities = _recognize_universities(resume_text)

    jd_normality = _analyze_jd_normality(jd_text, onet_match.get("domain"))

    return {
        "jd_seniority": jd_seniority["inferred_level"],
        "jd_seniority_confidence": jd_seniority["confidence"],
        "resume_seniority": resume_seniority["inferred_level"],
        "resume_seniority_confidence": resume_seniority["confidence"],
        "seniority_match": seniority_match,
        "seniority_gap_explanation": gap_explanation,
        "onet_matched_occupation": onet_match,
        "recognized_companies": recognized_companies,
        "recognized_universities": recognized_universities,
        "jd_normality_analysis": jd_normality,
    }


def _detect_seniority(text: str, context: str = "resume") -> Dict:
    signals = []
    years_mentioned = []

    year_matches = _YEAR_RE.findall(text)
    for y in year_matches:
        try:
            years_mentioned.append(int(y))
        except ValueError:
            pass

    with engine.connect() as conn:
        rows = conn.execute(sa_text("SELECT canonical_title, normalized, seniority_level FROM kb_job_titles WHERE seniority_level IS NOT NULL")).fetchall()

    text_lower = text.lower()
    level_votes = {}
    for row in rows:
        norm = row[1]
        level = row[2]
        if norm and norm in text_lower:
            level_votes[level] = level_votes.get(level, 0) + 1
            signals.append(norm)

    inferred_level = "mid"
    confidence = 0.5

    if level_votes:
        inferred_level = max(level_votes, key=level_votes.get)
        total_votes = sum(level_votes.values())
        confidence = level_votes[inferred_level] / total_votes
    elif years_mentioned:
        total_years = max(years_mentioned)
        if total_years < 1:
            inferred_level = "intern"
        elif total_years < 2:
            inferred_level = "junior"
        elif total_years < 5:
            inferred_level = "mid"
        elif total_years < 8:
            inferred_level = "senior"
        elif total_years < 12:
            inferred_level = "lead"
        else:
            inferred_level = "principal"
        confidence = 0.6

    for seniority_kw, level in [
        ("c-level", "c_suite"), ("chief", "c_suite"), ("vp", "vp"), ("vice president", "vp"),
        ("director", "director"), ("principal", "principal"), ("lead", "lead"),
        ("senior", "senior"), ("sr.", "senior"), ("junior", "junior"), ("jr.", "junior"),
        ("entry level", "junior"), ("intern", "intern"),
    ]:
        if seniority_kw in text_lower:
            inferred_level = level
            confidence = max(confidence, 0.75)
            break

    return {
        "inferred_level": inferred_level,
        "confidence": round(confidence, 2),
        "signals_found": list(set(signals))[:10],
        "years_mentioned": years_mentioned,
    }


def _explain_seniority_gap(jd: Dict, resume: Dict) -> str:
    jd_level = jd["inferred_level"]
    resume_level = resume["inferred_level"]

    if jd_level == resume_level:
        return f"Seniority levels match ({jd_level}). Good alignment."

    jd_idx = _SENIORITY_ORDER.index(jd_level) if jd_level in _SENIORITY_ORDER else 3
    resume_idx = _SENIORITY_ORDER.index(resume_level) if resume_level in _SENIORITY_ORDER else 3
    gap = abs(jd_idx - resume_idx)

    if resume_idx < jd_idx:
        advice = "Emphasize scope, team size, strategic impact, and leadership to bridge the gap."
        return f"JD signals {jd_level} level. Resume signals {resume_level} level ({gap} level gap). {advice}"
    else:
        return f"Your resume signals {resume_level}, but this role targets {jd_level}. Tailor to match the expected experience level."


def _match_onet_occupation(keywords: List[str]) -> Dict:
    with engine.connect() as conn:
        rows = conn.execute(sa_text("SELECT soc_code, title, typical_skills, domain FROM kb_onet_occupations LIMIT 500")).fetchall()

    if not rows:
        return {"soc_code": None, "title": None, "match_confidence": 0.0, "occupation_expected_missing_skills": [], "explanation": "No O*NET data available"}

    keyword_set = {normalize(k) for k in keywords}
    best = None
    best_score = 0.0

    for row in rows:
        try:
            typical = json.loads(row[2]) if row[2] else []
        except Exception:
            typical = []
        if not typical:
            continue

        typical_normalized = [normalize(s) for s in typical if s]
        overlap = keyword_set.intersection(typical_normalized)
        score = len(overlap) / max(len(typical_normalized), 1)

        if score > best_score:
            best_score = score
            best = {"soc_code": row[0], "title": row[1], "typical_skills": typical, "domain": row[3]}

    if not best or best_score < 0.1:
        return {"soc_code": None, "title": "No strong match", "match_confidence": 0.0, "occupation_expected_missing_skills": [], "explanation": "Resume skills don't strongly match any O*NET occupation"}

    typical_normalized = [normalize(s) for s in best["typical_skills"]]
    missing = [best["typical_skills"][i] for i, s in enumerate(typical_normalized) if s not in keyword_set][:5]

    return {
        "soc_code": best["soc_code"],
        "title": best["title"],
        "match_confidence": round(best_score, 2),
        "occupation_expected_missing_skills": missing,
        "explanation": f"These skills co-occur in {int(best_score * 100)}%+ of {best['title']} roles per O*NET",
    }


def _recognize_companies(text: str) -> List[Dict]:
    try:
        from backend.app.engine.embeddings import get_spacy
        nlp = get_spacy()
        doc = nlp(text[:50000])
        org_entities = [ent.text.strip() for ent in doc.ents if ent.label_ == "ORG"]
    except Exception:
        org_entities = []

    results = []
    seen = set()
    for org in org_entities:
        norm = normalize(org)
        if norm in seen or len(norm) < 2:
            continue
        seen.add(norm)

        with engine.connect() as conn:
            row = conn.execute(
                sa_text("SELECT canonical_name FROM kb_company_aliases WHERE alias_normalized = :n"),
                {"n": norm}
            ).fetchone()
            if row:
                canonical = row[0]
            else:
                row = conn.execute(
                    sa_text("SELECT canonical_name, industry, tier FROM kb_companies WHERE normalized = :n"),
                    {"n": norm}
                ).fetchone()
                canonical = row[0] if row else None

            if canonical:
                comp_row = conn.execute(
                    sa_text("SELECT canonical_name, industry, tier FROM kb_companies WHERE normalized = :n"),
                    {"n": normalize(canonical)}
                ).fetchone()
                if comp_row:
                    results.append({
                        "found_in_resume": org,
                        "canonical": comp_row[0],
                        "industry": comp_row[1],
                        "tier": comp_row[2],
                    })

    return results[:5]


def _recognize_universities(text: str) -> List[Dict]:
    results = []
    seen = set()

    with engine.connect() as conn:
        rows = conn.execute(sa_text("SELECT canonical_name, normalized, country FROM kb_universities LIMIT 2000")).fetchall()

    text_lower = text.lower()
    for row in rows:
        norm = row[1]
        if norm and len(norm) > 3 and norm in text_lower:
            canonical = row[0]
            if canonical in seen:
                continue
            seen.add(canonical)
            results.append({
                "found_in_resume": canonical,
                "canonical": canonical,
                "country": row[2],
            })
        if len(results) >= 3:
            break

    return results


def _analyze_jd_normality(jd_text: str, role_category: Optional[str]) -> Dict:
    if not role_category:
        role_category = "general"

    with engine.connect() as conn:
        rows = conn.execute(
            sa_text("SELECT keyword, keyword_normalized, frequency FROM kb_jd_frequency WHERE role_category = :rc AND frequency > 0.85"),
            {"rc": role_category}
        ).fetchall()

    if not rows:
        return {
            "jd_normality_score": 100,
            "role_category_detected": role_category,
            "atypical_missing_from_jd": [],
            "note": "No frequency data available for this role category.",
        }

    jd_lower = jd_text.lower()
    present = []
    absent = []

    for row in rows:
        kw = row[0]
        norm = row[1]
        if norm in jd_lower or kw.lower() in jd_lower:
            present.append(kw)
        else:
            absent.append(kw)

    total = len(rows)
    score = int((len(present) / max(total, 1)) * 100)

    note = ""
    if score < 70 and absent:
        absent_sample = absent[:3]
        note = f"This JD omits {', '.join(absent_sample)} — present in 85%+ of similar JDs. Consider adding them anyway."
    else:
        note = f"JD covers most high-frequency keywords for {role_category} roles."

    return {
        "jd_normality_score": score,
        "role_category_detected": role_category,
        "atypical_missing_from_jd": absent[:5],
        "note": note,
    }
