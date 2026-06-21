import { useState, useMemo } from "react";
import { Copy, Check, Search, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  keywords: any;
  resumeText: string;
  jdText: string;
  resumeFull?: string;
  jdFull?: string;
  result?: any;
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

function SkillPill({ label, matched, matchType }: { label: string; matched: boolean; matchType?: string }) {
  const typeLabels: Record<string, string> = {
    exact_match: "Exact",
    normalized_match: "Alias",
    inferred_match: "Inferred",
    unsupported_claim: "Weak",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
      matched
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-red-500/8 text-red-400 border-red-500/18"
    }`}>
      {label}
      {matchType && typeLabels[matchType] && (
        <span className={`text-[8px] uppercase font-black px-1 py-0.5 rounded ${
          matched ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
        }`}>
          {typeLabels[matchType]}
        </span>
      )}
    </span>
  );
}

function HighlightedPanel({
  title, text, matchedSet, missingSet,
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
      if (matchedSet.has(lower)) return <mark key={i} className="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5 font-semibold not-italic">{part}</mark>;
      if (missingSet?.has(lower)) return <mark key={i} className="bg-red-500/20 text-red-400 rounded-sm px-0.5 font-semibold not-italic">{part}</mark>;
      return <span key={i}>{part}</span>;
    });
  }, [displayText, matchedSet, missingSet]);

  return (
    <div className="flex-1 min-w-0">
      <h4 className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-2">{title}</h4>
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 max-h-96 overflow-y-auto">
        <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-wrap font-mono text-xs">{highlighted}</p>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-3 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Show less" : "Show full content"}
          </button>
        )}
      </div>
    </div>
  );
}

function getSkillLabel(skill: any): string {
  if (typeof skill === "string") return skill;
  if (!skill || typeof skill !== "object") return "Unknown";
  return (
    (typeof skill.keyword === "string" && skill.keyword) ||
    (typeof skill.term === "string" && skill.term) ||
    (typeof skill.canonical === "string" && skill.canonical) ||
    (typeof skill.jd_keyword === "string" && skill.jd_keyword) ||
    (typeof skill.matched_form === "string" && skill.matched_form) ||
    (typeof skill.normalized_form === "string" && skill.normalized_form) ||
    "Unknown"
  );
}

export default function HardSkillsSection({ keywords, resumeText, jdText, resumeFull, jdFull, result }: Props) {
  if (!keywords) return null;

  const { matched = [], match_rate } = keywords;
  const [activeTab, setActiveTab] = useState<"comparison" | "highlighted">("comparison");

  const isHardSkill = (skill: any) => {
    const cat = skill?.category?.toLowerCase?.() || "";
    return !["soft_skill", "transversal", "social", "competency", "other_skill", "other"].includes(cat);
  };

  const hardMatched = matched.filter(isHardSkill);
  const rawTrulyMissing = result?.role_fit?.honest_assessment?.truly_missing || keywords.missing || [];
  const trulyMissing = rawTrulyMissing.filter(isHardSkill);
  const noiseFiltered = result?.role_fit?.honest_assessment?.noise_filtered || [];

  const matchedSet = useMemo(
    () => new Set<string>(
      hardMatched.map((m: any) => (typeof m?.keyword === "string" ? m.keyword.toLowerCase() : "")).filter(Boolean)
    ),
    [hardMatched]
  );

  const missingSet = useMemo(
    () => new Set<string>(
      trulyMissing.map((m: any) => {
        const v = m?.skill || m?.keyword;
        return typeof v === "string" ? v.toLowerCase() : "";
      }).filter(Boolean)
    ),
    [trulyMissing]
  );

  const { copied: copiedAll, copy: copyAll } = useCopy(
    () => trulyMissing.map((m: any) => m?.skill || m?.keyword || "").filter(Boolean).join(", ")
  );

  const matchPercent = Math.round((match_rate || 0) * 100);
  const total = hardMatched.length + trulyMissing.length;

  return (
    <div id="hard-skills" className="scroll-mt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-black text-foreground">Hard Skills</h2>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
            {hardMatched.length} matched
          </span>
          {trulyMissing.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
              {trulyMissing.length} missing
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="text-xs text-muted-foreground">{matchPercent}% match</div>
          <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${matchPercent}%`,
                background: matchPercent >= 70 ? "#10b981" : matchPercent >= 45 ? "#f59e0b" : "#ef4444"
              }}
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground/80">Tip:</strong> Match skills in your resume to the exact spelling in the job description. Prioritize frequently-mentioned skills.
      </p>

      {/* Sub-tabs */}
      <div className="flex border-b border-white/[0.06] mb-5">
        {[
          { id: "comparison" as const, label: "Skills Comparison" },
          { id: "highlighted" as const, label: "Highlighted Skills" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors relative ${
              activeTab === tab.id ? "text-foreground tab-active" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "comparison" && (
        <div className="space-y-5">
          {/* All skill pills */}
          <div className="flex flex-wrap gap-2">
            {hardMatched.slice(0, 20).map((skill: any, i: number) => (
              <SkillPill key={i} label={getSkillLabel(skill)} matched={true} matchType={skill.match_type} />
            ))}
            {trulyMissing.slice(0, 15).map((skill: any, i: number) => (
              <SkillPill key={`m-${i}`} label={skill.skill || skill.keyword || "Unknown"} matched={false} />
            ))}
          </div>

          {/* Side-by-side panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HighlightedPanel title="Resume" text={resumeFull || resumeText || ""} matchedSet={matchedSet} />
            <HighlightedPanel title="Job Description" text={jdFull || jdText || ""} matchedSet={matchedSet} missingSet={missingSet} />
          </div>

          {trulyMissing.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold hover:opacity-90 transition-all shadow-md shadow-violet-500/20"
              >
                {copiedAll ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedAll ? "Copied!" : `Copy ${trulyMissing.length} missing skills`}
              </button>
              <span className="text-xs text-muted-foreground">Add these to your resume to improve your score</span>
            </div>
          )}
        </div>
      )}

      {activeTab === "highlighted" && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/25 border border-emerald-500/40 inline-block" />
              Matched
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500/25 border border-red-500/40 inline-block" />
              Missing
            </span>
          </div>

          {hardMatched.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">✓ Matched ({hardMatched.length})</h4>
              <div className="flex flex-wrap gap-2">
                {hardMatched.map((kw: any, i: number) => {
                  const count = kw.resume_occurrence_count || kw.jd_occurrence_count;
                  return (
                    <span key={i} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium">
                      {getSkillLabel(kw)}{count > 1 ? ` ×${count}` : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {trulyMissing.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">✗ Missing ({trulyMissing.length})</h4>
              <div className="flex flex-wrap gap-2">
                {trulyMissing.map((kw: any, i: number) => {
                  const count = kw.jd_occurrence_count || 1;
                  return (
                    <span key={i} className="px-3 py-1.5 bg-red-500/8 text-red-400 border border-red-500/18 rounded-lg text-xs font-medium">
                      {kw.skill || kw.keyword}{count > 1 ? ` ×${count}` : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {noiseFiltered.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/[0.05]">
          <div className="flex items-start gap-3 text-muted-foreground bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl">
            <Search className="h-4 w-4 mt-0.5 opacity-50 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-60">Filtered for Accuracy</p>
              <p className="text-xs opacity-70 leading-relaxed">
                {noiseFiltered.length} generic phrases ignored (e.g., "{noiseFiltered[0]?.skill || 'various tasks'}") to prevent keyword inflation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
