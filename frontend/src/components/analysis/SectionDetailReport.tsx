import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { scoreToColor } from "../../utils/formatters";

interface Props {
  sections: any;
  keywords: any;
  feedback: any[];
}

const SECTION_META: Record<string, { label: string; desc: string; emoji: string }> = {
  contact_info: { label: "Contact Info", emoji: "📇", desc: "Name, email, phone, LinkedIn, location" },
  summary:      { label: "Professional Summary", emoji: "✍️", desc: "2–4 sentence career overview targeting the role" },
  experience:   { label: "Work Experience", emoji: "💼", desc: "Roles with quantified impact bullets" },
  education:    { label: "Education", emoji: "🎓", desc: "Degrees, institutions, graduation dates" },
  skills:       { label: "Skills", emoji: "🛠", desc: "Technical and soft skills relevant to the JD" },
  projects:     { label: "Projects", emoji: "🧪", desc: "Side projects that demonstrate relevant skills" },
  certifications: { label: "Certifications", emoji: "🏆", desc: "Industry certifications and credentials" },
  awards:       { label: "Awards", emoji: "🥇", desc: "Recognition and achievements" },
  languages:    { label: "Languages", emoji: "🌐", desc: "Spoken/written languages with proficiency" },
  volunteer:    { label: "Volunteer", emoji: "🤝", desc: "Community involvement and leadership" },
};

const SECTION_BENCHMARKS: Record<string, { min: number; max: number }> = {
  summary:    { min: 40,  max: 120 },
  experience: { min: 150, max: 600 },
  education:  { min: 20,  max: 150 },
  skills:     { min: 30,  max: 200 },
  projects:   { min: 50,  max: 300 },
};

function wordCountWarning(name: string, count: number): string | null {
  const bench = SECTION_BENCHMARKS[name];
  if (!bench) return null;
  if (count < bench.min) return `Too short (${count} words, aim for ${bench.min}+).`;
  if (count > bench.max) return `Very long (${count} words, consider trimming to ~${bench.max}).`;
  return null;
}

function SectionCard({ section, sectionFeedback }: { section: any; sectionFeedback: any[] }) {
  const [open, setOpen] = useState(false);
  const meta = SECTION_META[section.name] || { label: section.name, emoji: "📄", desc: "" };
  const wcWarn = wordCountWarning(section.name, section.word_count || 0);
  const critFeedback = sectionFeedback.filter(f => f.priority === "critical");
  const otherFeedback = sectionFeedback.filter(f => f.priority !== "critical");
  const totalIssues = sectionFeedback.length + (wcWarn ? 1 : 0);
  const health = totalIssues === 0 ? "good" : totalIssues <= 2 ? "warn" : "bad";
  const healthColor = health === "good" ? "#10b981" : health === "warn" ? "#f59e0b" : "#ef4444";

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${health === "bad" ? "border-red-500/30" : health === "warn" ? "border-amber-500/30" : "border-border"}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/[0.01] hover:bg-white/[0.04] transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-base w-6 text-center">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{meta.label}</span>
            {totalIssues > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: `${healthColor}20`, color: healthColor }}>
                {totalIssues} issue{totalIssues > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta.desc}</p>
        </div>
        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">{section.word_count || 0} words</p>
            <p className="text-xs text-muted-foreground">{Math.round((section.confidence || 0) * 100)}% conf.</p>
          </div>
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: healthColor, boxShadow: `0 0 4px ${healthColor}80` }}
          />
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 bg-white/[0.01] space-y-3 border-t border-white/[0.05]">
          {/* Word count metric + warning */}
          <div className="flex items-center gap-4 pt-3">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-center">
              <p className="text-base font-black text-foreground tabular-nums">{section.word_count || 0}</p>
              <p className="text-xs text-muted-foreground">words</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-center">
              <p className="text-base font-black text-foreground tabular-nums">{Math.round((section.confidence || 0) * 100)}%</p>
              <p className="text-xs text-muted-foreground">confidence</p>
            </div>
            {section.keyword_density != null && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-center">
                <p className="text-base font-bold" style={{ color: scoreToColor(Math.round(section.keyword_density * 100)) }}>
                  {Math.round(section.keyword_density * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">kw density</p>
              </div>
            )}
          </div>

          {/* Word count warning */}
          {wcWarn && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/90">{wcWarn}</p>
            </div>
          )}

          {/* Critical feedback for this section */}
          {critFeedback.map((f, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{f.message}</p>
                {f.action && <p className="text-xs text-muted-foreground mt-1">→ {f.action}</p>}
              </div>
            </div>
          ))}
          {otherFeedback.map((f, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-violet-500/8 border border-violet-500/15 rounded-lg">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground/90">{f.message}</p>
                {f.action && <p className="text-xs text-muted-foreground mt-1">→ {f.action}</p>}
              </div>
            </div>
          ))}

          {/* All clear */}
          {totalIssues === 0 && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-emerald-400">Section looks good — no issues detected.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MissingCard({ name }: { name: string }) {
  const meta = SECTION_META[name] || { label: name, emoji: "📄", desc: "Add this section to improve your resume." };
  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 flex items-center gap-3">
      <span className="text-base w-6 text-center opacity-40">{meta.emoji}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{meta.label}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">Missing</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
      </div>
      <XCircle className="h-4 w-4 text-red-500/60 flex-shrink-0" />
    </div>
  );
}

export default function SectionDetailReport({ sections, keywords: _kw, feedback }: Props) {
  if (!sections) return null;
  const { detected = [], missing = [], ordering_feedback, length_warnings = [] } = sections;
  const [showAll, setShowAll] = useState(false);

  const visibleDetected = showAll ? detected : detected.slice(0, 5);

  function feedbackForSection(sectionName: string) {
    if (!feedback) return [];
    return feedback.filter(f => {
      const cat = (f.category || "").toLowerCase();
      return cat === sectionName || cat.includes(sectionName.split("_")[0]);
    });
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="text-primary">§</span> Section-by-Section Report
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-emerald-500 font-semibold">{detected.length} detected</span>
          {missing.length > 0 && (
            <><span>·</span><span className="text-red-500 font-semibold">{missing.length} missing</span></>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        {/* Detected sections */}
        {visibleDetected.map((s: any) => (
          <SectionCard key={s.name} section={s} sectionFeedback={feedbackForSection(s.name)} />
        ))}

        {detected.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
          >
            {showAll ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showAll ? "Show fewer sections" : `Show ${detected.length - 5} more sections`}
          </button>
        )}

        {/* Missing sections */}
        {missing.length > 0 && (
          <>
            <div className="pt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Missing Sections</p>
              <div className="space-y-2">
                {(typeof missing[0] === "string" ? missing : missing.map((m: any) => m.name || m)).map((name: string) => (
                  <MissingCard key={name} name={name} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Ordering feedback */}
        {ordering_feedback && (
          <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/90">{ordering_feedback}</p>
          </div>
        )}

        {/* Length warnings */}
        {length_warnings.map((w: string, i: number) => (
          <div key={i} className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/90">{w}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
