from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import openai
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class OptimizeRequest(BaseModel):
    bullet_text: str
    missing_skill: str
    jd_context: Optional[str] = ""
    api_key: str

@router.post("/optimize_bullet")
async def optimize_bullet(req: OptimizeRequest):
    if not req.api_key:
        raise HTTPException(status_code=400, detail="OpenAI API Key is required")
        
    client = openai.OpenAI(api_key=req.api_key)
    
    system_prompt = (
        "You are an expert ATS resume writer. Your task is to rewrite a resume bullet point "
        "to naturally incorporate a missing technical or soft skill, while keeping the original "
        "impact and metrics intact. Keep it professional, concise, and action-oriented."
    )
    
    user_prompt = f"""
Original Bullet Point: {req.bullet_text}
Missing Skill to Incorporate: {req.missing_skill}
Job Description Context: {req.jd_context}

Please rewrite the bullet point to naturally include the missing skill. Ensure it sounds like a real, impactful accomplishment. Return ONLY the rewritten bullet point text, nothing else. No quotes, no intro.
"""
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=150
        )
        rewritten = response.choices[0].message.content.strip()
        return {"rewritten_bullet": rewritten}
    except Exception as e:
        logger.error(f"OpenAI API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
