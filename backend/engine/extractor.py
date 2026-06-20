import re
import logging
from typing import List, Dict
from engine.embeddings import get_spacy
from sqlalchemy import text
from database import engine

logger = logging.getLogger(__name__)

_PUNCT_RE = re.compile(r"[^\w\s.\-]")
_WS_RE = re.compile(r"\s+")


def normalize(s: str) -> str:
    if not s:
        return ""
    s = s.lower().strip()
    s = _PUNCT_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


def extract_keywords(text_input: str, top_n: int = 80) -> List[Dict]:
    candidates = set()

    nlp = get_spacy()
    doc = nlp(text_input[:100000])

    for chunk in doc.noun_chunks:
        t = chunk.text.strip()
        if 2 <= len(t) <= 60:
            candidates.add(t)

    for ent in doc.ents:
        if ent.label_ in ("ORG", "PRODUCT", "SKILL", "WORK_OF_ART", "GPE"):
            t = ent.text.strip()
            if 2 <= len(t) <= 60:
                candidates.add(t)

    try:
        import yake
        kw_extractor = yake.KeywordExtractor(lan="en", n=3, top=top_n)
        yake_kws = kw_extractor.extract_keywords(text_input[:50000])
        for kw, score in yake_kws:
            if 2 <= len(kw) <= 60:
                candidates.add(kw)
    except Exception as e:
        logger.debug("YAKE extraction failed: %s", e)

    try:
        from keybert import KeyBERT
        kbm = KeyBERT(model="all-MiniLM-L6-v2")
        kb_kws = kbm.extract_keywords(text_input[:10000], keyphrase_ngram_range=(1, 3), stop_words="english", top_n=top_n)
        for kw, score in kb_kws:
            if 2 <= len(kw) <= 60:
                candidates.add(kw)
    except Exception as e:
        logger.debug("KeyBERT extraction failed: %s", e)

    normalized_candidates = {normalize(c): c for c in candidates if normalize(c)}

    enriched = _enrich_with_kb(list(normalized_candidates.keys()), normalized_candidates)
    return enriched[:top_n]


def _enrich_with_kb(normalized_terms: List[str], term_map: Dict[str, str]) -> List[Dict]:
    if not normalized_terms:
        return []

    batch_size = 500
    skill_lookup = {}
    alias_lookup = {}
    freq_lookup = {}

    for i in range(0, len(normalized_terms), batch_size):
        batch = normalized_terms[i:i + batch_size]
        placeholders = ", ".join([f"'{t.replace(chr(39), '')}'" for t in batch])
        with engine.connect() as conn:
            rows = conn.execute(text(
                f"SELECT normalized, canonical_name, category, domain FROM kb_skills WHERE normalized IN ({placeholders})"
            )).fetchall()
            for row in rows:
                skill_lookup[row[0]] = {"canonical_name": row[1], "category": row[2], "domain": row[3]}

            alias_rows = conn.execute(text(
                f"SELECT alias_normalized, canonical_name FROM kb_skill_aliases WHERE alias_normalized IN ({placeholders})"
            )).fetchall()
            for row in alias_rows:
                alias_lookup[row[0]] = row[1]

            freq_rows = conn.execute(text(
                f"SELECT keyword_normalized, frequency, role_category FROM kb_jd_frequency WHERE keyword_normalized IN ({placeholders})"
            )).fetchall()
            for row in freq_rows:
                freq_lookup[row[0]] = {"frequency": row[1], "role_category": row[2]}

    results = []
    seen = set()
    for norm, original in term_map.items():
        if norm in seen:
            continue
        seen.add(norm)

        canonical = None
        category = None
        domain = None
        kb_source = None

        if norm in alias_lookup:
            canonical = alias_lookup[norm]
            kb_source = "alias"
        elif norm in skill_lookup:
            info = skill_lookup[norm]
            canonical = info["canonical_name"]
            category = info["category"]
            domain = info["domain"]
            kb_source = "kb_skills"

        freq_info = freq_lookup.get(norm, {})

        results.append({
            "term": original,
            "normalized": norm,
            "canonical": canonical or original,
            "category": category,
            "domain": domain,
            "kb_source": kb_source,
            "frequency": freq_info.get("frequency", 0.0),
            "role_category": freq_info.get("role_category"),
        })

    results.sort(key=lambda x: x["frequency"], reverse=True)
    return results


def extract_jd_keywords(jd_text: str) -> List[Dict]:
    return extract_keywords(jd_text, top_n=80)


def extract_resume_keywords(resume_text: str) -> List[Dict]:
    return extract_keywords(resume_text, top_n=100)
