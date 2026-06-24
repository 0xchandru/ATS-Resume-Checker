import re
import logging
from typing import List, Dict
from sqlalchemy import text
from backend.app.database import engine  # noqa: unchanged — still at backend.app level

logger = logging.getLogger(__name__)


def detect_sections(resume_text: str, metadata: Dict) -> Dict:
    patterns = _load_patterns()
    lines = resume_text.split("\n")
    char_data = metadata.get("char_data", [])

    detected = _detect_by_pattern(lines, patterns)
    detected = _merge_font_detection(detected, lines, char_data)
    detected = _spacy_fallback(detected, lines, resume_text)

    detected_names = {s["name"] for s in detected}
    from backend.app.config import EXPECTED_SECTIONS
    missing = [s for s in EXPECTED_SECTIONS if s not in detected_names]

    _assign_text_to_sections(detected, lines)

    ordering_score, ordering_feedback = _score_ordering(detected, resume_text)
    length_warnings = _check_lengths(detected)

    return {
        "detected": detected,
        "missing": missing,
        "ordering_score": ordering_score,
        "ordering_feedback": ordering_feedback,
        "length_warnings": length_warnings,
    }


def _load_patterns() -> List[Dict]:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT section_name, pattern, confidence FROM kb_section_patterns ORDER BY confidence DESC")).fetchall()
    return [{"section_name": r[0], "pattern": r[1], "confidence": r[2]} for r in rows]


def _detect_by_pattern(lines: List[str], patterns: List[Dict]) -> List[Dict]:
    detected = []
    detected_names = set()

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or len(stripped) > 80:
            continue

        best_match = None
        best_confidence = 0.0

        for pat in patterns:
            try:
                if re.match(pat["pattern"], stripped):
                    if pat["confidence"] > best_confidence:
                        best_match = pat
                        best_confidence = pat["confidence"]
            except re.error:
                continue

        if best_match and best_match["section_name"] not in detected_names:
            detected_names.add(best_match["section_name"])
            detected.append({
                "name": best_match["section_name"],
                "position": i,
                "word_count": 0,
                "confidence": best_confidence,
                "method": "pattern",
                "header_line": stripped,
                "text": "",
            })

    return detected


def _merge_font_detection(detected: List[Dict], lines: List[str], char_data: List[Dict]) -> List[Dict]:
    if not char_data:
        return detected

    try:
        y_to_fontsize = {}
        for ch in char_data:
            y = round(ch.get("y", 0))
            size = ch.get("size", 0)
            if y not in y_to_fontsize or size > y_to_fontsize[y]:
                y_to_fontsize[y] = size

        if not y_to_fontsize:
            return detected

        avg_size = sum(y_to_fontsize.values()) / len(y_to_fontsize)
        header_lines = {y for y, size in y_to_fontsize.items() if size >= avg_size + 2}

        detected_positions = {d["position"] for d in detected}
        detected_names = {d["name"] for d in detected}
        patterns = _load_patterns()

        for i, line in enumerate(lines):
            if i in detected_positions:
                continue
            stripped = line.strip()
            if not stripped or len(stripped) > 60:
                continue
            for pat in patterns:
                if pat["section_name"] in detected_names:
                    continue
                try:
                    if re.match(pat["pattern"], stripped):
                        detected.append({
                            "name": pat["section_name"],
                            "position": i,
                            "word_count": 0,
                            "confidence": pat["confidence"] * 0.9,
                            "method": "font",
                            "header_line": stripped,
                            "text": "",
                        })
                        detected_names.add(pat["section_name"])
                        break
                except re.error:
                    continue
    except Exception as e:
        logger.debug("Font detection failed: %s", e)

    return detected


def _spacy_fallback(detected: List[Dict], lines: List[str], resume_text: str) -> List[Dict]:
    detected_names = {d["name"] for d in detected}
    missing_from_config = []
    from backend.app.config import EXPECTED_SECTIONS
    for s in EXPECTED_SECTIONS:
        if s not in detected_names:
            missing_from_config.append(s)

    if not missing_from_config:
        return detected

    section_keywords = {
        "summary": [
            "summary", "profile", "objective", "about", "overview",
            "professional summary", "career summary", "executive summary",
            "personal statement", "professional profile", "career objective",
            "about me", "professional overview",
        ],
        "experience": [
            "experience", "employment", "work history", "career",
            "professional experience", "work experience", "professional background",
            "employment history", "job history", "career history",
            "relevant experience", "industry experience",
        ],
        "education": [
            "education", "academic", "degree", "qualifications",
            "academic background", "educational background", "academic history",
            "academic qualifications", "educational qualifications",
        ],
        "skills": [
            "skills", "competencies", "technologies", "expertise",
            "technical skills", "core skills", "key skills", "skill set",
            "proficiencies", "technical expertise", "technical proficiencies",
            "core competencies", "areas of expertise", "strengths",
            "tools", "software", "platforms",
        ],
        "projects": [
            "projects", "portfolio", "personal projects", "key projects",
            "notable projects", "project experience", "project highlights",
            "selected projects", "open source", "side projects",
        ],
        "certifications": [
            "certifications", "certificates", "credentials",
            "certification", "professional certifications",
            "licenses", "professional development", "accreditations",
            "training", "courses", "professional licenses",
        ],
        "contact_info": [
            "contact", "email", "phone", "linkedin",
            "personal information", "contact information",
            "contact details", "get in touch",
        ],
        "achievements": [
            "achievements", "awards", "honors", "accomplishments",
            "recognition", "accolades", "awards and honors",
            "honors and awards",
        ],
        "publications": [
            "publications", "papers", "research", "articles",
            "journal articles", "conference papers", "research papers",
            "white papers",
        ],
        "volunteer": [
            "volunteer", "volunteering", "community service",
            "social activities", "community involvement",
            "extracurricular", "community engagement",
        ],
        "languages": [
            "languages", "language skills", "spoken languages",
            "language proficiency", "foreign languages",
        ],
        "interests": [
            "interests", "hobbies", "activities",
            "personal interests", "hobbies and interests",
        ],
        "references": [
            "references", "referees", "references available",
        ],
    }

    detected_positions = {d["position"] for d in detected}

    text_lower = resume_text.lower()
    for section in missing_from_config:
        kws = section_keywords.get(section, [section])

        best_match: dict | None = None  # (position, line, keyword_len) of best candidate

        for kw in kws:
            # Skip this keyword if it doesn't appear anywhere in the resume
            if kw not in text_lower:
                continue

            for i, line in enumerate(lines):
                stripped = line.strip()
                # Header lines are short and the keyword dominates the line
                if kw not in stripped.lower():
                    continue
                if len(stripped) >= 80:
                    continue

                if i in detected_positions:
                    # Only allow overriding with "experience" when there is a
                    # genuine heading collision
                    if section == "experience":
                        for d in detected:
                            if d["position"] == i and d["name"] != "experience":
                                d["name"] = "experience"
                                d["method"] = "spacy_heuristic_override"
                    # Either way, stop scanning for this keyword
                    continue

                # Prefer the candidate whose keyword is the *longest* match
                # (more specific keywords like "professional experience" win
                # over generic ones like "experience"), and among equal length
                # prefer the earliest position so we don't grab mid-body
                # occurrences of the word.
                if best_match is None or kw > best_match["keyword"]:
                    best_match = {"position": i, "line": stripped, "keyword": kw}
                elif kw == best_match["keyword"] and i < best_match["position"]:
                    best_match = {"position": i, "line": stripped, "keyword": kw}

        if best_match is not None and best_match["position"] not in detected_positions:
            detected.append({
                "name": section,
                "position": best_match["position"],
                "word_count": 0,
                "confidence": 0.7,
                "method": "spacy_heuristic",
                "header_line": best_match["line"],
                "text": "",
            })
            detected_positions.add(best_match["position"])

    return detected


def _assign_text_to_sections(detected: List[Dict], lines: List[str]):
    sorted_sections = sorted(detected, key=lambda s: s["position"])
    for idx, section in enumerate(sorted_sections):
        start = section["position"] + 1
        end = sorted_sections[idx + 1]["position"] if idx + 1 < len(sorted_sections) else len(lines)
        section_lines = lines[start:end]
        # Deduplicate lines while preserving order — exact duplicate lines
        # (e.g. repeated header rows in multi-column PDFs) inflate word counts
        # and confuse downstream scorers.
        seen_lines: set = set()
        deduped: list = []
        for ln in section_lines:
            stripped = ln.strip()
            if stripped and stripped not in seen_lines:
                seen_lines.add(stripped)
                deduped.append(stripped)
        text_content = "\n".join(deduped)
        section["text"] = text_content
        section["word_count"] = len(text_content.split())


def _score_ordering(detected: List[Dict], resume_text: str) -> tuple:
    from backend.app.config import EXPECTED_SECTIONS
    ideal_order = EXPECTED_SECTIONS

    sorted_sections = sorted(detected, key=lambda s: s["position"])
    detected_order = [s["name"] for s in sorted_sections]

    if not detected_order:
        return 50, "No sections detected"

    exp_years = _estimate_experience_years(resume_text)
    if exp_years < 2:
        ideal_order = ["contact_info", "summary", "education", "experience", "skills", "projects", "certifications"]

    score = 0
    total = 0
    for expected, actual in zip(ideal_order, detected_order):
        total += 1
        if expected == actual:
            score += 1

    ordering_score = int((score / max(total, 1)) * 100)

    feedback_parts = []
    detected_set = set(detected_order)
    if "experience" in detected_set and "education" in detected_set:
        exp_pos = detected_order.index("experience") if "experience" in detected_order else 999
        edu_pos = detected_order.index("education") if "education" in detected_order else 999
        if exp_years >= 2 and exp_pos < edu_pos:
            feedback_parts.append("Experience before Education — correct ordering for experienced candidates.")
        elif exp_years < 2 and edu_pos < exp_pos:
            feedback_parts.append("Education before Experience — acceptable for entry-level candidates.")

    if "summary" not in detected_set:
        feedback_parts.append("Missing Summary reduces ATS context and recruiter first impression.")

    return ordering_score, " ".join(feedback_parts) or "Section ordering looks good."


def _estimate_experience_years(text: str) -> int:
    """
    Estimate total years of experience from year spans in the text.

    Fixes:
    - Capture the full 4-digit year (previous regex captured only the 2-digit
      prefix "19"/"20" via the capturing group, so int() was always 19 or 20
      and max-min was 0 or 1 — meaningless).
    - Clamp the result to a plausible career span (0–50 years).
    """
    year_matches = re.findall(r"\b((?:19|20)\d{2})\b", text)
    if len(year_matches) >= 2:
        years = [int(y) for y in year_matches]
        span = max(years) - min(years)
        return min(span, 50)
    return 0


def _check_lengths(detected: List[Dict]) -> List[str]:
    warnings = []
    for section in detected:
        wc = section.get("word_count", 0)
        name = section["name"]
        if wc < 30 and name in ("experience", "skills", "summary"):
            warnings.append(f"{name.title()} section ({wc} words) is sparse. Add more detail.")
        elif wc > 600:
            warnings.append(f"{name.title()} section ({wc} words) may be too long. Consider trimming.")
    return warnings
