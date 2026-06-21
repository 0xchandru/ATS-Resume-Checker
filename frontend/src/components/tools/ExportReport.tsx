import { Download, Printer, Share2, CheckCircle2 } from "lucide-react";
import { exportReport } from "../../utils/api";
import { AnalysisResult } from "../../App";
import { scoreToColor } from "../../utils/formatters";
import { useState } from "react";

interface Props {
  result: AnalysisResult;
}

export default function ExportReport({ result }: Props) {
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportReport(result.scan_id);
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Export Report</h2>
          <p className="text-sm text-slate-500">
            {result.filename} · Score: <span className="font-semibold" style={{ color: scoreToColor(result.overall_score) }}>{result.overall_score}</span> ({result.letter_grade})
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Download JSON"}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print Report
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      {result.resume_preview && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-1">Resume Preview (first 600 chars)</p>
          <p className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">{result.resume_preview}</p>
        </div>
      )}
    </div>
  );
}
