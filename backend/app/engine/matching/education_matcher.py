"""
Education Matcher — matches education entries from resume against JD requirements.
Uses the KB universities tables for recognition and degree level detection.
"""
import re
import logging
from typing import Dict, List
from sqlalchemy import text
from backend.app.database import engine

logger = logging.getLogger(__name__)

DEGREE_LEVELS = {
    "phd": 5, "ph.d": 5, "doctorate": 5, "doctoral": 5,
    "master": 4, "masters": 4, "m.s.": 4, "m.sc": 4, "mba": 4, "m.a.": 4, "m.eng": 4,
    "bachelor": 3, "bachelors": 3, "b.s.": 3, "b.sc": 3, "b.a.": 3, "b.tech": 3, "b.eng": 3, "b.e.": 3,
    "associate": 2, "associates": 2, "a.s.": 2, "a.a.": 2,
    "diploma": 1, "certificate": 1, "certification": 1,
}

DEGREE_LABELS = {5: "PhD/Doctorate", 4: "Master's", 3: "Bachelor's", 2: "Associate's", 1: "Diploma/Certificate"}

FIELD_KEYWORDS = {
    "computer science": ["computer science", "cs", "computing"],
    "information technology": ["information technology", "it", "information systems"],
    "cybersecurity": ["cybersecurity", "cyber security", "information security", "infosec"],
    "engineering": ["engineering", "mechanical", "electrical", "civil", "chemical"],
    "business": ["business", "management", "administration", "mba", "commerce"],
    "data science": ["data science", "data analytics", "machine learning", "ai", "artificial intelligence"],
    "mathematics": ["mathematics", "math", "statistics", "applied math"],
}


def match_education(resume_text: str, jd_text: str) -> Dict:
    """
    Match education entries in resume against JD requirements.
    Returns education assessment including degree level, university recognition, and field match.
    """
    resume_edu = _extract_education(resume_text)
    jd_edu = _extract_education_requirements(jd_text)

    # University recognition
    recognized_universities = _recognize_universities(resume_text)

    # Degree level comparison
    resume_max_level = max([e["level"] for e in resume_edu], default=0)
    jd_required_level = jd_edu.get("min_level", 0)

    level_match = "exceeds" if resume_max_level > jd_required_level else (
        "meets" if resume_max_level == jd_required_level else "below"
    )

    # Field match
    resume_fields = set()
    for e in resume_edu:
        resume_fields.update(e.get("fields", []))
    
    jd_fields = set(jd_edu.get("preferred_fields", []))
    field_overlap = resume_fields & jd_fields if jd_fields else resume_fields

    score = _compute_edu_score(resume_max_level, jd_required_level, len(recognized_universities), bool(field_overlap))

    return {
        "resume_education": resume_edu,
        "jd_requirements": jd_edu,
        "recognized_universities": recognized_universities,
        "degree_level_match": level_match,
        "resume_max_level": resume_max_level,
        "resume_max_label": DEGREE_LABELS.get(resume_max_level, "Unknown"),
        "jd_required_level": jd_required_level,
        "jd_required_label": DEGREE_LABELS.get(jd_required_level, "Not specified"),
        "field_overlap": list(field_overlap),
        "score": score,
    }


def _extract_education(text_content: str) -> List[Dict]:
    """Extract education entries from text."""
    entries = []
    text_lower = text_content.lower()

    for degree_term, level in DEGREE_LEVELS.items():
        if degree_term in text_lower:
            fields = []
            for field_name, keywords in FIELD_KEYWORDS.items():
                if any(kw in text_lower for kw in keywords):
                    fields.append(field_name)
            
            entries.append({
                "degree_term": degree_term,
                "level": level,
                "level_label": DEGREE_LABELS.get(level, "Unknown"),
                "fields": fields,
            })

    # Deduplicate by level (keep highest per level)
    seen_levels = set()
    unique = []
    for e in sorted(entries, key=lambda x: x["level"], reverse=True):
        if e["level"] not in seen_levels:
            seen_levels.add(e["level"])
            unique.append(e)

    return unique


def _extract_education_requirements(jd_text: str) -> Dict:
    """Extract education requirements from JD text."""
    text_lower = jd_text.lower()
    
    min_level = 0
    for degree_term, level in DEGREE_LEVELS.items():
        if degree_term in text_lower:
            min_level = max(min_level, level)

    preferred_fields = []
    for field_name, keywords in FIELD_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            preferred_fields.append(field_name)

    return {
        "min_level": min_level,
        "min_label": DEGREE_LABELS.get(min_level, "Not specified"),
        "preferred_fields": preferred_fields,
    }


def _recognize_universities(resume_text: str) -> List[Dict]:
    """Recognize universities mentioned in resume using KB lookup."""
    recognized = []
    text_lower = resume_text.lower()

    try:
        with engine.connect() as conn:
            # Query a sample of university names to check against
            rows = conn.execute(text(
                "SELECT DISTINCT name, country FROM kb_universities LIMIT 5000"
            )).fetchall()
            
            for row in rows:
                name = row[0]
                country = row[1] if len(row) > 1 else ""
                if name and len(name) > 5 and name.lower() in text_lower:
                    recognized.append({
                        "name": name,
                        "country": country or "Unknown",
                        "recognized": True,
                    })
    except Exception as e:
        logger.debug("University KB lookup failed: %s", e)

    return recognized[:10]  # Cap at 10


def _compute_edu_score(resume_level: int, jd_level: int, uni_count: int, field_match: bool) -> float:
    """Compute education score 0-100."""
    if jd_level == 0:
        return 80.0  # No specific requirement

    score = 0.0
    
    # Degree level (60% weight)
    if resume_level >= jd_level:
        score += 60.0
    elif resume_level == jd_level - 1:
        score += 40.0
    elif resume_level > 0:
        score += 20.0

    # University recognition (20% weight)
    if uni_count > 0:
        score += 20.0

    # Field match (20% weight)
    if field_match:
        score += 20.0

    return min(100.0, score)
