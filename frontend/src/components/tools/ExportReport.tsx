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
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-black text-foreground">Export Report</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {result.filename} · Score:{" "}
            <span className="font-bold" style={{ color: scoreToColor(result.overall_score) }}>
              {result.overall_score}
            </span>{" "}
            ({result.letter_grade})
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity shadow-md shadow-violet-500/20"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Download JSON"}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] text-foreground/80 rounded-xl text-sm font-semibold hover:bg-white/[0.07] transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print Report
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] text-foreground/80 rounded-xl text-sm font-semibold hover:bg-white/[0.07] transition-colors"
        >
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      {result.resume_preview && (
        <div className="mt-5 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Resume Preview (first 600 chars)</p>
          <p className="text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">{result.resume_preview}</p>
        </div>
      )}
    </div>
  );
}
