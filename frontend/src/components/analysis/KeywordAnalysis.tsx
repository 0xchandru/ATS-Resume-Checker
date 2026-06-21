import { useState } from "react";
import { Copy, Check, Search, TrendingUp, AlertCircle } from "lucide-react";
import { matchLayerBadgeClass, importanceDotClass } from "../../utils/formatters";

interface Props {
  keywords: any;
}

const LAYER_LABELS: Record<string, string> = {
  exact: "Exact", alias: "Alias", kb_lookup: "KB", fuzzy: "Fuzzy", semantic: "Semantic",
};

const IMPACT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dotBg: string }> = {
  critical: { label: "High Impact",   color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    dotBg: "bg-red-400" },
  high:     { label: "Medium Impact", color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  dotBg: "bg-amber-400" },
  normal:   { label: "Low Impact",    color: "text-slate-400",  bg: "bg-white/[0.02]",  border: "border-white/[0.05]",  dotBg: "bg-slate-500" },
};

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

function CopyButton({ textFn, label }: { textFn: () => string; label: string }) {
  const { copied, copy } = useCopy(textFn);
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] text-muted-foreground hover:text-foreground transition-colors font-medium border border-white/[0.06]"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : `Copy ${label}`}
    </button>
  );
}

function FreqBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  const hot = count >= 3;
  return (
    <span className={`text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-md border shrink-0 ${
      hot
        ? "bg-red-500/15 border-red-500/25 text-red-400"
        : count >= 2
        ? "bg-amber-500/15 border-amber-500/25 text-amber-400"
        : "bg-white/[0.06] border-white/[0.08] text-muted-foreground/70"
    }`}>
      {count}×
    </span>
  );
}

export default function KeywordAnalysis({ keywords }: Props) {
  if (!keywords) return null;
  const { matched = [], missing = [], density_warnings = [], matched_count, total_jd_keywords, match_rate } = keywords;
  const [activeTab, setActiveTab] = useState<"matched" | "missing">("missing");

  const layerBreakdown = matched.reduce((acc: Record<string, number>, m: any) => {
    acc[m.match_layer] = (acc[m.match_layer] || 0) + 1;
    return acc;
  }, {});

  const matchPercent = Math.round((match_rate || 0) * 100);
  const missingCount = missing.length;

  // Sort missing by JD frequency desc, then by importance
  const importanceOrder: Record<string, number> = { critical: 0, high: 1, normal: 2 };
  const sortedMissing = [...missing].sort((a: any, b: any) => {
    const impDiff = (importanceOrder[a.jd_importance] ?? 2) - (importanceOrder[b.jd_importance] ?? 2);
    if (impDiff !== 0) return impDiff;
    return (b.jd_occurrence_count || 1) - (a.jd_occurrence_count || 1);
  });

  // Group missing by importance
  const criticalMissing = sortedMissing.filter((k: any) => k.jd_importance === "critical");
  const highMissing = sortedMissing.filter((k: any) => k.jd_importance === "high");
  const normalMissing = sortedMissing.filter((k: any) => k.jd_importance !== "critical" && k.jd_importance !== "high");

  // Sort matched by frequency desc
  const sortedMatched = [...matched].sort((a: any, b: any) =>
    (b.jd_occurrence_count || 1) - (a.jd_occurrence_count || 1)
  );

  const scoreColor = matchPercent >= 80 ? "#10b981" : matchPercent >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h2 className="text-sm font-black text-foreground/70 uppercase tracking-wider flex items-center gap-2">
            <Search className="h-4 w-4 text-violet-400" />
            Keyword Analysis
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-black border"
              style={{ backgroundColor: `${scoreColor}18`, color: scoreColor, borderColor: `${scoreColor}30` }}>
              {matchPercent}% match
            </span>
            <span className="text-xs text-emerald-400 font-bold">{matched_count || 0} matched</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs text-red-400 font-bold">{missingCount} missing</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground">{total_jd_keywords || 0} in JD</span>
          </div>
        </div>

        {/* Match rate bar */}
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${matchPercent}%`, backgroundColor: scoreColor }}
          />
        </div>

        {/* SkillSyncer-style target indicator */}
        {matchPercent < 80 && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-500/8 border border-amber-500/15 rounded-xl text-xs">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="text-amber-300/80">
              You're at <span className="font-bold text-amber-400">{matchPercent}%</span> — target is <span className="font-bold">80%</span> for best ATS results. Add <span className="font-bold text-amber-400">{missingCount}</span> missing keywords.
            </span>
          </div>
        )}
        {matchPercent >= 80 && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-500/8 border border-emerald-500/15 rounded-xl text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-emerald-300/80 font-medium">Excellent match! Your resume aligns strongly with this job description.</span>
          </div>
        )}

        {/* Layer breakdown chips */}
        {Object.keys(layerBreakdown).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {Object.entries(layerBreakdown).map(([layer, count]) => (
              <span key={layer} className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${matchLayerBadgeClass(layer)}`}>
                {LAYER_LABELS[layer] || layer} · {count as number}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.05]">
        {(["missing", "matched"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
              activeTab === tab
                ? tab === "missing"
                  ? "text-red-400 border-b-2 border-red-400"
                  : "text-emerald-400 border-b-2 border-emerald-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "missing"
              ? `✗ Missing (${missing.length})`
              : `✓ Matched (${matched.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {activeTab === "missing" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">Add these to your resume to increase your match score</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <CopyButton
                  label="critical"
                  textFn={() => criticalMissing.map((m: any) => m.keyword).join(", ")}
                />
                <CopyButton
                  label="all"
                  textFn={() => sortedMissing.map((m: any) => m.keyword).join(", ")}
                />
              </div>
            </div>

            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {/* Critical / High Impact group */}
              {criticalMissing.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                    High Impact — {criticalMissing.length} not found
                  </p>
                  <div className="space-y-1.5">
                    {criticalMissing.map((kw: any, i: number) => (
                      <MissingKeywordRow key={i} kw={kw} />
                    ))}
                  </div>
                </div>
              )}

              {/* Medium Impact */}
              {highMissing.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    Medium Impact — {highMissing.length} not found
                  </p>
                  <div className="space-y-1.5">
                    {highMissing.map((kw: any, i: number) => (
                      <MissingKeywordRow key={i} kw={kw} />
                    ))}
                  </div>
                </div>
              )}

              {/* Low Impact */}
              {normalMissing.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
                    Low Impact — {normalMissing.length} not found
                  </p>
                  <div className="space-y-1.5">
                    {normalMissing.map((kw: any, i: number) => (
                      <MissingKeywordRow key={i} kw={kw} />
                    ))}
                  </div>
                </div>
              )}

              {missing.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  🎉 No missing keywords — great match!
                </div>
              )}
            </div>

            {density_warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {density_warnings.map((w: any, i: number) => (
                  <div key={i} className="p-2.5 bg-amber-500/8 border border-amber-500/15 rounded-lg text-xs text-amber-400">
                    ⚠ {w.warning}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "matched" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Keywords found in your resume — sorted by JD frequency</p>
              <CopyButton
                label="all"
                textFn={() => sortedMatched.map((m: any) => m.keyword).join(", ")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[520px] overflow-y-auto pr-1">
              {sortedMatched.map((kw: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] rounded-lg transition-colors group">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${importanceDotClass(kw.jd_importance)}`} />
                  <span className="font-medium text-foreground/85 text-sm flex-1 truncate">{kw.keyword}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <FreqBadge count={kw.jd_occurrence_count} />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold opacity-60 group-hover:opacity-100 ${matchLayerBadgeClass(kw.match_layer)}`}>
                      {LAYER_LABELS[kw.match_layer] || kw.match_layer}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MissingKeywordRow({ kw }: { kw: any }) {
  const imp = IMPACT_CONFIG[kw.jd_importance] || IMPACT_CONFIG.normal;
  return (
    <div className={`p-3 rounded-xl border transition-colors hover:brightness-110 ${imp.bg} ${imp.border}`}>
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${imp.dotBg}`} />
        <span className="font-semibold text-foreground/90 text-sm flex-1">{kw.keyword}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <FreqBadge count={kw.jd_occurrence_count} />
        </div>
      </div>
      {kw.suggestion && (
        <p className="text-xs text-muted-foreground mt-1.5 pl-4 leading-relaxed">
          → {kw.suggestion}
        </p>
      )}
    </div>
  );
}
