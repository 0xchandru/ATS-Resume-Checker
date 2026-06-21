import { useState, useMemo } from "react";
import { Copy, Check, Search } from "lucide-react";

interface Props {
  keywords: any;
  resumeText: string;
  jdText: string;
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

function SkillChip({ label, matched }: { label: string; matched: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
        matched
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
          : "bg-muted text-muted-foreground border-border"
      }`}
    >
      {label}
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
  const highlighted = useMemo(() => {
    if (!text) return text;
    const allKw = [...matchedSet, ...(missingSet || [])].sort((a, b) => b.length - a.length);
    if (allKw.length === 0) return text;
    const escaped = allKw.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    return text.split(regex).map((part, i) => {
      const lower = part.toLowerCase();
      if (matchedSet.has(lower)) {
        return <mark key={i} className="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5 font-semibold not-italic">{part}</mark>;
      }
      if (missingSet?.has(lower)) {
        return <mark key={i} className="bg-red-500/20 text-red-400 rounded-sm px-0.5 font-semibold not-italic">{part}</mark>;
      }
      return <span key={i}>{part}</span>;
    });
  }, [text, matchedSet, missingSet]);

  return (
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-bold text-foreground mb-3">{title}</h4>
      <div className="bg-muted/30 border border-border rounded-xl p-4 max-h-80 overflow-y-auto">
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">{highlighted}</p>
      </div>
    </div>
  );
}

interface ExtendedProps extends Props {
  roleFit?: {
    honest_assessment?: {
      truly_missing?: any[];
      noise_filtered?: any[];
    };
  };
}

export default function HardSkillsSection({ keywords, resumeText, jdText, roleFit }: ExtendedProps) {
  if (!keywords) return null;

  const { matched = [], missing = [], matched_count, total_jd_keywords, match_rate } = keywords;
  const [activeTab, setActiveTab] = useState<"comparison" | "highlighted">("comparison");

  const trulyMissing: any[] = roleFit?.honest_assessment?.truly_missing ?? missing;
  const noiseFiltered: any[] = roleFit?.honest_assessment?.noise_filtered ?? [];

  const matchedSet = useMemo(() => new Set<string>(matched.map((m: any) => m.keyword.toLowerCase())), [matched]);
  const missingSet = useMemo(() => new Set<string>(trulyMissing.map((m: any) => (m.keyword || m).toLowerCase())), [trulyMissing]);

  const matchPercent = Math.round((match_rate || 0) * 100);
  const { copied: copiedAll, copy: copyAll } = useCopy(() => trulyMissing.map((m: any) => m.keyword || m).join(", "));

  // Separate hard skills (technical keywords)
  const allSkills = [...matched.map((m: any) => ({ ...m, isMatched: true })), ...missing.map((m: any) => ({ ...m, isMatched: false }))];

  return (
    <div id="hard-skills" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-black text-foreground">Hard Skills</h2>
        <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-lg">
          {matched_count || 0} of {total_jd_keywords || 0} matched
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
            className={`px-5 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab.id
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
            {allSkills.slice(0, 30).map((skill: any, i: number) => (
              <SkillChip
                key={i}
                label={skill.keyword || skill.term}
                matched={skill.isMatched}
              />
            ))}
          </div>

          {/* Side by side resume vs JD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HighlightedPanel
              title="Resume:"
              text={resumeText || ""}
              matchedSet={matchedSet}
            />
            <HighlightedPanel
              title="Job Description:"
              text={jdText || ""}
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
            <h4 className="text-sm font-bold text-emerald-500 mb-2">✓ Matched Skills ({matched.length})</h4>
            <div className="flex flex-wrap gap-2">
              {matched.map((kw: any, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg text-sm font-medium">
                  {kw.keyword}
                </span>
              ))}
            </div>
          </div>

          {/* Truly missing skills */}
          {trulyMissing.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-red-500 mb-2">✗ Missing Skills ({trulyMissing.length})</h4>
              <div className="flex flex-wrap gap-2">
                {trulyMissing.map((kw: any, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/25 rounded-lg text-sm font-medium">
                    {kw.keyword || kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Noise filtered — JD fragments ignored as noise */}
          {noiseFiltered.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Filtered as noise ({noiseFiltered.length} JD fragments ignored)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {noiseFiltered.map((kw: any, i: number) => (
                  <span key={i} className="px-2 py-1 bg-muted text-muted-foreground border border-border rounded-md text-xs line-through opacity-60">
                    {kw.keyword || kw}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 opacity-70">
                These terms were removed from your match target — they're filler or generic words that don't reflect real skills.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
