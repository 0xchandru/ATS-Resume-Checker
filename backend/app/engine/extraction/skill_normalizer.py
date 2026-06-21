"""
Skill Normalizer — Converts raw JD phrases into normalized skill concepts.

Eliminates keyword noise (fragments like "senior staffs", "basic knowledge")
and groups related terms under canonical skill concepts.
"""

import logging
import re
from typing import Dict, List, Optional, Sequence, Set, Tuple, Union
from sqlalchemy import text
from backend.app.database import engine
from backend.app.engine.extraction.extractor import normalize

logger = logging.getLogger(__name__)

def is_real_skill(term: Union[str, dict]) -> bool:
    """Return True only if this term represents an actual skill/tool/technology."""
    if isinstance(term, dict):
        term_value = term.get("term")
        term = term_value if isinstance(term_value, str) else ""
    if not term or len(term.strip()) < 2:
        return False

    normalized = normalize(term)

    # Check against KB for positive match (Strict Dataset Check)
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT COUNT(*) FROM kb_skills WHERE normalized = :n"),
                {"n": normalized}
            )
            if (result.scalar() or 0) > 0:
                return True

            result = conn.execute(
                text("SELECT COUNT(*) FROM kb_cyber_skills WHERE LOWER(skill_name) = :n"),
                {"n": normalized}
            )
            if (result.scalar() or 0) > 0:
                return True

            result = conn.execute(
                text("SELECT COUNT(*) FROM kb_skill_aliases WHERE alias_normalized = :n"),
                {"n": normalized}
            )
            if (result.scalar() or 0) > 0:
                return True
    except Exception as e:
        logger.warning("KB lookup failed for skill validation: %s", e)

    return False


def normalize_and_group_skills(
    raw_keywords: Sequence[Union[str, Dict]],
) -> Tuple[Dict[str, dict], List[dict]]:
    valid_skills = []
    noise_filtered = []

    for kw in raw_keywords:
        term = kw.get("term") if isinstance(kw, dict) else kw
        if not isinstance(term, str) or not term.strip():
            continue
        valid_skills.append(kw)

    groups: Dict[str, dict] = {}
    assigned: Set[str] = set()

    sorted_skills = sorted(valid_skills, key=lambda s: len((s.get("term") or "") if isinstance(s, dict) else s))

    for skill_obj in sorted_skills:
        is_dict = isinstance(skill_obj, dict)
        skill = (skill_obj.get("term") or "") if is_dict else skill_obj
        norm = normalize(str(skill))
        
        if norm in assigned:
            continue

        merged = False
        for canon_key, group in groups.items():
            canon_norm = normalize(canon_key)
            if norm in canon_norm or canon_norm in norm:
                group["variants"].append(skill)
                assigned.add(norm)
                merged = True
                break

            for variant in group["variants"]:
                vn = normalize(variant)
                if norm in vn or vn in norm:
                    group["variants"].append(skill)
                    assigned.add(norm)
                    merged = True
                    break
            if merged:
                break

        if not merged:
            if is_dict:
                group_obj = dict(skill_obj)
                group_obj["canonical"] = skill_obj.get("canonical", skill)
                group_obj["variants"] = [skill]
                group_obj["is_real_skill"] = True
                groups[skill] = group_obj
            else:
                category = _lookup_skill_category(norm)
                groups[skill] = {
                    "canonical": skill,
                    "variants": [skill],
                    "category": category,
                    "is_real_skill": True,
                    "term": skill,
                    "normalized": norm
                }
            assigned.add(norm)

    return groups, noise_filtered


def _classify_noise_reason(term: str) -> str:
    """Classify why a term was filtered as noise."""
    return "Not found in skills database"


def _lookup_skill_category(normalized_term: str) -> Optional[str]:
    """Look up the category of a skill from the KB."""
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT category FROM kb_skills WHERE normalized = :n LIMIT 1"),
                {"n": normalized_term}
            )
            row = result.fetchone()
            if row and row[0]:
                return row[0]
    except Exception:
        pass
    return None
