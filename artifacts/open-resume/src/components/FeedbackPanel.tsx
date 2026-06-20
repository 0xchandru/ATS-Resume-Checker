import { useState } from "react";
import { AlertTriangle, AlertCircle, Lightbulb, ChevronDown, ChevronUp, ArrowRight, ListChecks } from "lucide-react";

interface Props {
  feedback: any[];
}

const PRIORITY: Record<string, { label: string; icon: any; accent: string; bg: string; border: string }> = {
  critical:    { label: "Critical",     icon: AlertTriangle, accent: "text-red-500",   bg: "bg-red-500/10",    border: "border-red-500/25" },
  important:   { label: "Important",    icon: AlertCircle,   accent: "text-amber-500", bg: "bg-amber-500/10",  border: "border-amber-500/25" },
  nice_to_have:{ label: "Nice to Have", icon: Lightbulb,     accent: "text-blue-500",  bg: "bg-blue-500/10",   border: "border-blue-500/25" },
};

function FeedbackCard({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  const p = PRIORITY[item.priority] || PRIORITY.nice_to_have;
  const Icon = p.icon;
  const hasDetails = item.action || (item.original && item.suggested);

  return (
    <div className={`rounded-xl border ${p.border} overflow-hidden`}>
      <div className={`p-4 ${p.bg}`}>
        <div className="flex items-start gap-3">
          <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${p.accent}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.accent} ${p.border} border`}>
                {p.label}
              </span>
              {item.category && (
                <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
                  {item.category.replace(/_/g, " ")}
                </span>
              )}
              {item.keyword && (
                <code className="text-xs bg-muted border border-border px-2 py-0.5 rounded-full font-mono">{item.keyword}</code>
              )}
            </div>
            <p className="text-sm text-foreground font-medium leading-relaxed">{item.message}</p>

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
              <div className="flex items-start gap-2 p-2.5 bg-card rounded-lg border border-border">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-foreground/90 leading-relaxed">{item.action}</p>
              </div>
            )}
            {item.original && item.suggested && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs font-bold text-red-400 mb-1 uppercase tracking-wide">Before</p>
                  <p className="text-xs text-foreground/80 italic">"{item.original}"</p>
                </div>
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-xs font-bold text-emerald-400 mb-1 uppercase tracking-wide">After</p>
                  <p className="text-xs text-foreground/80">"{item.suggested}"</p>
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
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          Improvement Roadmap
        </h2>
        <div className="flex items-center gap-1 flex-wrap">
          {grouped.critical.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{grouped.critical.length} critical</span>
          )}
          {grouped.important.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{grouped.important.length} important</span>
          )}
          {grouped.nice_to_have.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{grouped.nice_to_have.length} tips</span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-5 pt-4 pb-3 flex-wrap">
        {filters.filter(f => !f.hidden).map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="px-5 pb-5 space-y-2.5">
        {displayed.map((item, i) => <FeedbackCard key={i} item={item} />)}
      </div>
    </div>
  );
}
