import { CheckCircle2, XCircle, List } from "lucide-react";

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
    <div className="bg-card/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <List className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Section Analysis</h2>
              <p className="text-xs text-muted-foreground mt-0.5">ATS document segmentation</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Structure Score</p>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${ordering_score >= 75 ? "bg-emerald-500" : ordering_score >= 50 ? "bg-amber-500" : "bg-red-500"}`} 
                  style={{ width: `${ordering_score}%` }} 
                />
              </div>
              <p className={`text-xl font-black tabular-nums ${ordering_score >= 75 ? "text-emerald-600 dark:text-emerald-400" : ordering_score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{ordering_score}%</p>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {EXPECTED.map(name => {
            const present = detectedNames.has(name);
            const section = detected.find((d: any) => d.name === name);
            return (
              <div key={name} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${present ? "bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/30" : "bg-red-500/5 border-red-500/20 dark:bg-red-500/10 dark:border-red-500/30"}`}>
                <div className={`p-1.5 rounded-full ${present ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                  {present
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    : <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  }
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <span className={`text-sm font-semibold ${present ? "text-foreground" : "text-muted-foreground"}`}>
                    {SECTION_LABELS[name] || name}
                  </span>
                  {!present && <span className="text-[10px] text-red-500/80 font-medium">Missing section</span>}
                </div>
                {present && section && (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono font-medium text-emerald-600/80 dark:text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md">{section.word_count}w</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Word count bars for detected sections */}
        {detected.length > 0 && (
          <div className="mb-6 bg-muted/30 p-5 rounded-2xl border border-border/50">
            <p className="text-xs font-bold text-foreground/70 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/60"></span>
              Section Lengths
            </p>
            <div className="space-y-4">
              {detected.map((s: any) => (
                <div key={s.name} className="group">
                  <div className="flex justify-between text-xs mb-1.5 transition-colors group-hover:text-foreground">
                    <span className="font-medium text-muted-foreground group-hover:text-foreground">{SECTION_LABELS[s.name] || s.name}</span>
                    <span className="font-mono text-muted-foreground">{s.word_count} words</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden border border-border/50">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${s.word_count < 30 ? "from-amber-500 to-amber-400" : s.word_count > 600 ? "from-red-500 to-red-400" : "from-primary/80 to-primary"}`}
                      style={{ width: `${Math.min((s.word_count / maxWords) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {ordering_feedback && (
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <span className="text-lg">💡</span>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 leading-relaxed">{ordering_feedback}</p>
            </div>
          )}

          {length_warnings.length > 0 && length_warnings.map((w: string, i: number) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300 leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
