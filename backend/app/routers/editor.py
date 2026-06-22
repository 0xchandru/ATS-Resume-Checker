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


# ─── AI Bullet Optimization ───────────────────────────────────────────────────

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


# ─── AI Resume Clean (remove AI clichés) ─────────────────────────────────────

# Overused "AI-ism" phrases to strip/replace — inspired by Resume-Matcher
_AI_PHRASE_MAP = {
    r"\bspearheaded\b": "led",
    r"\borchestrated\b": "coordinated",
    r"\bsynergistic(?:ally)?\b": "collaborative",
    r"\bleveraged\b": "used",
    r"\butilized\b": "used",
    r"\brobust\b": "strong",
    r"\bseamless(?:ly)?\b": "smooth",
    r"\bcutting[- ]edge\b": "modern",
    r"\binnovative\b": "new",
    r"\bdynamic\b": "",
    r"\bpassionate(?:ly)?\b": "committed",
    r"\bvisionari(?:ly|es)?\b": "",
    r"\bthought leader(?:ship)?\b": "domain expertise",
    r"\bsynergi(?:ze|zing|es|ed)\b": "collaborate",
    r"\bempower(?:ing|ed|s)?\b": "enable",
    r"\bproactively?\b": "",
    r"\bholistic(?:ally)?\b": "comprehensive",
    r"\bparadigm shift\b": "major change",
    r"\bgame[- ]changer\b": "impactful improvement",
    r"\bworld[- ]class\b": "high[- ]quality",
    r"\bsolution[- ]oriented\b": "problem-solving",
    r"\bversatile\b": "",
    r"\bdetail[- ]oriented\b": "thorough",
    r"\bteam player\b": "collaborative",
    r"\bself[- ]starter\b": "",
    r"\bfast[- ]paced(?: environment)?\b": "",
    r"\bgo[- ]getter\b": "",
    r"\bthink outside the box\b": "innovative thinking",
    r"\bvalue[- ]add(?:ed)?\b": "impact",
    r"\bwin[- ]win\b": "mutually beneficial",
    r"\bdeliverable[- ]driven\b": "",
    r"\bstrategic(?:ally)?\b": "",
    r"\bsuperior communication skills\b": "strong communication",
    r"\bexcellent communication skills\b": "strong communication",
    r"\bproven track record\b": "demonstrated record",
    r"\bstakeholder(?:s)?\b": "stakeholder",
    r"\bmission[- ]critical\b": "critical",
    r"\bbest[- ]in[- ]class\b": "top-tier",
    r"\bpivot(?:ing|ed)?\b": "shift",
    r"\bscal(?:able|ability|ing)\b": "scalable",
    r"\boutside the box\b": "",
}


class CleanResumeRequest(BaseModel):
    resume_text: str
    use_ai: Optional[bool] = False
    jd_text: Optional[str] = ""


@router.post("/clean_resume")
async def clean_resume(req: CleanResumeRequest):
    """
    Remove AI clichés and overused phrases from a resume.
    1. Applies regex replacements for known AI-ism phrases (fast, always runs).
    2. Optionally sends the result through the LLM for a deeper polish pass.
    """
    text = req.resume_text
    changes: list = []

    for pattern, replacement in _AI_PHRASE_MAP.items():
        new_text, n = re.subn(pattern, replacement, text, flags=re.IGNORECASE)
        if n > 0:
            phrase = re.sub(r"\\b|\\(?!\w)", "", pattern).strip(r"()[]?+*")
            changes.append({"phrase": phrase, "replacement": replacement or "(removed)", "count": n})
            text = new_text

    # Collapse double spaces left by empty replacements
    text = re.sub(r"  +", " ", text)
    text = re.sub(r" +\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    if req.use_ai and req.jd_text:
        try:
            client = get_ai_client()
            model = ai_model()
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert resume editor. The user has a resume that needs "
                            "cleaning. Remove any remaining vague corporate jargon, clichés, or "
                            "filler words. Make every sentence concrete, measurable, and action-driven. "
                            "Do NOT add new skills or experiences. "
                            "Return ONLY the cleaned resume text — no commentary, no markdown, no intro."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Job Description Context:\n{req.jd_text[:800]}\n\n"
                            f"Resume to clean:\n{text}"
                        ),
                    },
                ],
                temperature=0.4,
                max_tokens=3000,
            )
            text = (response.choices[0].message.content or "").strip() or text
        except Exception as e:
            logger.warning("AI clean pass failed (using regex-only result): %s", e)

    return {"cleaned_text": text, "changes": changes, "change_count": len(changes)}


# ─── AI Resume Optimize (inject missing skills) ───────────────────────────────

class OptimizeResumeRequest(BaseModel):
    resume_text: str
    jd_text: str
    missing_skills: Optional[list] = []
    tone: Optional[str] = "professional"


@router.post("/optimize_resume")
async def optimize_resume(req: OptimizeResumeRequest):
    """
    Rewrite the full resume to better match the job description,
    naturally incorporating the top missing skills where supported by existing experience.
    """
    if not req.resume_text or not req.jd_text:
        raise HTTPException(status_code=400, detail="resume_text and jd_text are required")

    try:
        client = get_ai_client()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    model = ai_model()

    skills_list = ""
    if req.missing_skills:
        top = req.missing_skills[:12]
        skills_list = "\n".join(f"- {s}" for s in top)

    system_prompt = (
        "You are a world-class ATS resume optimizer. Rewrite the candidate's resume to:\n"
        "1. Naturally incorporate missing skills WHERE the candidate's existing experience supports it.\n"
        "2. Strengthen weak or vague bullets with stronger action verbs and metrics where possible.\n"
        "3. Remove hollow corporate buzzwords (synergize, leverage, spearhead, etc.).\n"
        "4. Keep ALL sections present in the original (contact, summary, experience, skills, etc.).\n"
        "5. Do NOT invent experience, certifications, or numbers the candidate doesn't have.\n"
        "6. Use plain text formatting: no markdown headers, no asterisks, just clean readable text.\n"
        "7. Maintain the original structure and chronology.\n"
        f"Tone: {req.tone}.\n"
        "Return ONLY the complete rewritten resume text — no commentary, no explanation."
    )

    user_prompt = (
        f"Job Description:\n{req.jd_text[:1200]}\n\n"
        f"Missing Skills to Weave In (only where experience supports):\n{skills_list}\n\n"
        f"Original Resume:\n{req.resume_text[:3000]}"
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.6,
            max_tokens=3500,
        )
        rewritten = (response.choices[0].message.content or "").strip()
        if not rewritten:
            raise HTTPException(status_code=500, detail="AI returned empty response")
        return {"optimized_text": rewritten}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("AI resume optimisation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ─── PDF Export ───────────────────────────────────────────────────────────────

class ExportPdfRequest(BaseModel):
    resume_html: str
    filename: Optional[str] = "resume"


def _html_to_pdf_lines(html: str) -> list:
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
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _generate_pdf_bytes(resume_html: str) -> bytes:
    try:
        from fpdf import FPDF
    except ImportError:
        raise RuntimeError("fpdf2 is not installed. Run: uv add fpdf2")

    class _ResumePDF(FPDF):
        def header(self): pass
        def footer(self): pass

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
            pdf.set_x(25)
            pdf.multi_cell(165, 5.5, "\x95 " + safe, align="L")

        else:
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(0, 5.5, safe, align="L")
            pdf.ln(1)

    return bytes(pdf.output())


@router.post("/export_pdf")
async def export_resume_pdf(req: ExportPdfRequest):
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
