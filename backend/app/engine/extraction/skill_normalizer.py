"""
Skill Normalizer — Converts raw JD phrases into normalized skill concepts.

Eliminates keyword noise (fragments like "senior staffs", "basic knowledge")
and groups related terms under canonical skill concepts.
"""

import logging
import re
from typing import Dict, List, Optional, Set, Tuple
from sqlalchemy import text
from backend.app.database import engine
from backend.app.engine.extraction.extractor import normalize

logger = logging.getLogger(__name__)

# ── Noise phrases that should NEVER be treated as skills ──────────────────

NOISE_PHRASES: Set[str] = {
    # Generic corporate filler
    "business", "applications", "services", "solutions", "platforms",
    "systems", "tools", "technologies", "infrastructure", "environment",
    "operations", "management", "processes", "procedures", "practices",
    "standards", "requirements", "objectives", "strategies", "initiatives",
    "resources", "activities", "functions", "responsibilities", "tasks",
    "duties", "assignments", "deliverables", "outcomes", "results",

    # JD filler phrases
    "senior staffs", "basic knowledge", "strong understanding",
    "further investigations", "deep understanding", "good understanding",
    "excellent communication", "problem solving skills", "team player",
    "self starter", "detail oriented", "fast paced environment",
    "ability to work", "willingness to learn", "passion for",
    "strong analytical", "excellent written", "verbal communication",
    "interpersonal skills", "organizational skills", "time management",
    "multi tasking", "positive attitude", "proactive approach",
    "cross functional", "stakeholder management", "continuous improvement",

    # Verb phrases that aren't skills
    "manage incidents", "perform analysis", "conduct investigations",
    "provide support", "develop solutions", "implement changes",
    "monitor systems", "review reports", "create documentation",
    "coordinate activities", "escalate issues", "identify trends",
}

# ── Minimum viability checks ──────────────────────────────────────────────

_PURE_GENERIC_NOUNS = {
    "staff", "staffs", "team", "teams", "member", "members",
    "knowledge", "understanding", "experience", "ability", "skill",
    "candidate", "individual", "person", "professional", "analyst",
    "specialist", "engineer", "manager", "lead", "director",
    "work", "job", "role", "position", "opportunity",
    "company", "organization", "firm", "client", "customer",
    "year", "years", "month", "months", "day", "days",
    "level", "levels", "area", "areas", "field", "fields",
    "type", "types", "kind", "form", "basis", "manner",
}

_FILLER_ADJECTIVES = {
    "basic", "strong", "excellent", "good", "great", "deep",
    "advanced", "senior", "junior", "mid", "high", "low",
    "full", "part", "remote", "onsite", "hybrid",
    "relevant", "related", "similar", "various", "multiple",
    "effective", "efficient", "successful", "demonstrated",
    "proven", "extensive", "comprehensive", "thorough",
}


def is_real_skill(term: str) -> bool:
    """Return True only if this term represents an actual skill/tool/technology."""
    if not term or len(term.strip()) < 3:
        return False

    normalized = normalize(term)

    # Reject known noise phrases
    if normalized in NOISE_PHRASES:
        return False

    # Reject pure generic nouns
    words = normalized.split()
    if len(words) == 1 and words[0] in _PURE_GENERIC_NOUNS:
        return False

    # Reject "adjective + generic noun" patterns (e.g., "basic knowledge", "strong understanding")
    if len(words) == 2:
        if words[0] in _FILLER_ADJECTIVES and words[1] in _PURE_GENERIC_NOUNS:
            return False

    # Reject pure verb phrases (3+ words starting with a verb)
    if len(words) >= 3:
        _COMMON_VERBS = {"manage", "perform", "conduct", "provide", "develop",
                         "implement", "monitor", "review", "create", "coordinate",
                         "escalate", "identify", "analyze", "support", "maintain"}
        if words[0] in _COMMON_VERBS:
            return False

    # Check against KB for positive match
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT COUNT(*) FROM kb_skills WHERE normalized = :n"),
                {"n": normalized}
            )
            if result.scalar() > 0:
                return True

            # Also check cyber skills
            result = conn.execute(
                text("SELECT COUNT(*) FROM kb_cyber_skills WHERE LOWER(skill_name) = :n"),
                {"n": normalized}
            )
            if result.scalar() > 0:
                return True

            # Check aliases
            result = conn.execute(
                text("SELECT COUNT(*) FROM kb_skill_aliases WHERE alias_normalized = :n"),
                {"n": normalized}
            )
            if result.scalar() > 0:
                return True
    except Exception as e:
        logger.warning("KB lookup failed for skill validation: %s", e)

    # If not in KB, still accept if it looks like a technical term
    # (contains numbers, special chars, or is an acronym)
    if re.search(r'\d', term):  # Contains numbers (e.g., "Python 3.x", "802.1x")
        return True
    if term.isupper() and len(term) >= 2:  # Acronym (e.g., "SIEM", "EDR")
        return True
    if any(c in term for c in ['+', '#', '/', '.']):  # Technical chars (e.g., "C++", "C#")
        return True

    # Default: accept terms with ≤ 3 words that aren't in noise lists
    # (slightly permissive to avoid false negatives on lesser-known tools)
    if len(words) <= 3:
        return True

    return False


def normalize_and_group_skills(
    raw_keywords: List[str],
) -> Dict[str, dict]:
    """
    Take a list of raw JD keywords and return grouped, normalized skill concepts.

    Returns:
        {
            "canonical_name": {
                "canonical": str,
                "variants": [str, ...],
                "category": str | None,
                "is_real_skill": bool,
            }
        }
    """
    # Step 1: Filter noise
    valid_skills = []
    noise_filtered = []

    for kw in raw_keywords:
        if is_real_skill(kw):
            valid_skills.append(kw)
        else:
            noise_filtered.append({
                "skill": kw,
                "reason": _classify_noise_reason(kw),
            })

    if noise_filtered:
        logger.info(
            "Filtered %d noise keywords: %s",
            len(noise_filtered),
            [n["skill"] for n in noise_filtered][:10],
        )

    # Step 2: Group by substring containment and KB category
    groups: Dict[str, dict] = {}
    assigned: Set[str] = set()

    # Sort by length (shorter = more likely canonical)
    sorted_skills = sorted(valid_skills, key=lambda s: len(s))

    for skill in sorted_skills:
        norm = normalize(skill)
        if norm in assigned:
            continue

        # Check if this skill is a variant of an existing group
        merged = False
        for canon_key, group in groups.items():
            # Substring containment: "firewall" in "next-gen firewall"
            if norm in normalize(canon_key) or normalize(canon_key) in norm:
                group["variants"].append(skill)
                assigned.add(norm)
                merged = True
                break

            # Check if any existing variant contains this or vice versa
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
            # Check KB for canonical name
            category = _lookup_skill_category(norm)
            groups[skill] = {
                "canonical": skill,
                "variants": [skill],
                "category": category,
                "is_real_skill": True,
            }
            assigned.add(norm)

    return groups, noise_filtered


def _classify_noise_reason(term: str) -> str:
    """Classify why a term was filtered as noise."""
    normalized = normalize(term)

    if normalized in NOISE_PHRASES:
        return "JD filler phrase — not a real skill"

    words = normalized.split()
    if len(words) == 1 and words[0] in _PURE_GENERIC_NOUNS:
        return "Generic noun — not a specific skill"

    if len(words) == 2 and words[0] in _FILLER_ADJECTIVES and words[1] in _PURE_GENERIC_NOUNS:
        return f"Adjective + generic noun — '{term}' is not actionable"

    if len(words) >= 3:
        return "Verb phrase — describes activity, not a skill"

    return "Too short or non-specific"


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
