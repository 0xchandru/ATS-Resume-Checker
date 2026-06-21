import { AlertTriangle, CheckCircle2, XCircle, ChevronRight, AlertOctagon, Target } from "lucide-react";
import { AnalysisResult } from "../../App";

interface Props {
  result: AnalysisResult;
}

const FIT_CONFIG: Record<string, { gradient: string; border: string; badge: string; badgeText: string }> = {
  strong_fit: {
    gradient: "from-emerald-500/10 to-emerald-500/5",
    border: "border-emerald-500/20",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    badgeText: "Strong",
  },
  good_fit: {
    gradient: "from-blue-500/10 to-blue-500/5",
    border: "border-blue-500/20",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    badgeText: "Good",
  },
  stretch_fit: {
    gradient: "from-amber-500/10 to-amber-500/5",
    border: "border-amber-500/20",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    badgeText: "Stretch",
  },
  poor_fit: {
    gradient: "from-red-500/10 to-red-500/5",
    border: "border-red-500/20",
    badge: "bg-red-500/15 text-red-400 border-red-500/25",
    badgeText: "Poor",
  },
  unqualified: {
    gradient: "from-red-500/12 to-red-500/5",
    border: "border-red-500/25",
    badge: "bg-red-500/15 text-red-400 border-red-500/25",
    badgeText: "Unqualified",
  },
};

const ICON_MAP: Record<string, any> = {
  strong_fit: CheckCircle2,
  good_fit: CheckCircle2,
  stretch_fit: AlertTriangle,
  poor_fit: AlertOctagon,
  unqualified: XCircle,
};

const ICON_COLOR: Record<string, string> = {
  strong_fit: "text-emerald-400",
  good_fit: "text-blue-400",
  stretch_fit: "text-amber-400",
  poor_fit: "text-red-400",
  unqualified: "text-red-400",
};

export default function RoleFitVerdict({ result }: Props) {
  if (!result.role_fit) return null;
  const { role_fit } = result;

  const config = FIT_CONFIG[role_fit.fit_level] || FIT_CONFIG.good_fit;
  const Icon = ICON_MAP[role_fit.fit_level] || CheckCircle2;
  const iconColor = ICON_COLOR[role_fit.fit_level] || "text-blue-400";

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${config.gradient} ${config.border} overflow-hidden`} data-testid="verdict-card">
      {/* Header row */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-white/[0.05] border border-white/[0.07]`}>
            <Target className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Verdict</p>
            <h2 className="text-lg font-black text-foreground">{role_fit.fit_label}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-bold border ${config.badge}`}>
            {config.badgeText}
          </span>
          <div className="text-center">
            <span className="text-2xl font-black text-foreground">{role_fit.fit_score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4">
        <p className="text-sm text-foreground/85 leading-relaxed">
          {role_fit.summary}
        </p>
      </div>

      {/* What matches / What doesn't */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 px-6 pb-5">
        <div className="bg-white/[0.03] border border-emerald-500/10 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> What Matches
          </p>
          <ul className="space-y-2">
            {role_fit.honest_assessment?.what_matches?.slice(0, 5).map((item: string, i: number) => (
              <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white/[0.03] border border-red-500/10 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5" /> What's Missing
          </p>
          <ul className="space-y-2">
            {role_fit.honest_assessment?.what_doesnt?.slice(0, 5).map((item: string, i: number) => (
              <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-red-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      {role_fit.recommendations && role_fit.recommendations.length > 0 && (
        <div className="px-6 pb-5 pt-0 border-t border-white/[0.05]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-4 mb-3">Recommendations</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {role_fit.recommendations.slice(0, 4).map((rec: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground/75 bg-white/[0.03] border border-white/[0.05] rounded-lg p-3">
                <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-violet-400 shrink-0" />
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
