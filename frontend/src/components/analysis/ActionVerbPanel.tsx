import { Zap } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Props { actionVerbs: any; }

const CATEGORY_COLORS: Record<string, string> = {
  leadership:    "#8b5cf6",
  technical:     "#3b82f6",
  analytical:    "#06b6d4",
  communication: "#10b981",
  generic:       "#64748b",
};

export default function ActionVerbPanel({ actionVerbs }: Props) {
  if (!actionVerbs) return null;
  const { profile = {}, weak_verbs = [], strong_verb_ratio = 0, seniority_verb_alignment, alignment_note, suggestions = [] } = actionVerbs;

  const pieData = Object.entries(profile)
    .filter(([, v]) => (v as number) > 0)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value as number,
      color: CATEGORY_COLORS[key] || "#94a3b8",
    }));

  const ratioPercent = Math.round(strong_verb_ratio * 100);
  const ratioColor = ratioPercent >= 60 ? "#10b981" : ratioPercent >= 40 ? "#f59e0b" : "#ef4444";
  const circ = 2 * Math.PI * 30;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <h2 className="text-sm font-black text-foreground/70 uppercase tracking-wider flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" /> Action Verb Analysis
        </h2>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie chart */}
          <div>
            <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest text-center mb-3">Verb Categories</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={34} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} verbs`, name]}
                    contentStyle={{ backgroundColor: "#11121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }}
                    labelStyle={{ color: "rgba(255,255,255,0.9)" }}
                    itemStyle={{ color: "rgba(255,255,255,0.6)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>

          {/* Strength ring */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <svg width="88" height="88" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="44" cy="44" r="30" fill="none" stroke={ratioColor} strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - strong_verb_ratio)}
                  transform="rotate(-90 44 44)"
                  style={{ filter: `drop-shadow(0 0 4px ${ratioColor}80)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-black tabular-nums" style={{ color: ratioColor }}>{ratioPercent}%</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground/80">Strong Verb Ratio</p>
              {ratioPercent < 60 && (
                <p className="text-xs text-amber-400 mt-0.5">Target: 60%+</p>
              )}
            </div>
            {!seniority_verb_alignment && alignment_note && (
              <p className="text-xs text-red-400 text-center bg-red-500/8 border border-red-500/15 p-2.5 rounded-xl leading-relaxed">{alignment_note}</p>
            )}
          </div>

          {/* Weak verbs & suggestions */}
          <div className="space-y-4">
            {weak_verbs.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-2">Weak Verbs</p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {weak_verbs.map((wv: any, i: number) => (
                    <div key={i} className="p-2.5 bg-red-500/8 border border-red-500/15 rounded-lg">
                      <p className="text-xs font-bold text-red-400 capitalize">{wv.verb}</p>
                      {wv.context && <p className="text-xs text-muted-foreground mt-0.5 truncate">"{wv.context}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {suggestions.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-2">Suggestions</p>
                <div className="space-y-1.5">
                  {suggestions.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-emerald-500/8 border border-emerald-500/15 rounded-lg">
                      <span className="text-emerald-400 mt-0.5 shrink-0 text-xs">→</span>
                      <p className="text-xs text-foreground/80 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
