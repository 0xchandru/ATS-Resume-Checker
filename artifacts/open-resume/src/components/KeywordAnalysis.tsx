import { useState } from "react";
import { Copy, Check, Search } from "lucide-react";
import { matchLayerBadgeClass, importanceDotClass } from "../utils/formatters";

interface Props {
  keywords: any;
}

const LAYER_LABELS: Record<string, string> = {
  exact: "Exact", alias: "Alias", kb_lookup: "KB", fuzzy: "Fuzzy", semantic: "Semantic",
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
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors font-medium"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : `Copy ${label}`}
    </button>
  );
}

export default function KeywordAnalysis({ keywords }: Props) {
  if (!keywords) return null;
  const { matched = [], missing = [], density_warnings = [], matched_count, total_jd_keywords, match_rate } = keywords;
  const [activeTab, setActiveTab] = useState<"matched" | "missing">("matched");

  const layerBreakdown = matched.reduce((acc: Record<string, number>, m: any) => {
    acc[m.match_layer] = (acc[m.match_layer] || 0) + 1;
    return acc;
  }, {});

  const matchPercent = Math.round((match_rate || 0) * 100);
  const missingCount = (total_jd_keywords || 0) - (matched_count || 0);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Keyword Analysis
          </h2>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-emerald-500 font-bold">{matched_count || 0} matched</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-red-500 font-bold">{missingCount} missing</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground font-bold">{total_jd_keywords || 0} in JD</span>
            <span className={`px-2 py-0.5 rounded-full font-bold text-white ${matchPercent >= 75 ? "bg-emerald-500" : matchPercent >= 50 ? "bg-amber-500" : "bg-red-500"}`}>
              {matchPercent}% match
            </span>
          </div>
        </div>

        {/* Match rate bar */}
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${matchPercent}%`,
              backgroundColor: matchPercent >= 75 ? "#10b981" : matchPercent >= 50 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>

        {/* Layer breakdown chips */}
        {Object.keys(layerBreakdown).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {Object.entries(layerBreakdown).map(([layer, count]) => (
              <span key={layer} className={`text-xs px-2 py-0.5 rounded-full font-medium ${matchLayerBadgeClass(layer)}`}>
                {LAYER_LABELS[layer] || layer} ({count as number})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["matched", "missing"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? tab === "matched"
                  ? "text-emerald-500 border-b-2 border-emerald-500"
                  : "text-red-500 border-b-2 border-red-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "matched" ? `✓ Matched (${matched.length})` : `✗ Missing (${missing.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {activeTab === "matched" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Keywords found in your resume — matched by AI layer</p>
              <CopyButton
                label="all"
                textFn={() => matched.map((m: any) => m.keyword).join(", ")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {matched.map((kw: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-muted/40 hover:bg-muted/60 rounded-lg transition-colors group">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${importanceDotClass(kw.jd_importance)}`} />
                  <span className="font-medium text-foreground text-sm flex-1 truncate">{kw.keyword}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-60 group-hover:opacity-100">
                    {kw.jd_occurrence_count > 1 && (
                      <span className="text-xs text-muted-foreground">{kw.jd_occurrence_count}×</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${matchLayerBadgeClass(kw.match_layer)}`}>
                      {LAYER_LABELS[kw.match_layer] || kw.match_layer}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {density_warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {density_warnings.map((w: any, i: number) => (
                  <div key={i} className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                    ⚠ {w.warning}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "missing" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Add these keywords to improve your ATS match rate</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <CopyButton
                  label="critical"
                  textFn={() => missing.filter((m: any) => m.jd_importance === "critical").map((m: any) => m.keyword).join(", ")}
                />
                <CopyButton
                  label="all"
                  textFn={() => missing.map((m: any) => m.keyword).join(", ")}
                />
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {missing.map((kw: any, i: number) => (
                <div key={i} className="p-3 bg-muted/40 hover:bg-muted/60 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${importanceDotClass(kw.jd_importance)}`} />
                    <span className="font-semibold text-foreground text-sm flex-1">{kw.keyword}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {kw.jd_occurrence_count > 1 && (
                        <span className="text-xs px-1.5 py-0.5 bg-muted rounded font-medium text-muted-foreground">
                          {kw.jd_occurrence_count}× in JD
                        </span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        kw.jd_importance === "critical" ? "bg-red-500/20 text-red-400" :
                        kw.jd_importance === "high"     ? "bg-amber-500/20 text-amber-400" :
                                                          "bg-muted text-muted-foreground"
                      }`}>{kw.jd_importance}</span>
                    </div>
                  </div>
                  {kw.suggestion && (
                    <p className="text-xs text-muted-foreground mt-1.5 pl-4 leading-relaxed">
                      → {kw.suggestion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
