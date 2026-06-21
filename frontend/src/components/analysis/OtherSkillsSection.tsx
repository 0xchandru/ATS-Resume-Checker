import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";

interface Props {
  keywords: any;
  otherSkillData?: {
    matched: any[];
    missing: any[];
  };
}

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

export default function OtherSkillsSection({ keywords, otherSkillData }: Props) {
  if (!keywords || !otherSkillData) return null;

  const { matched = [], missing = [] } = otherSkillData;

  const totalOther = matched.length + missing.length;

  if (totalOther === 0) return null;

  return (
    <div id="other-skills" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-black text-foreground">Other Skills</h2>
        {totalOther > 0 && (
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-lg">
            {matched.length} of {totalOther} matched
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        These skills include general terminology, operational concepts, or frameworks extracted from the job description that don't fit into core hard or soft skills.
      </p>

      <div className="space-y-4">
        {/* Matched other skills */}
        {matched.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-emerald-500 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Found in Resume ({matched.length})
            </h4>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              {matched.map((kw: any, i: number) => {
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

        {/* Missing other skills */}
        {missing.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Missing from Resume ({missing.length})
            </h4>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              {missing.map((kw: any, i: number) => {
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
      </div>
    </div>
  );
}
