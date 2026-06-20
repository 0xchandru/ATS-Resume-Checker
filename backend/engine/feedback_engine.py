import re
import logging
from typing import Dict, List
from sqlalchemy import text
from database import engine

logger = logging.getLogger(__name__)

_QUANT_RE = re.compile(r"\d+[%$x]|\$[\d,]+|\d+\s*(users?|clients?|customers?|million|billion|k\b)", re.IGNORECASE)
_BULLET_RE = re.compile(r"^[\s]*[-•·▪▸►*]\s+(.+)")


def generate_feedback(
    match_result: Dict,
    sections: Dict,
    formatting: Dict,
    career: Dict,
    scoring: Dict,
    action_verbs: Dict,
    resume_text: str,
    jd_text: str,
) -> List[Dict]:
    feedback = []

    _add_seniority_feedback(feedback, career)
    _add_format_critical(feedback, formatting)
    _add_missing_critical_keywords(feedback, match_result)
    _add_score_feedback(feedback, scoring)
    _add_quantification_feedback(feedback, scoring, resume_text)
    _add_missing_section_feedback(feedback, sections)
    _add_missing_high_keywords(feedback, match_result)
    _add_verb_strength_feedback(feedback, action_verbs)
    _add_occupation_skill_feedback(feedback, career)
    _add_nice_to_have(feedback, match_result, sections, action_verbs)

    feedback.sort(key=lambda x: {"critical": 0, "important": 1, "nice_to_have": 2}.get(x["priority"], 3))
    return feedback[:20]


def analyze_action_verbs(resume_text: str, sections: Dict) -> Dict:
    experience_text = ""
    for section in sections.get("detected", []):
        if section["name"] == "experience":
            experience_text = section.get("text", "")
            break
    if not experience_text:
        experience_text = resume_text

    with engine.connect() as conn:
        rows = conn.execute(text("SELECT verb, category, strength FROM kb_action_verbs")).fetchall()

    verb_kb = {row[0].lower(): {"category": row[1], "strength": row[2]} for row in rows}

    lines = experience_text.split("\n")
    profile = {"leadership": 0, "technical": 0, "analytical": 0, "communication": 0, "generic": 0}
    weak_verbs = []
    all_verbs = []

    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        match = _BULLET_RE.match(line_stripped)
        if match:
            content = match.group(1)
        else:
            content = line_stripped

        first_word = content.split()[0].lower().rstrip(".,;:") if content.split() else ""
        if not first_word:
            continue

        if first_word in verb_kb:
            info = verb_kb[first_word]
            cat = info["category"] or "generic"
            strength = info["strength"] or 2
            if cat in profile:
                profile[cat] += 1
            else:
                profile["generic"] += 1
            all_verbs.append({"verb": first_word, "strength": strength, "category": cat})
            if strength == 1:
                weak_verbs.append({
                    "verb": first_word,
                    "context": content[:120],
                    "strength": strength,
                })
        else:
            profile["generic"] += 1
            all_verbs.append({"verb": first_word, "strength": 2, "category": "generic"})

    total = max(sum(profile.values()), 1)
    strong_count = sum(1 for v in all_verbs if v["strength"] == 3)
    strong_ratio = strong_count / total

    seniority_align = profile.get("leadership", 0) / max(total, 1) > 0.2
    align_note = ""
    if not seniority_align:
        align_note = "Senior roles expect leadership verbs. Current profile is predominantly execution-level."

    suggestions = []
    if weak_verbs:
        weak_sample = weak_verbs[:3]
        replacements = {"worked": ["engineered", "implemented", "built"], "helped": ["facilitated", "enabled", "accelerated"], "assisted": ["supported", "collaborated", "contributed"], "did": ["executed", "delivered", "completed"]}
        for wv in weak_sample:
            v = wv["verb"]
            alts = replacements.get(v, ["engineered", "architected", "optimized"])
            suggestions.append(f"Replace '{v}' with '{alts[0]}', '{alts[1]}', or '{alts[2]}'")

    return {
        "profile": profile,
        "weak_verbs": weak_verbs[:10],
        "strong_verb_ratio": round(strong_ratio, 2),
        "seniority_verb_alignment": seniority_align,
        "alignment_note": align_note,
        "suggestions": suggestions,
    }


def check_cybersecurity_vertical(match_result: Dict, resume_text: str) -> Dict | None:
    with engine.connect() as conn:
        cyber_rows = conn.execute(
            text("SELECT skill_name FROM kb_cyber_skills WHERE precision_level IS NOT NULL OR rank IS NOT NULL ORDER BY rank LIMIT 200")
        ).fetchall()

    if not cyber_rows:
        return None

    cyber_skills = {r[0].lower() for r in cyber_rows}
    jd_matched = [m for m in match_result.get("matched", []) if m.get("keyword", "").lower() in cyber_skills]
    all_jd = match_result.get("total_jd_keywords", 1) or 1

    if len(jd_matched) / all_jd < 0.15:
        return None

    with engine.connect() as conn:
        all_cyber = conn.execute(text("SELECT skill_name, rank, precision_level, domain FROM kb_cyber_skills ORDER BY rank")).fetchall()
        cert_patterns = conn.execute(text("SELECT canonical_name, regex_pattern FROM kb_cert_patterns")).fetchall()
        all_certs = conn.execute(text("SELECT canonical_name, domain FROM kb_certifications WHERE domain = 'cybersecurity' OR domain LIKE '%cyber%'")).fetchall()

    matched_kw_set = {m.get("keyword", "").lower() for m in match_result.get("matched", [])}
    resume_lower = resume_text.lower()

    detected_certs = []
    for row in cert_patterns:
        cert_name = row[0]
        pattern = row[1]
        try:
            if re.search(pattern, resume_text, re.IGNORECASE):
                detected_certs.append(cert_name)
        except re.error:
            pass

    missing_certs = [r[0] for r in all_certs if r[0] not in detected_certs][:5]

    ranked_found = []
    ranked_missing = []
    for row in all_cyber:
        skill = row[0]
        if skill.lower() in matched_kw_set or skill.lower() in resume_lower:
            ranked_found.append({"skill": skill, "rank": row[1], "precision_level": row[2]})
        else:
            ranked_missing.append({"skill": skill, "rank": row[1], "precision_level": row[2]})

    cert_coverage = len(detected_certs) / max(len(all_certs), 1)
    skill_coverage = len(ranked_found) / max(len(all_cyber), 1)
    security_score = int((skill_coverage * 0.6 + cert_coverage * 0.4) * 100)

    return {
        "detected_certs": detected_certs,
        "missing_critical_certs": missing_certs,
        "ranked_skills_found": ranked_found[:20],
        "ranked_skills_missing": ranked_missing[:20],
        "security_score": security_score,
    }


def _add_seniority_feedback(feedback: List, career: Dict):
    if not career.get("seniority_match"):
        jd_lvl = career.get("jd_seniority", "unknown")
        res_lvl = career.get("resume_seniority", "unknown")
        SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "lead", "principal", "director", "vp", "c_suite"]
        jd_idx = SENIORITY_ORDER.index(jd_lvl) if jd_lvl in SENIORITY_ORDER else 3
        res_idx = SENIORITY_ORDER.index(res_lvl) if res_lvl in SENIORITY_ORDER else 3
        gap = abs(jd_idx - res_idx)
        if gap >= 2:
            feedback.append({
                "priority": "critical",
                "category": "seniority_mismatch",
                "message": career.get("seniority_gap_explanation", "Seniority gap detected."),
                "action": "Add metrics: team size managed, project budget, users impacted",
            })
        else:
            feedback.append({
                "priority": "important",
                "category": "seniority_mismatch",
                "message": career.get("seniority_gap_explanation", "Minor seniority gap."),
                "action": "Highlight leadership and scope to better match the role level.",
            })


def _add_format_critical(feedback: List, formatting: Dict):
    for issue in formatting.get("issues", []):
        if issue.get("severity") == "critical":
            feedback.append({
                "priority": "critical",
                "category": "format_issue",
                "message": issue["message"],
                "action": "Fix this formatting issue to ensure ATS can parse your resume.",
            })


def _add_missing_critical_keywords(feedback: List, match_result: Dict):
    for kw in match_result.get("missing", []):
        if kw.get("jd_importance") == "critical":
            feedback.append({
                "priority": "critical",
                "category": "missing_critical_keyword",
                "message": f"'{kw['keyword']}' is critical for this role and missing from your resume.",
                "section": "skills",
                "keyword": kw["keyword"],
                "action": f"Add '{kw['keyword']}' to your skills or experience if applicable.",
            })


def _add_score_feedback(feedback: List, scoring: Dict):
    if scoring.get("overall_score", 100) < 50:
        feedback.append({
            "priority": "critical",
            "category": "low_score",
            "message": f"Overall ATS score is {scoring.get('overall_score')} — below the 50-point threshold many ATS systems use to filter candidates.",
            "action": "Focus on adding missing keywords and improving formatting.",
        })


def _add_quantification_feedback(feedback: List, scoring: Dict, resume_text: str):
    impact = scoring.get("sub_scores", {}).get("impact_quantification", {})
    score = impact.get("score", 100)
    if score < 50:
        bullets = _find_low_impact_bullets(resume_text)
        entry = {
            "priority": "important",
            "category": "low_quantification",
            "message": f"Only {impact.get('quantified_bullets', 0)} of {impact.get('total_experience_bullets', 0)} experience bullets contain metrics. ATS and recruiters weight impact heavily.",
            "action": "Add quantified outcomes: percentages, dollar amounts, team sizes, user counts.",
        }
        if bullets:
            entry["original"] = bullets[0]
            entry["suggested"] = _rewrite_bullet(bullets[0])
        feedback.append(entry)


def _add_missing_section_feedback(feedback: List, sections: Dict):
    missing = sections.get("missing", [])
    if "summary" in missing:
        feedback.append({
            "priority": "important",
            "category": "missing_summary",
            "message": "No Summary section detected. A 3-line targeted summary with role keywords improves ATS score and recruiter first impression.",
            "section": "summary",
            "action": "Add a 3-sentence professional summary with 3–4 keywords from the job description.",
        })
    if "experience" in missing:
        feedback.append({
            "priority": "critical",
            "category": "missing_experience",
            "message": "No Experience section detected. This is critical for ATS scoring.",
            "section": "experience",
        })


def _add_missing_high_keywords(feedback: List, match_result: Dict):
    for kw in match_result.get("missing", []):
        if kw.get("jd_importance") == "high":
            feedback.append({
                "priority": "important",
                "category": "missing_high_keyword",
                "message": f"'{kw['keyword']}' appears {kw.get('jd_occurrence_count', 1)}× in the JD and is not in your resume.",
                "section": "skills",
                "keyword": kw["keyword"],
                "action": kw.get("suggestion", "Add this skill if applicable."),
            })


def _add_occupation_skill_feedback(feedback: List, career: Dict):
    onet = career.get("onet_matched_occupation", {})
    for skill in onet.get("occupation_expected_missing_skills", [])[:3]:
        feedback.append({
            "priority": "important",
            "category": "missing_occupation_skill",
            "message": f"'{skill}' is expected in this occupation per O*NET and is absent from your resume.",
            "section": "skills",
            "keyword": skill,
            "action": f"Add '{skill}' to your skills section if you have experience with it.",
        })


def _add_verb_strength_feedback(feedback: List, action_verbs: Dict):
    if action_verbs.get("strong_verb_ratio", 1.0) < 0.6:
        for wv in action_verbs.get("weak_verbs", [])[:3]:
            feedback.append({
                "priority": "nice_to_have",
                "category": "verb_strength",
                "message": f"Replace weak verb '{wv['verb']}' with a stronger action verb.",
                "original": wv.get("context", ""),
                "suggested": f"Replace '{wv['verb']}' with 'engineered', 'architected', 'optimized', or 'spearheaded'",
            })


def _add_nice_to_have(feedback: List, match_result: Dict, sections: Dict, action_verbs: Dict):
    for warning in match_result.get("density_warnings", [])[:2]:
        feedback.append({
            "priority": "nice_to_have",
            "category": "keyword_density",
            "message": warning.get("warning", "Keyword appears too frequently."),
            "keyword": warning.get("keyword"),
        })

    for warning in sections.get("length_warnings", [])[:2]:
        feedback.append({
            "priority": "nice_to_have",
            "category": "section_length",
            "message": warning,
        })


def _find_low_impact_bullets(resume_text: str) -> List[str]:
    lines = resume_text.split("\n")
    low_impact = []
    for line in lines:
        stripped = line.strip()
        if _BULLET_RE.match(stripped) or (len(stripped) > 30 and stripped[0].isupper()):
            if not _QUANT_RE.search(stripped) and len(stripped) > 30:
                low_impact.append(stripped)
    return low_impact[:3]


def _rewrite_bullet(original: str) -> str:
    verbs = ["Reduced", "Improved", "Increased", "Optimized", "Automated", "Engineered", "Implemented"]
    import random
    verb = random.choice(verbs)
    return f"{verb} [process/system] by X%, resulting in [measurable outcome]. Original: '{original[:60]}...'"
