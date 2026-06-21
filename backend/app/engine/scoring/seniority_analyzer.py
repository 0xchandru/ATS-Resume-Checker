"""
Seniority Analyzer — Detects seniority level from both JD and resume,
computes the gap, and applies score penalties.

If a fresher resume targets a senior JD, this module says that plainly
and caps the score accordingly.
"""

import logging
import re
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Seniority levels (ordered) ────────────────────────────────────────────

SENIORITY_LEVELS = {
    "intern":     0,
    "entry":      1,
    "junior":     2,
    "mid":        3,
    "senior":     4,
    "lead":       5,
    "principal":  6,
    "staff":      6,
    "director":   7,
    "vp":         8,
    "executive":  9,
}

LEVEL_NAMES = {v: k for k, v in SENIORITY_LEVELS.items()}

# ── Score caps based on seniority gap ─────────────────────────────────────

SCORE_CAPS = {
    0: 100,   # No gap → no cap
    1: 75,    # 1 level gap → max 75
    2: 55,    # 2 level gap → max 55
    3: 35,    # 3+ level gap → max 35
}

# ── Detection patterns ───────────────────────────────────────────────────

# Years of experience patterns
_YEARS_PATTERNS = [
    r'(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)',
    r'minimum\s+(?:of\s+)?(\d+)\s*(?:years?|yrs?)',
    r'at\s+least\s+(\d+)\s*(?:years?|yrs?)',
    r'(\d+)\s*-\s*\d+\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)',
    r'(\d+)\+\s*(?:years?|yrs?)',
]

# Title-level markers
_TITLE_LEVEL_MAP = {
    "intern":       ["intern", "internship", "trainee", "co-op", "apprentice"],
    "entry":        ["entry level", "entry-level", "associate", "graduate", "fresher"],
    "junior":       ["junior", "jr", "level 1", "level i", "analyst i", "engineer i"],
    "mid":          ["mid level", "mid-level", "level 2", "level ii", "analyst ii", "engineer ii"],
    "senior":       ["senior", "sr", "level 3", "level iii", "analyst iii", "engineer iii"],
    "lead":         ["lead", "team lead", "tech lead", "technical lead", "supervisor"],
    "principal":    ["principal", "staff", "distinguished", "fellow"],
    "director":     ["director", "head of", "chief"],
    "vp":           ["vice president", "vp"],
    "executive":    ["ciso", "cto", "cio", "cso", "c-level", "executive"],
}

# Scope indicators
_SCOPE_PATTERNS = [
    r'team\s+of\s+(\d+)',
    r'(\d+)\s+(?:team\s+)?members?',
    r'(\d+)\s+direct\s+reports?',
    r'budget\s+(?:of\s+)?\$[\d,]+',
    r'(?:managed|led|oversaw)\s+(?:a\s+)?team',
]

# Certification seniority signals
_SENIOR_CERTS = {"cissp", "cism", "cisa", "oscp", "giac", "ccnp", "casp+", "crisc"}
_JUNIOR_CERTS = {"security+", "comptia security+", "network+", "a+", "cysa+", "ccna"}


def analyze_jd_seniority(jd_text: str) -> Dict:
    """
    Analyze a job description to determine the required seniority level.

    Returns:
        {
            "level": str,            # "junior", "mid", "senior", etc.
            "level_numeric": int,    # 0-9
            "years_required": int | None,
            "signals": [str, ...],   # List of signals detected
            "confidence": float,     # 0-1
        }
    """
    lower_jd = jd_text.lower()
    signals = []
    level_votes = []

    # 1. Parse explicit year requirements
    years_required = None
    for pattern in _YEARS_PATTERNS:
        match = re.search(pattern, lower_jd)
        if match:
            years = int(match.group(1))
            years_required = years
            signals.append(f"{years}+ years of experience required")

            if years >= 8:
                level_votes.append(("lead", 0.9))
            elif years >= 5:
                level_votes.append(("senior", 0.9))
            elif years >= 3:
                level_votes.append(("mid", 0.8))
            elif years >= 1:
                level_votes.append(("junior", 0.7))
            else:
                level_votes.append(("entry", 0.6))
            break

    # 2. Parse title-level markers
    for level, markers in _TITLE_LEVEL_MAP.items():
        for marker in markers:
            # Check in title context (first 200 chars or near "title" keyword)
            if marker in lower_jd[:300] or f"role: {marker}" in lower_jd or f"position: {marker}" in lower_jd:
                level_votes.append((level, 0.85))
                signals.append(f"Title contains '{marker}'")
                break

    # 3. Parse responsibility scope
    scope_count = 0
    for pattern in _SCOPE_PATTERNS:
        if re.search(pattern, lower_jd):
            scope_count += 1
    if scope_count >= 2:
        level_votes.append(("lead", 0.7))
        signals.append(f"Leadership scope indicators found ({scope_count})")
    elif scope_count == 1:
        level_votes.append(("senior", 0.5))
        signals.append("Some leadership scope indicators")

    # 4. Parse cert requirements
    for cert in _SENIOR_CERTS:
        if cert in lower_jd:
            level_votes.append(("senior", 0.6))
            signals.append(f"Senior certification required: {cert.upper()}")
            break

    for cert in _JUNIOR_CERTS:
        if cert in lower_jd and not any(c in lower_jd for c in _SENIOR_CERTS):
            level_votes.append(("junior", 0.4))
            signals.append(f"Entry-level certification: {cert}")

    # 5. Compute final level
    if not level_votes:
        return {
            "level": "mid",  # Default assumption
            "level_numeric": SENIORITY_LEVELS["mid"],
            "years_required": years_required,
            "signals": ["No explicit seniority signals found — defaulting to mid-level"],
            "confidence": 0.3,
        }

    # Weighted vote
    level_scores = {}
    for level, confidence in level_votes:
        level_scores[level] = level_scores.get(level, 0) + confidence

    best_level = max(level_scores, key=lambda k: level_scores[k])
    total_confidence = min(1.0, level_scores[best_level] / len(level_votes))

    return {
        "level": best_level,
        "level_numeric": SENIORITY_LEVELS.get(best_level, 3),
        "years_required": years_required,
        "signals": signals,
        "confidence": round(total_confidence, 2),
    }


def analyze_resume_seniority(
    resume_text: str,
    career_intelligence: Optional[Dict] = None,
) -> Dict:
    """
    Analyze a resume to determine the candidate's seniority level.

    Returns:
        {
            "level": str,
            "level_numeric": int,
            "years_experience": float | None,
            "signals": [str, ...],
            "confidence": float,
        }
    """
    lower_text = resume_text.lower()
    signals = []
    level_votes = []

    # 1. Use career intelligence if available
    if career_intelligence:
        ci_level = career_intelligence.get("seniority_estimate", {})
        if isinstance(ci_level, dict):
            level = ci_level.get("level", "").lower()
            if level in SENIORITY_LEVELS:
                level_votes.append((level, 0.8))
                signals.append(f"Career intelligence detected: {level}")

        years = career_intelligence.get("total_experience_years")
        if years:
            signals.append(f"Estimated {years} years of experience")
            if years >= 8:
                level_votes.append(("lead", 0.8))
            elif years >= 5:
                level_votes.append(("senior", 0.8))
            elif years >= 3:
                level_votes.append(("mid", 0.7))
            elif years >= 1:
                level_votes.append(("junior", 0.7))
            else:
                level_votes.append(("entry", 0.6))

    # 2. Parse work experience date ranges
    years_from_dates = _estimate_years_from_dates(resume_text)
    if years_from_dates is not None:
        signals.append(f"Date range analysis: ~{years_from_dates:.1f} years")
        if years_from_dates >= 8:
            level_votes.append(("lead", 0.7))
        elif years_from_dates >= 5:
            level_votes.append(("senior", 0.7))
        elif years_from_dates >= 3:
            level_votes.append(("mid", 0.6))
        elif years_from_dates >= 1:
            level_votes.append(("junior", 0.6))
        else:
            level_votes.append(("entry", 0.5))

    # 3. Analyze job titles
    for level, markers in _TITLE_LEVEL_MAP.items():
        for marker in markers:
            if marker in lower_text:
                level_votes.append((level, 0.5))
                signals.append(f"Title indicator: '{marker}'")
                break

    # 4. Analyze verb usage
    words = set(lower_text.split())
    
    try:
        from sqlalchemy import text
        from backend.app.database import engine
        with engine.connect() as conn:
            verb_rows = conn.execute(text("SELECT verb, strength FROM kb_action_verbs")).fetchall()
            senior_verbs = {row[0].lower() for row in verb_rows if row[1] == 3}
            junior_verbs = {row[0].lower() for row in verb_rows if row[1] == 1}
    except Exception as e:
        logger.warning("Failed to load verbs from KB for seniority check: %s", e)
        senior_verbs = set()
        junior_verbs = set()

    senior_verb_count = len(words & senior_verbs)
    junior_verb_count = len(words & junior_verbs)

    if senior_verb_count >= 3:
        level_votes.append(("senior", 0.5))
        signals.append(f"Strong leadership verbs: {senior_verb_count}")
    elif junior_verb_count >= 3 and senior_verb_count == 0:
        level_votes.append(("entry", 0.5))
        signals.append(f"Mostly junior verbs: {junior_verb_count}")

    # 5. Check for "fresher" indicators
    fresher_indicators = [
        "fresher", "fresh graduate", "recent graduate", "new graduate",
        "entry level", "seeking first", "career start", "aspiring",
        "looking for opportunities", "passionate about starting",
    ]
    for ind in fresher_indicators:
        if ind in lower_text:
            level_votes.append(("entry", 0.8))
            signals.append(f"Fresher indicator: '{ind}'")
            break

    # 6. Check for lab/training-heavy indicators (no real experience)
    lab_heavy = sum(1 for ind in ["tryhackme", "hackthebox", "ctf", "home lab", "homelab", "virtual lab"]
                    if ind in lower_text)
    if lab_heavy >= 2:
        level_votes.append(("entry", 0.6))
        signals.append(f"Lab/training-heavy profile ({lab_heavy} indicators)")

    # Compute final level
    if not level_votes:
        return {
            "level": "junior",  # Conservative default
            "level_numeric": SENIORITY_LEVELS["junior"],
            "years_experience": years_from_dates,
            "signals": ["No clear seniority signals — defaulting to junior"],
            "confidence": 0.3,
        }

    level_scores = {}
    for level, confidence in level_votes:
        level_scores[level] = level_scores.get(level, 0) + confidence

    best_level = max(level_scores, key=lambda k: level_scores[k])
    total_confidence = min(1.0, level_scores[best_level] / max(1, len(level_votes)) * 2)

    return {
        "level": best_level,
        "level_numeric": SENIORITY_LEVELS.get(best_level, 2),
        "years_experience": years_from_dates,
        "signals": signals,
        "confidence": round(total_confidence, 2),
    }


def compute_seniority_gap(
    jd_seniority: Dict,
    resume_seniority: Dict,
) -> Dict:
    """
    Compute the gap between JD-required and candidate seniority.

    Returns:
        {
            "jd_level": str,
            "resume_level": str,
            "gap_levels": int,
            "gap_severity": "none" | "minor" | "significant" | "critical",
            "plain_statement": str,
            "score_cap": int,
            "score_impact": int,  # Negative penalty
        }
    """
    jd_level = jd_seniority.get("level_numeric", 3)
    resume_level = resume_seniority.get("level_numeric", 2)
    jd_name = jd_seniority.get("level", "mid")
    resume_name = resume_seniority.get("level", "junior")

    gap = max(0, jd_level - resume_level)

    # Determine severity
    if gap == 0:
        severity = "none"
        statement = f"Seniority match: Both the JD and your profile are at {jd_name}-level."
        score_impact = 0
    elif gap == 1:
        severity = "minor"
        statement = (
            f"Slight seniority gap: The JD targets {jd_name}-level, "
            f"but your profile reads as {resume_name}-level. "
            f"This is a stretch but achievable with strong skills."
        )
        score_impact = -8
    elif gap == 2:
        severity = "significant"
        years_req = jd_seniority.get("years_required")
        years_str = f" ({years_req}+ years required)" if years_req else ""
        statement = (
            f"Significant seniority mismatch: The JD requires {jd_name}-level experience{years_str}, "
            f"but your resume shows {resume_name}-level experience. "
            f"This is a major gap that keyword overlap cannot compensate for."
        )
        score_impact = -15
    else:
        severity = "critical"
        years_req = jd_seniority.get("years_required")
        years_str = f" ({years_req}+ years required)" if years_req else ""
        statement = (
            f"Critical seniority mismatch: The JD requires {jd_name}-level experience{years_str}, "
            f"but your resume shows {resume_name}-level experience. "
            f"This role is significantly above your current experience level. "
            f"Consider targeting roles at {resume_name} or "
            f"{LEVEL_NAMES.get(resume_level + 1, 'mid')}-level instead."
        )
        score_impact = -25

    # Score cap
    score_cap = SCORE_CAPS.get(min(gap, 3), 35)

    return {
        "jd_level": jd_name,
        "resume_level": resume_name,
        "gap_levels": gap,
        "gap_severity": severity,
        "plain_statement": statement,
        "score_cap": score_cap,
        "score_impact": score_impact,
    }


def _estimate_years_from_dates(text: str) -> Optional[float]:
    """
    Estimate total years of experience from date ranges in resume text.
    Looks for patterns like "Jan 2020 - Dec 2022" or "2019 - Present".
    """
    # Pattern: Month Year - Month Year or Year - Year
    date_range_pattern = r'(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+)?(\d{4})\s*[-–—to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+)?(\d{4}|[Pp]resent|[Cc]urrent|[Nn]ow|[Oo]ngoing)'

    import datetime
    current_year = datetime.datetime.now().year

    total_months = 0
    matches = re.findall(date_range_pattern, text)

    for start_year, end_str in matches:
        try:
            sy = int(start_year)
            if end_str.isdigit():
                ey = int(end_str)
            else:
                ey = current_year

            if 1990 <= sy <= current_year and sy <= ey <= current_year + 1:
                total_months += max(0, (ey - sy) * 12)
        except (ValueError, TypeError):
            continue

    if total_months > 0:
        return round(total_months / 12, 1)
    return None
