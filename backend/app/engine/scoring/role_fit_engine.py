"""
Role-Fit Verdict Engine — Produces an honest, recruiter-friendly verdict
about whether the candidate is a good fit for the role.

No inflation. No platitudes. If a fresher targets a senior role, say so plainly.
"""

import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ── Fit levels ────────────────────────────────────────────────────────────

FIT_LEVELS = {
    "strong_fit":   {"label": "Strong Fit",   "color": "green",  "threshold": 75},
    "good_fit":     {"label": "Good Fit",     "color": "blue",   "threshold": 60},
    "stretch_fit":  {"label": "Stretch Fit",  "color": "amber",  "threshold": 40},
    "poor_fit":     {"label": "Poor Fit",     "color": "red",    "threshold": 20},
    "unqualified":  {"label": "Not Qualified","color": "red",    "threshold": 0},
}


def generate_role_fit_verdict(
    overall_score: float,
    seniority_gap: Dict,
    evidence_quality: Dict,
    skill_concepts: Dict,
    noise_filtered: List[Dict],
    keywords_data: Dict,
    career_intelligence: Optional[Dict] = None,
) -> Dict:
    """
    Generate a comprehensive, honest role-fit verdict.

    Args:
        overall_score: The final ATS score (already capped by seniority)
        seniority_gap: Output from seniority_analyzer.compute_seniority_gap()
        evidence_quality: Output from evidence_scorer.score_all_evidence()
        skill_concepts: Grouped skill concepts from skill_normalizer
        noise_filtered: List of noise keywords that were filtered out
        keywords_data: Full keywords data from matcher
        career_intelligence: Output from career_analyzer

    Returns:
        Complete role-fit verdict with honest assessment
    """
    # Determine fit level
    gap_severity = seniority_gap.get("gap_severity", "none")
    evidence_grade = evidence_quality.get("overall_grade", "Medium")

    # Compute fit score (combines overall score with seniority and evidence)
    fit_score = _compute_fit_score(overall_score, seniority_gap, evidence_quality)

    # Classify fit level
    fit_level = _classify_fit_level(fit_score, gap_severity)

    # Build honest assessment
    what_matches = _identify_strengths(keywords_data, evidence_quality, career_intelligence)
    what_doesnt = _identify_gaps(keywords_data, seniority_gap, evidence_quality)
    truly_missing = _identify_truly_missing(keywords_data, noise_filtered)

    # Generate summary
    summary = _generate_summary(
        fit_level, fit_score, seniority_gap, evidence_grade,
        what_matches, what_doesnt
    )

    # Generate recommendations
    recommendations = _generate_recommendations(
        fit_level, seniority_gap, evidence_quality, truly_missing
    )

    return {
        "fit_level": fit_level,
        "fit_label": FIT_LEVELS[fit_level]["label"],
        "fit_color": FIT_LEVELS[fit_level]["color"],
        "fit_score": round(fit_score),
        "summary": summary,
        "honest_assessment": {
            "what_matches": what_matches,
            "what_doesnt": what_doesnt,
            "truly_missing": truly_missing,
            "noise_filtered": noise_filtered[:10],  # Cap at 10
        },
        "recommendations": recommendations,
        "seniority_statement": seniority_gap.get("plain_statement", ""),
        "evidence_grade": evidence_grade,
    }


def _compute_fit_score(
    overall_score: float,
    seniority_gap: Dict,
    evidence_quality: Dict,
) -> float:
    """Compute a weighted fit score."""
    # Base from overall score
    base = overall_score

    # Seniority penalty (already applied via cap, but add direct penalty too)
    seniority_penalty = abs(seniority_gap.get("score_impact", 0))
    base -= seniority_penalty * 0.5  # Half the impact (rest is via cap)

    # Evidence quality adjustment
    evidence_score = evidence_quality.get("overall_score", 0.5)
    if evidence_score < 0.4:
        base *= 0.85  # Weak evidence reduces effective score
    elif evidence_score > 0.7:
        base *= 1.05  # Strong evidence slight boost (capped at cap)

    # Apply seniority cap
    cap = seniority_gap.get("score_cap", 100)
    base = min(base, cap)

    return max(0, min(100, base))


def _classify_fit_level(fit_score: float, gap_severity: str) -> str:
    """Classify fit level based on score and seniority gap."""
    # Critical seniority gap overrides score
    if gap_severity == "critical":
        return "unqualified" if fit_score < 30 else "poor_fit"

    if gap_severity == "significant" and fit_score < 50:
        return "poor_fit"

    # Score-based classification
    if fit_score >= 75:
        return "strong_fit"
    elif fit_score >= 60:
        return "good_fit"
    elif fit_score >= 40:
        return "stretch_fit"
    elif fit_score >= 20:
        return "poor_fit"
    else:
        return "unqualified"


def _identify_strengths(
    keywords_data: Dict,
    evidence_quality: Dict,
    career_intelligence: Optional[Dict],
) -> List[str]:
    """Identify what genuinely matches."""
    strengths = []

    # Matched skills with good evidence
    evidence_breakdown = evidence_quality.get("breakdown", {})
    production_skills = evidence_breakdown.get("production", [])
    project_skills = evidence_breakdown.get("project", [])
    cert_skills = evidence_breakdown.get("certification", [])

    if production_skills:
        skill_names = [s.get("skill", "") for s in production_skills[:3] if s.get("skill")]
        if skill_names:
            strengths.append(f"Production experience with: {', '.join(skill_names)}")

    if project_skills:
        skill_names = [s.get("skill", "") for s in project_skills[:3] if s.get("skill")]
        if skill_names:
            strengths.append(f"Project work demonstrating: {', '.join(skill_names)}")

    if cert_skills:
        skill_names = [s.get("skill", "") for s in cert_skills[:3] if s.get("skill")]
        if skill_names:
            strengths.append(f"Relevant certifications: {', '.join(skill_names)}")

    # Match rate
    matched = keywords_data.get("matched", [])
    if len(matched) > 5:
        strengths.append(f"{len(matched)} JD keywords found in resume")

    # Career intelligence signals
    if career_intelligence:
        if career_intelligence.get("companies_recognized"):
            strengths.append("Work at recognized companies")
        if career_intelligence.get("education_quality"):
            strengths.append("Strong educational background")

    if not strengths:
        strengths.append("Some domain vocabulary overlap detected")

    return strengths[:5]


def _identify_gaps(
    keywords_data: Dict,
    seniority_gap: Dict,
    evidence_quality: Dict,
) -> List[str]:
    """Identify what genuinely doesn't match."""
    gaps = []

    # Seniority gap
    gap_severity = seniority_gap.get("gap_severity", "none")
    if gap_severity in ("significant", "critical"):
        jd_level = seniority_gap.get("jd_level", "senior")
        resume_level = seniority_gap.get("resume_level", "junior")
        years_req = seniority_gap.get("years_required")
        if years_req:
            gaps.append(f"JD requires {years_req}+ years at {jd_level}-level; resume shows {resume_level}-level")
        else:
            gaps.append(f"JD targets {jd_level}-level; resume shows {resume_level}-level experience")

    # Missing critical skills
    missing = keywords_data.get("missing", [])
    critical_missing = [m for m in missing if isinstance(m, dict) and m.get("jd_importance") in ("critical", "high")]
    if critical_missing:
        skills_list = ", ".join(str(m.get("keyword", m.get("skill", ""))) for m in critical_missing[:3])
        gaps.append(f"Missing critical skills: {skills_list}")

    # Weak evidence
    evidence_grade = evidence_quality.get("overall_grade", "Medium")
    if evidence_grade == "Low":
        keyword_only = evidence_quality.get("breakdown", {}).get("keyword_only", [])
        if keyword_only:
            gaps.append(f"{len(keyword_only)} skills listed without substantiating context (keyword-only)")

    # Low match rate
    match_rate = keywords_data.get("match_rate", 0)
    if match_rate < 0.4:
        gaps.append(f"Low keyword match rate ({match_rate*100:.0f}%)")

    if not gaps:
        gaps.append("Minor gaps — overall alignment is reasonable")

    return gaps[:5]


def _identify_truly_missing(
    keywords_data: Dict,
    noise_filtered: List[Dict],
) -> List[Dict]:
    """
    Build the truly-missing skills list (excluding noise).
    Each item has: skill, importance, is_noise=False
    """
    missing = keywords_data.get("missing", [])
    noise_set = {n.get("skill", "").lower() for n in noise_filtered}

    truly_missing = []
    for m in missing:
        skill = str(m.get("keyword") or m.get("skill") or "") if isinstance(m, dict) else str(m)
        if skill.lower() in noise_set:
            continue
        importance = m.get("jd_importance", "medium") if isinstance(m, dict) else "medium"
        truly_missing.append({
            "skill": skill,
            "importance": importance,
            "is_noise": False,
        })

    # Sort by importance
    importance_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    truly_missing.sort(key=lambda x: importance_order.get(x["importance"], 2))

    return truly_missing[:15]


def _generate_summary(
    fit_level: str,
    fit_score: float,
    seniority_gap: Dict,
    evidence_grade: str,
    what_matches: List[str],
    what_doesnt: List[str],
) -> str:
    """Generate an honest summary paragraph."""
    fit_label = FIT_LEVELS[fit_level]["label"]
    gap_severity = seniority_gap.get("gap_severity", "none")

    if fit_level == "unqualified":
        return (
            f"This resume is NOT QUALIFIED for this role (score: {fit_score:.0f}). "
            f"{seniority_gap.get('plain_statement', '')} "
            f"While there may be domain vocabulary overlap, the experience gap is too large. "
            f"Evidence quality is {evidence_grade.lower()}."
        )
    elif fit_level == "poor_fit":
        return (
            f"This resume is a POOR FIT for this role (score: {fit_score:.0f}). "
            f"{seniority_gap.get('plain_statement', '')} "
            f"Key gaps: {what_doesnt[0] if what_doesnt else 'multiple critical skills missing'}. "
            f"Evidence quality is {evidence_grade.lower()}."
        )
    elif fit_level == "stretch_fit":
        return (
            f"This resume is a STRETCH FIT for this role (score: {fit_score:.0f}). "
            f"There are meaningful skills present, but significant gaps exist. "
            f"Strengths: {what_matches[0] if what_matches else 'some relevant skills'}. "
            f"Gaps: {what_doesnt[0] if what_doesnt else 'several required skills missing'}."
        )
    elif fit_level == "good_fit":
        return (
            f"This resume is a GOOD FIT for this role (score: {fit_score:.0f}). "
            f"Most required skills are present with {evidence_grade.lower()} evidence quality. "
            f"Minor gaps exist but are addressable. "
            f"Strengths: {what_matches[0] if what_matches else 'strong skill alignment'}."
        )
    else:  # strong_fit
        return (
            f"This resume is a STRONG FIT for this role (score: {fit_score:.0f}). "
            f"Skills, seniority, and evidence quality all align well with the JD requirements. "
            f"Evidence quality is {evidence_grade.lower()}."
        )


def _generate_recommendations(
    fit_level: str,
    seniority_gap: Dict,
    evidence_quality: Dict,
    truly_missing: List[Dict],
) -> List[str]:
    """Generate actionable recommendations."""
    recs = []
    gap_severity = seniority_gap.get("gap_severity", "none")
    evidence_grade = evidence_quality.get("overall_grade", "Medium")

    if gap_severity in ("significant", "critical"):
        resume_level = seniority_gap.get("resume_level", "junior")
        recs.append(
            f"Target {resume_level}-level or one level above roles instead — "
            f"this role is above your current experience band"
        )

    if evidence_grade == "Low":
        keyword_only = evidence_quality.get("breakdown", {}).get("keyword_only", [])
        if keyword_only:
            recs.append(
                f"Add context to {len(keyword_only)} keyword-only skills — "
                f"describe how you used them with quantified outcomes"
            )

    # Missing critical skills
    critical_missing = [m for m in truly_missing if m["importance"] in ("critical", "high")]
    if critical_missing:
        skills = ", ".join(m["skill"] for m in critical_missing[:3])
        recs.append(f"Address missing critical skills: {skills}")

    # Lab → project conversion
    lab_count = len(evidence_quality.get("breakdown", {}).get("lab_training", []))
    if lab_count >= 2:
        recs.append(
            "Convert lab/training experience into project case studies "
            "with quantified outcomes"
        )

    if fit_level in ("strong_fit", "good_fit"):
        recs.append("Fine-tune resume language to mirror the JD's exact terminology")

    if not recs:
        recs.append("Review the missing skills list and add relevant experience where possible")

    return recs[:5]
