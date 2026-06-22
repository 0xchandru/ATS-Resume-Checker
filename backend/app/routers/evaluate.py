import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.ai_client import get_ai_client, ai_model

logger = logging.getLogger(__name__)
router = APIRouter()


class EvaluateRequest(BaseModel):
    resume_text: str
    jd_text: str


SYSTEM_PROMPT = """You are a brutally honest ATS resume evaluator with deep knowledge of how real enterprise ATS systems work (Workday, Taleo, iCIMS, SuccessFactors, Greenhouse, LinkedIn Recruiter, Naukri, Indeed, Foundit).

You are NOT a keyword-stuffing optimizer. You produce honest, evidence-based evaluations that tell the candidate exactly what will happen when their resume hits a real ATS.

=== CORE RULES — NEVER VIOLATE THESE ===

RULE 1 — NO STOPWORDS OR FILLER WORDS.
Never list these as missing keywords or problems:
we, that, this, who, what, part, they, these, the, a, an, to, of, for, with, by, and, or, but,
regular, end, use, work, help, make, get, join, apply, including, following, required, strong,
experience, years, team, role, ability, opportunity, position, candidate, responsibilities.
Also exclude: company mission/vision language, generic corporate culture words, and any word
that would appear in 80%+ of job postings for any field.

RULE 2 — DISTINGUISH REQUIRED vs. PREFERRED.
Scan the JD carefully. If a skill/cert is marked "required", "must have", or "essential" it is a hard gap.
If marked "preferred", "nice to have", "a plus", or "desirable" — it is a soft gap. Never treat preferred
as equally critical to required. In your problems and missing_requirements, always label which type.

RULE 3 — ATS PARSEABILITY IS THE FIRST GATE.
Before any keyword matching matters, the ATS must successfully parse the document. Flag:
- Multi-column PDF layout: Workday/Taleo/iCIMS read left-to-right across the page width, scrambling two-column content. This is CRITICAL.
- Tables: parsed as a single merged text blob, destroying structure.
- LaTeX-generated PDFs: often embed text as character sequences that break copy-paste and OCR.
- Font explosion (>3 fonts): minor issue on enterprise ATS but signals design over substance.

RULE 4 — CONTEXT-SENSITIVE KEYWORD COUNTING.
Only count a keyword as "present in resume" if it genuinely appears in context, not just incidentally.

RULE 5 — HONEST SCORING, NO INFLATION.
- content_match: 0–100. For entry-level/fresher candidates, 55–70 is a strong realistic score.
  80+ means the resume was clearly written for this exact role. Do not give 85+ without very specific evidence.
- ats_parseability: 0–100. Multi-column layout alone should cap this at 50. LaTeX with multi-column and
  special chars should cap it at 40.

RULE 6 — ALIASES ARE ONE REQUIREMENT.
SIEM means any of: Splunk, IBM QRadar, Microsoft Sentinel, ArcSight. EDR = CrowdStrike, SentinelOne, Carbon Black.
Having one satisfies the requirement unless the JD names a specific one.

RULE 7 — EVIDENCE QUALITY IS SEPARATE FROM KEYWORD PRESENCE.
A bullet that says "Used Python" is Low evidence.
"Built a Python tool that queried 5 threat intel APIs with <2s response time" is High evidence.

RULE 8 — FRESHER/ENTRY-LEVEL CONTEXT.
- Home lab projects, TryHackMe/HackTheBox ranks, CTF competitions ARE valid experience proxies.
- Missing preferred certs (Security+, CEH) are soft gaps.

You must respond with ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON.
"""


def USER_TEMPLATE(resume_text: str, jd_text: str) -> str:
    return f"""
Resume text:
\"\"\"
{resume_text[:7000]}
\"\"\"

Job Description:
\"\"\"
{jd_text[:4000]}
\"\"\"

Evaluate this resume against the job description.

First, scan the JD for:
1. Which skills/certs are explicitly REQUIRED vs. PREFERRED vs. just mentioned
2. The seniority level (entry/junior/mid/senior) implied by the JD
3. Specific ATS systems named or implied by the company type

Then evaluate and return exactly this JSON structure (no markdown, no code fences):
{{
  "verdict": "<one honest sentence: is this resume ready to submit to this role?>",
  "biggest_blocker": "<one sentence: the single most critical thing holding this back — ATS issues take priority over content gaps>",
  "candidate_level": "<Fresher|Junior|Mid|Senior|Unknown>",
  "jd_seniority": "<Entry|Junior|Mid|Senior|Unknown>",
  "scores": {{
    "content_match": <integer 0-100, calibrated: 55-70 is strong for a fresher>,
    "ats_parseability": <integer 0-100, multi-column caps at 50, LaTeX+multi-column caps at 40>,
    "formatting_risk": "<Low|Medium|High>",
    "evidence_quality": "<Low|Medium|High>"
  }},
  "strengths": [
    "<strength tied to a specific JD requirement — cite the evidence from the resume>"
  ],
  "problems": [
    {{
      "severity": "<Critical|High|Medium|Low>",
      "type": "<ATS|Content|Format|Evidence|Cert>",
      "issue": "<specific, evidence-based description of the problem>",
      "fix": "<specific, actionable fix — no generic advice>",
      "required_vs_preferred": "<Required|Preferred|N/A>"
    }}
  ],
  "missing_requirements": [
    {{
      "skill": "<genuine role-relevant skill or cert — NO stopwords, NO filler words>",
      "type": "<Required|Preferred>",
      "importance": "<Critical|High|Medium|Low>",
      "alias_available": <true if candidate has a functional equivalent, false otherwise>
    }}
  ],
  "fix_plan": [
    "<Step 1: highest-impact fix first. Be specific — name what to change and how.>"
  ],
  "recommendation": "<Apply as-is|Apply after minor edits|Apply only after major edits>",
  "recommendation_reason": "<one honest paragraph. If ATS parseability is the main issue, say so explicitly and what ATS systems are most affected.>"
}}
"""


@router.post("/evaluate")
async def evaluate_resume(request: EvaluateRequest):
    if not request.resume_text or len(request.resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="resume_text must be at least 50 characters")
    if not request.jd_text or len(request.jd_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="jd_text must be at least 50 characters")

    try:
        client = get_ai_client()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    model = ai_model()
    logger.info("Starting AI evaluation with model=%s", model)

    try:
        completion = client.chat.completions.create(
            model=model,
            max_tokens=2500,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_TEMPLATE(request.resume_text, request.jd_text)},
            ],
        )

        raw_content = completion.choices[0].message.content or "{}"
        # Strip markdown fences if the model wraps output
        raw_content = raw_content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        try:
            parsed = json.loads(raw_content)
        except Exception:
            logger.error("AI returned invalid JSON: %s", raw_content[:300])
            raise HTTPException(status_code=502, detail="AI returned invalid JSON")

        return parsed

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error("AI evaluation failed: %s", error_msg)

        if "429" in error_msg or "quota" in error_msg.lower() or "rate" in error_msg.lower():
            return {
                "verdict": "AI evaluation unavailable — rate limit or quota reached.",
                "biggest_blocker": "API rate limit hit. Try again in a moment.",
                "candidate_level": "Unknown",
                "jd_seniority": "Unknown",
                "scores": {"content_match": 50, "ats_parseability": 50, "formatting_risk": "Medium", "evidence_quality": "Medium"},
                "strengths": ["ATS extraction engine ran successfully."],
                "problems": [{
                    "severity": "High",
                    "type": "API",
                    "issue": "NVIDIA API rate limit or quota reached.",
                    "fix": "Wait a moment and try again, or check your NVIDIA account quota.",
                    "required_vs_preferred": "N/A"
                }],
                "missing_requirements": [],
                "fix_plan": ["Wait for rate limit to reset, then retry AI evaluation."],
                "recommendation": "Apply after resolving API quota",
                "recommendation_reason": "Could not generate AI evaluation due to API rate limits. The standard ATS score is still valid."
            }

        raise HTTPException(status_code=502, detail=f"AI evaluation failed: {error_msg}")
