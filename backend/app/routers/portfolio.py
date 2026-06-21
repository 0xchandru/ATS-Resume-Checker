import os
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import openai

logger = logging.getLogger(__name__)
router = APIRouter()

class PortfolioRequest(BaseModel):
    resume_text: str

SYSTEM_PROMPT = """You are a senior tech recruiter and engineering manager. Analyze the candidate's resume and suggest 3 highly specific, impressive portfolio projects they should build to strengthen their profile for their target roles.

Return exactly this JSON structure:
{
    "projects": [
        {
            "title": "<Project Name>",
            "description": "<What it is and why it's impressive>",
            "tech_stack": ["Tech1", "Tech2", "Tech3"],
            "difficulty": "<Beginner|Intermediate|Advanced>",
            "business_impact": "<What ATS/Recruiters will love about this>"
        }
    ]
}
"""

@router.post("/portfolio")
async def analyze_portfolio(request: PortfolioRequest):
    if not request.resume_text:
        raise HTTPException(status_code=400, detail="resume_text is required")

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    client = openai.OpenAI(api_key=api_key)

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=1500,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Resume:\n{request.resume_text[:5000]}"}
            ],
            response_format={"type": "json_object"}
        )
        
        raw_content = completion.choices[0].message.content or "{}"
        parsed = json.loads(raw_content)
        return parsed

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Portfolio analysis failed: {error_msg}")
        
        if "insufficient_quota" in error_msg or "429" in error_msg:
            logger.warning("OpenAI quota exceeded for portfolio. Returning mock fallback.")
            return {
                "projects": [
                    {
                        "title": "API Quota Exceeded (Mock Project)",
                        "description": "Please check your OpenAI billing details to get real portfolio recommendations.",
                        "tech_stack": ["OpenAI API", "Billing"],
                        "difficulty": "Beginner",
                        "business_impact": "Resolving this will allow the ATS platform to generate real AI projects."
                    }
                ]
            }
            
        raise HTTPException(status_code=502, detail="Failed to analyze portfolio")
