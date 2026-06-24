import re
import logging
from typing import Dict, List, Optional
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

# Strong-impact verbs that signal outcome-driven bullets.
# A bullet with one of these verbs AND a quantified metric gets a higher
# weight than one that merely contains an incidental number (e.g. "team of 5").
_HIGH_IMPACT_VERBS = re.compile(
    r"^[\s]*[-•·▪▸►*➤→\s]*(?:"
    r"Reduced|Decreased|Cut|Eliminated|Saved|Prevented|Blocked|"
    r"Increased|Grew|Boosted|Improved|Raised|Accelerated|Doubled|Tripled|"
    r"Achieved|Generated|Delivered|Deployed|Launched|Automated|Streamlined|"
    r"Detected|Resolved|Responded|Investigated|Mitigated|Hardened|"
    r"Led|Managed|Spearheaded|Designed|Architected|Optimized|Migrated|"
    r"Established|Built|Scaled|Onboarded|Trained"
    r")\b",
    re.IGNORECASE,
)

# Patterns that indicate truly incidental numbers (NOT impact metrics).
_INCIDENTAL_NUMBER_RE = re.compile(
    r"\b(?:team of|group of|class of|cohort of|batch of|set of|list of|"
    r"total of|staff of|member of|member)\s+\d+\b"
    r"|\b\d+\s*(?:people|person|member|student|attendee)s?\b",
    re.IGNORECASE,
)


# ═══════════════════════════════════════════════════════════════════════════
# Enhanced scoring with seniority caps, evidence quality, and concept matching
# ═══════════════════════════════════════════════════════════════════════════

def calculate_score_v2(
    match_result: Dict,
    sections: Dict,
    formatting: Dict,
    career: Dict,
    resume_text: str,
    jd_text: str,
    seniority_gap: Optional[Dict] = None,
    evidence_quality: Optional[Dict] = None,
    cert_match: Optional[Dict] = None,
    edu_match: Optional[Dict] = None,
    role_profile: Optional[str] = None,
) -> Dict:
    """
    Enhanced 7-dimension scoring model with optional role-adaptive weights.

    Dimensions (default weights):
        1. Hard Skills Match     (0.25) — Concept-level matching
        2. Domain Alignment      (0.15) — Semantic relevance to JD domain
        3. Evidence Quality      (0.15) — How well skills are substantiated
        4. Seniority Fit         (0.15) — Level match between candidate and role
        5. ATS Parseability      (0.15) — Format compliance
        6. Section Completeness  (0.08) — Required resume sections present
        7. Impact Quantification (0.07) — Quantified achievements in bullets

    Score caps based on seniority gap:
        - Gap >= 3 levels → Score capped at 35
        - Gap == 2 levels → Score capped at 55
        - Gap == 1 level  → Score capped at 75
        - Match           → No cap

    role_profile: optional key into ROLE_WEIGHT_PROFILES ('cybersecurity',
        'software', or 'default'). Overrides the default weights when set.
    """
    from backend.app.config import ROLE_WEIGHT_PROFILES

    # Select weights — role-adaptive profile wins over static defaults
    if role_profile and role_profile in ROLE_WEIGHT_PROFILES:
        w = ROLE_WEIGHT_PROFILES[role_profile]
    else:
        w = ROLE_WEIGHT_PROFILES.get("default", {})

    w_kw  = w.get("keyword_match",       0.25)
    w_sem = w.get("domain_alignment",    0.15)
    w_ev  = w.get("evidence_quality",    0.15)
    w_sen = w.get("seniority_fit",       0.15)
    w_fmt = w.get("format_compliance",   0.15)
    w_sec = w.get("section_completeness",0.08)
    w_imp = w.get("impact_quantification",0.07)

    kw_score = _keyword_score(match_result)
    sem_score = _semantic_score(resume_text, jd_text)
    sec_score = _section_score(sections)
    fmt_score = _format_score(formatting)
    impact_score = _impact_score(sections, resume_text)

    # New dimensions
    evidence_score_val = _evidence_dimension_score(evidence_quality)
    seniority_score_val = _seniority_dimension_score(seniority_gap)

    # Parseability multiplier
    parseability_multiplier = _parseability_multiplier(formatting)

    # 7-dimension weighted sum with role-adaptive weights
    weighted = (
        kw_score                * w_kw
        + sem_score["score"]    * w_sem
        + evidence_score_val    * w_ev
        + seniority_score_val   * w_sen
        + fmt_score["score"]    * w_fmt
        + sec_score["score"]    * w_sec
        + impact_score["score"] * w_imp
    )

    # Apply parseability multiplier
    weighted = weighted * parseability_multiplier

    # Apply Certification Bonus (up to +5 points for exact/bonus certs)
    cert_bonus = 0.0
    if cert_match:
        cert_bonus += min(3.0, cert_match.get("matched_count", 0) * 1.5)
        cert_bonus += min(2.0, cert_match.get("bonus_count", 0) * 0.5)
    
    # Apply Education Adjustment (up to +2 points or -2 points)
    edu_adj = 0.0
    if edu_match:
        if edu_match.get("degree_level_match") == "exceeds":
            edu_adj += 2.0
        elif edu_match.get("degree_level_match") == "below":
            edu_adj -= 2.0
        if len(edu_match.get("recognized_universities", [])) > 0:
            edu_adj += 1.0

    weighted += cert_bonus + edu_adj

    # Apply seniority score cap
    score_cap = 100
    if seniority_gap:
        score_cap = seniority_gap.get("score_cap", 100)

    overall = round(min(score_cap, max(0, weighted)), 1)
    grade = _get_grade(overall)

    return {
        "overall_score": overall,
        "letter_grade": grade,
        "parseability_multiplier": round(parseability_multiplier, 2),
        "score_cap": score_cap,
        "score_cap_reason": seniority_gap.get("plain_statement", "") if seniority_gap and score_cap < 100 else "",
        "role_profile": role_profile or "default",

        # New 7 dimensions explicitly required by UI
        "parsing_quality": round(sec_score["score"]),
        "formatting_quality": round(fmt_score["score"]),
        "keyword_match": round(kw_score),
        "semantic_match": round(sem_score["score"]),
        "evidence_strength": round(evidence_score_val),
        "seniority_fit": round(seniority_score_val),
        "overall_fit": overall,

        "sub_scores": {
            "keyword_match": {
                "score": round(kw_score, 1),
                "weight": w_kw,
                "weighted_contribution": round(kw_score * w_kw, 2),
                "details": f"{match_result['matched_count']} of {match_result['total_jd_keywords']} JD keywords matched",
                "match_breakdown": match_result.get("breakdown", {}),
            },
            "semantic_relevance": {
                "score": round(sem_score["score"], 1),
                "weight": w_sem,
                "weighted_contribution": round(sem_score["score"] * w_sem, 2),
                "cosine_similarity": round(sem_score["cosine"], 3),
                "details": sem_score["details"],
            },
            "evidence_quality": {
                "score": round(evidence_score_val, 1),
                "weight": w_ev,
                "weighted_contribution": round(evidence_score_val * w_ev, 2),
                "grade": evidence_quality.get("overall_grade", "Unknown") if evidence_quality else "N/A",
                "details": _evidence_details(evidence_quality),
            },
            "seniority_fit": {
                "score": round(seniority_score_val, 1),
                "weight": w_sen,
                "weighted_contribution": round(seniority_score_val * w_sen, 2),
                "details": seniority_gap.get("plain_statement", "Seniority not analyzed") if seniority_gap else "N/A",
                "gap_severity": seniority_gap.get("gap_severity", "unknown") if seniority_gap else "unknown",
            },
            "format_compliance": {
                "score": round(fmt_score["score"], 1),
                "weight": w_fmt,
                "weighted_contribution": round(fmt_score["score"] * w_fmt, 2),
                "details": fmt_score["details"],
                "parseability_multiplier": round(parseability_multiplier, 2),
            },
            "section_completeness": {
                "score": round(sec_score["score"], 1),
                "weight": w_sec,
                "weighted_contribution": round(sec_score["score"] * w_sec, 2),
                "detected_count": sec_score["detected_count"],
                "expected_count": sec_score["expected_count"],
                "details": sec_score["details"],
            },
            "impact_quantification": {
                "score": round(impact_score["score"], 1),
                "weight": w_imp,
                "weighted_contribution": round(impact_score["score"] * w_imp, 2),
                "quantified_bullets": impact_score["quantified_bullets"],
                "high_impact_bullets": impact_score.get("high_impact_bullets", 0),
                "total_experience_bullets": impact_score["total_bullets"],
                "details": impact_score["details"],
            },
        },
    }


def _evidence_dimension_score(evidence_quality: Optional[Dict]) -> float:
    """Convert evidence quality data into a 0-100 score."""
    if not evidence_quality:
        return 50.0  # Neutral default

    overall = evidence_quality.get("overall_score", 0.5)
    return min(100.0, overall * 100)


def _seniority_dimension_score(seniority_gap: Optional[Dict]) -> float:
    """Convert seniority gap data into a 0-100 score."""
    if not seniority_gap:
        return 50.0  # Neutral default

    gap = seniority_gap.get("gap_levels", 0)
    if gap == 0:
        return 100.0
    elif gap == 1:
        return 65.0
    elif gap == 2:
        return 35.0
    else:
        return 10.0


def _evidence_details(evidence_quality: Optional[Dict]) -> str:
    """Generate details string for evidence quality."""
    if not evidence_quality:
        return "Evidence quality not analyzed"

    grade = evidence_quality.get("overall_grade", "Unknown")
    breakdown = evidence_quality.get("breakdown", {})
    prod = len(breakdown.get("production", []))
    proj = len(breakdown.get("project", []))
    cert = len(breakdown.get("certification", []))
    lab = len(breakdown.get("lab_training", []))
    kw = len(breakdown.get("keyword_only", []))

    parts = []
    if prod: parts.append(f"{prod} production")
    if proj: parts.append(f"{proj} project")
    if cert: parts.append(f"{cert} cert")
    if lab: parts.append(f"{lab} lab/training")
    if kw: parts.append(f"{kw} keyword-only")

    return f"Evidence grade: {grade} ({', '.join(parts) if parts else 'no breakdown'})"


def calculate_score(
    match_result: Dict,
    sections: Dict,
    formatting: Dict,
    career: Dict,
    resume_text: str,
    jd_text: str,
) -> Dict:
    """Original 5-dimension scorer — kept for backward compatibility."""
    kw_score = _keyword_score(match_result)
    sem_score = _semantic_score(resume_text, jd_text)
    sec_score = _section_score(sections)
    fmt_score = _format_score(formatting)
    impact_score = _impact_score(sections, resume_text)

    parseability_multiplier = _parseability_multiplier(formatting)

    weighted = (
        kw_score * SCORING_WEIGHTS["keyword_match"]
        + sem_score["score"] * SCORING_WEIGHTS["semantic_relevance"]
        + sec_score["score"] * SCORING_WEIGHTS["section_completeness"]
        + fmt_score["score"] * SCORING_WEIGHTS["format_compliance"]
        + impact_score["score"] * SCORING_WEIGHTS["impact_quantification"]
    )

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
        vectorizer.fit([resume_text[:50000], jd_text[:20000]])
        vec1 = vectorizer.transform([resume_text[:50000]])
        vec2 = vectorizer.transform([jd_text[:20000]])
        tfidf_cosine = float(cosine_similarity(vec1, vec2)[0][0])
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
    """
    Score impact quantification quality.

    High-impact bullets (strong outcome verb + quantified metric, and NOT
    merely an incidental number like "team of 5") are worth 2x a plain
    quantified bullet that happens to contain a number for context.

    Scoring scale:
        score = (high_impact_bullets * 2 + plain_quantified) / (total_bullets * 2) * 100
    """
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

    high_impact = []
    plain_quantified = []

    for b in bullets:
        has_quant = bool(_QUANT_RE.search(b))
        if not has_quant:
            continue
        # Exclude purely incidental numbers like "team of 5 engineers"
        only_incidental = _INCIDENTAL_NUMBER_RE.search(b) and not re.search(r"\d+\s*[%$x]|\$[\d,]+", b)
        if only_incidental:
            continue
        if _HIGH_IMPACT_VERBS.match(b):
            high_impact.append(b)
        else:
            plain_quantified.append(b)

    total = max(len(bullets), 1)
    hi_count = len(high_impact)
    pl_count = len(plain_quantified)
    q_count = hi_count + pl_count  # legacy compat

    # Weighted score: high-impact bullets worth 2x
    numerator = hi_count * 2 + pl_count
    denominator = total * 2
    score = min(100.0, (numerator / denominator) * 100)

    details = (
        f"{hi_count} high-impact + {pl_count} quantified of {len(bullets)} bullets"
    )
    return {
        "score": score,
        "quantified_bullets": q_count,
        "high_impact_bullets": hi_count,
        "total_bullets": len(bullets),
        "details": details,
        "bullets": bullets,
    }


def _get_grade(score: float) -> str:
    for threshold, grade in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return "F"


# ─── Soft skill vocabulary (mirrors frontend SoftSkillsSection.tsx) ────────────

_SOFT_SKILL_TERMS = {
    "communication", "leadership", "teamwork", "team player", "problem solving",
    "problem-solving", "critical thinking", "adaptability", "time management",
    "collaboration", "interpersonal", "analytical", "attention to detail",
    "self-motivated", "creativity", "flexibility", "organizational",
    "decision making", "conflict resolution", "mentoring", "coaching",
    "negotiation", "presentation", "public speaking", "emotional intelligence",
    "empathy", "initiative", "proactive", "multitasking", "prioritization",
    "delegation", "strategic thinking", "innovation", "customer service",
    "relationship building", "accountability", "work ethic", "professionalism",
    "resilience", "patience", "active listening", "cross-functional",
    "stakeholder", "agile", "scrum", "detail-oriented", "fast learner",
    "self-starter", "results-driven", "team-oriented", "motivated",
}

_SOFT_FRAGMENTS = ("communicat", "leadership", "interpersonal", "agile", "scrum")
_SOFT_EXCLUSIONS = ("system", "database", "server", "cloud", "platform")


def _is_soft_skill(keyword: str) -> bool:
    lower = keyword.lower()
    if lower in _SOFT_SKILL_TERMS:
        return True
    for frag in _SOFT_FRAGMENTS:
        if frag in lower and not any(ex in lower for ex in _SOFT_EXCLUSIONS):
            return True
    return False


def compute_category_scores(
    match_result: Dict,
    sections: Dict,
    formatting: Dict,
    career: Dict,
    resume_text: str,
    jd_text: str,
    action_verbs: Optional[Dict] = None,
) -> Dict:
    """
    Compute Jobscan-style 5-category scores for the results sidebar.
    Each category has: score (0-100), issues_to_fix (int).
    """
    matched = match_result.get("matched", [])
    missing = match_result.get("missing", [])

    # ── Searchability ─────────────────────────────────────────────────────────
    detected_names = {s["name"] for s in sections.get("detected", [])}
    search_checks = [
        "contact_info" in detected_names,
        "summary" in detected_names,
        "experience" in detected_names,
        "education" in detected_names,
        "skills" in detected_names,
        match_result.get("match_rate", 0) >= 0.25,
    ]
    search_passed = sum(1 for c in search_checks if c)
    search_score = round(search_passed / len(search_checks) * 100)
    search_issues = len(search_checks) - search_passed

    # ── Hard Skills ────────────────────────────────────────────────────────────
    hard_matched = [m for m in matched if not _is_soft_skill(m.get("keyword", ""))]
    hard_missing = [m for m in missing if not _is_soft_skill(m.get("keyword", ""))]
    hard_total = len(hard_matched) + len(hard_missing)
    hard_score = round(len(hard_matched) / hard_total * 100) if hard_total > 0 else 50
    hard_issues = min(len(hard_missing), 15)

    # ── Soft Skills ────────────────────────────────────────────────────────────
    soft_matched = [m for m in matched if _is_soft_skill(m.get("keyword", ""))]
    soft_missing = [m for m in missing if _is_soft_skill(m.get("keyword", ""))]
    soft_total = len(soft_matched) + len(soft_missing)
    if soft_total > 0:
        soft_score = round(len(soft_matched) / soft_total * 100)
    else:
        soft_score = 60
    soft_issues = min(len(soft_missing), 8)

    # ── Recruiter Tips ─────────────────────────────────────────────────────────
    impact = _impact_score(sections, resume_text)
    quant_score = impact["score"]
    quant_ok = quant_score >= 40

    strong_verb_ratio = 0.5
    if action_verbs:
        strong_verb_ratio = action_verbs.get("strong_verb_ratio", 0.5)
    verbs_ok = strong_verb_ratio >= 0.5

    word_count = formatting.get("word_count", 500)
    wc_ok = 300 <= word_count <= 1200

    file_type = formatting.get("file_type", "pdf")
    fmt_ok = file_type in ("pdf", "docx")

    recruiter_checks = [quant_ok, verbs_ok, wc_ok, fmt_ok]
    recruiter_passed = sum(1 for c in recruiter_checks if c)
    recruiter_base = round(recruiter_passed / len(recruiter_checks) * 100)
    recruiter_score = round(recruiter_base * 0.55 + quant_score * 0.45)
    recruiter_issues = len(recruiter_checks) - recruiter_passed

    # ── Formatting ─────────────────────────────────────────────────────────────
    fmt_result = _format_score(formatting)
    fmt_score_val = round(fmt_result["score"])
    fmt_issues = sum(
        1 for i in formatting.get("issues", [])
        if i.get("severity") in ("critical", "warning")
    )

    return {
        "searchability": {
            "score": search_score,
            "issues_to_fix": search_issues,
            "passed_checks": search_passed,
            "total_checks": len(search_checks),
        },
        "hard_skills": {
            "score": hard_score,
            "issues_to_fix": hard_issues,
            "matched_count": len(hard_matched),
            "missing_count": len(hard_missing),
        },
        "soft_skills": {
            "score": soft_score,
            "issues_to_fix": soft_issues,
            "matched_count": len(soft_matched),
            "missing_count": len(soft_missing),
        },
        "recruiter_tips": {
            "score": recruiter_score,
            "issues_to_fix": recruiter_issues,
            "quantification_score": round(quant_score, 1),
            "quantified_bullets": impact["quantified_bullets"],
            "total_bullets": impact["total_bullets"],
            "strong_verb_ratio": round(strong_verb_ratio, 2),
        },
        "formatting": {
            "score": fmt_score_val,
            "issues_to_fix": fmt_issues,
        },
    }
