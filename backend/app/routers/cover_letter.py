"""
Cover Letter Generator — AI-powered using NVIDIA NIM GLM model.
Returns a professionally structured cover letter in plain text format.
"""
import json
import logging
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.ai_client import get_ai_client, ai_model

logger = logging.getLogger(__name__)
router = APIRouter()


class CoverLetterRequest(BaseModel):
    resume_text: str
    jd_text: str
    tone: str = "professional"


SYSTEM_PROMPT = """You are an expert cover letter writer with 15+ years of experience in talent acquisition and career coaching.

Your task: Write a compelling, tailored, ATS-optimized cover letter that:
1. Opens with a strong hook tied to the specific role and company
2. Highlights 2-3 of the candidate's strongest matching qualifications with concrete evidence
3. Shows genuine enthusiasm and alignment with the company/role
4. Closes with a confident call to action
5. Reads as authentic and human — NOT generic or robotic

Writing rules:
- Use the EXACT job title from the job description
- Reference specific skills and requirements from the JD by name
- Keep it under 400 words (3-4 tight paragraphs)
- Never use these clichés: "I am writing to apply", "team player", "hardworking", "passionate", "fast-learner", "go-getter"
- Start the opening with something other than "I"
- Each paragraph should do ONE thing well: (1) hook + role fit, (2) proof of skills, (3) why this company, (4) close

You MUST respond with ONLY valid JSON. No markdown fences, no explanation.
"""


def _user_prompt(resume_text: str, jd_text: str, tone: str) -> str:
    tone_map = {
        "professional": "formal and polished",
        "confident": "assertive and direct",
        "creative": "engaging and distinctive",
        "executive": "senior leadership tone, strategic and concise",
    }
    tone_desc = tone_map.get(tone.lower(), "professional and clear")

    return f"""Resume:
\"\"\"
{resume_text[:5000]}
\"\"\"

Job Description:
\"\"\"
{jd_text[:3000]}
\"\"\"

Tone: {tone_desc}

Write a tailored cover letter. Extract the company name and job title from the JD if available.

Return ONLY this JSON (no markdown, no fences):
{{
  "company_name": "<company name from JD, or 'the company' if not found>",
  "role_title": "<exact job title from JD>",
  "greeting": "Dear Hiring Manager,",
  "paragraphs": [
    "<Opening paragraph: strong hook, reference the exact role, show immediate value fit — 2-3 sentences>",
    "<Skills paragraph: cite 2-3 specific matching skills from JD with concrete evidence from resume — 3-4 sentences>",
    "<Why this company: show research/alignment with company mission or role specifics — 2 sentences>",
    "<Closing: confident CTA, thank them, mention availability — 2 sentences>"
  ],
  "sign_off": "Sincerely,",
  "candidate_placeholder": "[Your Name]"
}}"""


@router.post("/cover_letter")
async def generate_cover_letter(request: CoverLetterRequest):
    if not request.resume_text or len(request.resume_text.strip()) < 30:
        raise HTTPException(status_code=400, detail="resume_text is required")
    if not request.jd_text or len(request.jd_text.strip()) < 30:
        raise HTTPException(status_code=400, detail="jd_text is required")

    try:
        client = get_ai_client()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    model = ai_model()
    logger.info("Generating cover letter with model=%s, tone=%s", model, request.tone)

    try:
        completion = client.chat.completions.create(
            model=model,
            max_tokens=1200,
            temperature=0.7,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _user_prompt(request.resume_text, request.jd_text, request.tone)},
            ],
        )

        raw = (completion.choices[0].message.content or "{}").strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        try:
            data = json.loads(raw)
        except Exception:
            # Try to extract JSON from response
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group())
                except Exception:
                    raise HTTPException(status_code=502, detail="AI returned malformed JSON")
            else:
                raise HTTPException(status_code=502, detail="AI returned invalid response")

        paragraphs = data.get("paragraphs", [])
        if not paragraphs:
            raise HTTPException(status_code=502, detail="AI returned empty cover letter")

        return {
            "company_name": data.get("company_name", "the company"),
            "role_title": data.get("role_title", "this position"),
            "greeting": data.get("greeting", "Dear Hiring Manager,"),
            "paragraphs": paragraphs,
            "sign_off": data.get("sign_off", "Sincerely,"),
            "candidate_placeholder": data.get("candidate_placeholder", "[Your Name]"),
            "tone": request.tone,
            # Legacy field — plain text for backwards compat
            "cover_letter": "\n\n".join([
                data.get("greeting", "Dear Hiring Manager,"),
                *paragraphs,
                f"{data.get('sign_off', 'Sincerely,')}\n{data.get('candidate_placeholder', '[Your Name]')}",
            ]),
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error("Cover letter generation failed: %s", error_msg)
        if "429" in error_msg or "rate" in error_msg.lower() or "quota" in error_msg.lower():
            raise HTTPException(status_code=429, detail="AI rate limit reached. Please wait a moment and try again.")
        raise HTTPException(status_code=502, detail=f"Cover letter generation failed: {error_msg}")
