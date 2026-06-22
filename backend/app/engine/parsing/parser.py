import logging
import os
from typing import Any

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


def _parse_pdf(file_path: str) -> dict:
    rich_text = ""
    try:
        import fitz
        doc = fitz.open(file_path)
        html_parts = []
        
        # Calculate average font size to detect headings
        sizes = []
        for page in doc:
            for block in page.get_text("dict")["blocks"]:
                if block.get("type") == 0:  # text block
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            if span.get("text", "").strip():
                                sizes.append(span.get("size", 12.0))
                                
        avg_size = sum(sizes) / len(sizes) if sizes else 12.0
        
        for page in doc:
            for block in page.get_text("dict")["blocks"]:
                if block.get("type") != 0:
                    continue
                    
                block_html = []
                is_heading = False
                
                for line in block.get("lines", []):
                    line_html = []
                    for span in line.get("spans", []):
                        text = span.get("text", "").replace("<", "&lt;").replace(">", "&gt;")
                        if not text.strip():
                            if text == " ":
                                line_html.append(" ")
                            continue
                            
                        # Detect heading
                        if span.get("size", 12.0) > avg_size + 1:
                            is_heading = True
                            
                        # Detect bold/italic
                        flags = span.get("flags", 0)
                        font_name = span.get("font", "").lower()
                        is_bold = bool(flags & 16) or "bold" in font_name
                        is_italic = bool(flags & 2) or "italic" in font_name
                        
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
                for line_text in block_html:
                    clean_no_tags = line_text.replace("<strong>", "").replace("</strong>", "").replace("<em>", "").replace("</em>", "").strip()
                    is_all_caps_bold = len(clean_no_tags) < 80 and "<strong>" in line_text and clean_no_tags.isupper()

                    # A line is "title-like" when it looks like a project/section header:
                    # • contains an em-dash separator (e.g. "SecOps Console — SOC Analyst Dashboard")
                    # • contains a tech-stack separator " · "
                    # • is itself flagged as a heading by font size
                    # • is a short all-caps bold phrase
                    is_title_like = (
                        len(clean_no_tags) < 120 and (
                            "\u2014" in clean_no_tags   # em-dash  —
                            or " \u2013 " in clean_no_tags  # en-dash  –
                            or " — " in clean_no_tags
                            or " – " in clean_no_tags
                            or " · " in clean_no_tags
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
                    else:
                        if in_list:
                            if is_title_like:
                                # Close the current list — this line starts a new project/section
                                html_parts.append("</ul>")
                                in_list = False
                                if is_heading or is_all_caps_bold:
                                    html_parts.append(f"<h2>{line_text}</h2>")
                                else:
                                    html_parts.append(f"<h3>{line_text}</h3>")
                            else:
                                # Genuine continuation of the previous bullet point
                                last_li = html_parts.pop()
                                html_parts.append(last_li[:-5] + " " + line_text + "</li>")
                        else:
                            if is_heading or is_all_caps_bold:
                                html_parts.append(f"<h2>{line_text}</h2>")
                            else:
                                html_parts.append(f"<p>{line_text}</p>")
                if in_list:
                    html_parts.append("</ul>")
                    
        rich_text = "".join(html_parts).replace("</ul><ul>", "")
    except Exception as e:
        logger.warning(f"PyMuPDF semantic HTML extraction failed: {e}")

    try:
        import pdfplumber
        result = _parse_pdf_pdfplumber(file_path)
    except Exception as e:
        logger.warning("pdfplumber failed (%s), falling back to PyMuPDF", e)
        result = _parse_pdf_pymupdf(file_path)

    if not rich_text:
        rich_text = f"<p style='white-space: pre-wrap;'>{result['raw_text']}</p>"

    result["rich_text"] = rich_text
    return result


def _parse_pdf_pdfplumber(file_path: str) -> dict:
    import pdfplumber

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
                char_data.append({"x": ch.get("x0", 0), "y": ch.get("top", 0), "fontname": fn, "size": fs, "text": ch.get("text", "")})

            pages_data.append({"page": page_num + 1, "text": text, "char_count": len(chars)})

    raw_text = "\n".join(all_text_parts).strip()
    fonts_list = [{"fontname": fn, "size": fs} for fn, fs in fonts_seen]

    try:
        import fitz
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            imgs = page.get_images(full=True)  # type: ignore
            if imgs:
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
        "metadata": {
            "fonts_used": [f"{f['fontname']}" for f in fonts_list],
            "font_count": len(fonts_seen),
            "font_details": fonts_list,
            "has_tables": has_tables,
            "has_images": has_images,
            "has_header_footer": has_header_footer,
            "has_special_characters": _has_special_chars(raw_text),
            "char_data": char_data[:500],
            "word_count": len(raw_text.split()),
        },
    }


def _parse_pdf_pymupdf(file_path: str) -> dict:
    import fitz

    pages_data = []
    all_text_parts = []
    has_images = False

    doc = fitz.open(file_path)
    page_count = len(doc)

    for page_num in range(page_count):
        page = doc.load_page(page_num)
        text = page.get_text("text")  # type: ignore
        all_text_parts.append(text)
        pages_data.append({"page": page_num + 1, "text": text, "char_count": len(text)})
        if page.get_images(full=True):  # type: ignore
            has_images = True

    doc.close()
    raw_text = "\n".join(all_text_parts).strip()

    return {
        "raw_text": raw_text,
        "pages": pages_data,
        "page_count": page_count,
        "file_type": "pdf",
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
        },
    }


def _parse_docx(file_path: str) -> dict:
    from docx import Document
    import lxml.etree as etree

    doc = Document(file_path)
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

    # Generate basic rich text HTML
    rich_text_parts = []
    for para in doc.paragraphs:
        if para.text.strip():
            # Check if heading
            style_name = para.style.name if para.style else ""
            if "Heading 1" in style_name:
                rich_text_parts.append(f"<h2>{para.text}</h2>")
            elif "Heading" in style_name:
                rich_text_parts.append(f"<h3>{para.text}</h3>")
            else:
                # Process runs for bold/italic
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
        },
    }


def _parse_txt(file_path: str) -> dict:
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        raw_text = f.read()
    
    # Generate basic rich text HTML
    rich_text_parts = []
    for line in raw_text.split("\n"):
        if line.strip():
            # Very basic markdown-like heading detection for txt files
            if line.isupper() and len(line) < 50:
                rich_text_parts.append(f"<h2>{line}</h2>")
            elif line.startswith("- ") or line.startswith("* "):
                rich_text_parts.append(f"<ul><li>{line[2:]}</li></ul>")
            else:
                rich_text_parts.append(f"<p>{line}</p>")
    
    return {
        "raw_text": raw_text,
        "rich_text": "".join(rich_text_parts),
        "pages": [{"page": 1, "text": raw_text, "char_count": len(raw_text)}],
        "page_count": 1,
        "file_type": "txt",
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
        },
    }


def _has_special_chars(text: str) -> bool:
    # Only flag severe PDF extraction failures, not standard typographic symbols like bullets/dashes
    for ch in text:
        if ch == '' or (ord(ch) < 32 and ch not in '\n\r\t'):
            return True
    return False
