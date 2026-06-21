import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from backend.app.database import engine
from backend.app.engine.extraction.extractor import extract_resume_keywords

logger = logging.getLogger(__name__)
router = APIRouter()

class PortfolioRequest(BaseModel):
    resume_text: str

@router.post("/portfolio")
async def analyze_portfolio(request: PortfolioRequest):
    if not request.resume_text:
        raise HTTPException(status_code=400, detail="resume_text is required")

    try:
        with engine.connect() as conn:
            # Get all projects
            result = conn.execute(text("SELECT title, description, tech_stack, difficulty, business_impact FROM kb_portfolio_projects"))
            rows = result.fetchall()

            if not rows:
                return {
                    "projects": [
                        {
                            "title": "No Projects Found in KB",
                            "description": "Please add projects to backend/data/kb/portfolio-projects/projects.json",
                            "tech_stack": ["Add Dataset"],
                            "difficulty": "Beginner",
                            "business_impact": "Will allow the platform to suggest actual projects."
                        }
                    ]
                }

            # Simple logic: extract resume skills and try to find overlap,
            # or just return up to 3 random projects if no overlap logic needed yet.
            # Here we just return the first 3 for simplicity.
            
            projects_out = []
            for row in rows[:3]:
                try:
                    tech_stack = json.loads(row[2]) if row[2] else []
                except:
                    tech_stack = []

                projects_out.append({
                    "title": row[0],
                    "description": row[1],
                    "tech_stack": tech_stack,
                    "difficulty": row[3],
                    "business_impact": row[4]
                })

            return {"projects": projects_out}

    except Exception as e:
        logger.error(f"Portfolio matching failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to retrieve portfolio projects from datasets")
