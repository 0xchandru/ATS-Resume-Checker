import { CheckCircle2, XCircle, List, AlertTriangle, Lightbulb } from "lucide-react";

interface Props {
  sections: any;
}

const SECTION_LABELS: Record<string, string> = {
  contact_info: "Contact Info", summary: "Professional Summary", experience: "Experience",
  education: "Education", skills: "Skills", projects: "Projects",
  certifications: "Certifications", awards: "Awards", languages: "Languages",
  volunteer: "Volunteer", publications: "Publications",
};

const EXPECTED = ["contact_info", "summary", "experience", "education", "skills", "projects", "certifications"];

export default function SectionAnalysis({ sections }: Props) {
  if (!sections) return null;
  const { detected = [], missing = [], ordering_score, ordering_feedback, length_warnings = [] } = sections;
  const detectedNames = new Set(detected.map((d: any) => d.name));
  const maxWords = Math.max(...detected.map((d: any) => d.word_count || 0), 1);

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <List className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Section Analysis</h2>
            <p className="text-xs text-muted-foreground mt-0.5">ATS document segmentation</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">Structure Score</p>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${ordering_score}%`,
                  background: ordering_score >= 75 ? "#10b981" : ordering_score >= 50 ? "#f59e0b" : "#ef4444"
                }}
              />
            </div>
            <p className="text-xl font-black tabular-nums" style={{
              color: ordering_score >= 75 ? "#10b981" : ordering_score >= 50 ? "#f59e0b" : "#ef4444"
            }}>
              {ordering_score}%
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Section checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {EXPECTED.map(name => {
            const present = detectedNames.has(name);
            const section = detected.find((d: any) => d.name === name);
            return (
              <div key={name} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                present
                  ? "bg-emerald-500/8 border-emerald-500/15"
                  : "bg-red-500/8 border-red-500/15"
              }`}>
                <div className={`p-1.5 rounded-full shrink-0 ${present ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                  {present
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    : <XCircle className="h-3.5 w-3.5 text-red-400" />
                  }
                </div>
                <div className="flex-1">
                  <span className={`text-sm font-semibold ${present ? "text-foreground/90" : "text-foreground/50"}`}>
                    {SECTION_LABELS[name] || name}
                  </span>
                  {!present && <p className="text-[10px] text-red-400/70 font-semibold">Missing section</p>}
                </div>
                {present && section && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0">
                    {section.word_count}w
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Section length bars */}
        {detected.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-xl">
            <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-4">Section Lengths</p>
            <div className="space-y-3.5">
              {detected.map((s: any) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-muted-foreground">{SECTION_LABELS[s.name] || s.name}</span>
                    <span className="font-mono text-muted-foreground/60 tabular-nums">{s.word_count} words</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min((s.word_count / maxWords) * 100, 100)}%`,
                        background: s.word_count < 30 ? "#f59e0b" : s.word_count > 600 ? "#ef4444" : "#7c3aed"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ordering feedback and length warnings */}
        <div className="space-y-2">
          {ordering_feedback && (
            <div className="flex items-start gap-3 p-3.5 bg-blue-500/8 rounded-xl border border-blue-500/15">
              <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/80 leading-relaxed">{ordering_feedback}</p>
            </div>
          )}
          {length_warnings.map((w: string, i: number) => (
            <div key={i} className="flex items-start gap-3 p-3.5 bg-amber-500/8 rounded-xl border border-amber-500/15">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/80 leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
