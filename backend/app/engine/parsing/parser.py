import re
import logging
import os
from typing import Any, List, Dict

logger = logging.getLogger(__name__)


def parse_resume(file_path: str) -> dict:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return _parse_pdf(file_path)
    elif ext == ".docx":
        return _parse_docx(file_path)
    elif ext == ".txt":
        return _parse_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# ─────────────────────────────────────────────────────────────────────────────
# Text Post-processing Utilities
# ─────────────────────────────────────────────────────────────────────────────

def _join_hyphenated_linebreaks(text: str) -> str:
    """
    Join words that were hyphenated across line breaks in PDFs.

    PDFs break long words at line boundaries with a soft hyphen:
      'Velocirap-\\ntor'        →  'Velociraptor'
      'Malware-\\nBazaar'       →  'MalwareBazaar'
      'system admin-\\nistration' →  'system administration'
      'case man-\\nagement'     →  'case management'
      'identifi-\\ncation'      →  'identification'

    We only join when the character immediately before the hyphen is a letter
    and the first character on the next line is also a letter — i.e., it is
    unambiguously a wrapped word, not a real compound hyphen followed by an
    independent sentence.
    """
    # Pattern: letter + hyphen + optional whitespace + newline + optional
    # leading spaces + letter  →  letter + letter (drop the hyphen)
    return re.sub(
        r'([A-Za-z])-[ \t]*\n[ \t]*([A-Za-z])',
        lambda m: m.group(1) + m.group(2),
        text,
    )


def _extract_pdf_links(file_path: str) -> List[Dict]:
    """
    Extract all hyperlinks from a PDF using PyMuPDF annotations.
    Returns a list of dicts: {text, url, page, rect}.
    """
    links: List[Dict] = []
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        for page_num, page in enumerate(doc):
            page_links = page.get_links()
            if not page_links:
                continue
            # Build a word-position index for this page
            words = page.get_text("words")  # (x0,y0,x1,y1,word,block,line,word_idx)
            for link in page_links:
                if link.get("kind") != 2:  # 2 = LINK_URI
                    continue
                uri = link.get("uri", "").strip()
                if not uri or uri.startswith("#"):
                    continue
                rect = link.get("from")  # fitz.Rect
                if rect is None:
                    continue
                # Collect words whose bounding boxes overlap with the link rect
                link_words = []
                for w in words:
                    wx0, wy0, wx1, wy1 = w[0], w[1], w[2], w[3]
                    word_str = w[4]
                    if wx0 < rect.x1 and wx1 > rect.x0 and wy0 < rect.y1 and wy1 > rect.y0:
                        link_words.append(word_str)
                link_text = " ".join(link_words).strip()
                links.append({
                    "text": link_text,
                    "url": uri,
                    "page": page_num + 1,
                    "rect": [rect.x0, rect.y0, rect.x1, rect.y1],
                })
        doc.close()
    except Exception as e:
        logger.warning("PDF link extraction failed: %s", e)
    return links


def _build_link_rect_index(links: List[Dict]) -> Dict[int, List]:
    """Index links by page number for fast lookup."""
    idx: Dict[int, List] = {}
    for lnk in links:
        pg = lnk["page"]
        idx.setdefault(pg, []).append(lnk)
    return idx


def _span_in_link(span_bbox, page_links: List[Dict]) -> str:
    """Return the URL if the span's bounding box overlaps with any link on this page."""
    if not page_links:
        return ""
    sx0, sy0, sx1, sy1 = span_bbox
    for lnk in page_links:
        rx0, ry0, rx1, ry1 = lnk["rect"]
        if sx0 < rx1 and sx1 > rx0 and sy0 < ry1 and sy1 > ry0:
            return lnk["url"]
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# PDF Parser
# ─────────────────────────────────────────────────────────────────────────────

def _parse_pdf(file_path: str) -> dict:
    """Main PDF entry point: builds rich HTML + raw text with all enhancements."""

    # ── Extract links first (we'll use them in both HTML and raw_text) ──────
    links = _extract_pdf_links(file_path)
    link_index = _build_link_rect_index(links)

    rich_text = ""
    try:
        import fitz
        doc = fitz.open(file_path)
        html_parts = []

        # Calculate average font size across the document for heading detection
        sizes = []
        for page in doc:
            for block in page.get_text("dict")["blocks"]:
                if block.get("type") == 0:
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            if span.get("text", "").strip():
                                sizes.append(span.get("size", 12.0))
        avg_size = sum(sizes) / len(sizes) if sizes else 12.0

        for page_num, page in enumerate(doc):
            page_links = link_index.get(page_num + 1, [])

            for block in page.get_text("dict")["blocks"]:
                if block.get("type") != 0:
                    continue

                block_html = []
                is_heading = False

                for line in block.get("lines", []):
                    line_html = []
                    for span in line.get("spans", []):
                        raw_text_span = span.get("text", "")
                        if not raw_text_span.strip():
                            if raw_text_span == " ":
                                line_html.append(" ")
                            continue

                        text = raw_text_span.replace("<", "&lt;").replace(">", "&gt;")

                        # Heading detection by font size
                        if span.get("size", 12.0) > avg_size + 1:
                            is_heading = True

                        # Bold / italic detection
                        flags = span.get("flags", 0)
                        font_name = span.get("font", "").lower()
                        is_bold = bool(flags & 16) or "bold" in font_name
                        is_italic = bool(flags & 2) or "italic" in font_name

                        # Link detection — check if span bbox overlaps with a hyperlink
                        span_bbox = span.get("bbox", (0, 0, 0, 0))
                        link_url = _span_in_link(span_bbox, page_links)

                        if link_url:
                            text = f'<a href="{link_url}" style="color:#6366f1;text-decoration:underline;">{text}</a>'
                        else:
                            if is_bold:
                                text = f"<strong>{text}</strong>"
                            if is_italic:
                                text = f"<em>{text}</em>"

                        line_html.append(text)

                    line_text = "".join(line_html).strip()
                    if line_text:
                        block_html.append(line_text)

                if not block_html:
                    continue

                in_list = False
                prev_was_wrapped_line = False

                for line_text in block_html:
                    clean = re.sub(r'<[^>]+>', '', line_text).strip()
                    is_all_caps_bold = len(clean) < 80 and "<strong>" in line_text and clean.isupper()
                    is_title_like = (
                        len(clean) < 120 and (
                            "\u2014" in clean
                            or " \u2013 " in clean
                            or " — " in clean
                            or " – " in clean
                            or " · " in clean
                            or is_heading
                            or is_all_caps_bold
                        )
                    )

                    if line_text.startswith("&#x2022;") or line_text.startswith("•") or line_text.startswith("- "):
                        if not in_list:
                            html_parts.append("<ul>")
                            in_list = True
                        clean_text = line_text.replace("&#x2022;", "").replace("•", "").lstrip("- ").strip()
                        html_parts.append(f"<li>{clean_text}</li>")
                        prev_was_wrapped_line = False
                    else:
                        if in_list:
                            if is_title_like:
                                html_parts.append("</ul>")
                                in_list = False
                                if is_heading or is_all_caps_bold:
                                    html_parts.append(f"<h2>{line_text}</h2>")
                                else:
                                    html_parts.append(f"<h3>{line_text}</h3>")
                                prev_was_wrapped_line = False
                            else:
                                # Continuation of previous bullet
                                last_li = html_parts.pop()
                                html_parts.append(last_li[:-5] + " " + line_text + "</li>")
                        else:
                            if is_heading or is_all_caps_bold:
                                html_parts.append(f"<h2>{line_text}</h2>")
                                prev_was_wrapped_line = False
                            else:
                                html_parts.append(f"<p>{line_text}</p>")
                                prev_was_wrapped_line = True

                if in_list:
                    html_parts.append("</ul>")

        raw_html = "".join(html_parts).replace("</ul><ul>", "")

        # ── Join hyphenated line-breaks in the HTML text nodes ──────────────
        # We do this on the text portions only (not inside tags)
        rich_text = _join_hyphens_in_html(raw_html)

    except Exception as e:
        logger.warning("PyMuPDF semantic HTML extraction failed: %s", e)

    # ── Raw text extraction (pdfplumber primary, PyMuPDF fallback) ──────────
    try:
        result = _parse_pdf_pdfplumber(file_path, links=links)
    except Exception as e:
        logger.warning("pdfplumber failed (%s), falling back to PyMuPDF", e)
        result = _parse_pdf_pymupdf(file_path, links=links)

    if not rich_text:
        rich_text = f"<p style='white-space: pre-wrap;'>{result['raw_text']}</p>"

    result["rich_text"] = rich_text
    return result


def _join_hyphens_in_html(html: str) -> str:
    """
    Apply hyphenated line-break joining only to text content between HTML tags,
    not to URLs or tag attributes.
    """
    # Split on tags — even indices are text, odd indices are tags
    parts = re.split(r'(<[^>]+>)', html)
    for i in range(0, len(parts), 2):  # only text nodes
        parts[i] = _join_hyphenated_linebreaks(parts[i])
    return "".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# pdfplumber extraction
# ─────────────────────────────────────────────────────────────────────────────

def _parse_pdf_pdfplumber(file_path: str, links: List[Dict] = None) -> dict:
    import pdfplumber

    if links is None:
        links = _extract_pdf_links(file_path)

    pages_data = []
    all_text_parts = []
    char_data = []
    fonts_seen = set()
    has_tables = False
    has_header_footer = False
    has_images = False

    with pdfplumber.open(file_path) as pdf:
        page_count = len(pdf.pages)
        for page_num, page in enumerate(pdf.pages):
            page_height = page.height or 1000

            # Use layout=True for better multi-column handling when available
            try:
                text = page.extract_text(layout=True) or ""
            except TypeError:
                text = page.extract_text() or ""

            all_text_parts.append(text)

            tables = page.extract_tables()
            if tables and len(tables) > 0 and any(t for t in tables):
                has_tables = True

            chars = page.chars
            for ch in chars:
                fn = ch.get("fontname", "")
                fs = ch.get("size", 0)
                if fn:
                    fonts_seen.add((fn, round(fs, 1)))
                top = ch.get("top", 0)
                bottom = ch.get("bottom", 0)
                if top < page_height * 0.08 or bottom > page_height * 0.92:
                    has_header_footer = True
                char_data.append({
                    "x": ch.get("x0", 0),
                    "y": ch.get("top", 0),
                    "fontname": fn,
                    "size": fs,
                    "text": ch.get("text", ""),
                })

            pages_data.append({"page": page_num + 1, "text": text, "char_count": len(chars)})

    raw_text = "\n".join(all_text_parts).strip()

    # ── Critical: join hyphenated line-breaks ────────────────────────────────
    raw_text = _join_hyphenated_linebreaks(raw_text)

    # ── Append extracted link URLs to raw_text ───────────────────────────────
    # This ensures the ATS engine can see the actual URLs (portfolio, github, etc.)
    if links:
        seen_urls: set = set()
        link_lines = []
        for lnk in links:
            url = lnk.get("url", "").strip()
            label = lnk.get("text", "").strip()
            if url and url not in seen_urls:
                seen_urls.add(url)
                link_lines.append(f"{label}: {url}" if label else url)
        if link_lines:
            raw_text += "\n\n[EXTRACTED LINKS]\n" + "\n".join(link_lines)

    fonts_list = [{"fontname": fn, "size": fs} for fn, fs in fonts_seen]

    try:
        import fitz
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            if page.get_images(full=True):
                has_images = True
                break
        doc.close()
    except Exception:
        pass

    return {
        "raw_text": raw_text,
        "pages": pages_data,
        "page_count": page_count,
        "file_type": "pdf",
        "links": links,
        "metadata": {
            "fonts_used": [f["fontname"] for f in fonts_list],
            "font_count": len(fonts_seen),
            "font_details": fonts_list,
            "has_tables": has_tables,
            "has_images": has_images,
            "has_header_footer": has_header_footer,
            "has_special_characters": _has_special_chars(raw_text),
            "char_data": char_data[:500],
            "word_count": len(raw_text.split()),
            "extracted_links": links,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# PyMuPDF fallback extraction
# ─────────────────────────────────────────────────────────────────────────────

def _parse_pdf_pymupdf(file_path: str, links: List[Dict] = None) -> dict:
    import fitz

    if links is None:
        links = _extract_pdf_links(file_path)

    pages_data = []
    all_text_parts = []
    has_images = False

    doc = fitz.open(file_path)
    page_count = len(doc)

    for page_num in range(page_count):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        all_text_parts.append(text)
        pages_data.append({"page": page_num + 1, "text": text, "char_count": len(text)})
        if page.get_images(full=True):
            has_images = True

    doc.close()

    raw_text = "\n".join(all_text_parts).strip()
    raw_text = _join_hyphenated_linebreaks(raw_text)

    if links:
        seen_urls: set = set()
        link_lines = []
        for lnk in links:
            url = lnk.get("url", "").strip()
            label = lnk.get("text", "").strip()
            if url and url not in seen_urls:
                seen_urls.add(url)
                link_lines.append(f"{label}: {url}" if label else url)
        if link_lines:
            raw_text += "\n\n[EXTRACTED LINKS]\n" + "\n".join(link_lines)

    return {
        "raw_text": raw_text,
        "pages": pages_data,
        "page_count": page_count,
        "file_type": "pdf",
        "links": links,
        "metadata": {
            "fonts_used": [],
            "font_count": 0,
            "font_details": [],
            "has_tables": False,
            "has_images": has_images,
            "has_header_footer": False,
            "has_special_characters": _has_special_chars(raw_text),
            "char_data": [],
            "word_count": len(raw_text.split()),
            "extracted_links": links,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# DOCX Parser
# ─────────────────────────────────────────────────────────────────────────────

def _parse_docx(file_path: str) -> dict:
    from docx import Document

    doc = Document(file_path)

    # Extract hyperlinks from docx relationships
    docx_links: List[Dict] = []
    try:
        for rel in doc.part.rels.values():
            if "hyperlink" in rel.reltype:
                url = rel.target_ref
                if url and url.startswith("http"):
                    docx_links.append({"url": url, "text": ""})
    except Exception:
        pass

    paragraphs = []
    for para in doc.paragraphs:
        if para.text.strip():
            paragraphs.append(para.text)

    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    paragraphs.append(cell.text)

    raw_text = "\n".join(paragraphs)

    if docx_links:
        seen_urls: set = set()
        link_lines = []
        for lnk in docx_links:
            url = lnk.get("url", "").strip()
            if url and url not in seen_urls:
                seen_urls.add(url)
                link_lines.append(url)
        if link_lines:
            raw_text += "\n\n[EXTRACTED LINKS]\n" + "\n".join(link_lines)

    styles = set()
    for para in doc.paragraphs:
        if para.style and para.style.name:
            styles.add(para.style.name)

    has_header_footer = False
    try:
        for section in doc.sections:
            header_text = " ".join(p.text for p in section.header.paragraphs).strip()
            footer_text = " ".join(p.text for p in section.footer.paragraphs).strip()
            if header_text or footer_text:
                has_header_footer = True
                break
    except Exception:
        pass

    has_tables = len(doc.tables) > 0
    has_images = len(doc.inline_shapes) > 0

    has_text_boxes = False
    try:
        body_xml = doc.element.body.xml
        has_text_boxes = "txbxContent" in body_xml
    except Exception:
        pass

    # Generate rich HTML
    rich_text_parts = []
    for para in doc.paragraphs:
        if para.text.strip():
            style_name = para.style.name if para.style else ""
            if "Heading 1" in style_name:
                rich_text_parts.append(f"<h2>{para.text}</h2>")
            elif "Heading" in style_name:
                rich_text_parts.append(f"<h3>{para.text}</h3>")
            else:
                html_para = []
                for run in para.runs:
                    run_text = run.text.replace("<", "&lt;").replace(">", "&gt;")
                    if run.bold:
                        run_text = f"<strong>{run_text}</strong>"
                    if run.italic:
                        run_text = f"<em>{run_text}</em>"
                    html_para.append(run_text)
                if para.style.name == 'List Bullet':
                    rich_text_parts.append(f"<ul><li>{''.join(html_para)}</li></ul>")
                else:
                    rich_text_parts.append(f"<p>{''.join(html_para)}</p>")

    for table in doc.tables:
        rich_text_parts.append("<table border='1'>")
        for row in table.rows:
            rich_text_parts.append("<tr>")
            for cell in row.cells:
                if cell.text.strip():
                    rich_text_parts.append(f"<td>{cell.text}</td>")
            rich_text_parts.append("</tr>")
        rich_text_parts.append("</table>")

    return {
        "raw_text": raw_text,
        "rich_text": "".join(rich_text_parts),
        "pages": [{"page": 1, "text": raw_text, "char_count": len(raw_text)}],
        "page_count": 1,
        "file_type": "docx",
        "links": docx_links,
        "metadata": {
            "fonts_used": list(styles),
            "font_count": len(styles),
            "font_details": [{"fontname": s, "size": 0} for s in styles],
            "has_tables": has_tables or has_text_boxes,
            "has_images": has_images,
            "has_header_footer": has_header_footer,
            "has_special_characters": _has_special_chars(raw_text),
            "char_data": [],
            "word_count": len(raw_text.split()),
            "has_text_boxes": has_text_boxes,
            "extracted_links": docx_links,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# TXT Parser
# ─────────────────────────────────────────────────────────────────────────────

def _parse_txt(file_path: str) -> dict:
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        raw_text = f.read()

    # Extract any bare URLs from the text
    url_pattern = re.compile(r'https?://[^\s\)\]\>\"\']+')
    txt_links = [{"url": u, "text": ""} for u in url_pattern.findall(raw_text)]

    rich_text_parts = []
    for line in raw_text.split("\n"):
        if line.strip():
            if line.isupper() and len(line) < 50:
                rich_text_parts.append(f"<h2>{line}</h2>")
            elif line.startswith("- ") or line.startswith("* "):
                rich_text_parts.append(f"<ul><li>{line[2:]}</li></ul>")
            else:
                # Linkify bare URLs
                line_html = url_pattern.sub(
                    lambda m: f'<a href="{m.group()}" style="color:#6366f1;">{m.group()}</a>',
                    line.replace("<", "&lt;").replace(">", "&gt;"),
                )
                rich_text_parts.append(f"<p>{line_html}</p>")

    return {
        "raw_text": raw_text,
        "rich_text": "".join(rich_text_parts),
        "pages": [{"page": 1, "text": raw_text, "char_count": len(raw_text)}],
        "page_count": 1,
        "file_type": "txt",
        "links": txt_links,
        "metadata": {
            "fonts_used": [],
            "font_count": 0,
            "font_details": [],
            "has_tables": False,
            "has_images": False,
            "has_header_footer": False,
            "has_special_characters": _has_special_chars(raw_text),
            "char_data": [],
            "word_count": len(raw_text.split()),
            "extracted_links": txt_links,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────────────

def _has_special_chars(text: str) -> bool:
    for ch in text:
        if ch == '\x00' or (ord(ch) < 32 and ch not in '\n\r\t'):
            return True
    return False
