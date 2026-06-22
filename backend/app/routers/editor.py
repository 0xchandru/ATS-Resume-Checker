import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.app.ai_client import get_ai_client, ai_model

router = APIRouter()
logger = logging.getLogger(__name__)


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
