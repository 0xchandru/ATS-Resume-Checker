import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

interface Props {
  formatting: any;
}

const SEVERITY_ICON: Record<string, any> = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
  pass: CheckCircle2,
};

const SEVERITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/15" },
  warning: { color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/15" },
  info: { color: "text-blue-400", bg: "bg-blue-500/8", border: "border-blue-500/15" },
  pass: { color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/15" },
};

function FormatCheck({ passed, description, severity = "pass" }: {
  passed: boolean;
  description: string;
  severity?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      {passed ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
      ) : severity === "critical" ? (
        <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
      )}
      <p className="text-sm text-foreground/80 leading-snug">{description}</p>
    </div>
  );
}

function CheckBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-foreground mb-2">{title}</h3>
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4">
        {children}
      </div>
    </div>
  );
}

export default function FormattingSection({ formatting }: Props) {
  if (!formatting) return null;

  const {
    issues = [],
    page_count,
    word_count,
    font_count,
    fonts_used = [],
    has_tables,
    has_images,
    has_columns,
    has_header_footer,
  } = formatting;

  const criticalCount = issues.filter((i: any) => i.severity === "critical").length;
  const warningCount = issues.filter((i: any) => i.severity === "warning").length;

  return (
    <div id="formatting" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-black text-foreground">Formatting</h2>
        {(criticalCount + warningCount) > 0 && (
          <span className="text-xs px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full font-semibold">
            {criticalCount + warningCount} issue{(criticalCount + warningCount) > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <CheckBlock title="Layout">
        <FormatCheck
          passed={!has_columns}
          description={has_columns
            ? "Multi-column layout detected. Most ATS systems cannot parse this correctly — switch to single column."
            : "Single-column layout. ATS can parse this correctly."}
          severity="critical"
        />
        <FormatCheck
          passed={!has_tables}
          description={has_tables
            ? "Tables detected. Tables break ATS parsing — use standard text formatting."
            : "No tables detected. Good ATS compatibility."}
          severity="warning"
        />
        <FormatCheck
          passed={!has_images}
          description={has_images
            ? "Images found. ATS cannot read text in images — replace with text."
            : "No embedded images. All content is readable by ATS."}
          severity="warning"
        />
        <FormatCheck
          passed={page_count != null && page_count <= 2}
          description={`${page_count || "?"} page${(page_count || 0) !== 1 ? "s" : ""}. ${
            (page_count || 0) > 2 ? "Consider reducing to 1-2 pages." : "Good length."
          }`}
        />
      </CheckBlock>

      <CheckBlock title="Font Check">
        <FormatCheck
          passed={(font_count || 0) <= 3}
          description={`${font_count || 0} font${(font_count || 0) !== 1 ? "s" : ""} detected. ${
            (font_count || 0) > 3 ? "Too many — use 1-2 fonts for a clean look." : "Acceptable font usage."
          }`}
        />
        {fonts_used.length > 0 && (
          <div className="flex items-start gap-3 py-2.5">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/80">
              Fonts: {fonts_used.slice(0, 5).map((f: string) => (
                <code key={f} className="text-xs px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded font-mono text-foreground/90 mx-0.5">{f}</code>
              ))}
            </p>
          </div>
        )}
      </CheckBlock>

      <CheckBlock title="Page Setup">
        <FormatCheck
          passed={!has_header_footer}
          description={has_header_footer
            ? "Header/footer detected. Some ATS skip header/footer content — keep critical info in the body."
            : "No header/footer issues."}
        />
        <FormatCheck
          passed={(word_count || 0) >= 200}
          description={`${word_count || 0} words total. ${
            (word_count || 0) < 200
              ? "Resume may be too short — add more relevant content."
              : (word_count || 0) > 1500
              ? "Quite long — consider trimming to the most relevant information."
              : "Good content length."
          }`}
        />
      </CheckBlock>

      {issues.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Detailed Checks</h3>
          <div className="space-y-2">
            {issues.map((issue: any, i: number) => {
              const style = SEVERITY_STYLE[issue.severity] || SEVERITY_STYLE.info;
              const Icon = SEVERITY_ICON[issue.severity] || Info;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${style.bg} ${style.border}`}>
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.color}`} />
                  <div className="flex-1 min-w-0">
                    {issue.type && (
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">
                        {issue.type.replace(/_/g, " ")}
                      </p>
                    )}
                    <p className="text-sm text-foreground/85">{issue.message}</p>
                  </div>
                  <span className={`text-[10px] font-bold capitalize shrink-0 ${style.color}`}>
                    {issue.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
