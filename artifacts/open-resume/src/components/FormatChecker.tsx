import { CheckCircle2, XCircle, AlertTriangle, Info, FileType } from "lucide-react";

interface Props {
  formatting: any;
}

const SEVERITY_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  critical: { icon: XCircle,       color: "text-red-500",   bg: "bg-red-500/10",    border: "border-red-500/25" },
  warning:  { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10",  border: "border-amber-500/25" },
  info:     { icon: Info,          color: "text-blue-500",  bg: "bg-blue-500/10",   border: "border-blue-500/25" },
  pass:     { icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
};
const ORDER = ["critical", "warning", "info", "pass"];

export default function FormatChecker({ formatting }: Props) {
  if (!formatting) return null;
  const { issues = [], page_count, word_count, font_count, fonts_used = [], has_tables, has_images, has_columns, has_header_footer } = formatting;
  const sorted = [...issues].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  const counts = { critical: 0, warning: 0, pass: 0 };
  issues.forEach((i: any) => { if (counts[i.severity as keyof typeof counts] !== undefined) counts[i.severity as keyof typeof counts]++; });

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <FileType className="h-4 w-4 text-primary" /> Format Compliance
        </h2>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {counts.critical > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">{counts.critical} critical</span>}
          {counts.warning  > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">{counts.warning} warnings</span>}
          {counts.pass     > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">{counts.pass} passed</span>}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pages", value: page_count },
            { label: "Words", value: word_count },
            { label: "Fonts", value: font_count },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">{value ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Fonts used */}
        {fonts_used.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground">Fonts detected:</span>
            {fonts_used.slice(0, 5).map((f: string) => (
              <code key={f} className="text-xs px-2 py-0.5 bg-muted border border-border rounded-lg font-mono text-foreground">{f}</code>
            ))}
          </div>
        )}

        {/* Issues list */}
        {sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map((issue: any, i: number) => {
              const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div key={i} className={`flex items-start gap-2.5 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    {issue.type && (
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-0.5">
                        {issue.type.replace(/_/g, " ")}
                      </p>
                    )}
                    <p className="text-sm text-foreground/90">{issue.message}</p>
                  </div>
                  <span className={`text-xs font-bold capitalize flex-shrink-0 ${cfg.color}`}>{issue.severity}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ATS flags grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Tables",       value: has_tables,       bad: true },
            { label: "Images",       value: has_images,       bad: true },
            { label: "Multi-column", value: has_columns,      bad: true },
            { label: "Header/Footer",value: has_header_footer, bad: false },
          ].map(({ label, value, bad }) => (
            <div key={label} className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm ${
              value
                ? bad
                  ? "bg-red-500/10 border-red-500/25 text-red-400"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
            }`}>
              <span className="text-foreground/80">{label}</span>
              <span className="font-bold">{value ? "Yes" : "No"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
