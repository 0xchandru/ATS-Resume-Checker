import { Zap } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Legend, Tooltip, PieChart, Pie, Cell } from "recharts";

interface Props {
  actionVerbs: any;
}

const CATEGORY_COLORS: Record<string, string> = {
  leadership: "#8b5cf6",
  technical: "#3b82f6",
  analytical: "#06b6d4",
  communication: "#10b981",
  generic: "#94a3b8",
};

const STRENGTH_LABELS = ["", "Weak", "Medium", "Strong"];

export default function ActionVerbPanel({ actionVerbs }: Props) {
  if (!actionVerbs) return null;
  const { profile = {}, weak_verbs = [], strong_verb_ratio = 0, seniority_verb_alignment, alignment_note, suggestions = [] } = actionVerbs;

  const totalVerbs = Object.values(profile).reduce((a: any, b: any) => a + b, 0) as number;

  const pieData = Object.entries(profile)
    .filter(([, v]) => (v as number) > 0)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value as number,
      color: CATEGORY_COLORS[key] || "#94a3b8",
    }));

  const ratioPercent = Math.round(strong_verb_ratio * 100);
  const ratioColor = ratioPercent >= 60 ? "#10b981" : ratioPercent >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
        <Zap className="h-5 w-5 text-amber-500" /> Action Verb Analysis
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie chart */}
        <div className="lg:col-span-1">
          <p className="text-sm font-semibold text-slate-600 mb-2 text-center">Verb Categories</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} verbs`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Strength ratio */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center">
          <div className="relative">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle cx="60" cy="60" r="48" fill="none" stroke={ratioColor} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={2 * Math.PI * 48 * (1 - strong_verb_ratio)}
                transform="rotate(-90 60 60)" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold" style={{ color: ratioColor }}>{ratioPercent}%</p>
              <p className="text-xs text-slate-500">Strong</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 text-center mt-2 font-medium">Strong Verb Ratio</p>
          {ratioPercent < 60 && <p className="text-xs text-amber-600 mt-1 text-center">Target: 60%+</p>}
          {!seniority_verb_alignment && alignment_note && (
            <p className="text-xs text-red-600 mt-2 text-center bg-red-50 p-2 rounded-lg border border-red-200">{alignment_note}</p>
          )}
        </div>

        {/* Weak verbs & suggestions */}
        <div className="lg:col-span-1">
          {weak_verbs.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-600 mb-2">Weak Verbs Found</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {weak_verbs.map((wv: any, i: number) => (
                  <div key={i} className="p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-700 capitalize">{wv.verb}</p>
                    {wv.context && <p className="text-xs text-slate-500 mt-0.5 truncate">"{wv.context}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {suggestions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">Suggestions</p>
              <div className="space-y-1.5">
                {suggestions.map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">→</span>
                    <p className="text-xs text-slate-700">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
