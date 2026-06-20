import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a brutally honest ATS resume evaluator with deep knowledge of how real enterprise ATS systems work (Workday, Taleo, iCIMS, SuccessFactors, Greenhouse, LinkedIn Recruiter, Naukri, Indeed, Foundit).

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
- Multi-column PDF layout: Workday/Taleo/iCIMS read left-to-right across the page width,
  scrambling two-column content. This is CRITICAL. A resume with perfect keywords that can't be parsed scores 0.
- Tables: parsed as a single merged text blob, destroying structure.
- LaTeX-generated PDFs: often embed text as character sequences that break copy-paste and OCR.
  The "special characters" symptom (bullet chars, ligatures, em-dashes from LaTeX) is a reliable signal.
- Text in images, headers/footers: invisble to most ATS.
- Font explosion (>3 fonts): minor issue on enterprise ATS but signals design over substance.
- LinkedIn and Indeed are more forgiving parsers. Naukri, Foundit have weaker parsers.
  Workday, Taleo, iCIMS are the strictest.

RULE 4 — CONTEXT-SENSITIVE KEYWORD COUNTING.
Only count a keyword as "present in resume" if it genuinely appears in context, not just incidentally.
For example, "Splunk" in a lab project that says "installed Splunk" is weaker evidence than
"Used Splunk to analyze 200k daily events and build correlation rules." Note the difference in evidence_quality.

RULE 5 — HONEST SCORING, NO INFLATION.
- content_match: 0–100. For entry-level/fresher candidates, 55–70 is a strong realistic score.
  80+ means the resume was clearly written for this exact role. Do not give 85+ without very specific evidence.
- ats_parseability: 0–100. Multi-column layout alone should cap this at 50. LaTeX with multi-column and
  special chars should cap it at 40.
- If ATS parseability is below 50, the recommendation CANNOT be "Apply as-is" regardless of content.

RULE 6 — ALIASES ARE ONE REQUIREMENT.
SIEM means any of: Splunk, IBM QRadar, Microsoft Sentinel, ArcSight, Elastic SIEM, LogRhythm.
Having one SIEM tool satisfies the SIEM requirement unless the JD names a specific one as required.
EDR = CrowdStrike, SentinelOne, Carbon Black, Defender ATP, Cortex XDR.
IDS/IPS = Snort, Suricata, Zeek, Bro.
SOAR = Splunk SOAR, Palo Alto XSOAR, IBM QRadar SOAR, Shuffle SOAR.
Vulnerability scanning = Nessus, Qualys, OpenVAS, Rapid7.
Ticketing = Jira, ServiceNow, Remedy, Zendesk.

RULE 7 — EVIDENCE QUALITY IS SEPARATE FROM KEYWORD PRESENCE.
A bullet that says "Used Python" is Low evidence.
"Built a Python tool that queried 5 threat intel APIs with <2s response time" is High evidence.
Score evidence_quality on the whole resume's pattern, not just individual bullets.

RULE 8 — FRESHER/ENTRY-LEVEL CONTEXT.
For a fresher or recent graduate applying to their first industry role:
- Home lab projects, TryHackMe/HackTheBox ranks, CTF competitions ARE valid experience proxies.
- Absence of paid experience is expected, not a blocker.
- Missing preferred certs (Security+, CEH) are soft gaps, not disqualifiers.
- TryHackMe Top 1% or similar rankings are genuinely strong differentiators.

You must respond with ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON.`;


const USER_TEMPLATE = (resumeText: string, jdText: string) => `
Resume text:
"""
${resumeText.slice(0, 7000)}
"""

Job Description:
"""
${jdText.slice(0, 4000)}
"""

Evaluate this resume against the job description.

First, scan the JD for:
1. Which skills/certs are explicitly REQUIRED vs. PREFERRED vs. just mentioned
2. The seniority level (entry/junior/mid/senior) implied by the JD
3. Specific ATS systems named or implied by the company type

Then evaluate and return exactly this JSON structure (no markdown, no code fences):
{
  "verdict": "<one honest sentence: is this resume ready to submit to this role?>",
  "biggest_blocker": "<one sentence: the single most critical thing holding this back — ATS issues take priority over content gaps>",
  "candidate_level": "<Fresher|Junior|Mid|Senior|Unknown>",
  "jd_seniority": "<Entry|Junior|Mid|Senior|Unknown>",
  "scores": {
    "content_match": <integer 0-100, calibrated: 55-70 is strong for a fresher>,
    "ats_parseability": <integer 0-100, multi-column caps at 50, LaTeX+multi-column caps at 40>,
    "formatting_risk": "<Low|Medium|High>",
    "evidence_quality": "<Low|Medium|High>"
  },
  "strengths": [
    "<strength tied to a specific JD requirement — cite the evidence from the resume>",
    "<strength 2>",
    "<strength 3>"
  ],
  "problems": [
    {
      "severity": "<Critical|High|Medium|Low>",
      "type": "<ATS|Content|Format|Evidence|Cert>",
      "issue": "<specific, evidence-based description of the problem>",
      "fix": "<specific, actionable fix — no generic advice>",
      "required_vs_preferred": "<Required|Preferred|N/A>"
    }
  ],
  "missing_requirements": [
    {
      "skill": "<genuine role-relevant skill or cert — NO stopwords, NO filler words>",
      "type": "<Required|Preferred>",
      "importance": "<Critical|High|Medium|Low>",
      "alias_available": <true if candidate has a functional equivalent, false otherwise>
    }
  ],
  "fix_plan": [
    "<Step 1: highest-impact fix first. Be specific — name what to change and how.>",
    "<Step 2>",
    "<Step 3>"
  ],
  "recommendation": "<Apply as-is|Apply after minor edits|Apply only after major edits>",
  "recommendation_reason": "<one honest paragraph. If ATS parseability is the main issue, say so explicitly and what ATS systems are most affected.>"
}

Rules:
- problems: 3–8 items, ATS/format problems before content gaps, ranked Critical first
- strengths: 3–5 items, each tied to specific resume evidence
- missing_requirements: only role-relevant gaps, absolutely no stopwords or generic English
- fix_plan: minimum steps, most leverage first, no vague advice like "add more keywords"
- If the resume has multi-column layout evidence (two text columns detected, LaTeX formatting,
  special bullet chars), flag it explicitly in problems as Critical/ATS
- Be direct. No hype. If something is genuinely good, say specifically why.`;

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
      max_completion_tokens: 2500,
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
