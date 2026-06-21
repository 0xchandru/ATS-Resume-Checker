import { CheckCircle2, XCircle, Lightbulb, ArrowRight } from "lucide-react";

interface Props {
  keywords: any;
  softSkillData?: {
    matched: any[];
    missing: any[];
  };
}

const SOFT_SKILL_KEYWORDS = new Set([
  "communication", "leadership", "teamwork", "team player", "problem solving", "problem-solving",
  "critical thinking", "adaptability", "time management", "collaboration", "interpersonal",
  "analytical", "attention to detail", "self-motivated", "creativity", "flexibility",
  "organizational", "decision making", "conflict resolution", "mentoring", "coaching",
  "negotiation", "presentation", "public speaking", "emotional intelligence", "empathy",
  "initiative", "proactive", "multitasking", "prioritization", "delegation",
  "strategic thinking", "innovation", "customer service", "relationship building", "accountability",
  "work ethic", "professionalism", "resilience", "patience", "active listening",
  "detail-oriented", "documentation", "reporting", "investigation", "troubleshooting",
  "analytical thinking", "problem solving skills", "strong analytical",
]);

function getSkillKeyword(skill: any): string {
  if (typeof skill === "string") return skill;
  if (!skill || typeof skill !== "object") return "";
  return (
    (typeof skill.keyword === "string" && skill.keyword) ||
    (typeof skill.term === "string" && skill.term) ||
    (typeof skill.canonical === "string" && skill.canonical) ||
    (typeof skill.jd_keyword === "string" && skill.jd_keyword) ||
    (typeof skill.normalized_form === "string" && skill.normalized_form) ||
    ""
  );
}

function isSoftSkill(skill: any): boolean {
  const keyword = getSkillKeyword(skill);
  if (!keyword) return false;
  const lower = keyword.toLowerCase();
  const cat = skill?.category?.toLowerCase?.() || "";
  if (cat === "soft_skill" || cat === "transversal" || cat === "social" || cat === "competency") return true;
  return SOFT_SKILL_KEYWORDS.has(lower) ||
    lower.includes("communicat") ||
    lower.includes("leadership") ||
    (lower.includes("team") && !lower.includes("system")) ||
    (lower.includes("management") && !lower.includes("system") && !lower.includes("database") && !lower.includes("network")) ||
    lower.includes("interpersonal") ||
    lower.includes("presentation") ||
    lower.includes("analytical") ||
    lower.includes("problem-solving") ||
    lower.includes("problem solving") ||
    lower.includes("documentation") ||
    lower.includes("reporting");
}

const IMPORTANCE_STYLE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/25",
  high: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/25",
};

export default function SoftSkillsSection({ keywords, softSkillData }: Props) {
  if (!keywords) return null;

  const { matched = [], missing = [] } = keywords;

  const matchedSoft = softSkillData?.matched || matched.filter((m: any) => isSoftSkill(m));
  const missingSoft = softSkillData?.missing || missing.filter((m: any) => isSoftSkill(m));
  const totalSoft = matchedSoft.length + missingSoft.length;

  return (
    <div id="soft-skills" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-black text-foreground">Soft Skills</h2>
        {totalSoft > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 bg-white/[0.04] border border-white/[0.07] text-muted-foreground rounded-full">
            {matchedSoft.length}/{totalSoft} matched
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        Soft skills demonstrate your work style. Less ATS-weighted than hard skills, but reviewed closely by hiring managers. Show them through examples, not just labels.
      </p>

      {totalSoft === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No soft skills were explicitly detected in the job description. Focus on naturally incorporating communication, leadership, and teamwork language into your experience bullets.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchedSoft.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Found in Resume ({matchedSoft.length})
              </h4>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl divide-y divide-white/[0.04]">
                {matchedSoft.map((kw: any, i: number) => {
                  const count = kw.resume_occurrence_count || kw.jd_occurrence_count;
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="text-sm font-medium text-foreground/90 flex-1 min-w-0 truncate">
                        {getSkillKeyword(kw) || kw.keyword}
                      </span>
                      {count > 1 && (
                        <span className="text-xs text-muted-foreground shrink-0">×{count}</span>
                      )}
                      <span className="text-xs text-muted-foreground/60 shrink-0 hidden sm:block">
                        {kw.match_layer || kw.match_type || "keyword"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {missingSoft.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                Missing from Resume ({missingSoft.length})
              </h4>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl divide-y divide-white/[0.04]">
                {missingSoft.map((kw: any, i: number) => {
                  const count = kw.jd_occurrence_count || 1;
                  const importance = (kw.jd_importance || "").toLowerCase();
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground/90 truncate">
                            {getSkillKeyword(kw) || kw.keyword}
                          </span>
                          {count > 1 && <span className="text-xs text-muted-foreground">×{count}</span>}
                        </div>
                        {kw.suggestion && (
                          <p className="text-xs text-muted-foreground mt-1">→ {kw.suggestion}</p>
                        )}
                      </div>
                      {importance && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 capitalize ${
                          IMPORTANCE_STYLE[importance] || "bg-white/[0.05] text-muted-foreground border-white/[0.08]"
                        }`}>
                          {kw.jd_importance}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pro tip */}
          <div className="flex items-start gap-3 p-4 bg-violet-500/8 border border-violet-500/15 rounded-xl">
            <ArrowRight className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/80 leading-relaxed">
              <strong className="text-foreground">Pro tip:</strong> Don't list soft skills in isolation. Instead of "Strong communication skills", write "Presented quarterly security reports to C-suite, driving a 40% increase in security budget."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
