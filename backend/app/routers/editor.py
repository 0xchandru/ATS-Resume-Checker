import re
import logging
from html import unescape
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from backend.app.ai_client import get_ai_client, ai_model

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Bullet optimisation ──────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    bullet_text: str
    missing_skill: str
    jd_context: Optional[str] = ""


@router.post("/optimize_bullet")
async def optimize_bullet(req: OptimizeRequest):
    if not req.bullet_text or not req.missing_skill:
        raise HTTPException(status_code=400, detail="bullet_text and missing_skill are required")

    try:
        client = get_ai_client()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    model = ai_model()

    system_prompt = (
        "You are an expert ATS resume writer. Rewrite the given resume bullet point to naturally "
        "incorporate the missing skill while keeping the original impact and metrics intact. "
        "Keep it professional, concise, and action-oriented. "
        "Return ONLY the rewritten bullet point text — no quotes, no intro, no explanation."
    )

    user_prompt = (
        f"Original Bullet Point: {req.bullet_text}\n"
        f"Missing Skill to Incorporate: {req.missing_skill}\n"
        f"Job Description Context: {req.jd_context}\n\n"
        "Rewrite the bullet point to naturally include the missing skill."
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=200,
        )
        rewritten = (response.choices[0].message.content or "").strip()
        return {"rewritten_bullet": rewritten}
    except Exception as e:
        logger.error("AI bullet optimisation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ─── PDF Export ───────────────────────────────────────────────────────────────

class ExportPdfRequest(BaseModel):
    resume_html: str
    filename: Optional[str] = "resume"


def _html_to_pdf_lines(html: str) -> list:
    """Parse resume HTML into a list of (tag_type, text) tuples for PDF layout."""
    # Tag each block element with a sentinel so we can distinguish headings
    text = re.sub(r"<h1[^>]*>(.*?)</h1>", r"\n[H1]\1[/H1]\n", html, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<h2[^>]*>(.*?)</h2>", r"\n[H2]\1[/H2]\n", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<h3[^>]*>(.*?)</h3>", r"\n[H3]\1[/H3]\n", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<li[^>]*>(.*?)</li>", r"\n[LI]\1[/LI]\n", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<p[^>]*>(.*?)</p>", r"\n[P]\1[/P]\n", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"[ \t]+", " ", text)

    lines: list = []
    for raw in text.split("\n"):
        raw = raw.strip()
        if not raw:
            continue
        for tag, label in (("[H1]", "h1"), ("[H2]", "h2"), ("[H3]", "h3"), ("[LI]", "bullet"), ("[P]", "p")):
            end = tag.replace("[", "[/")
            if raw.startswith(tag):
                content = raw[len(tag):]
                if end in content:
                    content = content[: content.index(end)]
                content = content.strip()
                if content:
                    lines.append((label, content))
                break
        else:
            lines.append(("p", raw))

    return lines


def _safe_text(text: str) -> str:
    """Encode to latin-1 substituting characters fpdf2 can't handle."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _generate_pdf_bytes(resume_html: str) -> bytes:
    """Produce an ATS-friendly single-column PDF from resume HTML via fpdf2."""
    try:
        from fpdf import FPDF
    except ImportError:
        raise RuntimeError("fpdf2 is not installed. Run: uv add fpdf2")

    class _ResumePDF(FPDF):
        def header(self): pass  # No running header
        def footer(self): pass  # No page number footer

    pdf = _ResumePDF(orientation="P", unit="mm", format="A4")
    pdf.set_margins(left=20, top=20, right=20)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    lines = _html_to_pdf_lines(resume_html)

    for typ, text in lines:
        safe = _safe_text(text)
        if not safe.strip():
            continue

        if typ == "h1":
            pdf.set_font("Helvetica", "B", 15)
            pdf.set_text_color(20, 20, 20)
            pdf.multi_cell(0, 8, safe, align="L")
            pdf.ln(1)

        elif typ == "h2":
            pdf.ln(3)
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(40, 40, 40)
            pdf.multi_cell(0, 7, safe.upper(), align="L")
            # Thin rule under each section heading (ATS parsers ignore this)
            y = pdf.get_y()
            pdf.set_draw_color(180, 180, 180)
            pdf.line(20, y, 190, y)
            pdf.ln(2)

        elif typ == "h3":
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(40, 40, 40)
            pdf.multi_cell(0, 6, safe, align="L")

        elif typ == "bullet":
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(50, 50, 50)
            # Indent + bullet symbol
            pdf.set_x(25)
            pdf.multi_cell(165, 5.5, "\x95 " + safe, align="L")

        else:  # p / generic text
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(0, 5.5, safe, align="L")
            pdf.ln(1)

    return bytes(pdf.output())


@router.post("/export_pdf")
async def export_resume_pdf(req: ExportPdfRequest):
    """Generate an ATS-friendly single-column PDF from the Smart Editor resume HTML."""
    if not req.resume_html or not req.resume_html.strip():
        raise HTTPException(status_code=400, detail="resume_html is required")

    try:
        pdf_bytes = _generate_pdf_bytes(req.resume_html)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("PDF generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.filename or "resume")
    download_name = f"{safe_name}_ats.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )
