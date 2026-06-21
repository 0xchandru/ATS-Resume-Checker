import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";

interface Props {
  keywords: any;
  softSkillData?: {
    matched: any[];
    missing: any[];
  };
}

// Common soft skill keywords — used as fallback when backend doesn't provide categories
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

// Helper to extract keyword string from any skill object
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
  
  // Check backend category first
  const cat = skill?.category?.toLowerCase?.() || "";
  if (cat === "soft_skill" || cat === "transversal" || cat === "social" || cat === "competency") {
    return true;
  }
  
  // Fallback to keyword matching
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

export default function SoftSkillsSection({ keywords, softSkillData }: Props) {
  if (!keywords) return null;

  const { matched = [], missing = [] } = keywords;

  // If backend provides pre-categorized soft skills, use those; otherwise detect locally
  const matchedSoft = softSkillData?.matched || matched.filter((m: any) => isSoftSkill(m));
  const missingSoft = softSkillData?.missing || missing.filter((m: any) => isSoftSkill(m));

  const totalSoft = matchedSoft.length + missingSoft.length;

  return (
    <div id="soft-skills" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-black text-foreground">Soft Skills</h2>
        {totalSoft > 0 && (
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-lg">
            {matchedSoft.length} of {totalSoft} matched
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        Soft skills demonstrate your work style and interpersonal abilities. While less weighted than hard skills in ATS scoring, recruiters actively look for these during manual review.
      </p>

      {totalSoft === 0 ? (
        <div className="bg-muted/30 rounded-xl p-6 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No soft skills were explicitly detected in the job description. Focus on naturally incorporating communication, leadership, and teamwork language into your experience bullets.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Matched soft skills */}
          {matchedSoft.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-emerald-500 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Found in Resume ({matchedSoft.length})
              </h4>
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                {matchedSoft.map((kw: any, i: number) => {
                  const count = kw.resume_occurrence_count || kw.jd_occurrence_count;
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-foreground">{getSkillKeyword(kw) || kw.keyword} {count > 1 ? <span className="text-muted-foreground ml-1">({count})</span> : null}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        Matched via {kw.match_layer || kw.match_type || "keyword"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Missing soft skills */}
          {missingSoft.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Missing from Resume ({missingSoft.length})
              </h4>
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                {missingSoft.map((kw: any, i: number) => {
                  const count = kw.jd_occurrence_count || 1;
                  return (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground">{getSkillKeyword(kw) || kw.keyword} {count > 1 ? <span className="text-muted-foreground ml-1">({count})</span> : null}</span>
                        {kw.suggestion && (
                          <p className="text-xs text-muted-foreground mt-1">→ {kw.suggestion}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        kw.jd_importance === "critical" ? "bg-red-500/20 text-red-400" :
                        kw.jd_importance === "high" ? "bg-amber-500/20 text-amber-400" :
                        "bg-muted text-muted-foreground"
                      }`}>{kw.jd_importance || "relevant"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-foreground">
              <strong>💡 Pro tip:</strong> Don't list soft skills in isolation. Demonstrate them through your experience bullets.
              Instead of "Strong communication skills", write "Presented quarterly security reports to C-suite executives, driving a 40% increase in security budget."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
