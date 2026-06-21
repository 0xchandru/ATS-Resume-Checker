import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from backend.app.database import engine
from backend.app.engine.extraction.extractor import extract_resume_keywords

logger = logging.getLogger(__name__)
router = APIRouter()

class CoverLetterRequest(BaseModel):
    resume_text: str
    jd_text: str
    tone: str = "professional"

@router.post("/cover_letter")
async def generate_cover_letter(request: CoverLetterRequest):
    if not request.resume_text or not request.jd_text:
        raise HTTPException(status_code=400, detail="resume_text and jd_text are required")

    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT template_text FROM kb_cover_letter_templates WHERE tone = :t LIMIT 1"),
                {"t": request.tone.lower()}
            )
            row = result.fetchone()
            
            if not row:
                # Fallback to general template
                result = conn.execute(text("SELECT template_text FROM kb_cover_letter_templates LIMIT 1"))
                row = result.fetchone()

            if not row:
                mock_letter = "[Mock Cover Letter]\n\nDear Hiring Manager,\n\nPlease populate the backend/data/kb/cover-letters/templates.json dataset to generate real cover letters without AI.\n\nSincerely,\n[Your Name]"
                return {"cover_letter": mock_letter}

            template = row[0]

        # Extract some skills from resume to inject into template
        extracted = extract_resume_keywords(request.resume_text)
        top_skills = [s.get("term", s) for s in extracted[:3]] if extracted else []
        skills_str = ", ".join(top_skills) if top_skills else "my core competencies"

        # Basic template injection
        final_letter = template.replace("[Top Skills]", skills_str)
        final_letter = final_letter.replace("[Candidate Name]", "[Your Name]")
        
        return {"cover_letter": final_letter}

    except Exception as e:
        logger.error(f"Cover letter generation failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to generate cover letter from datasets")
