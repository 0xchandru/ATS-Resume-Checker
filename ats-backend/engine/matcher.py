import re
import logging
from typing import List, Dict, Tuple
from engine.extractor import normalize
from sqlalchemy import text
from database import engine

logger = logging.getLogger(__name__)


def match_all_layers(
    resume_kws: List[Dict],
    jd_kws: List[Dict],
    resume_text: str,
    jd_text: str,
) -> Dict:
    resume_terms = {kw["normalized"]: kw for kw in resume_kws}
    jd_terms = {kw["normalized"]: kw for kw in jd_kws}

    jd_norm_set = set(jd_terms.keys())
    resume_norm_set = set(resume_terms.keys())

    full_resume_tokens = set(_tokenize_text(resume_text))
    full_jd_tokens = set(_tokenize_text(jd_text))

    jd_all = jd_norm_set | full_jd_tokens

    matched = []
    missing = []
    breakdown = {"alias": 0, "exact": 0, "kb_lookup": 0, "fuzzy": 0, "semantic": 0}

    unmatched_jd = set()

    for jd_norm, jd_kw in jd_terms.items():
        original_jd = jd_kw.get("term", jd_norm)

        result = _try_alias(jd_norm, jd_kw, resume_norm_set | full_resume_tokens)
        if result:
            breakdown["alias"] += 1
            matched.append(result)
            continue

        result = _try_exact(jd_norm, jd_kw, resume_norm_set | full_resume_tokens)
        if result:
            breakdown["exact"] += 1
            matched.append(result)
            continue

        result = _try_kb_lookup(jd_norm, jd_kw, resume_norm_set | full_resume_tokens)
        if result:
            breakdown["kb_lookup"] += 1
            matched.append(result)
            continue

        unmatched_jd.add(jd_norm)

    if unmatched_jd:
        unmatched_list = list(unmatched_jd)
        resume_norm_list = list(resume_norm_set | full_resume_tokens)

        fuzzy_matched, still_unmatched = _try_fuzzy_batch(
            unmatched_list, resume_norm_list, jd_terms
        )
        for item in fuzzy_matched:
            breakdown["fuzzy"] += 1
            matched.append(item)

        if still_unmatched:
            semantic_matched, truly_missing = _try_semantic_batch(
                still_unmatched, resume_norm_list, jd_terms, resume_text
            )
            for item in semantic_matched:
                breakdown["semantic"] += 1
                matched.append(item)
            unmatched_jd = set(truly_missing)
        else:
            unmatched_jd = set()

    for jd_norm in unmatched_jd:
        jd_kw = jd_terms.get(jd_norm, {})
        freq = jd_kw.get("frequency", 0.0)
        importance = _calc_importance(freq)
        missing.append({
            "keyword": jd_kw.get("term", jd_norm),
            "normalized_form": jd_kw.get("canonical", jd_norm),
            "category": jd_kw.get("category"),
            "domain": jd_kw.get("domain"),
            "jd_frequency": freq,
            "jd_importance": importance,
            "jd_occurrence_count": _count_occurrences(jd_kw.get("term", jd_norm), jd_text),
            "source_flags": _calc_source_flags(jd_kw),
            "suggestion": _generate_suggestion(jd_kw),
        })

    missing.sort(key=lambda x: ({"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x["jd_importance"], 3), -x["jd_frequency"]))

    density_warnings = _check_density(resume_text, matched)

    return {
        "matched": matched,
        "missing": missing,
        "density_warnings": density_warnings,
        "total_jd_keywords": len(jd_terms),
        "matched_count": len(matched),
        "match_rate": len(matched) / max(len(jd_terms), 1),
        "breakdown": breakdown,
    }


def _tokenize_text(text: str) -> List[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9\-\.]*(?:\s+[a-zA-Z][a-zA-Z0-9\-\.]*){0,3}", text.lower())
    return [normalize(t) for t in tokens if len(t) >= 2]


def _try_alias(jd_norm: str, jd_kw: Dict, resume_set: set) -> Dict | None:
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT canonical_name FROM kb_skill_aliases WHERE alias_normalized = :n"),
            {"n": jd_norm}
        ).fetchone()
        if row:
            canonical_norm = normalize(row[0])
            if canonical_norm in resume_set or jd_norm in resume_set:
                return _build_match(jd_kw, jd_norm, "alias", 1.0, row[0])
    return None


def _try_exact(jd_norm: str, jd_kw: Dict, resume_set: set) -> Dict | None:
    if jd_norm in resume_set:
        return _build_match(jd_kw, jd_norm, "exact", 1.0, jd_kw.get("canonical", jd_norm))
    return None


def _try_kb_lookup(jd_norm: str, jd_kw: Dict, resume_set: set) -> Dict | None:
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT canonical_name, category, domain FROM kb_skills WHERE normalized = :n"),
            {"n": jd_norm}
        ).fetchone()
        if row:
            canonical_norm = normalize(row[0])
            if canonical_norm in resume_set or jd_norm in resume_set:
                return _build_match(jd_kw, jd_norm, "kb_lookup", 0.98, row[0], row[1], row[2])
    return None


def _try_fuzzy_batch(
    unmatched: List[str],
    resume_terms: List[str],
    jd_terms: Dict,
) -> Tuple[List[Dict], List[str]]:
    if not unmatched or not resume_terms:
        return [], unmatched
    try:
        from rapidfuzz import process, fuzz

        scores = process.cdist(
            unmatched, resume_terms,
            scorer=fuzz.token_set_ratio,
            score_cutoff=82,
        )

        matched = []
        still_unmatched = []
        for i, jd_norm in enumerate(unmatched):
            row = scores[i]
            best_idx = row.argmax() if hasattr(row, "argmax") else -1
            best_score = float(row[best_idx]) if best_idx >= 0 and len(row) > 0 else 0

            if best_score >= 82:
                jd_kw = jd_terms.get(jd_norm, {"term": jd_norm, "normalized": jd_norm, "frequency": 0.0})
                matched.append(_build_match(jd_kw, jd_norm, "fuzzy", best_score / 100.0, jd_kw.get("canonical", jd_norm)))
            else:
                still_unmatched.append(jd_norm)
        return matched, still_unmatched
    except Exception as e:
        logger.warning("Fuzzy matching failed: %s", e)
        return [], unmatched


def _try_semantic_batch(
    unmatched: List[str],
    resume_terms: List[str],
    jd_terms: Dict,
    resume_text: str,
) -> Tuple[List[Dict], List[str]]:
    if not unmatched or not resume_terms:
        return [], unmatched
    try:
        from engine.embeddings import get_sentence_transformer
        import numpy as np

        model = get_sentence_transformer()
        all_texts = unmatched + resume_terms
        embeddings = model.encode(all_texts, batch_size=64, show_progress_bar=False)

        jd_embeddings = embeddings[:len(unmatched)]
        resume_embeddings = embeddings[len(unmatched):]

        from numpy.linalg import norm

        def cosine(a, b):
            n_a = norm(a)
            n_b = norm(b)
            if n_a == 0 or n_b == 0:
                return 0.0
            return float(np.dot(a, b) / (n_a * n_b))

        matched = []
        still_unmatched = []
        for i, jd_norm in enumerate(unmatched):
            best_score = 0.0
            for j in range(len(resume_embeddings)):
                score = cosine(jd_embeddings[i], resume_embeddings[j])
                if score > best_score:
                    best_score = score

            if best_score >= 0.72:
                jd_kw = jd_terms.get(jd_norm, {"term": jd_norm, "normalized": jd_norm, "frequency": 0.0})
                matched.append(_build_match(jd_kw, jd_norm, "semantic", best_score, jd_kw.get("canonical", jd_norm)))
            else:
                still_unmatched.append(jd_norm)

        return matched, still_unmatched
    except Exception as e:
        logger.warning("Semantic matching failed: %s", e)
        return [], unmatched


def _build_match(jd_kw: Dict, norm: str, layer: str, confidence: float, matched_form: str, category: str = None, domain: str = None) -> Dict:
    freq = jd_kw.get("frequency", 0.0)
    return {
        "keyword": jd_kw.get("term", norm),
        "normalized_form": jd_kw.get("canonical", norm),
        "match_layer": layer,
        "matched_form": matched_form,
        "kb_source": jd_kw.get("kb_source", "unknown"),
        "category": category or jd_kw.get("category"),
        "domain": domain or jd_kw.get("domain"),
        "jd_frequency": freq,
        "jd_importance": _calc_importance(freq),
        "jd_occurrence_count": 1,
        "match_confidence": confidence,
    }


def _calc_importance(freq: float) -> str:
    if freq >= 0.8:
        return "critical"
    elif freq >= 0.6:
        return "high"
    elif freq >= 0.4:
        return "medium"
    return "low"


def _count_occurrences(term: str, text: str) -> int:
    return len(re.findall(re.escape(term.lower()), text.lower()))


def _calc_source_flags(jd_kw: Dict) -> List[str]:
    flags = ["jd_keyword"]
    if jd_kw.get("kb_source"):
        flags.append("kb_matched")
    return flags


def _generate_suggestion(kw: Dict) -> str:
    term = kw.get("canonical", kw.get("term", "this skill"))
    cat = kw.get("category") or "skill"
    importance = _calc_importance(kw.get("frequency", 0.0))
    if importance == "critical":
        return f"Add '{term}' to your skills or experience section — it's a critical requirement for this role."
    elif importance == "high":
        return f"Consider adding '{term}' if you have relevant experience with this {cat}."
    return f"Mention '{term}' if applicable to strengthen keyword alignment."


def _check_density(resume_text: str, matched: List[Dict]) -> List[Dict]:
    from config import KEYWORD_DENSITY_THRESHOLD
    warnings = []
    text_lower = resume_text.lower()
    for match in matched:
        term = match.get("keyword", "")
        if not term:
            continue
        count = len(re.findall(re.escape(term.lower()), text_lower))
        if count > KEYWORD_DENSITY_THRESHOLD:
            warnings.append({
                "keyword": term,
                "count_in_resume": count,
                "threshold": KEYWORD_DENSITY_THRESHOLD,
                "warning": f"Appears {count} times — may trigger keyword stuffing detection",
            })
    return warnings
