import re
import logging
from typing import List, Dict, Set
from engine.embeddings import get_spacy
from sqlalchemy import text
from database import engine

logger = logging.getLogger(__name__)

_PUNCT_RE = re.compile(r"[^\w\s.\-]")
_WS_RE = re.compile(r"\s+")

_STOPWORDS: Set[str] = {
    "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought", "used",
    "it", "its", "we", "us", "our", "they", "them", "their", "he", "she", "his",
    "her", "you", "your", "i", "me", "my", "this", "that", "these", "those",
    "who", "whom", "whose", "which", "what", "when", "where", "why", "how",
    "not", "no", "nor", "so", "yet", "both", "either", "neither", "each",
    "few", "more", "most", "other", "some", "such", "than", "too", "very",
    "just", "part", "end", "use", "using", "used", "make", "making", "made",
    "work", "working", "worked", "like", "also", "well", "get", "got", "set",
    "new", "good", "high", "large", "own", "same", "great", "way", "put",
    "even", "back", "any", "come", "could", "see", "look", "think", "know",
    "take", "into", "then", "first", "over", "after", "before", "around",
    "between", "through", "during", "without", "within", "across", "along",
    "against", "among", "re", "per", "via", "etc", "ie", "eg", "vs",
    "including", "included", "includes", "include", "following", "follow",
    "required", "requirement", "requirements", "strong", "excellent",
    "experience", "years", "year", "time", "team", "teams", "role", "roles",
    "ability", "must", "will", "shall", "preferred", "plus", "bonus",
    "opportunity", "opportunities", "position", "candidate", "candidates",
    "responsibilities", "responsibilities", "qualification", "qualifications",
    "regular", "participate", "participation", "general", "apply", "applied",
    "ensure", "ensuring", "maintain", "maintaining", "support", "supporting",
    "provide", "providing", "develop", "developing", "implement", "implementing",
    "manage", "managing", "build", "building", "create", "creating", "help",
    "assist", "assisting", "communicate", "communicating", "collaborate",
    "define", "understand", "understanding", "identify", "identifying",
    "based", "focus", "focused", "drive", "driven", "lead", "leading",
    "deliver", "delivering", "report", "reporting", "review", "reviewing",
    "minimum", "ideal", "ideally", "preferred", "desirable", "advantageous",
    "equivalent", "related", "relevant", "proven", "demonstrated", "solid",
    "thorough", "extensive", "strong", "deep", "broad", "good", "excellent",
    "outstanding", "exceptional", "superior", "effective", "successful",
    "dynamic", "fast", "paced", "fast-paced", "growing", "rapidly",
    "join", "joining", "seeking", "looking", "find", "finding",
    "day", "days", "week", "weeks", "month", "months", "process", "processes",
    "approach", "aspects", "areas", "area", "field", "fields", "sector",
    "industry", "environment", "environments", "solution", "solutions",
    "initiative", "initiatives", "project", "projects", "task", "tasks",
    "function", "functions", "operation", "operations",
}

_MIN_KEYWORD_LENGTH = 2
_STOPWORD_RATIO_THRESHOLD = 0.6


def normalize(s: str) -> str:
    if not s:
        return ""
    s = s.lower().strip()
    s = _PUNCT_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


def _is_stopword_dominated(phrase: str) -> bool:
    """Return True if the phrase is mostly stopwords and should be excluded."""
    tokens = phrase.lower().split()
    if not tokens:
        return True
    if len(tokens) == 1:
        return tokens[0] in _STOPWORDS
    stop_count = sum(1 for t in tokens if t in _STOPWORDS or len(t) < _MIN_KEYWORD_LENGTH)
    ratio = stop_count / len(tokens)
    return ratio >= _STOPWORD_RATIO_THRESHOLD


def _is_valid_keyword(term: str) -> bool:
    """Reject terms that are pure stopwords, too short, or numbers-only."""
    norm = normalize(term)
    if len(norm) < 2:
        return False
    if norm.isdigit():
        return False
    if _is_stopword_dominated(norm):
        return False
    return True


def extract_keywords(text_input: str, top_n: int = 80) -> List[Dict]:
    candidates: Set[str] = set()

    nlp = get_spacy()
    doc = nlp(text_input[:100000])

    for chunk in doc.noun_chunks:
        t = chunk.text.strip()
        if 2 <= len(t) <= 60 and _is_valid_keyword(t):
            root_pos = chunk.root.pos_
            if root_pos in ("NOUN", "PROPN"):
                candidates.add(t)

    for ent in doc.ents:
        if ent.label_ in ("ORG", "PRODUCT", "SKILL", "WORK_OF_ART", "GPE"):
            t = ent.text.strip()
            if 2 <= len(t) <= 60 and _is_valid_keyword(t):
                candidates.add(t)

    for token in doc:
        if (
            token.pos_ in ("NOUN", "PROPN")
            and not token.is_stop
            and not token.is_punct
            and len(token.text) >= 3
            and _is_valid_keyword(token.text)
        ):
            candidates.add(token.lemma_.lower().strip())

    try:
        import yake
        kw_extractor = yake.KeywordExtractor(lan="en", n=3, top=top_n)
        yake_kws = kw_extractor.extract_keywords(text_input[:50000])
        for kw, score in yake_kws:
            if 2 <= len(kw) <= 60 and _is_valid_keyword(kw):
                candidates.add(kw)
    except Exception as e:
        logger.debug("YAKE extraction failed: %s", e)

    try:
        from keybert import KeyBERT
        kbm = KeyBERT(model="all-MiniLM-L6-v2")
        kb_kws = kbm.extract_keywords(
            text_input[:10000],
            keyphrase_ngram_range=(1, 3),
            stop_words="english",
            top_n=top_n,
        )
        for kw, score in kb_kws:
            if 2 <= len(kw) <= 60 and _is_valid_keyword(kw):
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
    seen: Set[str] = set()
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
        freq = freq_info.get("frequency", 0.0)

        if kb_source is None and freq == 0.0:
            if _is_stopword_dominated(norm):
                continue

        results.append({
            "term": original,
            "normalized": norm,
            "canonical": canonical or original,
            "category": category,
            "domain": domain,
            "kb_source": kb_source,
            "frequency": freq,
            "role_category": freq_info.get("role_category"),
        })

    results.sort(key=lambda x: x["frequency"], reverse=True)
    return results


def extract_jd_keywords(jd_text: str) -> List[Dict]:
    raw = extract_keywords(jd_text, top_n=80)
    return [kw for kw in raw if not _is_stopword_dominated(kw["normalized"])]


def extract_resume_keywords(resume_text: str) -> List[Dict]:
    raw = extract_keywords(resume_text, top_n=100)
    return [kw for kw in raw if not _is_stopword_dominated(kw["normalized"])]
