import { useState, useMemo } from "react";
import { Copy, Check, Search, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  keywords: any;
  resumeText: string;
  jdText: string;
  resumeFull?: string;
  jdFull?: string;
}

function useCopy(textFn: () => string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(textFn()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

const MATCH_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  exact_match: { bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Exact" },
  normalized_match: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Alias" },
  inferred_match: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Inferred" },
  unsupported_claim: { bg: "bg-red-500/10", text: "text-red-500", label: "Unsupported" },
};

function SkillChip({ label, matched, matchType }: { label: string; matched: boolean; matchType?: string }) {
  const mt = matchType && MATCH_TYPE_STYLES[matchType];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${matched
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
          : "bg-muted text-muted-foreground border-border"
        }`}
    >
      {label}
      {mt && (
        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md ${mt.bg} ${mt.text}`}>
          {mt.label}
        </span>
      )}
    </span>
  );
}

function HighlightedPanel({
  title,
  text,
  matchedSet,
  missingSet,
}: {
  title: string;
  text: string;
  matchedSet: Set<string>;
  missingSet?: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 600;
  const displayText = expanded || !isLong ? text : text.slice(0, 600) + "...";

  const highlighted = useMemo(() => {
    if (!displayText) return displayText;
    const allKw = [...matchedSet, ...(missingSet || [])].sort((a, b) => b.length - a.length);
    if (allKw.length === 0) return displayText;
    const escaped = allKw.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    return displayText.split(regex).map((part, i) => {
      const lower = part.toLowerCase();
      if (matchedSet.has(lower)) {
        return <mark key={i} className="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5 font-semibold not-italic">{part}</mark>;
      }
      if (missingSet?.has(lower)) {
        return <mark key={i} className="bg-red-500/20 text-red-400 rounded-sm px-0.5 font-semibold not-italic">{part}</mark>;
      }
      return <span key={i}>{part}</span>;
    });
  }, [displayText, matchedSet, missingSet]);

  return (
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-bold text-foreground mb-3">{title}</h4>
      <div className="bg-muted/30 border border-border rounded-xl p-4 max-h-[32rem] overflow-y-auto">
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">{highlighted}</p>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Show less" : "Show full content"}
          </button>
        )}
      </div>
    </div>
  );
}

// Helper to extract a display label from any skill object
function getSkillLabel(skill: any): string {
  if (typeof skill === "string") return skill;
  if (!skill || typeof skill !== "object") return "Unknown skill";
  return (
    (typeof skill.keyword === "string" && skill.keyword) ||
    (typeof skill.term === "string" && skill.term) ||
    (typeof skill.canonical === "string" && skill.canonical) ||
    (typeof skill.jd_keyword === "string" && skill.jd_keyword) ||
    (typeof skill.matched_form === "string" && skill.matched_form) ||
    (typeof skill.normalized_form === "string" && skill.normalized_form) ||
    "Unknown skill"
  );
}

export default function HardSkillsSection({ keywords, resumeText, jdText, resumeFull, jdFull, result }: Props & { result?: any }) {
  if (!keywords) return null;

  const { matched = [], matched_count, total_jd_keywords, match_rate } = keywords;
  const [activeTab, setActiveTab] = useState<"comparison" | "highlighted">("comparison");

  // Filter out soft and other skills from the main hard skills display
  const isHardSkill = (skill: any) => {
    const cat = skill?.category?.toLowerCase?.() || "";
    return cat !== "soft_skill" && cat !== "transversal" && cat !== "social" && cat !== "competency" && cat !== "other_skill" && cat !== "other";
  };

  const hardMatched = matched.filter(isHardSkill);
  
  // Use truly missing skills from the role fit assessment if available
  const rawTrulyMissing = result?.role_fit?.honest_assessment?.truly_missing || keywords.missing || [];
  const trulyMissing = rawTrulyMissing.filter(isHardSkill);
  
  const noiseFiltered = result?.role_fit?.honest_assessment?.noise_filtered || [];

  const matchedSet = useMemo(
    () => new Set<string>(
      hardMatched
        .map((m: any) => (typeof m?.keyword === "string" ? m.keyword.toLowerCase() : ""))
        .filter(Boolean)
    ),
    [matched]
  );

  const missingSet = useMemo(
    () => new Set<string>(
      trulyMissing
        .map((m: any) => {
          const value = m?.skill || m?.keyword;
          return typeof value === "string" ? value.toLowerCase() : "";
        })
        .filter(Boolean)
    ),
    [trulyMissing]
  );

  const matchPercent = Math.round((match_rate || 0) * 100);
  const { copied: copiedAll, copy: copyAll } = useCopy(
    () => trulyMissing.map((m: any) => (typeof m?.skill === "string" ? m.skill : m?.keyword || "")).filter(Boolean).join(", ")
  );

  // Separate hard skills (technical keywords)
  const allSkills = [
    ...hardMatched.map((m: any) => ({ ...m, isMatched: true })),
    ...trulyMissing.map((m: any) => ({ ...m, keyword: m.skill || m.keyword, isMatched: false }))
  ];

  return (
    <div id="hard-skills" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-black text-foreground">Hard Skills</h2>
        <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-lg">
          {hardMatched.length} of {hardMatched.length + trulyMissing.length} matched
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        <strong>Tip:</strong> Match the skills in your resume to the exact spelling in the job description. Prioritize skills that appear most frequently in the job description.
      </p>

      {/* Sub-tabs */}
      <div className="flex border-b border-border mb-5">
        {[
          { id: "comparison" as const, label: "Skills Comparison" },
          { id: "highlighted" as const, label: "Highlighted Skills" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-semibold transition-colors relative ${activeTab === tab.id
                ? "text-foreground tab-active"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "comparison" && (
        <div className="space-y-5">
          {/* Skill chips */}
          <div className="flex flex-wrap gap-2">
            {allSkills.slice(0, 30).map((skill: any, i: number) => {
              const label = getSkillLabel(skill);
              return (
                <SkillChip
                  key={i}
                  label={label}
                  matched={skill.isMatched}
                  matchType={skill.match_type}
                />
              );
            })}
          </div>

          {/* Side by side resume vs JD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HighlightedPanel
              title="Resume:"
              text={resumeFull || resumeText || ""}
              matchedSet={matchedSet}
            />
            <HighlightedPanel
              title="Job Description:"
              text={jdFull || jdText || ""}
              matchedSet={matchedSet}
              missingSet={missingSet}
            />
          </div>

          {/* Copy missing */}
          {trulyMissing.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all"
              >
                {copiedAll ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedAll ? "Copied!" : `Copy ${trulyMissing.length} missing skills`}
              </button>
              <span className="text-xs text-muted-foreground">Add these to your resume to improve match rate</span>
            </div>
          )}
        </div>
      )}

      {activeTab === "highlighted" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/30 inline-block border border-emerald-500/50" />
              Matched in resume
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500/30 inline-block border border-red-500/50" />
              Missing from resume
            </span>
          </div>

          {/* All matched skills */}
          <div>
            <h4 className="text-sm font-bold text-emerald-500 mb-2">✓ Matched Skills ({hardMatched.length})</h4>
            <div className="flex flex-wrap gap-2">
              {hardMatched.map((kw: any, i: number) => {
                const count = kw.resume_occurrence_count || kw.jd_occurrence_count;
                return (
                  <span key={i} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg text-sm font-medium">
                    {getSkillLabel(kw)} {count > 1 ? `(${count})` : ''}
                  </span>
                );
              })}
            </div>
          </div>

          {/* All missing skills */}
          {trulyMissing.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-red-500 mb-2">✗ Missing Skills ({trulyMissing.length})</h4>
              <div className="flex flex-wrap gap-2">
                {trulyMissing.map((kw: any, i: number) => {
                  const count = kw.jd_occurrence_count || 1;
                  return (
                    <span key={i} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/25 rounded-lg text-sm font-medium">
                      {kw.skill || kw.keyword} {count > 1 ? `(${count})` : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Noise Filtered Indicator */}
      {noiseFiltered.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-start gap-3 text-muted-foreground bg-muted/20 p-3 rounded-xl">
            <Search className="h-4 w-4 mt-0.5 opacity-50" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">Filtered for Accuracy</p>
              <p className="text-xs opacity-80 leading-relaxed">
                The ATS Intelligence Engine ignored {noiseFiltered.length} generic phrases from the JD (e.g., "{noiseFiltered[0]?.skill || 'various tasks'}", "{noiseFiltered[1]?.skill || 'team player'}") to prevent keyword inflation and provide an honest assessment of your actual skills.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
