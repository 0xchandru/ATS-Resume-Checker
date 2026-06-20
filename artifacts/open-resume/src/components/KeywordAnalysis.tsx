import { matchLayerBadgeClass, importanceDotClass } from "../utils/formatters";

interface Props {
  keywords: any;
}

export default function KeywordAnalysis({ keywords }: Props) {
  if (!keywords) return null;
  const { matched = [], missing = [], density_warnings = [], matched_count, total_jd_keywords, match_rate } = keywords;

  const layerOrder = ["alias", "exact", "kb_lookup", "fuzzy", "semantic"];
  const breakdown = matched.reduce((acc: Record<string, number>, m: any) => {
    acc[m.match_layer] = (acc[m.match_layer] || 0) + 1;
    return acc;
  }, {});

  const exactCount = (breakdown.alias || 0) + (breakdown.exact || 0) + (breakdown.kb_lookup || 0);
  const semanticCount = (breakdown.semantic || 0) + (breakdown.fuzzy || 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Keyword Analysis</h2>
        <p className="text-sm text-slate-500">
          {matched_count} matched · {total_jd_keywords - matched_count} missing · {Math.round((match_rate || 0) * 100)}% rate
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="text-slate-500">Match layers:</span>
        {layerOrder.map((layer) => breakdown[layer] ? (
          <span key={layer} className={`px-2 py-0.5 rounded-full font-medium ${matchLayerBadgeClass(layer)}`}>
            {layer} ({breakdown[layer]})
          </span>
        ) : null)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            Matched ({matched.length})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {matched.map((kw: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${importanceDotClass(kw.jd_importance)}`} />
                <span className="font-medium text-slate-800 flex-1 truncate">{kw.keyword}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${matchLayerBadgeClass(kw.match_layer)}`}>{kw.match_layer}</span>
                {kw.category && <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-xs">{kw.category}</span>}
              </div>
            ))}
          </div>
          {density_warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {density_warnings.map((w: any, i: number) => (
                <div key={i} className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  ⚠ {w.warning}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            Missing ({missing.length})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {missing.map((kw: any, i: number) => (
              <div key={i} className="p-2 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${importanceDotClass(kw.jd_importance)}`} />
                  <span className="font-medium text-slate-800 flex-1 truncate">{kw.keyword}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    kw.jd_importance === "critical" ? "bg-red-100 text-red-700" :
                    kw.jd_importance === "high" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>{kw.jd_importance}</span>
                  {kw.jd_occurrence_count > 1 && (
                    <span className="text-xs text-slate-400">{kw.jd_occurrence_count}×</span>
                  )}
                </div>
                {kw.suggestion && (
                  <p className="text-xs text-slate-500 mt-1 pl-3">{kw.suggestion}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 flex flex-wrap gap-4">
        <span>{exactCount} exact/alias/KB matches</span>
        <span>{semanticCount} fuzzy/semantic matches</span>
        <span>{Math.round((match_rate || 0) * 100)}% overall match rate</span>
      </div>
    </div>
  );
}
