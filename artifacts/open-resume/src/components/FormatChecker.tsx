import { CheckCircle2, XCircle, AlertTriangle, Info, FileType } from "lucide-react";
import { severityToColor, severityToBgClass } from "../utils/formatters";

interface Props {
  formatting: any;
}

const SEVERITY_ICON: Record<string, any> = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
  pass: CheckCircle2,
};

const SEVERITY_ORDER = ["critical", "warning", "info", "pass"];

export default function FormatChecker({ formatting }: Props) {
  if (!formatting) return null;

  const { issues = [], page_count, word_count, font_count, fonts_used = [], has_tables, has_images, has_columns, has_header_footer, file_type } = formatting;

  const sorted = [...issues].sort((a, b) =>
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  const criticalCount = issues.filter((i: any) => i.severity === "critical").length;
  const warningCount = issues.filter((i: any) => i.severity === "warning").length;
  const passCount = issues.filter((i: any) => i.severity === "pass").length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileType className="h-5 w-5 text-slate-400" /> Format Compliance
        </h2>
        <div className="flex items-center gap-2 text-xs">
          {criticalCount > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">{criticalCount} critical</span>}
          {warningCount > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">{warningCount} warnings</span>}
          {passCount > 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">{passCount} passed</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        {[
          { label: "Pages", value: page_count || "—" },
          { label: "Words", value: word_count || "—" },
          { label: "Fonts", value: font_count || "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded-lg p-2">
            <p className="text-lg font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {fonts_used.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          <span className="text-xs text-slate-500">Fonts:</span>
          {fonts_used.slice(0, 5).map((f: string) => (
            <span key={f} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{f}</span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((issue: any, i: number) => {
          const Icon = SEVERITY_ICON[issue.severity] || Info;
          return (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${severityToBgClass(issue.severity)}`}>
              <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${severityToColor(issue.severity)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-0.5">
                  {issue.type?.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-slate-700">{issue.message}</p>
              </div>
              <span className={`text-xs font-semibold capitalize flex-shrink-0 ${severityToColor(issue.severity)}`}>{issue.severity}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {[
          { label: "Tables", value: has_tables, bad: true },
          { label: "Images", value: has_images, bad: true },
          { label: "Multi-column", value: has_columns, bad: true },
          { label: "Header/Footer", value: has_header_footer, bad: false },
        ].map(({ label, value, bad }) => (
          <div key={label} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${value ? (bad ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200") : "bg-emerald-50 border-emerald-200"}`}>
            <span className="text-slate-600">{label}</span>
            <span className={`font-semibold ${value ? (bad ? "text-red-600" : "text-amber-600") : "text-emerald-600"}`}>{value ? "Yes" : "No"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
