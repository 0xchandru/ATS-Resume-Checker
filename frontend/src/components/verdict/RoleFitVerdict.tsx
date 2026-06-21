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
    <div className={`mb-8 rounded-2xl border backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${colorClass} bg-opacity-40`}>
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="mt-1 bg-background/60 p-3 rounded-2xl shadow-sm border border-current/10">
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
              <h2 className="text-2xl font-black tracking-tight">Role Fit: {role_fit.fit_label}</h2>
              <div className="flex items-center gap-2 text-sm font-bold bg-background/60 px-4 py-1.5 rounded-full border border-current/10 shadow-sm">
                <span className="opacity-80">Fit Score:</span>
                <span className="text-base tabular-nums">{role_fit.fit_score}/100</span>
              </div>
            </div>
            <p className="text-base font-medium opacity-90 leading-relaxed mb-6 max-w-3xl">
              {role_fit.summary}
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <div className="bg-background/40 p-5 rounded-2xl border border-current/10">
                <p className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                  <CheckCircle2 className="h-4 w-4" /> What Matches
                </p>
                <ul className="space-y-2.5">
                  {role_fit.honest_assessment?.what_matches?.map((item: string, i: number) => (
                    <li key={i} className="text-sm font-medium flex items-start gap-3 opacity-90">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-background/40 p-5 rounded-2xl border border-current/10">
                <p className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                  <AlertTriangle className="h-4 w-4" /> What Doesn't
                </p>
                <ul className="space-y-2.5">
                  {role_fit.honest_assessment?.what_doesnt?.map((item: string, i: number) => (
                    <li key={i} className="text-sm font-medium flex items-start gap-3 opacity-90">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {role_fit.recommendations && role_fit.recommendations.length > 0 && (
              <div className="mt-6 pt-6 border-t border-current/10">
                <p className="text-xs font-black uppercase tracking-widest mb-4 opacity-80">Recommendations</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {role_fit.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm font-medium flex items-start gap-2.5 opacity-90 bg-background/30 p-3 rounded-xl border border-current/5">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
