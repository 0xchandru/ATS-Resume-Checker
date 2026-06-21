import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import openai

logger = logging.getLogger(__name__)
router = APIRouter()

class CoverLetterRequest(BaseModel):
    resume_text: str
    jd_text: str
    tone: str = "professional" # professional, enthusiastic, concise

SYSTEM_PROMPT = """You are an expert executive recruiter and career coach. Your task is to write a highly tailored, compelling cover letter based on a candidate's resume and a job description.
The cover letter must:
1. Not sound like it was written by an AI. Avoid generic buzzwords like "delved," "spearheaded," "testament to," or "thrilled to apply."
2. Be tailored to the specified tone (e.g., professional, enthusiastic, concise).
3. Connect specific achievements in the resume directly to the required skills in the job description.
4. Keep it to 3-4 paragraphs.
5. Provide placeholders like [Date], [Hiring Manager Name], [Company Name] where appropriate.
6. Return only the cover letter text, no markdown code blocks.
"""

@router.post("/cover_letter")
async def generate_cover_letter(request: CoverLetterRequest):
    if not request.resume_text or not request.jd_text:
        raise HTTPException(status_code=400, detail="resume_text and jd_text are required")

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    client = openai.OpenAI(api_key=api_key)

    user_prompt = f"Tone: {request.tone}\n\nResume:\n{request.resume_text[:5000]}\n\nJob Description:\n{request.jd_text[:3000]}\n\nWrite the cover letter."

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=1000,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
        )
        return {"cover_letter": completion.choices[0].message.content.strip()}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Cover letter generation failed: {error_msg}")
        
        if "insufficient_quota" in error_msg or "429" in error_msg:
            logger.warning("OpenAI quota exceeded for cover letter. Returning mock fallback.")
            mock_letter = "[Mock Cover Letter]\n\nDear Hiring Manager,\n\nI am unable to generate a real cover letter right now because the OpenAI API account has insufficient quota.\n\nPlease check your billing details on platform.openai.com or provide a valid OPENAI_API_KEY in the backend .env file.\n\nSincerely,\n[Your Name]"
            return {"cover_letter": mock_letter}
            
        raise HTTPException(status_code=502, detail="Failed to generate cover letter")
