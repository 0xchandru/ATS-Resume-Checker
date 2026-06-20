import re
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


def check_formatting(file_path: str, metadata: Dict) -> Dict:
    file_type = metadata.get("file_type") or ("pdf" if file_path.endswith(".pdf") else "docx")
    issues = []

    if file_type == "pdf":
        issues = _check_pdf(metadata)
    else:
        issues = _check_docx(metadata)

    return {
        "issues": issues,
        "page_count": metadata.get("page_count", 1),
        "word_count": metadata.get("word_count", 0),
        "font_count": metadata.get("font_count", 0),
        "fonts_used": metadata.get("fonts_used", []),
        "has_tables": metadata.get("has_tables", False),
        "has_images": metadata.get("has_images", False),
        "has_columns": _detect_columns(metadata),
        "has_header_footer": metadata.get("has_header_footer", False),
        "has_special_characters": metadata.get("has_special_characters", False),
        "file_type": file_type,
    }


def _check_pdf(metadata: Dict) -> List[Dict]:
    issues = []

    font_count = metadata.get("font_count", 0)
    if font_count > 3:
        issues.append({
            "type": "multiple_fonts",
            "severity": "warning",
            "message": f"{font_count} fonts detected. Reduce to 1–2 for ATS compatibility.",
        })
    else:
        issues.append({
            "type": "font_count",
            "severity": "pass",
            "message": f"{font_count} font(s) detected. Good.",
        })

    has_columns = _detect_columns(metadata)
    if has_columns:
        issues.append({
            "type": "multi_column_layout",
            "severity": "critical",
            "message": "Multi-column layout detected. ATS cannot reliably parse columnar resumes. Switch to single-column.",
        })
    else:
        issues.append({
            "type": "single_column",
            "severity": "pass",
            "message": "Single-column layout confirmed. Optimal for ATS.",
        })

    if metadata.get("has_tables"):
        issues.append({
            "type": "tables_detected",
            "severity": "critical",
            "message": "Tables detected. ATS cannot parse table content. Replace with plain text or bullet points.",
        })
    else:
        issues.append({
            "type": "no_tables",
            "severity": "pass",
            "message": "No tables detected. ATS can parse all content.",
        })

    if metadata.get("has_images"):
        issues.append({
            "type": "images_detected",
            "severity": "warning",
            "message": "Embedded images found. Remove profile photos and logos for better ATS compatibility.",
        })
    else:
        issues.append({
            "type": "no_images",
            "severity": "pass",
            "message": "No embedded images found.",
        })

    if metadata.get("has_header_footer"):
        issues.append({
            "type": "header_footer_content",
            "severity": "info",
            "message": "Content in document header/footer. Some ATS skip header/footer. Duplicate important info in the body.",
        })

    if metadata.get("has_special_characters"):
        issues.append({
            "type": "special_characters",
            "severity": "warning",
            "message": "Non-ASCII characters detected. Replace with standard ASCII equivalents for maximum ATS compatibility.",
        })

    return issues


def _check_docx(metadata: Dict) -> List[Dict]:
    issues = []

    if metadata.get("has_tables") or metadata.get("has_text_boxes"):
        issues.append({
            "type": "tables_or_textboxes",
            "severity": "critical",
            "message": "Tables or text boxes detected. These block ATS parsing. Use plain paragraphs instead.",
        })
    else:
        issues.append({
            "type": "no_tables",
            "severity": "pass",
            "message": "No tables or text boxes detected.",
        })

    if metadata.get("has_header_footer"):
        issues.append({
            "type": "header_footer_content",
            "severity": "info",
            "message": "Content found in header/footer. Consider moving contact info into the document body.",
        })

    if metadata.get("has_images"):
        issues.append({
            "type": "images_detected",
            "severity": "warning",
            "message": "Images detected in document. Remove for better ATS compatibility.",
        })
    else:
        issues.append({
            "type": "no_images",
            "severity": "pass",
            "message": "No images detected.",
        })

    font_count = metadata.get("font_count", 0)
    if font_count > 5:
        issues.append({
            "type": "multiple_styles",
            "severity": "warning",
            "message": f"{font_count} paragraph styles used. Simplify for consistency.",
        })

    if metadata.get("has_special_characters"):
        issues.append({
            "type": "special_characters",
            "severity": "warning",
            "message": "Non-standard characters detected. Use standard ASCII where possible.",
        })

    return issues


def _detect_columns(metadata: Dict) -> bool:
    char_data = metadata.get("char_data", [])
    if not char_data:
        return False

    try:
        x_positions = [c["x"] for c in char_data if isinstance(c.get("x"), (int, float))]
        if len(x_positions) < 20:
            return False

        max_x = max(x_positions)
        min_x = min(x_positions)
        if max_x - min_x < 100:
            return False

        mid = (max_x + min_x) / 2
        left_zone = [x for x in x_positions if x < mid * 0.6]
        right_zone = [x for x in x_positions if x > mid * 1.4]

        left_density = len(left_zone) / max(len(x_positions), 1)
        right_density = len(right_zone) / max(len(x_positions), 1)

        return left_density > 0.15 and right_density > 0.15
    except Exception:
        return False
