import logging
from backend.app.ai_client import get_ai_client, ai_model

logger = logging.getLogger(__name__)


def format_text_with_llm(raw_text: str, doc_type: str = "resume") -> str:
    """
    Uses an LLM to take messy raw OCR/pasted text and structure it into clean HTML.
    Preserves exact phrasing, fixes line breaks, and adds semantic tags (h1, h2, ul, li).
    """
    try:
        client = get_ai_client()
    except RuntimeError:
        logger.warning("NVIDIA_API_KEY not configured — returning plain-text fallback.")
        return f"<p style='white-space:pre-wrap'>{raw_text}</p>"

    model = ai_model()

    if doc_type == "resume":
        system_prompt = (
            "You are an expert ATS parser and rich-text resume editor engine. You will receive messy "
            "OCR text from a resume PDF. Output beautifully structured rich-text HTML.\n"
            "CRITICAL RULES:\n"
            "1. ONLY output the HTML. Do not wrap in ```html or any other markdown.\n"
            "2. Use <h2> for main sections (PROFESSIONAL SUMMARY, TECHNICAL SKILLS, EDUCATION, EXPERIENCE), "
            "<h3> for job roles or project titles.\n"
            "3. Use <strong> for job titles, company names. Use <em> for dates, locations.\n"
            "4. NEVER flatten the resume into a single paragraph. Use <p> for paragraphs and <ul>/<li> "
            "for bullet points.\n"
            "5. Fix OCR artifacts: restore spaces, merge split tokens, remove broken hyphenation.\n"
            "6. Do not invent or hallucinate text — only clean and format what is given."
        )
    else:
        system_prompt = (
            "You are an expert HR parser and rich-text editor engine. You will receive pasted Job "
            "Description text. Output highly readable HTML.\n"
            "CRITICAL RULES:\n"
            "1. ONLY output the HTML. Do not wrap in ```html or any other markdown.\n"
            "2. Use <h2> for primary sections (Requirements, Responsibilities), <h3> for sub-sections.\n"
            "3. Use <strong> for important keywords and requirements. Use <em> for contextual subtext.\n"
            "4. NEVER flatten into a single paragraph. Use <p> and <ul>/<li> for lists.\n"
            "5. Do not invent or hallucinate text — only structure what is given."
        )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Format this {doc_type}:\n\n{raw_text[:12000]}"},
            ],
            temperature=0.0,
            max_tokens=4000,
        )
        content = response.choices[0].message.content
        if content:
            return (
                content.strip()
                .removeprefix("```html")
                .removeprefix("```")
                .removesuffix("```")
                .strip()
            )
        return f"<p style='white-space:pre-wrap'>{raw_text}</p>"
    except Exception as e:
        logger.error("Error formatting text with AI: %s", e)
        return (
            "<div style='padding:10px;background:#fef2f2;border:1px solid #f87171;"
            "color:#b91c1c;border-radius:6px;margin-bottom:16px;font-weight:bold'>"
            f"⚠️ AI formatting failed: {e}. Showing raw text below.</div>"
            f"<p style='white-space:pre-wrap'>{raw_text}</p>"
        )
