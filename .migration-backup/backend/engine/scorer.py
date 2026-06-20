import re
import logging
from typing import Dict, List
from config import SCORING_WEIGHTS, GRADE_THRESHOLDS, LAYER_MULTIPLIERS

logger = logging.getLogger(__name__)


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

    weighted = (
        kw_score * SCORING_WEIGHTS["keyword_match"]
        + sem_score["score"] * SCORING_WEIGHTS["semantic_relevance"]
        + sec_score["score"] * SCORING_WEIGHTS["section_completeness"]
        + fmt_score["score"] * SCORING_WEIGHTS["format_compliance"]
        + impact_score["score"] * SCORING_WEIGHTS["impact_quantification"]
    )
    overall = round(min(100, max(0, weighted)), 1)
    grade = _get_grade(overall)

    return {
        "overall_score": overall,
        "letter_grade": grade,
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
    matched = match_result.get("matched", [])
    missing = match_result.get("missing", [])
    total = match_result.get("total_jd_keywords", 1) or 1

    total_contribution = 0.0
    max_contribution = 0.0

    for kw in matched:
        freq = kw.get("jd_frequency", 0.5) or 0.5
        confidence = kw.get("match_confidence", 1.0)
        layer = kw.get("match_layer", "exact")
        multiplier = LAYER_MULTIPLIERS.get(layer, 0.8)
        contribution = freq * confidence * multiplier
        total_contribution += contribution
        max_contribution += freq

    for kw in missing:
        freq = kw.get("jd_frequency", 0.5) or 0.5
        max_contribution += freq

    if max_contribution == 0:
        return 0.0
    return min(100.0, (total_contribution / max_contribution) * 100)


def _semantic_score(resume_text: str, jd_text: str) -> Dict:
    score = 0.0
    cosine = 0.0
    details = "Semantic similarity computed"

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np

        vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
        docs = [resume_text[:50000], jd_text[:20000]]
        tfidf = vectorizer.fit_transform(docs)
        tfidf_cosine = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
    except Exception as e:
        logger.debug("TF-IDF failed: %s", e)
        tfidf_cosine = 0.0

    try:
        from engine.embeddings import get_spacy
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
    score = min(100.0, cosine * 120)

    if cosine >= 0.8:
        details = "Very strong semantic alignment"
    elif cosine >= 0.6:
        details = "Strong semantic alignment"
    elif cosine >= 0.4:
        details = "Moderate semantic alignment"
    else:
        details = "Weak semantic alignment — resume content diverges significantly from job description"

    return {"score": score, "cosine": cosine, "details": details}


def _section_score(sections: Dict) -> Dict:
    from config import EXPECTED_SECTIONS
    detected = sections.get("detected", [])
    detected_names = {s["name"] for s in detected}
    expected_count = len(EXPECTED_SECTIONS)
    detected_count = sum(1 for s in EXPECTED_SECTIONS if s in detected_names)
    missing_sections = [s for s in EXPECTED_SECTIONS if s not in detected_names]
    score = (detected_count / expected_count) * 100

    details = f"Missing: {', '.join(missing_sections)}" if missing_sections else "All expected sections detected"
    return {
        "score": score,
        "detected_count": detected_count,
        "expected_count": expected_count,
        "details": details,
    }


def _format_score(formatting: Dict) -> Dict:
    score = 100.0
    issues = formatting.get("issues", [])
    for issue in issues:
        severity = issue.get("severity", "info")
        if severity == "critical":
            score -= 20
        elif severity == "warning":
            score -= 8
        elif severity == "info":
            score -= 2
    score = max(0, score)

    critical_count = sum(1 for i in issues if i.get("severity") == "critical")
    warning_count = sum(1 for i in issues if i.get("severity") == "warning")
    details = f"{critical_count} critical, {warning_count} warning issues" if (critical_count or warning_count) else "No formatting issues detected"
    return {"score": score, "details": details}


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
    bullet_re = re.compile(r"^[\s]*[-•·▪▸►*]\s+.+")
    verb_start_re = re.compile(r"^[\s]*[A-Z][a-z]+ed\s|^[\s]*[A-Z][a-z]+ed,|^[\s]*[A-Z][a-z]+ing\s")

    for line in lines:
        line = line.strip()
        if bullet_re.match(line) or (len(line) > 20 and verb_start_re.match(line)):
            bullets.append(line)

    if not bullets:
        for line in lines:
            line = line.strip()
            if len(line) > 30:
                bullets.append(line)

    quant_re = re.compile(r"\d+[%$x]|\$[\d,]+|\d+\s*(users?|clients?|customers?|teams?|million|billion|k\b)|[\d\.]+x\b", re.IGNORECASE)
    quantified = [b for b in bullets if quant_re.search(b)]

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
