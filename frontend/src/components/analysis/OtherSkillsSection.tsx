import { CheckCircle2, XCircle } from "lucide-react";

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

const IMPORTANCE_STYLE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/25",
  high: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/25",
};

export default function OtherSkillsSection({ keywords, otherSkillData }: Props) {
  if (!keywords || !otherSkillData) return null;

  const { matched = [], missing = [] } = otherSkillData;
  const totalOther = matched.length + missing.length;

  if (totalOther === 0) return null;

  return (
    <div id="other-skills" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-black text-foreground">Other Skills</h2>
        <span className="text-xs font-semibold px-2.5 py-1 bg-white/[0.04] border border-white/[0.07] text-muted-foreground rounded-full">
          {matched.length}/{totalOther} matched
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        General terminology, operational concepts, or frameworks from the job description that don't fit into core hard or soft skills.
      </p>

      <div className="space-y-4">
        {matched.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Found in Resume ({matched.length})
            </h4>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl divide-y divide-white/[0.04]">
              {matched.map((kw: any, i: number) => {
                const count = kw.resume_occurrence_count || kw.jd_occurrence_count;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-sm font-medium text-foreground/90 flex-1 min-w-0 truncate">
                      {getSkillKeyword(kw) || kw.keyword}
                    </span>
                    {count > 1 && <span className="text-xs text-muted-foreground shrink-0">×{count}</span>}
                    <span className="text-xs text-muted-foreground/50 shrink-0 hidden sm:block">
                      {kw.match_layer || kw.match_type || "keyword"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" /> Missing from Resume ({missing.length})
            </h4>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl divide-y divide-white/[0.04]">
              {missing.map((kw: any, i: number) => {
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
                        <p className="text-xs text-muted-foreground mt-0.5">→ {kw.suggestion}</p>
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
      </div>
    </div>
  );
}
