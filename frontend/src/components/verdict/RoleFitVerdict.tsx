import { AlertTriangle, CheckCircle2, XCircle, ChevronRight, AlertOctagon } from "lucide-react";
import { AnalysisResult } from "../../App";

interface Props {
  result: AnalysisResult;
}

const COLOR_MAP: Record<string, string> = {
  green: "bg-emerald-500/15 border-emerald-500/30 text-emerald-500",
  blue: "bg-blue-500/15 border-blue-500/30 text-blue-500",
  amber: "bg-amber-500/15 border-amber-500/30 text-amber-500",
  red: "bg-red-500/15 border-red-500/30 text-red-500",
};

const ICON_MAP: Record<string, any> = {
  strong_fit: CheckCircle2,
  good_fit: CheckCircle2,
  stretch_fit: AlertTriangle,
  poor_fit: AlertOctagon,
  unqualified: XCircle,
};

export default function RoleFitVerdict({ result }: Props) {
  if (!result.role_fit) return null;

  const { role_fit } = result;
  const Icon = ICON_MAP[role_fit.fit_level] || CheckCircle2;
  const colorClass = COLOR_MAP[role_fit.fit_color] || COLOR_MAP.blue;

  return (
    <div className={`mb-6 rounded-2xl border p-5 ${colorClass}`}>
      <div className="flex items-start gap-4">
        <div className="mt-1 bg-background/50 p-2 rounded-xl backdrop-blur-sm shadow-sm shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h2 className="text-lg font-bold">Role Fit: {role_fit.fit_label}</h2>
            <div className="flex items-center gap-2 text-xs font-semibold bg-background/50 px-2.5 py-1 rounded-full border border-current/20">
              <span>Fit Score:</span>
              <span className="text-sm">{role_fit.fit_score}/100</span>
            </div>
            {role_fit.evidence_grade && (
              <div className="text-xs font-semibold bg-background/50 px-2.5 py-1 rounded-full border border-current/20">
                Evidence: {role_fit.evidence_grade}
              </div>
            )}
          </div>

          <p className="text-sm opacity-90 leading-relaxed mb-4">{role_fit.summary}</p>

          {role_fit.seniority_statement && (
            <p className="text-xs opacity-75 italic mb-4 border-l-2 border-current/30 pl-3">
              {role_fit.seniority_statement}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-background/40 p-4 rounded-xl border border-current/10">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 opacity-80">
                <CheckCircle2 className="h-3.5 w-3.5" /> What Matches
              </p>
              <ul className="space-y-1.5">
                {(role_fit.honest_assessment?.what_matches ?? []).map((item: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2 opacity-90">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 opacity-80">
                <AlertTriangle className="h-3.5 w-3.5" /> What Doesn't
              </p>
              <ul className="space-y-1.5">
                {(role_fit.honest_assessment?.what_doesnt ?? []).map((item: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2 opacity-90">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {(role_fit.recommendations ?? []).length > 0 && (
            <div className="mt-4 pt-4 border-t border-current/20">
              <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Recommendations</p>
              <ul className="space-y-1">
                {role_fit.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2 opacity-90">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
