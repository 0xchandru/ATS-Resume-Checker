import logging
from typing import Optional
import openai
import os

logger = logging.getLogger(__name__)

def format_text_with_llm(raw_text: str, doc_type: str = "resume", api_key: Optional[str] = None) -> str:
    """
    Uses an LLM to take messy raw OCR text and structure it into clean HTML.
    Preserves exact phrasing, fixes line breaks, and adds semantic tags (h1, h2, ul, li).
    """
    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        logger.warning("No OpenAI API key found. Returning raw text.")
        return f"<p>{raw_text}</p>"

    client = openai.OpenAI(api_key=key)

    if doc_type == "resume":
        system_prompt = (
            "You are an expert ATS parser and rich-text resume editor engine. You will receive messy OCR text from a resume PDF. "
            "Your priority is to perfectly preserve structure and readability, outputting beautifully structured rich-text HTML.\n"
            "CRITICAL RULES:\n"
            "1. ONLY output the HTML. Do not wrap in ```html or any other markdown.\n"
            "2. Semantic Headings: Use <h2> for main sections (e.g., PROFESSIONAL SUMMARY, TECHNICAL SKILLS, EDUCATION, EXPERIENCE), <h3> for job roles or project titles.\n"
            "3. Rich Text: Use <strong> for job titles, company names, and important labels. Use <em> for dates, locations, or subtext. Keep inside bold/italic text properly preserved.\n"
            "4. Structure: NEVER flatten the resume into a single paragraph. Use <p> for normal paragraphs and <ul>/<li> for bullet points. Do not lose the bullet structure.\n"
            "5. Fix OCR Artifacts: Restore spaces between words, merge split tokens, remove broken hyphenation across line wraps, and normalize punctuation.\n"
            "6. Readability: Render the parsed output line by line, exactly as a human would read it. Do not concatenate words, headings, or skill groups.\n"
            "7. Do not invent or hallucinate text, just clean and format it perfectly."
        )
    else:
        system_prompt = (
            "You are an expert HR parser and rich-text editor engine. You will receive pasted text of a Job Description. "
            "Your priority is to automatically parse it into clear headings, subheadings, and bullet points, outputting highly readable HTML.\n"
            "CRITICAL RULES:\n"
            "1. ONLY output the HTML. Do not wrap in ```html or any other markdown.\n"
            "2. Semantic Headings: Use <h2> for the Job Title or primary sections (e.g., Requirements, Responsibilities), <h3> for sub-sections.\n"
            "3. Rich Text: Use <strong> for important keywords, qualifications, or requirements. Use <em> for contextual subtext.\n"
            "4. Structure: NEVER flatten the JD into a single paragraph. Use <p> for paragraphs and <ul>/<li> for lists of responsibilities/requirements.\n"
            "5. Readability: Ensure the parsed output is structured and easy to scan for an applicant.\n"
            "6. Do not invent or hallucinate text, just structure it perfectly."
        )

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Format this {doc_type}:\n\n{raw_text[:12000]}"}
            ],
            temperature=0.0,
            max_tokens=4000
        )
        content = response.choices[0].message.content
        if content:
            return content.strip().removeprefix("```html").removeprefix("```").removesuffix("```").strip()
        return f"<p>{raw_text}</p>"
    except Exception as e:
        logger.error(f"Error formatting text with LLM: {e}")
        warning_html = (
            "<div style='padding: 10px; background-color: #fef2f2; border: 1px solid #f87171; color: #b91c1c; border-radius: 6px; margin-bottom: 16px; font-weight: bold;'>"
            "⚠️ Rich Text Parsing Failed: The OpenAI API key has exceeded its quota or is invalid. "
            "Falling back to raw text extraction. Please check your billing details at platform.openai.com."
            "</div>"
        )
        return f"{warning_html}<p style='white-space: pre-wrap;'>{raw_text}</p>"
