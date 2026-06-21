"""
Certification Matcher — matches certifications from resume against JD requirements.
Uses the KB certifications tables for lookup and regex patterns for fuzzy matching.
"""
import re
import logging
from typing import Dict, List, Optional
from sqlalchemy import text
from backend.app.database import engine

logger = logging.getLogger(__name__)


def match_certifications(resume_text: str, jd_text: str) -> Dict:
    """
    Match certifications found in resume against those required/mentioned in JD.
    Returns matched, missing, and bonus certifications.
    """
    resume_certs = _extract_certs_from_text(resume_text)
    jd_certs = _extract_certs_from_text(jd_text)

    matched = []
    missing = []
    bonus = []

    jd_cert_names = {c["canonical"].lower() for c in jd_certs}
    resume_cert_names = {c["canonical"].lower() for c in resume_certs}

    for jc in jd_certs:
        key = jc["canonical"].lower()
        if key in resume_cert_names:
            matched.append({
                "certification": jc["canonical"],
                "acronym": jc.get("acronym", ""),
                "source": "resume",
                "match_type": "exact_match",
            })
        else:
            # Try alias matching
            alias_match = _check_cert_aliases(key, resume_cert_names)
            if alias_match:
                matched.append({
                    "certification": jc["canonical"],
                    "acronym": jc.get("acronym", ""),
                    "source": "resume",
                    "match_type": "normalized_match",
                    "matched_as": alias_match,
                })
            else:
                missing.append({
                    "certification": jc["canonical"],
                    "acronym": jc.get("acronym", ""),
                    "importance": "high",
                })

    # Bonus certs: in resume but not required by JD
    for rc in resume_certs:
        key = rc["canonical"].lower()
        if key not in jd_cert_names:
            bonus.append({
                "certification": rc["canonical"],
                "acronym": rc.get("acronym", ""),
                "value": "bonus",
            })

    return {
        "matched": matched,
        "missing": missing,
        "bonus": bonus,
        "matched_count": len(matched),
        "missing_count": len(missing),
        "bonus_count": len(bonus),
        "score": round((len(matched) / max(1, len(jd_certs))) * 100, 1) if jd_certs else 100.0,
    }


def _extract_certs_from_text(text_content: str) -> List[Dict]:
    """Extract certifications from text using KB lookup + regex patterns."""
    certs = []
    seen = set()
    text_lower = text_content.lower()

    # 1. KB regex patterns
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT pattern, canonical, acronym FROM kb_cert_regex"
            )).fetchall()
            for row in rows:
                pattern, canonical, acronym = row[0], row[1], row[2] if len(row) > 2 else ""
                try:
                    if re.search(pattern, text_content, re.IGNORECASE):
                        key = canonical.lower()
                        if key not in seen:
                            seen.add(key)
                            certs.append({"canonical": canonical, "acronym": acronym or "", "source": "regex"})
                except re.error:
                    continue
    except Exception as e:
        logger.debug("Cert regex lookup failed: %s", e)

    # 2. KB direct lookup (cert names in text)
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT DISTINCT canonical, acronym FROM kb_certifications"
            )).fetchall()
            for row in rows:
                canonical, acronym = row[0], row[1] if len(row) > 1 else ""
                key = canonical.lower()
                if key not in seen and key in text_lower:
                    seen.add(key)
                    certs.append({"canonical": canonical, "acronym": acronym or "", "source": "kb_lookup"})
                # Also check acronym
                if acronym and len(acronym) >= 2:
                    acr_lower = acronym.lower()
                    if acr_lower not in seen:
                        # Check for standalone acronym (word boundary)
                        if re.search(r'\b' + re.escape(acronym) + r'\b', text_content, re.IGNORECASE):
                            seen.add(acr_lower)
                            certs.append({"canonical": canonical, "acronym": acronym, "source": "acronym"})
    except Exception as e:
        logger.debug("Cert KB lookup failed: %s", e)

    return certs


def _check_cert_aliases(cert_name: str, resume_certs: set) -> Optional[str]:
    """Check if a JD cert has an alias that matches a resume cert."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT alias FROM kb_cert_aliases WHERE canonical = :name"
            ), {"name": cert_name}).fetchall()
            for row in rows:
                alias = row[0].lower()
                if alias in resume_certs:
                    return alias
    except Exception:
        pass
    return None
