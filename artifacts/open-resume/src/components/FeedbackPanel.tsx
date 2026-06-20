import { useState } from "react";
import { AlertTriangle, AlertCircle, Lightbulb, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { priorityBadgeClass } from "../utils/formatters";

interface Props {
  feedback: any[];
}

const PRIORITY_META: Record<string, { label: string; icon: any; bg: string; border: string; count_bg: string }> = {
  critical: { label: "Critical", icon: AlertTriangle, bg: "bg-red-50", border: "border-red-200", count_bg: "bg-red-500" },
  important: { label: "Important", icon: AlertCircle, bg: "bg-amber-50", border: "border-amber-200", count_bg: "bg-amber-500" },
  nice_to_have: { label: "Nice to Have", icon: Lightbulb, bg: "bg-blue-50", border: "border-blue-200", count_bg: "bg-blue-500" },
};

function FeedbackCard({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);
  const meta = PRIORITY_META[item.priority] || PRIORITY_META.nice_to_have;
  const Icon = meta.icon;
  const hasRewrite = item.original && item.suggested;
  const hasAction = item.action;

  return (
    <div className={`rounded-xl border p-4 ${meta.bg} ${meta.border}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${item.priority === "critical" ? "text-red-500" : item.priority === "important" ? "text-amber-500" : "text-blue-500"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityBadgeClass(item.priority)}`}>
              {meta.label}
            </span>
            {item.category && (
              <span className="text-xs text-slate-500 capitalize">{item.category.replace(/_/g, " ")}</span>
            )}
            {item.keyword && (
              <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full font-mono">{item.keyword}</span>
            )}
          </div>
          <p className="text-sm text-slate-800 font-medium leading-snug">{item.message}</p>

          {(hasAction || hasRewrite) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide" : "Show"} details
            </button>
          )}

          {expanded && (
            <div className="mt-3 space-y-2">
              {hasAction && (
                <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-slate-200">
                  <ArrowRight className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-700">{item.action}</p>
                </div>
              )}
              {hasRewrite && (
                <div className="space-y-2">
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 font-medium mb-1">Original</p>
                    <p className="text-xs text-slate-700 italic">"{item.original}"</p>
                  </div>
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Suggested</p>
                    <p className="text-xs text-slate-700">"{item.suggested}"</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPanel({ feedback }: Props) {
  if (!feedback?.length) return null;

  const grouped = {
    critical: feedback.filter(f => f.priority === "critical"),
    important: feedback.filter(f => f.priority === "important"),
    nice_to_have: feedback.filter(f => f.priority === "nice_to_have"),
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-900">Improvement Roadmap</h2>
        <div className="flex items-center gap-2">
          {Object.entries(grouped).map(([priority, items]) => items.length > 0 ? (
            <span key={priority} className={`flex items-center gap-1 text-xs font-bold text-white px-2 py-0.5 rounded-full ${PRIORITY_META[priority].count_bg}`}>
              {items.length}
            </span>
          ) : null)}
        </div>
      </div>

      <div className="space-y-5">
        {Object.entries(grouped).map(([priority, items]) => items.length > 0 ? (
          <div key={priority}>
            <div className="flex items-center gap-2 mb-3">
              {(() => { const Icon = PRIORITY_META[priority].icon; return <Icon className={`h-4 w-4 ${priority === "critical" ? "text-red-500" : priority === "important" ? "text-amber-500" : "text-blue-500"}`} />; })()}
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{PRIORITY_META[priority].label} ({items.length})</h3>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => <FeedbackCard key={i} item={item} />)}
            </div>
          </div>
        ) : null)}
      </div>
    </div>
  );
}
