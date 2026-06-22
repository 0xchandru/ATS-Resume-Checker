import re
import logging
from typing import List, Dict, Set, Tuple
from backend.app.engine.embeddings import get_spacy
from sqlalchemy import text
from backend.app.database import engine

logger = logging.getLogger(__name__)

_PUNCT_RE = re.compile(r"[^\w\s.\-/+#]")
_WS_RE = re.compile(r"\s+")

# ── Comprehensive stopword set ──────────────────────────────────────────────
# This includes:
# 1. Standard English stopwords
# 2. JD-specific filler words (corporate boilerplate)
# 3. Generic verbs that appear in all JDs regardless of role
# 4. JD structural words (headings, bullets, labels)
#
# IMPORTANT: Real tech skills should NEVER be in this list.
# If a word like "Python" or "Docker" is accidentally stopworded,
# that's a critical bug. This list is intentionally conservative
# about removing words that could be tech terms.

_JD_META_RE = re.compile(
    r"^(Job\s+Title|Experience|Location|Mode|Notice\s+Period|Work\s+Mode|"
    r"Notice|CTC|Salary|Shift|Timing|Openings?|Vacancies|Contact)\s*[-:–]",
    re.IGNORECASE | re.MULTILINE,
)
_JD_META_LINE_RE = re.compile(
    r"^(Job\s+Title|Experience|Location|Mode|Notice\s+Period|Skills\s*:)",
    re.IGNORECASE,
)


def _strip_jd_metadata(jd_text: str) -> str:
    """
    Remove structured JD metadata headers such as:
      Job Title: SOC Analyst
      Experience- 4+ yrs
      Location-Mohali
      Mode- Strictly Work from Office
      Notice Period- 30 days
    These produce garbage keyword extractions like 'mohali', 'strictly', 'yr'.
    """
    lines = jd_text.split("\n")
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if _JD_META_RE.match(stripped):
            continue
        if _JD_META_LINE_RE.match(stripped) and len(stripped) < 120:
            continue
        cleaned.append(line)
    return "\n".join(cleaned)


_STOPWORDS: Set[str] = {
    # ── Standard English stopwords ──
    "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought", "used",
    "it", "its", "we", "us", "our", "they", "them", "their", "he", "she", "his",
    "her", "you", "your", "i", "me", "my", "this", "that", "these", "those",
    "who", "whom", "whose", "which", "what", "when", "where", "why", "how",
    "not", "no", "nor", "so", "yet", "both", "either", "neither", "each",
    "few", "more", "most", "other", "some", "such", "than", "too", "very",
    "just", "also", "well", "even", "back", "any", "come", "see", "look",
    "think", "know", "take", "into", "then", "first", "over", "after", "before",
    "around", "between", "through", "during", "without", "within", "across",
    "along", "against", "among", "about", "above", "below", "up", "down", "out",

    # ── Generic verbs that appear in ALL JDs ──
    "use", "using", "make", "making", "made", "work", "working", "worked",
    "like", "get", "got", "set", "put", "go", "going", "gone", "keep",
    "keeping", "give", "giving", "given", "find", "finding", "found",
    "tell", "show", "try", "call", "want", "seem", "feel", "leave",
    "turn", "start", "run", "move", "play", "pay", "hold", "bring",
    "happen", "write", "sit", "stand", "lose", "begin", "began",

    # ── JD boilerplate verbs ──
    "ensure", "ensuring", "maintain", "maintaining", "support", "supporting",
    "provide", "providing", "develop", "developing", "implement", "implementing",
    "manage", "managing", "build", "building", "create", "creating", "help",
    "assist", "assisting", "communicate", "communicating", "collaborate",
    "collaborating", "define", "defining", "understand", "understanding",
    "identify", "identifying", "deliver", "delivering", "review", "reviewing",
    "participate", "participating", "participation", "contribute", "contributing",
    "apply", "applied", "applying", "join", "joining", "seeking",

    # ── JD structural / meta words ──
    "required", "requirement", "requirements", "requiring",
    "preferred", "preference", "preferably",
    "responsibilities", "responsibility",
    "qualification", "qualifications", "qualified",
    "experience", "experienced", "years", "year",
    "time", "team", "teams", "role", "roles",
    "ability", "abilities", "must", "shall",
    "plus", "bonus", "desirable", "advantageous",
    "opportunity", "opportunities", "position", "positions",
    "candidate", "candidates", "applicant", "applicants",
    "company", "organization", "firm", "employer",
    "minimum", "maximum", "ideal", "ideally",
    "equivalent", "related", "relevant",
    "strong", "excellent", "outstanding", "exceptional",
    "superior", "effective", "successful", "proven", "demonstrated",
    "solid", "thorough", "extensive", "deep", "broad", "good",
    "dynamic", "fast", "paced", "fast-paced", "growing", "rapidly",

    # ── Generic nouns from JDs ──
    "day", "days", "week", "weeks", "month", "months",
    "process", "processes", "approach", "approaches",
    "aspects", "areas", "area", "field", "fields", "sector", "sectors",
    "industry", "environment", "environments",
    "solution", "solutions", "initiative", "initiatives",
    "project", "projects", "task", "tasks",
    "function", "functions", "operation", "operations",
    "part", "end", "way", "ways", "level", "levels",
    "type", "types", "kind", "number", "group", "groups",
    "thing", "things", "case", "cases", "place", "point",
    "general", "regular", "specific", "various", "key",
    "new", "high", "large", "small", "own", "same", "great",
    "different", "important", "possible", "public", "available",
    "right", "best", "long", "little", "certain", "current",
    "full", "major", "early", "young", "special", "necessary",
    "people", "person", "staff", "member", "members", "party", "parties",
    "principle", "principles", "efficiency", "efficient", "resource", "resources",
    "knowledge", "skill", "skills", "document", "documents", "documentation",
    "familiarity", "familiar", "investigation", "investigations", "gen", "remediation",
    "communication", "communicate", "verbal", "written", "ability", "abilities", "strong",
    "system", "systems", "matrix", "matrices", "platform", "platforms",
    "procedure", "procedures", "presentation", "presentations", "technology", "technologies",
    "plan", "plans", "frontline", "front-line", "management", "manage",
    "effective", "stakeholder", "stakeholders", "tool", "tools", "service", "services",

    # ── Filler phrases / connectors ──
    "including", "included", "includes", "include",
    "following", "follow", "followed", "follows",
    "based", "focus", "focused", "focusing",
    "drive", "driven", "driving",
    "lead", "leading", "led",
    "report", "reporting", "reported",
    "looking", "per", "via", "etc", "ie", "eg", "vs", "re",

    # ── JD metadata & boilerplate (added to fix garbage extraction) ──
    # Role/structural markers in JDs that are NOT skills:
    "act", "acting", "acts",
    "perform", "performing", "performed", "performs",
    "coordinator", "responder", "responders", "coordinators",
    "creation", "effort", "efforts",
    "activity", "activities",
    "handling", "handler", "handlers",
    "unit", "units",
    "yr", "yrs",
    "notice", "period", "periods",
    "location", "locations",
    "mode", "modes",
    "strictly", "strict",
    "frontline", "staffs",
    "investigations", "investigation",
    "resolution", "resolutions",
    "coordination", "coordinations",
    "responder", "responders",
    "job", "jobs",
    "title", "titles",
    "act", "acts",
    "perform", "performs",
    "engage", "engages", "engaging", "engaged",
    "escalate", "escalates", "escalating", "escalated",
    "generation", "generations",

    # ── EEOC, Diversity, & Legal Terms ──
    "race", "gender", "religion", "sex", "sexual", "orientation", "disability",
    "national", "origin", "basis", "age", "veteran", "status", "law", "laws",
    "local", "state", "federal", "equal", "opportunity", "employer", "employment",
    "discriminate", "discrimination", "protect", "protected", "color", "creed", "marital",
    "genetic", "citizenship",

    # ── Shift & Timing Terms ──
    "weekend", "weekends", "holiday", "holidays", "evening", "evenings",
    "shift", "shifts", "morning", "mornings", "night", "nights", "midnight",
    "hourly", "salary", "pay", "compensation", "schedule", "scheduled", "hours",

    # ── Miscellaneous JD Noise ──
    "req", "id", "hundreds", "thousands", "millions", "matter", "concern", "value",
    "passionate", "provider", "line", "delivery", "advisory", "workforce",
    "change", "impact", "chain", "base", "proficiency", "team barracuda", "barracuda",
    "hundreds of thousands", "exercise", "landscape", "tier",

    # ── Corporate mission / values language (not skills) ──
    "commitment", "passion", "purpose", "mission", "vision", "integrity",
    "champion", "championing", "championed",
    "shape", "shaping", "shaped",
    "respect", "respecting", "mutual",
    "inclusion", "inclusive", "diversity",
    "culture", "cultural",
    "community", "communities",
    "belonging", "equity",
    "trust", "trustworthy", "transparency",

    # ── Generic adjectives / quantifiers that appear in any JD ──
    "additional", "extra", "further", "added",
    "simple", "simplified", "straightforward",
    "meaningful", "impactful", "exciting",
    "collaborative", "cross-functional",
    "dedicated", "motivated", "driven",

    # ── Generic nouns that are NOT skills ──
    "goal", "goals", "objective", "objectives",
    "chance", "chances", "opportunity",
    "fortune",  # Fortune 500 context
    "talent", "talents",
    "success", "successful",
    "stability", "stable",
    "growth", "growing",
    "step", "steps",
    "phase", "phases",
    "category", "categories",
    "recording", "recordings",
    "center",  # standalone; "security operations center" captured as multi-word
    "hire", "hiring", "hired",
    "degree",  # qualification; "bachelor's degree" captured as multi-word
    "bachelor", "bachelors",
    "bringing",
    "contribution", "contributions",
    "campaign", "campaigns",
    "learning",  # alone; "machine learning" multi-word survives stopword ratio check
    "financial",  # alone; "financial analysis", "financial services" survive
    "client",   # alone; "client management", "client-facing" survive
    "standard", "standards",  # alone; "NIST standards", "ISO 27001" survive
    "completion",
    "adhere", "adhering", "adherence",
    "awareness",  # alone; "security awareness" multi-word survives
    "exposure",   # alone — "cloud exposure" survives as multi-word
    "administration",  # alone; "Windows administration", "system administration" survive
    "indicators",  # alone; "indicators of compromise" survives as multi-word
    "defense",  # alone; "defense in depth", "cyber defense" survive as multi-word
    "framework",  # alone; "NIST framework", "security framework" survive
    "continuity",  # alone; "business continuity" survives as multi-word
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


def _is_stopword(word: str) -> bool:
    """Check if a single word is a stopword."""
    return word.lower().strip() in _STOPWORDS


def _is_stopword_dominated(phrase: str) -> bool:
    """Return True if the phrase is mostly stopwords and should be excluded."""
    tokens = phrase.lower().split()
    if not tokens:
        return True
    if len(tokens) == 1:
        return tokens[0] in _STOPWORDS or len(tokens[0]) < _MIN_KEYWORD_LENGTH
    # For multi-word phrases: if more than 60% are stopwords, reject
    stop_count = sum(1 for t in tokens if t in _STOPWORDS or len(t) < _MIN_KEYWORD_LENGTH)
    ratio = stop_count / len(tokens)
    return ratio >= _STOPWORD_RATIO_THRESHOLD


def _is_valid_keyword(term: str) -> bool:
    """
    Final validation gate. Every keyword must pass this regardless of
    whether it was found in the KB or has JD frequency.

    Rejects:
    - Pure stopwords / stopword-dominated phrases
    - Terms shorter than 2 chars
    - Pure numbers
    - Pure punctuation
    - Single common English words
    """
    norm = normalize(term)
    if len(norm) < 2:
        return False
    if norm.isdigit():
        return False
    # Single-char after normalization
    if len(norm.replace(" ", "")) < 2:
        return False
    if _is_stopword_dominated(norm):
        return False
    # Reject if all tokens are stopwords (stricter than ratio check for short phrases)
    tokens = norm.split()
    if all(t in _STOPWORDS for t in tokens):
        return False
    return True


def extract_keywords(text_input: str, top_n: int = 200) -> List[Dict]:
    """
    Extract keywords from text using multiple methods:
    1. spaCy NER + noun chunks (structural extraction)
    2. YAKE (statistical extraction)
    3. KeyBERT (semantic extraction)

    All candidates are filtered through _is_valid_keyword to prevent
    stopwords from leaking through ANY extraction method.
    """
    candidates: Set[str] = set()

    nlp = get_spacy()
    doc = nlp(text_input[:100000])

    # Method 1: spaCy noun chunks — only keep chunks with NOUN/PROPN root and max 3 words
    for chunk in doc.noun_chunks:
        t = chunk.text.strip()
        word_count = len(t.split())
        if 2 <= len(t) <= 60 and word_count <= 3 and chunk.root.pos_ in ("NOUN", "PROPN"):
            if _is_valid_keyword(t):
                candidates.add(t)

    # Method 2: spaCy named entities — tech/org/product entities
    for ent in doc.ents:
        if ent.label_ in ("ORG", "PRODUCT", "SKILL", "WORK_OF_ART", "GPE"):
            t = ent.text.strip()
            if 2 <= len(t) <= 60 and _is_valid_keyword(t):
                candidates.add(t)

    # Method 3: Individual tokens — nouns and proper nouns only
    for token in doc:
        if (
            token.pos_ in ("NOUN", "PROPN")
            and not token.is_stop
            and not token.is_punct
            and len(token.text) >= 3
            and _is_valid_keyword(token.text)
        ):
            candidates.add(token.lemma_.lower().strip())

    # Method 4: YAKE statistical keyword extraction
    try:
        import yake
        kw_extractor = yake.KeywordExtractor(lan="en", n=3, top=top_n)
        yake_kws = kw_extractor.extract_keywords(text_input[:50000])
        for kw, score in yake_kws:
            if 2 <= len(kw) <= 60 and _is_valid_keyword(kw):
                candidates.add(kw)
    except Exception as e:
        logger.debug("YAKE extraction failed: %s", e)

    # Method 5: KeyBERT semantic keyword extraction (uses shared cached model)
    try:
        from backend.app.engine.embeddings import get_keybert
        kbm = get_keybert()
        kb_kws = kbm.extract_keywords(
            text_input[:10000],
            keyphrase_ngram_range=(1, 3),
            stop_words="english",
            top_n=top_n,
        )
        for kw, score in kb_kws:
            kw_str = str(kw)
            if 2 <= len(kw_str) <= 60 and _is_valid_keyword(kw_str):
                candidates.add(kw_str)
    except Exception as e:
        logger.debug("KeyBERT extraction failed: %s", e)

    # Build normalized map and enrich with KB data
    normalized_candidates = {normalize(c): c for c in candidates if normalize(c)}

    enriched = _enrich_with_kb(list(normalized_candidates.keys()), normalized_candidates)
    return enriched[:top_n]


def _enrich_with_kb(normalized_terms: List[str], term_map: Dict[str, str]) -> List[Dict]:
    """
    Look up each normalized term against the knowledge base to find:
    - Canonical skill names
    - Skill categories and domains
    - JD frequency scores (normalized 0.0-1.0)

    CRITICAL FIX: Every term is validated with _is_valid_keyword as the
    FINAL gate, regardless of whether it has KB matches or JD frequency.
    This prevents stopwords from leaking through the KB frequency table.
    """
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
                f"""SELECT a.alias_normalized, a.canonical_name, s.category, s.domain 
                    FROM kb_skill_aliases a 
                    LEFT JOIN kb_skills s ON a.canonical_name = s.canonical_name 
                    WHERE a.alias_normalized IN ({placeholders})"""
            )).fetchall()
            for row in alias_rows:
                alias_lookup[row[0]] = {"canonical_name": row[1], "category": row[2], "domain": row[3]}

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

        # ═══════════════════════════════════════════════════════════════
        # CRITICAL: Final stopword gate — this is the fix for the bug
        # where stopwords like "we", "that", "part", "end", "regular"
        # were passing through because they had non-zero JD frequency.
        # Now we ALWAYS check, regardless of KB or frequency status.
        # ═══════════════════════════════════════════════════════════════
        if not _is_valid_keyword(norm):
            continue

        canonical = None
        category = None
        domain = None
        kb_source = None

        if norm in alias_lookup:
            info = alias_lookup[norm]
            canonical = info["canonical_name"]
            category = info["category"]
            domain = info["domain"]
            kb_source = "alias"
        elif norm in skill_lookup:
            info = skill_lookup[norm]
            canonical = info["canonical_name"]
            category = info["category"]
            domain = info["domain"]
            kb_source = "primary"

        # ═══════════════════════════════════════════════════════════════
        # STRICT DATASET WHITELIST RELAXATION:
        # Instead of discarding non-KB terms, we keep them if they
        # have some frequency or statistical weight, categorizing them
        # as "other_skill" so they show up in the "Other Skills" section.
        # ═══════════════════════════════════════════════════════════════
        if not kb_source:
            kb_source = "statistical"
            category = "other_skill"

        freq_info = freq_lookup.get(norm, {})
        freq = freq_info.get("frequency", 0.0)

        # If the term has no KB match and no frequency, it's likely noise
        # But we've already validated it's not a stopword, so include it
        # with lower confidence
        clean_original = original.strip(".,;: -*•·▪▸►➤→")
        if not clean_original:
            continue

        results.append({
            "term": clean_original,
            "normalized": norm,
            "canonical": canonical or clean_original,
            "category": category,
            "domain": domain,
            "kb_source": kb_source,
            "frequency": freq,
            "role_category": freq_info.get("role_category"),
        })

    results.sort(key=lambda x: x["frequency"], reverse=True)
    return results


def classify_jd_requirements(jd_text: str, keywords: List[Dict]) -> List[Dict]:
    """
    Parse JD to classify each keyword as:
    - REQUIRED: appears near "required", "must have", "essential", "minimum"
    - PREFERRED: appears near "preferred", "nice to have", "plus", "bonus"
    - MENTIONED: appears in JD but not in a requirements context

    This uses sentence-level proximity matching.
    """
    lines = jd_text.lower().split("\n")

    required_markers = {"required", "must have", "must-have", "essential",
                        "minimum", "mandatory", "necessary", "critical"}
    preferred_markers = {"preferred", "nice to have", "nice-to-have", "plus",
                         "bonus", "desirable", "ideally", "advantageous",
                         "a plus", "would be nice"}

    # Build a map of which section each line belongs to
    current_section = "mentioned"
    line_classifications = []

    for line in lines:
        stripped = line.strip().lower()
        # Check if this line is a section header
        if any(m in stripped for m in required_markers):
            current_section = "required"
        elif any(m in stripped for m in preferred_markers):
            current_section = "preferred"
        elif stripped and len(stripped) < 60 and stripped.endswith(":"):
            # Generic section header, keep current classification
            pass
        line_classifications.append(current_section)

    classified = []
    for kw in keywords:
        kw_lower = kw.get("normalized", "").lower()
        classification = "mentioned"

        # Check each line to see where this keyword appears
        for i, line in enumerate(lines):
            if kw_lower in line.lower():
                classification = line_classifications[i]
                break

        kw_copy = dict(kw)
        kw_copy["requirement_type"] = classification
        classified.append(kw_copy)

    return classified


def extract_jd_keywords(jd_text: str) -> List[Dict]:
    """Extract keywords from job description, with stopword filtering."""
    # Strip JD metadata header (Job Title, Location, Mode, Notice Period etc.)
    # before extraction to avoid extracting them as "skills"
    clean_text = _strip_jd_metadata(jd_text)
    raw = extract_keywords(clean_text, top_n=200)
    # Double-check: filter any remaining stopword-dominated phrases
    filtered = [kw for kw in raw if _is_valid_keyword(kw["normalized"])]
    # Classify as required vs preferred (use original text for context)
    classified = classify_jd_requirements(jd_text, filtered)
    return classified


def extract_resume_keywords(resume_text: str) -> List[Dict]:
    """Extract keywords from resume, with stopword filtering."""
    raw = extract_keywords(resume_text, top_n=200)
    return [kw for kw in raw if _is_valid_keyword(kw["normalized"])]
