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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <List className="h-5 w-5 text-slate-400" /> Section Analysis
        </h2>
        <div className="text-right">
          <p className="text-xs text-slate-500">Order score</p>
          <p className={`text-lg font-bold ${ordering_score >= 75 ? "text-emerald-600" : ordering_score >= 50 ? "text-amber-600" : "text-red-600"}`}>{ordering_score}%</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5 mb-4">
        {EXPECTED.map(name => {
          const present = detectedNames.has(name);
          const section = detected.find((d: any) => d.name === name);
          return (
            <div key={name} className={`flex items-center gap-2 p-2 rounded-lg ${present ? "bg-emerald-50" : "bg-red-50"}`}>
              {present
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              }
              <span className={`text-sm flex-1 ${present ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                {SECTION_LABELS[name] || name}
              </span>
              {present && section && (
                <span className="text-xs text-slate-400">{section.word_count}w</span>
              )}
              {present && section && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  section.confidence >= 0.9 ? "bg-emerald-100 text-emerald-600" :
                  section.confidence >= 0.7 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
                }`}>{Math.round(section.confidence * 100)}%</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Word count bars for detected sections */}
      {detected.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Section Lengths</p>
          <div className="space-y-2">
            {detected.map((s: any) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                  <span>{SECTION_LABELS[s.name] || s.name}</span>
                  <span>{s.word_count} words</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full">
                  <div
                    className={`h-full rounded-full ${s.word_count < 30 ? "bg-amber-400" : s.word_count > 600 ? "bg-red-400" : "bg-blue-400"}`}
                    style={{ width: `${Math.min((s.word_count / maxWords) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ordering_feedback && (
        <p className="text-xs text-slate-600 p-2 bg-blue-50 rounded-lg border border-blue-200 mb-3">{ordering_feedback}</p>
      )}

      {length_warnings.length > 0 && (
        <div className="space-y-1">
          {length_warnings.map((w: string, i: number) => (
            <p key={i} className="text-xs text-amber-700 p-2 bg-amber-50 border border-amber-200 rounded-lg">⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
