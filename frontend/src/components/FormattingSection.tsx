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
  critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  warning: { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  info: { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  pass: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
};

function FormatCheck({ passed, label, description, severity = "pass" }: {
  passed: boolean;
  label: string;
  description: string;
  severity?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      {passed ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
      ) : (
        severity === "critical" ? (
          <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        )
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{description}</p>
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
  const passCount = issues.filter((i: any) => i.severity === "pass").length;

  return (
    <div id="formatting" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-black text-foreground">Formatting</h2>
        {(criticalCount + warningCount) > 0 && (
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-lg">
            {criticalCount + warningCount} issue{(criticalCount + warningCount) > 1 ? "s" : ""} to fix
          </span>
        )}
      </div>

      {/* Layout Section */}
      <div className="mb-6">
        <h3 className="text-base font-bold text-foreground mb-3">Layout</h3>
        <div className="bg-muted/30 rounded-xl p-4">
          <FormatCheck
            passed={!has_columns}
            label="Single Column"
            description={has_columns
              ? "Multi-column layout detected. Most ATS systems cannot parse multi-column resumes correctly."
              : "Single-column layout detected. ATS systems can parse this correctly."}
            severity="critical"
          />
          <FormatCheck
            passed={!has_tables}
            label="No Tables"
            description={has_tables
              ? "Tables detected. Tables can break ATS parsing — use standard text formatting instead."
              : "No tables detected. Good for ATS compatibility."}
            severity="warning"
          />
          <FormatCheck
            passed={!has_images}
            label="No Images"
            description={has_images
              ? "Images detected. ATS systems cannot read text inside images. Remove or replace with text."
              : "No embedded images detected. ATS can parse all text content."}
            severity="warning"
          />
          <FormatCheck
            passed={page_count != null && page_count <= 2}
            label="Page Count"
            description={`Resume is ${page_count || "?"} page${(page_count || 0) > 1 ? "s" : ""}. ${
              (page_count || 0) > 2 ? "Consider reducing to 1-2 pages." : "Good length."
            }`}
          />
        </div>
      </div>

      {/* Font Check Section */}
      <div className="mb-6">
        <h3 className="text-base font-bold text-foreground mb-3">Font Check</h3>
        <div className="bg-muted/30 rounded-xl p-4">
          <FormatCheck
            passed={(font_count || 0) <= 3}
            label="Font Count"
            description={`${font_count || 0} font${(font_count || 0) > 1 ? "s" : ""} detected. ${
              (font_count || 0) > 3
                ? "Too many fonts — use 1-2 fonts for a clean, professional look."
                : "Acceptable number of fonts."
            }`}
          />
          {fonts_used.length > 0 && (
            <div className="flex items-center gap-2 py-3 border-b border-border/50 last:border-0">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  Fonts used: {fonts_used.slice(0, 5).map((f: string, i: number) => (
                    <code key={f} className="text-xs px-1.5 py-0.5 bg-muted border border-border rounded font-mono text-foreground mx-0.5">{f}</code>
                  ))}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page Setup Section */}
      <div className="mb-6">
        <h3 className="text-base font-bold text-foreground mb-3">Page Setup</h3>
        <div className="bg-muted/30 rounded-xl p-4">
          <FormatCheck
            passed={!has_header_footer}
            label="Header/Footer"
            description={has_header_footer
              ? "Header/footer content detected. Some ATS systems skip content in headers/footers — keep critical info in the body."
              : "No header/footer issues detected."}
          />
          <FormatCheck
            passed={(word_count || 0) >= 200}
            label="Content Length"
            description={`${word_count || 0} words total. ${
              (word_count || 0) < 200
                ? "Resume may be too short — add more relevant content."
                : (word_count || 0) > 1500
                ? "Resume is quite long — consider trimming to the most relevant information."
                : "Good content length."
            }`}
          />
        </div>
      </div>

      {/* Detailed Issues */}
      {issues.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-foreground mb-3">Detailed Checks</h3>
          <div className="space-y-2">
            {issues.map((issue: any, i: number) => {
              const style = SEVERITY_STYLE[issue.severity] || SEVERITY_STYLE.info;
              const Icon = SEVERITY_ICON[issue.severity] || Info;
              return (
                <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${style.bg} ${style.border}`}>
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${style.color}`} />
                  <div className="flex-1 min-w-0">
                    {issue.type && (
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-0.5">
                        {issue.type.replace(/_/g, " ")}
                      </p>
                    )}
                    <p className="text-sm text-foreground/90">{issue.message}</p>
                  </div>
                  <span className={`text-xs font-bold capitalize flex-shrink-0 ${style.color}`}>
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
