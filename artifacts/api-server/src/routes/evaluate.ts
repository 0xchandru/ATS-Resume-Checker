import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are an ATS resume evaluator for technical jobs. Be brutally honest, evidence-based, and resistant to keyword inflation.

Hard rules:
1) Exclude stopwords and filler words from keyword analysis.
   Never count words like: we, that, this, who, what, part, they, these, the, a, an, to, of, for, with, by, and, or, but, regular, end.
   Also exclude company-mission language unless it maps directly to role requirements.

2) Separate analysis into 4 independent scores:
   - Content Match: how well the resume matches the JD role requirements
   - ATS Parseability: how safely the resume can be read by ATS
   - Formatting Risk: Low / Medium / High
   - Evidence Quality: Low / Medium / High

3) Treat ATS parseability as critical. Flag these as high severity:
   multi-column layout, tables, text boxes, images used for text, header/footer-only important content,
   too many fonts, special characters that may break parsing, missing logical reading order,
   experience section not extractable.

4) Detect and explain layout problems explicitly. If the resume appears multi-column or structurally hard to parse, say so clearly.

5) Keyword matching rules:
   - Count only role-relevant terms from the JD.
   - Group aliases together (SIEM = Splunk/Sentinel/QRadar, EDR = endpoint detection tools, etc.)
   - Mark missing keywords only if they are genuinely important to the role.
   - Do not mark generic English words as critical missing keywords.

6) Score honesty:
   - Do not inflate scores.
   - If the resume is not ATS-safe, cap the overall recommendation even if keywords look strong.

7) Detect keyword stuffing: flag unnatural repetition.

You must respond with ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON.`;

const USER_TEMPLATE = (resumeText: string, jdText: string) => `
Resume text:
"""
${resumeText.slice(0, 6000)}
"""

Job Description:
"""
${jdText.slice(0, 3000)}
"""

Evaluate this resume against the job description and return a JSON object with exactly this structure:
{
  "verdict": "<one sentence: is this resume ready to apply?>",
  "biggest_blocker": "<one sentence: the single biggest thing holding this resume back>",
  "scores": {
    "content_match": <integer 0-100>,
    "ats_parseability": <integer 0-100>,
    "formatting_risk": "<Low|Medium|High>",
    "evidence_quality": "<Low|Medium|High>"
  },
  "strengths": [
    "<strength 1 tied to a specific JD requirement>",
    "<strength 2>",
    "<strength 3>"
  ],
  "problems": [
    {
      "severity": "<Critical|High|Medium|Low>",
      "type": "<ATS|Content|Format|Evidence>",
      "issue": "<concise description of the problem>",
      "fix": "<specific actionable fix>"
    }
  ],
  "missing_requirements": [
    "<genuine role-relevant missing skill or requirement>"
  ],
  "fix_plan": [
    "<highest-impact fix first>",
    "<second fix>",
    "<third fix>"
  ],
  "recommendation": "<Apply as-is|Apply after minor edits|Apply only after major edits>",
  "recommendation_reason": "<one paragraph explaining the recommendation honestly>"
}

Rules:
- problems array: 3-8 items, ranked by severity, ATS problems listed before content gaps
- strengths array: 3-5 items
- missing_requirements: only genuine role-relevant items, no stopwords or generic words
- fix_plan: minimum set of changes, most impactful first, no keyword stuffing
- Be direct. No hype. No fake precision. If confidence is low, say so.`;

router.post("/evaluate", async (req, res) => {
  const { resume_text, jd_text } = req.body as {
    resume_text?: string;
    jd_text?: string;
  };

  if (!resume_text || resume_text.trim().length < 50) {
    res.status(400).json({ error: "resume_text must be at least 50 characters" });
    return;
  }
  if (!jd_text || jd_text.trim().length < 50) {
    res.status(400).json({ error: "jd_text must be at least 50 characters" });
    return;
  }

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ error: "OPENAI_API_KEY not configured" });
    return;
  }

  const openai = new OpenAI({ apiKey });

  try {
    req.log.info("Starting LLM evaluation");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_TEMPLATE(resume_text, jd_text) },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "LLM returned invalid JSON");
      res.status(502).json({ error: "LLM returned invalid JSON", raw });
      return;
    }

    req.log.info("LLM evaluation complete");
    res.json(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err: msg }, "LLM evaluation failed");
    res.status(502).json({ error: `LLM evaluation failed: ${msg}` });
  }
});

export default router;
