"""
Evidence Scorer — Scores HOW a skill is evidenced in the resume,
not just WHETHER it appears.

A skill listed in a "Skills:" section with no context gets 0.3.
A skill used in a quantified production bullet gets 1.0.
"""

import logging
import re
from typing import Dict, List, Optional, Tuple
from backend.app.engine.extraction.extractor import normalize

logger = logging.getLogger(__name__)

# ── Evidence type weights ─────────────────────────────────────────────────

EVIDENCE_WEIGHTS = {
    "production":    1.0,   # Real work with quantified impact
    "project":       0.8,   # Built/created something substantial
    "certification": 0.7,   # Earned a relevant certification
    "lab_training":  0.5,   # Lab, CTF, training, course
    "keyword_only":  0.3,   # Listed in skills section, no context
    "inferred":      0.15,  # Not explicitly mentioned, implied by related skill
}

# ── Detection patterns ───────────────────────────────────────────────────

# Quantification patterns — indicate production work
_QUANT_PATTERNS = [
    r'\d+\s*%',                        # "reduced by 40%"
    r'\d+[kKmM]\+?',                   # "5K endpoints", "2M records"
    r'\d{2,}[\s,]*\d*\s*(user|endpoint|server|node|device|machine|system|client|account|incident)',
    r'\$\s*\d',                        # Dollar amounts
    r'across\s+\d',                    # "across 5000 endpoints"
    r'managed\s+\d',                   # "managed 200 servers"
    r'reduced|improved|increased|decreased|saved|cut|lowered|boosted',
    r'mttr|mttd|sla|uptime|availability|latency|throughput',
]

# Project verbs will be loaded dynamically from the KB

# Lab/training indicators
_LAB_INDICATORS = {
    "tryhackme", "hackthebox", "htb", "ctf", "capture the flag",
    "lab", "labs", "home lab", "homelab", "sandbox", "virtual lab",
    "course", "coursera", "udemy", "pluralsight", "cybrary",
    "bootcamp", "boot camp", "training", "learning path",
    "practice", "exercise", "hands-on lab", "certification prep",
}

# Certification patterns
_CERT_PATTERNS = [
    r'(?:comptia|comp tia)\s+\w+',
    r'(?:certified|certification)\s+\w+',
    r'(?:CISSP|CEH|OSCP|GIAC|CCNA|CCNP|CISA|CISM|GCIH|GPEN|GSEC)',
    r'(?:Security\+|Network\+|CySA\+|PenTest\+|CASP\+)',
    r'(?:AWS\s+(?:SAA|SAP|SCS|SOA)|Azure\s+(?:AZ-\d+|SC-\d+))',
]

# Skills section header patterns
_SKILLS_SECTION_HEADERS = {
    "skills", "technical skills", "core competencies", "competencies",
    "expertise", "technologies", "tools", "tech stack",
    "programming languages", "frameworks", "certifications",
}


def score_skill_evidence(
    skill: str,
    resume_text: str,
    resume_sections: Optional[Dict] = None,
) -> Dict:
    """
    Analyze how a skill is evidenced in the resume.

    Returns:
        {
            "skill": str,
            "evidence_type": str,
            "evidence_score": float,
            "evidence_context": str,  # The sentence/bullet where evidence was found
            "details": str,          # Human-readable explanation
        }
    """
    norm_skill = normalize(skill)
    lower_text = resume_text.lower()

    # First check if the skill even appears in the text
    if norm_skill not in normalize(resume_text):
        return {
            "skill": skill,
            "evidence_type": "inferred",
            "evidence_score": EVIDENCE_WEIGHTS["inferred"],
            "evidence_context": "",
            "details": f"'{skill}' is not explicitly mentioned — inferred from related skills",
        }

    # Find all sentences/bullets containing the skill
    contexts = _find_skill_contexts(skill, resume_text)

    if not contexts:
        return {
            "skill": skill,
            "evidence_type": "keyword_only",
            "evidence_score": EVIDENCE_WEIGHTS["keyword_only"],
            "evidence_context": "",
            "details": f"'{skill}' appears in text but not in a meaningful context",
        }

    # Classify the best evidence
    best_type = "keyword_only"
    best_context = contexts[0]
    best_score = EVIDENCE_WEIGHTS["keyword_only"]

    for ctx in contexts:
        ctx_lower = ctx.lower()

        # Check for production work (quantified achievements)
        for pattern in _QUANT_PATTERNS:
            if re.search(pattern, ctx_lower):
                if EVIDENCE_WEIGHTS["production"] > best_score:
                    best_type = "production"
                    best_context = ctx
                    best_score = EVIDENCE_WEIGHTS["production"]
                break

        # Check for project work
        try:
            from sqlalchemy import text
            from backend.app.database import engine
            with engine.connect() as conn:
                verb_rows = conn.execute(text("SELECT verb FROM kb_action_verbs WHERE strength >= 2")).fetchall()
                project_verbs = {row[0].lower() for row in verb_rows}
        except Exception:
            project_verbs = set()

        words = set(ctx_lower.split())
        if words & project_verbs:
            if EVIDENCE_WEIGHTS["project"] > best_score:
                best_type = "project"
                best_context = ctx
                best_score = EVIDENCE_WEIGHTS["project"]

        # Check for lab/training
        for indicator in _LAB_INDICATORS:
            if indicator in ctx_lower:
                if EVIDENCE_WEIGHTS["lab_training"] > best_score:
                    best_type = "lab_training"
                    best_context = ctx
                    best_score = EVIDENCE_WEIGHTS["lab_training"]
                break

        # Check for certification
        for pattern in _CERT_PATTERNS:
            if re.search(pattern, ctx, re.IGNORECASE):
                if EVIDENCE_WEIGHTS["certification"] > best_score:
                    best_type = "certification"
                    best_context = ctx
                    best_score = EVIDENCE_WEIGHTS["certification"]
                break

    # Check if skill is ONLY in a skills section (keyword-only)
    if best_type == "keyword_only" and resume_sections:
        skill_section_text = ""
        for sec_name, sec_data in resume_sections.items():
            if sec_name.lower().replace("_", " ") in _SKILLS_SECTION_HEADERS:
                skill_section_text = sec_data.get("text", "") if isinstance(sec_data, dict) else str(sec_data)
                break

        if skill_section_text and norm_skill in normalize(skill_section_text):
            # Skill is listed in skills section — check if it also appears elsewhere
            non_skill_text = resume_text
            if skill_section_text:
                non_skill_text = resume_text.replace(skill_section_text, "")

            if norm_skill not in normalize(non_skill_text):
                best_type = "keyword_only"
                best_score = EVIDENCE_WEIGHTS["keyword_only"]
                best_context = f"Listed in Skills section only"

    details_map = {
        "production": f"'{skill}' used in quantified work experience",
        "project": f"'{skill}' used in a project with hands-on work",
        "certification": f"'{skill}' supported by a certification",
        "lab_training": f"'{skill}' used in lab/training/CTF context",
        "keyword_only": f"'{skill}' listed without substantiating context",
        "inferred": f"'{skill}' inferred from related skills",
    }

    return {
        "skill": skill,
        "evidence_type": best_type,
        "evidence_score": best_score,
        "evidence_context": best_context[:200],
        "details": details_map.get(best_type, ""),
    }


def score_all_evidence(
    matched_skills: List[str],
    resume_text: str,
    resume_sections: Optional[Dict] = None,
) -> Dict:
    """
    Score evidence quality for all matched skills.

    Returns:
        {
            "overall_grade": "High" | "Medium" | "Low",
            "overall_score": float,  # 0-1
            "breakdown": {
                "production": [{"skill": ..., "context": ...}, ...],
                "project": [...],
                "certification": [...],
                "lab_training": [...],
                "keyword_only": [...],
                "inferred": [...],
            },
            "per_skill": [{"skill": ..., "evidence_type": ..., ...}, ...]
        }
    """
    per_skill = []
    breakdown = {
        "production": [],
        "project": [],
        "certification": [],
        "lab_training": [],
        "keyword_only": [],
        "inferred": [],
    }

    for skill in matched_skills:
        result = score_skill_evidence(skill, resume_text, resume_sections)
        per_skill.append(result)
        breakdown[result["evidence_type"]].append({
            "skill": skill,
            "context": result["evidence_context"],
        })

    # Calculate overall evidence quality
    if not per_skill:
        return {
            "overall_grade": "Low",
            "overall_score": 0.0,
            "breakdown": breakdown,
            "per_skill": per_skill,
        }

    total_score = sum(r["evidence_score"] for r in per_skill)
    avg_score = total_score / len(per_skill)

    # Grade thresholds
    if avg_score >= 0.7:
        grade = "High"
    elif avg_score >= 0.45:
        grade = "Medium"
    else:
        grade = "Low"

    return {
        "overall_grade": grade,
        "overall_score": round(avg_score, 3),
        "breakdown": breakdown,
        "per_skill": per_skill,
    }


def _find_skill_contexts(skill: str, text: str) -> List[str]:
    """Find sentences or bullet points containing the skill."""
    norm_skill = normalize(skill)
    contexts = []

    # Split by common delimiters: newline, bullet points, semicolons
    lines = re.split(r'[\n•▪▸►◆●\-–—]|\r\n', text)

    for line in lines:
        line = line.strip()
        if len(line) < 10:
            continue
        if norm_skill in normalize(line):
            contexts.append(line)

    return contexts[:5]  # Cap at 5 contexts
