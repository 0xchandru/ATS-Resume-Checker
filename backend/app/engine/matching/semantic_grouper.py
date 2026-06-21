"""
Semantic Skill Grouper — Groups related skills so that matching one variant
satisfies the entire concept group.

For example, if JD says "SIEM experience" and resume says "Splunk",
that's a concept match (not a miss).
"""

import logging
from typing import Dict, List, Optional, Tuple, Union, Sequence
from backend.app.engine.extraction.extractor import normalize

logger = logging.getLogger(__name__)

from sqlalchemy import text
from backend.app.database import engine

# Match confidence thresholds
DIRECT_MATCH = 1.0       # Exact keyword or alias found
CONCEPT_MATCH = 0.92     # Different term in same skill group
NEAR_MATCH = 0.80        # Semantically related (via embeddings)
INFERRED_MATCH = 0.65    # Implied by a higher-level skill


def _extract_term(keyword: Union[str, Dict]) -> str:
    if isinstance(keyword, dict):
        return keyword.get("term") or keyword.get("canonical") or keyword.get("normalized") or ""
    return keyword or ""


def find_group_for_skill(skill_term: Union[str, Dict]) -> Optional[Tuple[str, str]]:
    """
    Check if a skill term belongs to any predefined skill group or KB category.

    Returns:
        (category_name, canonical_term) or None
    """
    term = _extract_term(skill_term)
    norm = normalize(term)

    try:
        with engine.connect() as conn:
            # 1. Check if it's an alias, get canonical
            result = conn.execute(
                text("SELECT canonical_name FROM kb_skill_aliases WHERE alias_normalized = :n LIMIT 1"),
                {"n": norm}
            )
            row = result.fetchone()
            if row:
                canonical = row[0]
                # Look up category of canonical
                cat_res = conn.execute(
                    text("SELECT category FROM kb_skills WHERE canonical_name = :c LIMIT 1"),
                    {"c": canonical}
                )
                cat_row = cat_res.fetchone()
                if cat_row and cat_row[0]:
                    return (cat_row[0], canonical)
                return (canonical, canonical)

            # 2. Check if it's a primary skill
            result = conn.execute(
                text("SELECT category, canonical_name FROM kb_skills WHERE normalized = :n LIMIT 1"),
                {"n": norm}
            )
            row = result.fetchone()
            if row:
                category = row[0]
                canonical = row[1]
                if category:
                    return (category, canonical)
                return (canonical, canonical)
    except Exception as e:
        logger.warning("KB lookup failed in find_group_for_skill: %s", e)

    return None


def group_aware_match(
    jd_keywords: Sequence[Union[str, Dict]],
    resume_keywords: Sequence[Union[str, Dict]],
    matched_pairs: List[dict],
) -> List[dict]:
    """
    Enhance match results with concept-level grouping.

    For each JD keyword, check if it belongs to a skill group.
    If any resume keyword belongs to the same group, it's a concept match.

    Args:
        jd_keywords: All JD-extracted keywords
        resume_keywords: All resume-extracted keywords
        matched_pairs: Existing direct/fuzzy/semantic matches from matcher.py

    Returns:
        Enhanced matched_pairs with concept matches added
    """
    # Build set of already-matched JD keywords
    already_matched = {normalize(m.get("jd_keyword", "")) for m in matched_pairs}

    def _normalize_keyword(term: Union[str, Dict]) -> str:
        return normalize(_extract_term(term))

    # Build resume skill group membership
    resume_groups: Dict[str, List[str]] = {}
    for rk in resume_keywords:
        group_info = find_group_for_skill(rk)
        if group_info:
            gname = group_info[0]
            if gname not in resume_groups:
                resume_groups[gname] = []
            resume_groups[gname].append(_extract_term(rk))

    # Check unmatched JD keywords for concept matches
    concept_matches = []
    for jk in jd_keywords:
        jk_term = _extract_term(jk)
        jk_norm = _normalize_keyword(jk)
        if jk_norm in already_matched:
            continue

        jd_group = find_group_for_skill(jk_term)
        if not jd_group:
            continue

        gname = jd_group[0]
        if gname in resume_groups:
            # Found a concept match!
            resume_variant = resume_groups[gname][0]  # Use first match
            
            # Carry over JD properties if jk is a dict
            freq = jk.get("frequency", 0.0) if isinstance(jk, dict) else 0.0
            req_type = jk.get("requirement_type", "mentioned") if isinstance(jk, dict) else "mentioned"
            from backend.app.engine.matching.matcher import _calc_importance
            kb_source = jk.get("kb_source", "primary") if isinstance(jk, dict) else "primary"
            
            concept_matches.append({
                "keyword": jk_term,
                "normalized_form": jd_group[1],
                "match_layer": "concept",
                "match_type": "concept",
                "matched_form": resume_variant,
                "jd_keyword": jk_term,
                "resume_keyword": resume_variant,
                "confidence": CONCEPT_MATCH,
                "match_confidence": CONCEPT_MATCH,
                "category": gname,
                "group_name": gname,
                "explanation": f"'{jk_term}' and '{resume_variant}' are both in the '{gname}' skill group",
                "jd_frequency": freq,
                "requirement_type": req_type,
                "jd_importance": _calc_importance(freq, req_type, kb_source),
                "jd_occurrence_count": 1,
            })
            already_matched.add(jk_norm)

    # Categorize existing matches
    for m in matched_pairs:
        if "match_type" not in m:
            m["match_type"] = "direct"
        if "confidence" not in m:
            layer = m.get("match_layer", "exact")
            if layer == "exact" or layer == "alias":
                m["confidence"] = DIRECT_MATCH
            elif layer == "fuzzy":
                m["confidence"] = 0.85
            elif layer == "semantic":
                m["confidence"] = NEAR_MATCH
            else:
                m["confidence"] = DIRECT_MATCH

    return matched_pairs + concept_matches


def classify_match_type(match_layer: str, similarity: float = 1.0) -> Tuple[str, float]:
    """Classify a match into direct/concept/near/inferred categories."""
    if match_layer in ("exact", "alias", "kb_exact"):
        return "direct", DIRECT_MATCH
    elif match_layer == "fuzzy":
        return "near", max(0.75, similarity)
    elif match_layer == "semantic":
        if similarity >= 0.85:
            return "concept", CONCEPT_MATCH
        elif similarity >= 0.70:
            return "near", similarity
        else:
            return "inferred", similarity
    return "direct", DIRECT_MATCH
