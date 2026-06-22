import { CheckCircle2, XCircle, AlertTriangle, Info, FileType } from "lucide-react";

interface Props {
  formatting: any;
}

const SEVERITY_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  critical: { icon: XCircle,       color: "text-red-400",    bg: "bg-red-500/8",     border: "border-red-500/18" },
  warning:  { icon: AlertTriangle, color: "text-amber-400",  bg: "bg-amber-500/8",   border: "border-amber-500/18" },
  info:     { icon: Info,          color: "text-blue-400",   bg: "bg-blue-500/8",    border: "border-blue-500/18" },
  pass:     { icon: CheckCircle2,  color: "text-emerald-400",bg: "bg-emerald-500/8", border: "border-emerald-500/18" },
};
const ORDER = ["critical", "warning", "info", "pass"];

export default function FormatChecker({ formatting }: Props) {
  if (!formatting) return null;
  const { issues = [], page_count, word_count, font_count, fonts_used = [], has_tables, has_images, has_columns, has_header_footer } = formatting;
  const sorted = [...issues].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  const counts = { critical: 0, warning: 0, pass: 0 };
  issues.forEach((i: any) => { if (counts[i.severity as keyof typeof counts] !== undefined) counts[i.severity as keyof typeof counts]++; });

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-black text-foreground/70 uppercase tracking-wider flex items-center gap-2">
          <FileType className="h-4 w-4 text-violet-400" /> Format Compliance
        </h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          {counts.critical > 0 && <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold text-xs border border-red-500/25">{counts.critical} critical</span>}
          {counts.warning  > 0 && <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-xs border border-amber-500/25">{counts.warning} warnings</span>}
          {counts.pass     > 0 && <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/25">{counts.pass} passed</span>}
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
            <div key={label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-center">
              <p className="text-xl font-black text-foreground tabular-nums">{value ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Fonts used */}
        {fonts_used.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground/60">Fonts detected:</span>
            {[...new Set(fonts_used)].slice(0, 5).map((f: string, i: number) => (
              <code key={`${f}-${i}`} className="text-xs px-2 py-0.5 bg-white/[0.05] border border-white/[0.08] rounded-lg font-mono text-foreground/80">{f}</code>
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
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    {issue.type && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">
                        {issue.type.replace(/_/g, " ")}
                      </p>
                    )}
                    <p className="text-sm text-foreground/85">{issue.message}</p>
                  </div>
                  <span className={`text-[10px] font-black capitalize shrink-0 uppercase tracking-wide ${cfg.color}`}>{issue.severity}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ATS flags grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Tables",        value: has_tables,        bad: true },
            { label: "Images",        value: has_images,        bad: true },
            { label: "Multi-column",  value: has_columns,       bad: true },
            { label: "Header/Footer", value: has_header_footer, bad: false },
          ].map(({ label, value, bad }) => (
            <div key={label} className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm ${
              value
                ? bad
                  ? "bg-red-500/8 border-red-500/18 text-red-400"
                  : "bg-amber-500/8 border-amber-500/18 text-amber-400"
                : "bg-emerald-500/8 border-emerald-500/18 text-emerald-400"
            }`}>
              <span className="text-foreground/75 text-xs">{label}</span>
              <span className="font-bold text-xs">{value ? "Yes" : "No"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
