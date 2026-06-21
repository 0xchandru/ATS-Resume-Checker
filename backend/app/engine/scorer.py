import re
import logging
from typing import Dict, List
from backend.app.config import SCORING_WEIGHTS, GRADE_THRESHOLDS, LAYER_MULTIPLIERS

logger = logging.getLogger(__name__)

_QUANT_RE = re.compile(
    r"""
    \d+\s*[%$x]                      # 30%, $5k, 3x
    | \$[\d,]+                         # $50,000
    | \d+\s*(?:users?|clients?|customers?  # 5 users
              |teams?|million|billion|k\b   # 50k
              |vms?|servers?|hosts?         # 15 VMs
              |endpoints?|nodes?            # 10 endpoints
              |apis?|tools?|systems?        # 5 APIs
              |tickets?|alerts?|logs?       # 200 alerts
              |minutes?|seconds?|hours?     # <2 seconds
              |requests?|queries?           # 1000 requests
              |incidents?|cases?|events?    # 50 incidents
              |rules?|signatures?           # 100 rules
              )
    | [\d\.]+\s*x\b                    # 2.5x improvement
    | top\s+\d+\s*%                    # Top 1%
    | top\s+\d+\b                      # Top 100
    | #\s*\d+\b                        # #1 ranking
    | <\s*\d+\s*(?:s|ms|min|sec)       # <2s, <500ms
    | \d+\+\s*(?:years?|months?)       # 3+ years
    | \d{1,3}(?:,\d{3})+              # 1,000,000
    """,
    re.IGNORECASE | re.VERBOSE,
)

_BULLET_RE = re.compile(r"^[\s]*[-•·▪▸►*➤→]\s+.+")
_VERB_RE = re.compile(
    r"^[\s]*[A-Z][a-zA-Z]+(?:ed|ing|d)\b"   # past/present tense
    r"|^[\s]*(?:Built|Deployed|Designed|Developed|Created|Led|Managed|Reduced|"
    r"Improved|Automated|Implemented|Configured|Monitored|Investigated|"
    r"Analyzed|Detected|Responded|Tuned|Integrated|Migrated|Optimized|"
    r"Established|Delivered|Maintained|Supported|Enabled|Generated|Achieved)\b",
    re.IGNORECASE,
)


def calculate_score(
    match_result: Dict,
    sections: Dict,
    formatting: Dict,
    career: Dict,
    resume_text: str,
    jd_text: str,
) -> Dict:
    kw_score = _keyword_score(match_result)
    sem_score = _semantic_score(resume_text, jd_text)
    sec_score = _section_score(sections)
    fmt_score = _format_score(formatting)
    impact_score = _impact_score(sections, resume_text)

    # ═══════════════════════════════════════════════════════════════════
    # CRITICAL: Format penalty is now a MULTIPLIER, not an additive deduction.
    # If ATS can't parse the resume, keyword matching results are unreliable.
    # A multi-column LaTeX PDF that Workday can't read should dramatically
    # reduce the overall score, regardless of how good the content is.
    # ═══════════════════════════════════════════════════════════════════
    parseability_multiplier = _parseability_multiplier(formatting)

    weighted = (
        kw_score * SCORING_WEIGHTS["keyword_match"]
        + sem_score["score"] * SCORING_WEIGHTS["semantic_relevance"]
        + sec_score["score"] * SCORING_WEIGHTS["section_completeness"]
        + fmt_score["score"] * SCORING_WEIGHTS["format_compliance"]
        + impact_score["score"] * SCORING_WEIGHTS["impact_quantification"]
    )

    # Apply parseability multiplier — unparseable resume = dramatically lower score
    weighted = weighted * parseability_multiplier

    overall = round(min(100, max(0, weighted)), 1)
    grade = _get_grade(overall)

    return {
        "overall_score": overall,
        "letter_grade": grade,
        "parseability_multiplier": round(parseability_multiplier, 2),
        "sub_scores": {
            "keyword_match": {
                "score": round(kw_score, 1),
                "weight": SCORING_WEIGHTS["keyword_match"],
                "weighted_contribution": round(kw_score * SCORING_WEIGHTS["keyword_match"], 2),
                "details": f"{match_result['matched_count']} of {match_result['total_jd_keywords']} JD keywords matched",
                "match_breakdown": match_result.get("breakdown", {}),
            },
            "semantic_relevance": {
                "score": round(sem_score["score"], 1),
                "weight": SCORING_WEIGHTS["semantic_relevance"],
                "weighted_contribution": round(sem_score["score"] * SCORING_WEIGHTS["semantic_relevance"], 2),
                "cosine_similarity": round(sem_score["cosine"], 3),
                "details": sem_score["details"],
            },
            "section_completeness": {
                "score": round(sec_score["score"], 1),
                "weight": SCORING_WEIGHTS["section_completeness"],
                "weighted_contribution": round(sec_score["score"] * SCORING_WEIGHTS["section_completeness"], 2),
                "detected_count": sec_score["detected_count"],
                "expected_count": sec_score["expected_count"],
                "details": sec_score["details"],
            },
            "format_compliance": {
                "score": round(fmt_score["score"], 1),
                "weight": SCORING_WEIGHTS["format_compliance"],
                "weighted_contribution": round(fmt_score["score"] * SCORING_WEIGHTS["format_compliance"], 2),
                "details": fmt_score["details"],
                "parseability_multiplier": round(parseability_multiplier, 2),
            },
            "impact_quantification": {
                "score": round(impact_score["score"], 1),
                "weight": SCORING_WEIGHTS["impact_quantification"],
                "weighted_contribution": round(impact_score["score"] * SCORING_WEIGHTS["impact_quantification"], 2),
                "quantified_bullets": impact_score["quantified_bullets"],
                "total_experience_bullets": impact_score["total_bullets"],
                "details": impact_score["details"],
            },
        },
    }


def _keyword_score(match_result: Dict) -> float:
    """
    Calculate keyword match score with requirement-type weighting.

    Required keywords contribute fully.
    Preferred keywords contribute at 50% weight.
    Mentioned keywords contribute at 30% weight.
    """
    matched = match_result.get("matched", [])
    missing = match_result.get("missing", [])

    total_contribution = 0.0
    max_contribution = 0.0

    for kw in matched:
        freq = kw.get("jd_frequency", 0.3) or 0.3
        # Clamp frequency to reasonable range (0.0-1.0)
        freq = min(1.0, max(0.01, freq))
        confidence = kw.get("match_confidence", 1.0)
        layer = kw.get("match_layer", "exact")
        multiplier = LAYER_MULTIPLIERS.get(layer, 0.8)

        # Weight by requirement type
        req_type = kw.get("requirement_type", "mentioned")
        req_weight = {"required": 1.0, "preferred": 0.6, "mentioned": 0.4}.get(req_type, 0.4)

        contribution = freq * confidence * multiplier * req_weight
        total_contribution += contribution
        max_contribution += freq * req_weight

    for kw in missing:
        freq = kw.get("jd_frequency", 0.3) or 0.3
        freq = min(1.0, max(0.01, freq))
        req_type = kw.get("requirement_type", "mentioned")
        req_weight = {"required": 1.0, "preferred": 0.6, "mentioned": 0.4}.get(req_type, 0.4)
        max_contribution += freq * req_weight

    if max_contribution == 0:
        return 0.0
    return min(100.0, (total_contribution / max_contribution) * 100)


def _semantic_score(resume_text: str, jd_text: str) -> Dict:
    """
    Calibrated semantic scoring.
    Raw cosine in domain-matched documents runs 0.5-0.85 naturally.
    We use a piecewise linear scale so that:
      cosine >= 0.85 -> 90-100 (very strong)
      cosine 0.65-0.84 -> 60-89 (solid alignment)
      cosine 0.45-0.64 -> 35-59 (moderate)
      cosine < 0.45 -> 0-34 (weak/off-topic)
    """
    tfidf_cosine = 0.0
    spacy_cosine = 0.0

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
        docs = [resume_text[:50000], jd_text[:20000]]
        tfidf = vectorizer.fit_transform(docs)
        tfidf_cosine = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
    except Exception as e:
        logger.debug("TF-IDF failed: %s", e)

    try:
        from backend.app.engine.embeddings import get_spacy
        nlp = get_spacy()
        doc1 = nlp(resume_text[:50000])
        doc2 = nlp(jd_text[:20000])
        if doc1.has_vector and doc2.has_vector:
            spacy_cosine = doc1.similarity(doc2)
        else:
            spacy_cosine = tfidf_cosine
    except Exception as e:
        logger.debug("spaCy similarity failed: %s", e)
        spacy_cosine = tfidf_cosine

    cosine = (tfidf_cosine + spacy_cosine) / 2

    if cosine >= 0.85:
        score = 90 + (cosine - 0.85) / 0.15 * 10
    elif cosine >= 0.65:
        score = 60 + (cosine - 0.65) / 0.20 * 30
    elif cosine >= 0.45:
        score = 35 + (cosine - 0.45) / 0.20 * 25
    else:
        score = max(0.0, cosine / 0.45 * 35)

    score = min(100.0, score)

    if cosine >= 0.85:
        details = "Very strong semantic alignment — resume language closely mirrors JD"
    elif cosine >= 0.65:
        details = "Strong semantic alignment — good content coverage"
    elif cosine >= 0.45:
        details = "Moderate semantic alignment — some content gaps relative to JD"
    else:
        details = "Weak semantic alignment — resume content diverges significantly from job description"

    return {"score": score, "cosine": cosine, "details": details}


def _section_score(sections: Dict) -> Dict:
    from backend.app.config import EXPECTED_SECTIONS, OPTIONAL_SECTIONS
    detected = sections.get("detected", [])
    detected_names = {s["name"] for s in detected}

    required_sections = [s for s in EXPECTED_SECTIONS if s not in OPTIONAL_SECTIONS]
    required_count = len(required_sections)
    detected_required = sum(1 for s in required_sections if s in detected_names)
    missing_required = [s for s in required_sections if s not in detected_names]

    optional_bonus = sum(
        0.5 for s in OPTIONAL_SECTIONS if s in detected_names
    )
    optional_bonus = min(1, optional_bonus)

    total_weight = required_count + 1
    score_raw = (detected_required + optional_bonus) / total_weight * 100
    score = min(100.0, score_raw)

    details = f"Missing: {', '.join(missing_required)}" if missing_required else "All core sections detected"
    return {
        "score": score,
        "detected_count": detected_required,
        "expected_count": required_count,
        "details": details,
    }


def _format_score(formatting: Dict) -> Dict:
    """
    Format compliance score based on detected issues.
    Uses CAP-based scoring instead of point deductions.

    Critical issues CAP the maximum score rather than just subtracting.
    This better reflects reality: a multi-column PDF can't score 95%
    on formatting just because everything else looks fine.
    """
    score = 100.0
    issues = formatting.get("issues", [])
    has_multi_column = False
    has_special_chars = False
    has_tables = False

    for issue in issues:
        severity = issue.get("severity", "info")
        issue_type = issue.get("type", "")

        if issue_type == "multi_column_layout":
            has_multi_column = True
        if issue_type == "special_characters":
            has_special_chars = True
        if issue_type in ("tables_detected", "tables_or_textboxes"):
            has_tables = True

        if severity == "critical":
            score -= 25
        elif severity == "warning":
            score -= 10
        elif severity == "info":
            score -= 3

    # Apply caps based on critical format issues
    if has_multi_column and has_special_chars:
        # LaTeX multi-column: worst case for ATS
        score = min(score, 25.0)
    elif has_multi_column:
        # Multi-column without special chars
        score = min(score, 80.0)
    elif has_tables:
        # Tables break structure
        score = min(score, 50.0)

    score = max(0, score)

    critical_count = sum(1 for i in issues if i.get("severity") == "critical")
    warning_count = sum(1 for i in issues if i.get("severity") == "warning")
    details = (
        f"{critical_count} critical, {warning_count} warning issues"
        if (critical_count or warning_count)
        else "No formatting issues detected"
    )
    return {"score": score, "details": details}


def _parseability_multiplier(formatting: Dict) -> float:
    """
    Calculate a multiplier (0.0-1.0) reflecting how much ATS systems
    can actually read this resume.

    If ATS can't parse the document, keyword matches are unreliable.
    This multiplier reduces the ENTIRE score proportionally.

    - Perfect parseability: 1.0 (no effect)
    - Multi-column layout: 0.90 (10% reduction — most ATS parsers can handle this now)
    - Multi-column + special chars (LaTeX): 0.55 (45% reduction)
    - Tables + multi-column + special: 0.45 (55% reduction)
    """
    issues = formatting.get("issues", [])
    issue_types = {i.get("type") for i in issues}

    multiplier = 1.0

    if "multi_column_layout" in issue_types:
        multiplier *= 0.90

    if "special_characters" in issue_types:
        multiplier *= 0.85

    if "tables_detected" in issue_types or "tables_or_textboxes" in issue_types:
        multiplier *= 0.85

    if "header_footer_content" in issue_types:
        multiplier *= 0.95

    return max(0.3, multiplier)  # Never reduce below 30%


def _impact_score(sections: Dict, resume_text: str) -> Dict:
    experience_text = ""
    for section in sections.get("detected", []):
        if section["name"] == "experience":
            experience_text = section.get("text", "")
            break
    if not experience_text:
        experience_text = resume_text

    lines = experience_text.split("\n")
    bullets = []

    for line in lines:
        stripped = line.strip()
        if not stripped or len(stripped) < 15:
            continue
        if _BULLET_RE.match(stripped) or _VERB_RE.match(stripped):
            bullets.append(stripped)

    if len(bullets) < 3:
        for line in lines:
            stripped = line.strip()
            if len(stripped) > 30:
                bullets.append(stripped)
        bullets = list(dict.fromkeys(bullets))

    quantified = [b for b in bullets if _QUANT_RE.search(b)]

    total = max(len(bullets), 1)
    q_count = len(quantified)
    score = (q_count / total) * 100

    details = f"{q_count} of {len(bullets)} bullets contain quantified impact"
    return {
        "score": score,
        "quantified_bullets": q_count,
        "total_bullets": len(bullets),
        "details": details,
        "bullets": bullets,
    }


def _get_grade(score: float) -> str:
    for threshold, grade in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return "F"
