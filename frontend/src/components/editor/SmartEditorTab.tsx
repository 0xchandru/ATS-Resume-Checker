import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles, Loader2, Download, Wand2, Eraser,
  CheckCircle2, AlertCircle, ChevronRight, Zap, FileText,
  Target, TrendingUp, Award, BookOpen, BarChart2, Check, X
} from "lucide-react";
import RichTextEditor from "../common/RichTextEditor";

interface Keyword {
  keyword?: string;
  term?: string;
  category?: string;
  score?: number;
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

function ScoreRing({ score, size = 84 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dashOffset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? "#10b981" : pct >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.65s ease, stroke 0.4s ease" }}
      />
    </svg>
  );
}

function DimBar({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  const pct = Math.round(Math.min(100, Math.max(0, (value || 0) * 100)));
  const bg = pct >= 70 ? "bg-emerald-500" : pct >= 45 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground font-medium">
          <Icon className="w-3 h-3" />{label}
        </span>
        <span className="font-bold text-foreground/90">{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bg} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Chip({ label, type }: { label: string; type: "matched" | "missing" }) {
  if (type === "matched") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md leading-tight">
        <Check className="w-2.5 h-2.5 shrink-0" />{label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-red-500/8 text-red-400 border border-red-500/20 rounded-md leading-tight">
      <X className="w-2.5 h-2.5 shrink-0" />{label}
    </span>
  );
}

export default function SmartEditorTab({
  analysis, jd, scanId, onResumeUpdate, onScoreUpdate, onRescoringChange
}: Props) {
  const [resumeHtml, setResumeHtml] = useState("");
  const [liveScore, setLiveScore] = useState<ScoreSnapshot | null>(null);
  const [baseScore, setBaseScore] = useState(0);
  const [isRescoring, setIsRescoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstEditRef = useRef(true);

  useEffect(() => {
    if (!analysis) return;
    const html = analysis.resume_html || analysis.resume_full || "";
    setResumeHtml(html);
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
        // silent — don't disrupt the user's editing flow
      } finally {
        setIsRescoring(false);
        onRescoringChange?.(false);
      }
    }, 900);
  }, [scanId, onRescoringChange, onScoreUpdate]);

  const handleEditorChange = (html: string) => {
    setResumeHtml(html);
    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    onResumeUpdate?.(html, plain);
    if (firstEditRef.current) { firstEditRef.current = false; return; }
    triggerRescore(html);
  };

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
        setResumeHtml(newHtml);
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
        setResumeHtml(newHtml);
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
  const scoreColor = score >= 75 ? "text-emerald-400" : score >= 55 ? "text-amber-400" : "text-red-400";
  const wordCount = resumeHtml
    ? resumeHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length
    : 0;

  const matchedKws = (liveScore?.keywords?.matched || []).slice(0, 20);
  const missingKws = (liveScore?.keywords?.missing || []).slice(0, 16);

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-violet-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">Run Analysis First</h3>
        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
          Upload your resume and a job description to get your ATS score, then come here to edit and improve it with live scoring.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ minHeight: "600px" }}>
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl border animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === "ok"
            ? "bg-card border-emerald-500/25 text-emerald-300"
            : "bg-card border-red-500/25 text-red-400"
        }`}>
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/[0.06] bg-card/60 flex-wrap shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-foreground">Smart Editor</span>
          </div>
          {isRescoring && (
            <span className="flex items-center gap-1 text-[11px] text-violet-400 font-semibold px-2 py-0.5 bg-violet-500/8 rounded-full border border-violet-500/15">
              <Loader2 className="w-3 h-3 animate-spin" />Rescoring
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOptimize}
            disabled={isOptimizing || !jd}
            data-testid="btn-ai-optimize"
            title="AI rewrites your resume to better match the JD using your missing skills"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/18 text-violet-300 border border-violet-500/20 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
          >
            {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            AI Optimize
          </button>

          <button
            onClick={handleClean}
            disabled={isCleaning}
            data-testid="btn-ai-clean"
            title="Remove AI clichés, hollow buzzwords, and filler phrases"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.07] text-foreground/75 border border-white/[0.08] rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
          >
            {isCleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5" />}
            AI Clean
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExporting || !resumeHtml}
            data-testid="btn-export-pdf"
            title="Download an ATS-friendly single-column PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/18 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Body: sidebar + editor */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Score sidebar ── */}
        <div className="w-60 shrink-0 border-r border-white/[0.06] bg-card/20 flex flex-col overflow-y-auto gap-5 p-4">

          {/* Score ring */}
          <div className="flex flex-col items-center pt-1">
            <div className="relative">
              <ScoreRing score={score} size={84} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-lg font-black leading-none ${scoreColor}`} data-testid="live-score-value">
                  {Math.round(score)}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold mt-0.5">{grade}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-1.5">ATS Score</p>
            {scoreDelta !== 0 && (
              <p className={`text-[11px] font-bold mt-0.5 ${scoreDelta > 0 ? "text-emerald-400" : "text-red-400"}`}
                data-testid="score-delta">
                {scoreDelta > 0 ? "↑ +" : "↓ "}{Math.abs(scoreDelta)} from baseline
              </p>
            )}
          </div>

          {/* Dimension bars */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">Dimensions</p>
            <DimBar label="Keyword Match" value={liveScore?.keyword_match ?? 0} icon={Target} />
            <DimBar label="Domain Fit" value={liveScore?.semantic_match ?? 0} icon={BarChart2} />
            <DimBar label="Evidence" value={liveScore?.evidence_strength ?? 0} icon={Award} />
            <DimBar label="Seniority" value={liveScore?.seniority_fit ?? 0} icon={TrendingUp} />
            <DimBar label="ATS Format" value={liveScore?.formatting_quality ?? 0} icon={FileText} />
            <DimBar label="Sections" value={liveScore?.parsing_quality ?? 0} icon={BookOpen} />
          </div>

          {/* Missing skills */}
          {missingKws.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">
                Missing ({missingKws.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingKws.map((kw, i) => (
                  <Chip key={i} label={kwLabel(kw)} type="missing" />
                ))}
              </div>
              {jd && (
                <p className="text-[10px] text-muted-foreground">
                  Click <strong className="text-violet-400">AI Optimize</strong> to weave these in.
                </p>
              )}
            </div>
          )}

          {/* Matched skills */}
          {matchedKws.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">
                Matched ({matchedKws.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchedKws.map((kw, i) => (
                  <Chip key={i} label={kwLabel(kw)} type="matched" />
                ))}
              </div>
            </div>
          )}

          {/* Quick tips */}
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/12 p-3 space-y-2">
            <p className="text-[10px] font-bold text-violet-400 flex items-center gap-1.5 uppercase tracking-widest">
              <Zap className="w-3 h-3" />Tips
            </p>
            <ul className="text-[10px] text-muted-foreground/80 space-y-1.5 leading-relaxed">
              <li><ChevronRight className="w-2.5 h-2.5 inline text-violet-400" /> Start bullets with strong verbs</li>
              <li><ChevronRight className="w-2.5 h-2.5 inline text-violet-400" /> Add metrics — %, $, time, scale</li>
              <li><ChevronRight className="w-2.5 h-2.5 inline text-violet-400" /> Mirror keywords from the JD</li>
              <li><ChevronRight className="w-2.5 h-2.5 inline text-violet-400" /> Score updates as you type</li>
            </ul>
          </div>
        </div>

        {/* ── Rich text editor ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden p-3">
            <RichTextEditor
              value={resumeHtml}
              onChange={handleEditorChange}
              placeholder="Your resume content will load here. Edit any text and watch the score update live."
              minHeight="100%"
            />
          </div>

          {/* Status bar */}
          <div className="px-5 py-2 border-t border-white/[0.05] bg-card/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
            <span data-testid="editor-word-count">~{wordCount} words</span>
            <span className="flex items-center gap-1.5">
              {isRescoring
                ? <><Loader2 className="w-3 h-3 animate-spin text-violet-400" />Updating score…</>
                : <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Score auto-updates</>
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
