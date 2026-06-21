import { useEffect, useRef } from "react";
import { AnalysisResult } from "../../App";
import { RefreshCw, Sparkles, PlusCircle } from "lucide-react";
import SeniorityBadge from "../verdict/SeniorityBadge";
import { motion } from "framer-motion";

interface Props {
  result: AnalysisResult;
  onNewScan: () => void;
  onRescan: () => void;
  isRescanning: boolean;
  rescanError?: string;
  onRunAI: () => void;
  aiLoading: boolean;
  onScrollToCategory?: (category: string) => void;
}

const CIRC = 2 * Math.PI * 56;

function scoreToColor(score: number): string {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreToGradient(score: number): string {
  if (score >= 75) return "url(#grad-green)";
  if (score >= 50) return "url(#grad-amber)";
  return "url(#grad-red)";
}

function scoreToLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Low Match";
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const color = scoreToColor(score);
  const offset = CIRC * (1 - score / 100);

  useEffect(() => {
    if (!ringRef.current) return;
    ringRef.current.style.strokeDashoffset = `${CIRC}`;
    const t = setTimeout(() => {
      if (ringRef.current) {
        ringRef.current.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)";
        ringRef.current.style.strokeDashoffset = `${offset}`;
      }
    }, 100);
    return () => clearTimeout(t);
  }, [score, offset]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="156" height="156" viewBox="0 0 156 156">
        <defs>
          <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        {/* Outer decorative rings */}
        <circle cx="78" cy="78" r="72" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.12" />
        <circle cx="78" cy="78" r="68" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.07" />
        {/* Track */}
        <circle cx="78" cy="78" r="56" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        {/* Score arc */}
        <circle
          ref={ringRef}
          cx="78" cy="78" r="56"
          fill="none"
          stroke={scoreToGradient(score)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
          transform="rotate(-90 78 78)"
          className="score-ring-glow"
          style={{ "--glow-color": `${color}55` } as React.CSSProperties}
        />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <p className="text-5xl font-black leading-none tracking-tight" style={{ color }} data-testid="text-overall-score">
          {Math.round(score)}
        </p>
        <p className="text-[9px] text-muted-foreground mt-1 font-bold tracking-widest uppercase">
          {scoreToLabel(score)}
        </p>
        <div className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-black border" style={{
          background: `${color}18`,
          color,
          borderColor: `${color}35`,
        }}>
          {grade}
        </div>
      </div>
    </div>
  );
}

function CategoryBar({
  label, score, color, onClick
}: { label: string; score: number; color: string; onClick?: () => void }) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={onClick}
      className="w-full text-left group"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{Math.round(score)}%</span>
      </div>
      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, score)}%` }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="h-full rounded-full category-bar"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.button>
  );
}

export default function ResultsSidebar({
  result,
  onNewScan,
  onRescan,
  isRescanning,
  rescanError,
  onRunAI,
  aiLoading,
  onScrollToCategory,
}: Props) {
  const { overall_score, letter_grade, keywords } = result;

  const matchRate = keywords?.match_rate ? Math.round(keywords.match_rate * 100) : 0;
  const matchedCount = keywords?.matched_count || keywords?.matched?.length || 0;
  const totalKw = keywords?.total_jd_keywords || 0;

  const categories = [
    {
      label: "Parsing Quality",
      score: result.parsing_quality ?? 0,
      id: "parsing",
    },
    {
      label: "Keyword Match",
      score: result.keyword_match ?? 0,
      id: "keywords",
    },
    {
      label: "Semantic Match",
      score: result.semantic_match ?? 0,
      id: "semantic",
    },
    {
      label: "Evidence Strength",
      score: result.evidence_strength ?? 0,
      id: "evidence",
    },
    {
      label: "Seniority Fit",
      score: result.seniority_fit ?? 0,
      id: "seniority",
    },
    {
      label: "Formatting",
      score: result.formatting_quality ?? 0,
      id: "formatting",
    },
  ].map(c => ({
    ...c,
    color: c.score >= 70 ? "#10b981" : c.score >= 45 ? "#f59e0b" : "#ef4444",
  }));

  const matchBadgeClass = matchRate >= 70 ? "match-excellent" : matchRate >= 40 ? "match-good" : "match-poor";

  return (
    <div className="glass-sidebar rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="sidebar-gradient-header px-4 pt-4 pb-3">
        <p className="text-[9px] text-violet-400 font-bold uppercase tracking-widest">Current Scan</p>
        <p className="text-sm font-semibold text-foreground truncate mt-0.5" data-testid="text-filename">{result.filename}</p>
      </div>

      {/* Score Ring */}
      <div className="flex flex-col items-center py-6">
        <ScoreRing score={overall_score} grade={letter_grade} />
        <div className={`mt-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${matchBadgeClass}`} data-testid="text-match-rate">
          {matchedCount}/{totalKw} keywords · {matchRate}%
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 space-y-2 border-t border-white/[0.05]">
        <div className="pt-4" />
        <button
          onClick={onRescan}
          disabled={isRescanning}
          data-testid="btn-rescan"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-500 text-white hover:opacity-90 transition-all disabled:opacity-50 shadow-md shadow-violet-500/20"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRescanning ? "animate-spin" : ""}`} />
          {isRescanning ? "Rescanning…" : "Upload & Rescan"}
        </button>
        <button
          onClick={onRunAI}
          disabled={aiLoading}
          data-testid="btn-ai-optimize"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/[0.08] bg-white/[0.03] rounded-xl text-sm font-semibold text-foreground hover:bg-white/[0.06] hover:border-violet-500/30 transition-all disabled:opacity-50"
        >
          <Sparkles className={`h-3.5 w-3.5 text-violet-400 ${aiLoading ? "animate-pulse" : ""}`} />
          {aiLoading ? "Optimizing…" : "AI Optimize"}
        </button>
        {rescanError && (
          <p className="text-xs text-red-400 text-center">{rescanError}</p>
        )}
      </div>

      {/* Seniority Badge */}
      {result.seniority_analysis && (
        <div className="px-4 py-3 border-t border-white/[0.05]">
          <SeniorityBadge
            jdLevel={result.seniority_analysis.jd_level?.level}
            resumeLevel={result.seniority_analysis.resume_level?.level}
            gapSeverity={result.seniority_analysis.gap?.gap_severity}
          />
        </div>
      )}

      {/* Score Breakdown */}
      <div className="px-4 py-4 border-t border-white/[0.05] space-y-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Score Breakdown</p>
        {categories.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <CategoryBar
              label={c.label}
              score={c.score}
              color={c.color}
              onClick={() => onScrollToCategory?.(c.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* New Scan */}
      <div className="px-4 py-3 border-t border-white/[0.05]">
        <button
          onClick={onNewScan}
          data-testid="btn-new-scan-sidebar"
          className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-violet-400 transition-colors py-1"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Start new scan
        </button>
      </div>
    </div>
  );
}
