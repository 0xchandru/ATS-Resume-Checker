import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles, Loader2, Download, Wand2, Eraser,
  CheckCircle2, AlertCircle, X, Check, Zap
} from "lucide-react";
import ResumeEditor from "./ResumeEditor";

interface Keyword {
  keyword?: string;
  term?: string;
  category?: string;
}

interface ScoreSnapshot {
  overall_score: number;
  letter_grade: string;
  keyword_match?: number;
  semantic_match?: number;
  evidence_strength?: number;
  seniority_fit?: number;
  parsing_quality?: number;
  formatting_quality?: number;
  sub_scores?: Record<string, number>;
  keywords?: {
    matched?: (Keyword | string)[];
    missing?: (Keyword | string)[];
  };
}

interface Props {
  analysis: any;
  jd: string;
  scanId?: string;
  onResumeUpdate?: (resumeHtml: string, resumeText: string) => void;
  onScoreUpdate?: (scores: any) => void;
  onRescoringChange?: (v: boolean) => void;
}

function kwLabel(kw: Keyword | string): string {
  if (typeof kw === "string") return kw;
  return kw.keyword || kw.term || "";
}

function ScorePill({ score, grade, delta, isRescoring }: {
  score: number; grade: string; delta: number; isRescoring: boolean;
}) {
  const color = score >= 75 ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/8"
    : score >= 55 ? "text-amber-400 border-amber-500/30 bg-amber-500/8"
    : "text-red-400 border-red-500/30 bg-red-500/8";
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-sm ${color} transition-all duration-500`}>
      {isRescoring
        ? <Loader2 className="w-3.5 h-3.5 animate-spin opacity-60" />
        : <div className="w-2 h-2 rounded-full bg-current opacity-80" />}
      <span className="text-lg leading-none">{Math.round(score)}</span>
      <span className="text-xs opacity-70">{grade}</span>
      {delta !== 0 && !isRescoring && (
        <span className={`text-xs font-bold ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
        </span>
      )}
    </div>
  );
}

function DimPill({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.min(100, Math.max(0, (value || 0) * 100)));
  const color = pct >= 70 ? "text-emerald-400" : pct >= 45 ? "text-amber-400" : "text-red-400";
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
      {label}
      <span className={`font-bold ${color}`}>{pct}%</span>
    </span>
  );
}

export default function SmartEditorTab({
  analysis, jd, scanId, onResumeUpdate, onScoreUpdate, onRescoringChange
}: Props) {
  const [resumeHtml, setResumeHtml] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [liveScore, setLiveScore] = useState<ScoreSnapshot | null>(null);
  const [baseScore, setBaseScore] = useState(0);
  const [isRescoring, setIsRescoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstEditRef = useRef(true);

  useEffect(() => {
    if (!analysis) return;
    const html = analysis.resume_html || analysis.resume_full || "";
    setResumeHtml(html);
    setEditorKey(k => k + 1);
    setBaseScore(analysis.overall_score || 0);
    setLiveScore({
      overall_score: analysis.overall_score || 0,
      letter_grade: analysis.letter_grade || "?",
      keyword_match: analysis.keyword_match,
      semantic_match: analysis.semantic_match,
      evidence_strength: analysis.evidence_strength,
      seniority_fit: analysis.seniority_fit,
      parsing_quality: analysis.parsing_quality,
      formatting_quality: analysis.formatting_quality,
      sub_scores: analysis.sub_scores,
      keywords: analysis.keywords,
    });
    firstEditRef.current = true;
  }, [analysis?.scan_id]);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const triggerRescore = useCallback((html: string) => {
    if (!scanId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsRescoring(true);
      onRescoringChange?.(true);
      try {
        const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const res = await fetch(`/api/quick_score/${scanId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_text: plain }),
          signal: AbortSignal.timeout(45_000),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setLiveScore(prev => ({ ...prev, ...data }));
        onScoreUpdate?.(data);
      } catch {
        // silent — don't interrupt editing
      } finally {
        setIsRescoring(false);
        onRescoringChange?.(false);
      }
    }, 900);
  }, [scanId, onRescoringChange, onScoreUpdate]);

  const handleEditorChange = useCallback((html: string) => {
    setResumeHtml(html);
    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    onResumeUpdate?.(html, plain);
    if (firstEditRef.current) { firstEditRef.current = false; return; }
    triggerRescore(html);
  }, [triggerRescore, onResumeUpdate]);

  const handleOptimize = async () => {
    if (!resumeHtml || !jd) return;
    setIsOptimizing(true);
    try {
      const plain = resumeHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const missingSkills = (liveScore?.keywords?.missing || []).slice(0, 12).map(kwLabel).filter(Boolean);
      const res = await fetch("/api/editor/optimize_resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: plain, jd_text: jd, missing_skills: missingSkills }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.optimized_text) {
        const newHtml = data.optimized_text.split("\n").map((l: string) => `<p>${l || "<br/>"}</p>`).join("");
        firstEditRef.current = false;
        setResumeHtml(newHtml);
        setEditorKey(k => k + 1);
        onResumeUpdate?.(newHtml, data.optimized_text);
        triggerRescore(newHtml);
        showToast("Resume optimized — score updating…");
      }
    } catch (e: any) {
      showToast("AI Optimize failed: " + (e.message || "unknown error"), "err");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleClean = async () => {
    if (!resumeHtml) return;
    setIsCleaning(true);
    try {
      const plain = resumeHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const res = await fetch("/api/editor/clean_resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: plain, jd_text: jd }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.cleaned_text) {
        const newHtml = data.cleaned_text.split("\n").map((l: string) => `<p>${l || "<br/>"}</p>`).join("");
        firstEditRef.current = false;
        setResumeHtml(newHtml);
        setEditorKey(k => k + 1);
        onResumeUpdate?.(newHtml, data.cleaned_text);
        triggerRescore(newHtml);
        const n = data.change_count || 0;
        showToast(n > 0 ? `Removed ${n} AI cliché${n === 1 ? "" : "s"}` : "Already clean — no clichés found");
      }
    } catch (e: any) {
      showToast("AI Clean failed: " + (e.message || "unknown error"), "err");
    } finally {
      setIsCleaning(false);
    }
  };

  const handleExportPdf = async () => {
    if (!resumeHtml) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/editor/export_pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_html: resumeHtml, filename: "resume" }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "resume_ats.pdf";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("ATS-ready PDF downloaded");
    } catch (e: any) {
      showToast("PDF export failed: " + (e.message || "unknown error"), "err");
    } finally {
      setIsExporting(false);
    }
  };

  const score = liveScore?.overall_score ?? 0;
  const scoreDelta = liveScore ? Math.round(score - baseScore) : 0;
  const grade = liveScore?.letter_grade ?? "?";
  const wordCount = resumeHtml
    ? resumeHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length
    : 0;
  const missingKws = (liveScore?.keywords?.missing || []).slice(0, 20);

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-8 bg-card rounded-b-2xl border border-t-0 border-border">
        <div className="h-16 w-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
          <Sparkles className="w-7 h-7 text-violet-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Run Analysis First</h3>
        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
          Upload your resume and a job description to get your ATS score, then return here to edit your resume with live scoring.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-card border border-t-0 border-border rounded-b-2xl overflow-hidden"
      style={{ height: "calc(100vh - 120px)", minHeight: "600px" }}
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl border animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === "ok"
            ? "bg-card border-emerald-500/25 text-emerald-300"
            : "bg-card border-red-500/25 text-red-400"
        }`}>
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Top action bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02] shrink-0 flex-wrap">

        {/* Live score pill */}
        <ScorePill score={score} grade={grade} delta={scoreDelta} isRescoring={isRescoring} />

        {/* Dimension pills */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <DimPill label="KW" value={liveScore?.keyword_match ?? 0} />
          <span className="w-px h-3 bg-white/[0.1]" />
          <DimPill label="Domain" value={liveScore?.semantic_match ?? 0} />
          <span className="w-px h-3 bg-white/[0.1]" />
          <DimPill label="Evidence" value={liveScore?.evidence_strength ?? 0} />
          <span className="w-px h-3 bg-white/[0.1]" />
          <DimPill label="Format" value={liveScore?.formatting_quality ?? 0} />
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={handleOptimize}
          disabled={isOptimizing || !jd}
          data-testid="btn-ai-optimize"
          title="AI rewrites your resume using your missing skills"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
        >
          {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          AI Optimize
        </button>

        <button
          onClick={handleClean}
          disabled={isCleaning}
          data-testid="btn-ai-clean"
          title="Remove AI clichés and filler phrases"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-foreground/75 border border-white/[0.08] rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
        >
          {isCleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5" />}
          AI Clean
        </button>

        <button
          onClick={handleExportPdf}
          disabled={isExporting || !resumeHtml}
          data-testid="btn-export-pdf"
          title="Download ATS-friendly single-column PDF"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export PDF
        </button>
      </div>

      {/* ── Big editor area ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResumeEditor
          key={editorKey}
          value={resumeHtml}
          onChange={handleEditorChange}
          placeholder="Your resume content loads here. Edit anything — the score in the header updates automatically."
        />
      </div>

      {/* ── Bottom status bar ── */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-t border-white/[0.05] bg-white/[0.01] flex-wrap">
        {/* Word count + status */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span data-testid="editor-word-count">~{wordCount} words</span>
          <span className="flex items-center gap-1.5">
            {isRescoring
              ? <><Loader2 className="w-3 h-3 animate-spin text-violet-400" />Updating score…</>
              : <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Score auto-updates</>}
          </span>
        </div>

        {/* Missing skills strip */}
        {missingKws.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />Missing:
            </span>
            {(showMissing ? missingKws : missingKws.slice(0, 6)).map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/8 text-red-400 border border-red-500/18 rounded"
              >
                <X className="w-2 h-2" />{kwLabel(kw)}
              </span>
            ))}
            {missingKws.length > 6 && (
              <button
                onClick={() => setShowMissing(s => !s)}
                className="text-[10px] text-violet-400 font-bold hover:text-violet-300 transition-colors"
              >
                {showMissing ? "show less" : `+${missingKws.length - 6} more`}
              </button>
            )}
          </div>
        )}
        {missingKws.length === 0 && liveScore && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
            <Check className="w-3 h-3" />All keywords matched
          </span>
        )}
      </div>
    </div>
  );
}
