import { useState } from "react";
import { AlertTriangle, AlertCircle, Lightbulb, ChevronDown, ChevronUp, ArrowRight, ListChecks } from "lucide-react";

interface Props {
  feedback: any[];
}

const PRIORITY: Record<string, { label: string; icon: any; accent: string; bg: string; border: string }> = {
  critical:    { label: "Critical",     icon: AlertTriangle, accent: "text-red-400",   bg: "bg-red-500/8",    border: "border-red-500/18" },
  important:   { label: "Important",    icon: AlertCircle,   accent: "text-amber-400", bg: "bg-amber-500/8",  border: "border-amber-500/18" },
  nice_to_have:{ label: "Nice to Have", icon: Lightbulb,     accent: "text-blue-400",  bg: "bg-blue-500/8",   border: "border-blue-500/18" },
};

function FeedbackCard({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  const p = PRIORITY[item.priority] || PRIORITY.nice_to_have;
  const Icon = p.icon;
  const hasDetails = item.action || (item.original && item.suggested);

  return (
    <div className={`rounded-xl border ${p.border} ${p.bg} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${p.accent}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${p.bg} ${p.accent} ${p.border} border`}>
                {p.label}
              </span>
              {item.category && (
                <span className="text-xs text-muted-foreground capitalize bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-full">
                  {item.category.replace(/_/g, " ")}
                </span>
              )}
              {item.keyword && (
                <code className="text-xs bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded-full font-mono text-foreground/80">{item.keyword}</code>
              )}
            </div>
            <p className="text-sm text-foreground/85 font-medium leading-relaxed">{item.message}</p>

            {hasDetails && (
              <button
                onClick={() => setOpen(!open)}
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {open ? "Hide" : "Show"} details
              </button>
            )}
          </div>
        </div>

        {open && hasDetails && (
          <div className="mt-3 ml-7 space-y-2">
            {item.action && (
              <div className="flex items-start gap-2 p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <ArrowRight className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">{item.action}</p>
              </div>
            )}
            {item.original && item.suggested && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 bg-red-500/8 border border-red-500/15 rounded-lg">
                  <p className="text-[10px] font-bold text-red-400 mb-1 uppercase tracking-wide">Before</p>
                  <p className="text-xs text-foreground/75 italic">"{item.original}"</p>
                </div>
                <div className="p-2.5 bg-emerald-500/8 border border-emerald-500/15 rounded-lg">
                  <p className="text-[10px] font-bold text-emerald-400 mb-1 uppercase tracking-wide">After</p>
                  <p className="text-xs text-foreground/75">"{item.suggested}"</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeedbackPanel({ feedback }: Props) {
  if (!feedback?.length) return null;
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const grouped = {
    critical:     feedback.filter(f => f.priority === "critical"),
    important:    feedback.filter(f => f.priority === "important"),
    nice_to_have: feedback.filter(f => f.priority === "nice_to_have"),
  };

  const filters = [
    { id: "all",          label: `All (${feedback.length})` },
    { id: "critical",     label: `Critical (${grouped.critical.length})`,     hidden: grouped.critical.length === 0 },
    { id: "important",    label: `Important (${grouped.important.length})`,   hidden: grouped.important.length === 0 },
    { id: "nice_to_have", label: `Tips (${grouped.nice_to_have.length})`,     hidden: grouped.nice_to_have.length === 0 },
  ];

  const displayed = activeFilter === "all" ? feedback : feedback.filter(f => f.priority === activeFilter);

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-black text-foreground/70 uppercase tracking-wider flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-violet-400" />
          Improvement Roadmap
        </h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          {grouped.critical.length > 0 && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              {grouped.critical.length} critical
            </span>
          )}
          {grouped.important.length > 0 && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              {grouped.important.length} important
            </span>
          )}
          {grouped.nice_to_have.length > 0 && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
              {grouped.nice_to_have.length} tips
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 px-5 pt-4 pb-3 flex-wrap">
        {filters.filter(f => !f.hidden).map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeFilter === f.id
                ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20"
                : "bg-white/[0.04] border border-white/[0.07] text-muted-foreground hover:text-foreground hover:bg-white/[0.07]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-5 space-y-2">
        {displayed.map((item, i) => <FeedbackCard key={i} item={item} />)}
      </div>
    </div>
  );
}
