import { useEffect, useRef } from "react";
import { AnalysisResult } from "../../App";
import { RefreshCw, Sparkles, HelpCircle } from "lucide-react";
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

const CIRC = 2 * Math.PI * 58;

function scoreToColor(score: number): string {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreToLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Low";
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
        ringRef.current.style.transition = "stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1)";
        ringRef.current.style.strokeDashoffset = `${offset}`;
      }
    }, 80);
    return () => clearTimeout(t);
  }, [score, offset]);

  return (
    <div className="relative inline-flex items-center justify-center score-ring-container">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Decorative outer ring */}
        <circle cx="80" cy="80" r="72" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.15" />
        <circle cx="80" cy="80" r="68" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.08" />
        {/* Background track */}
        <circle cx="80" cy="80" r="58" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" strokeOpacity="0.5" />
        {/* Score arc */}
        <circle
          ref={ringRef}
          cx="80" cy="80" r="58"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
          transform="rotate(-90 80 80)"
          className="score-ring-glow"
          style={{ "--glow-color": `${color}60` } as React.CSSProperties}
        />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <p className="text-5xl font-black leading-none tracking-tight" style={{ color }}>{Math.round(score)}</p>
        <p className="text-[10px] text-muted-foreground mt-1 font-bold tracking-widest uppercase">
          {scoreToLabel(score)}
        </p>
      </div>
    </div>
  );
}

interface CategoryBarProps {
  label: string;
  score: number;
  issuesToFix: number;
  color?: string;
  onClick?: () => void;
}

function CategoryBar({ label, score, issuesToFix, color, onClick }: CategoryBarProps) {
  const barColor = color || scoreToColor(score);
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full group text-left hover:bg-muted/30 rounded-lg px-3 py-2.5 -mx-3 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tabular-nums" style={{ color: barColor }}>{Math.round(score)}%</span>
          {issuesToFix > 0 ? (
            <span className="text-[10px] text-red-400 font-bold bg-red-500/15 px-1.5 py-0.5 rounded-md">
              {issuesToFix}
            </span>
          ) : (
            <span className="text-[10px] text-emerald-400 font-bold">✓</span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, score)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full category-bar"
          style={{ backgroundColor: barColor }}
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
  const { overall_score, letter_grade, keywords, sub_scores, formatting, sections, feedback, category_scores } = result;

  const matchRate = keywords?.match_rate ? Math.round(keywords.match_rate * 100) : 0;
  const matchedCount = keywords?.matched_count || keywords?.matched?.length || 0;
  const totalKw = keywords?.total_jd_keywords || 0;

  const categories = [
    { label: "Parsing Quality", score: result.parsing_quality ?? 0, issues: 0, id: "parsing", color: (result.parsing_quality ?? 0) >= 70 ? "#10b981" : (result.parsing_quality ?? 0) >= 45 ? "#f59e0b" : "#ef4444" },
    { label: "Formatting Quality", score: result.formatting_quality ?? 0, issues: 0, id: "formatting", color: (result.formatting_quality ?? 0) >= 70 ? "#10b981" : (result.formatting_quality ?? 0) >= 45 ? "#f59e0b" : "#ef4444" },
    { label: "Keyword Match", score: result.keyword_match ?? 0, issues: 0, id: "keywords", color: (result.keyword_match ?? 0) >= 70 ? "#10b981" : (result.keyword_match ?? 0) >= 45 ? "#f59e0b" : "#ef4444" },
    { label: "Semantic Match", score: result.semantic_match ?? 0, issues: 0, id: "semantic", color: (result.semantic_match ?? 0) >= 70 ? "#10b981" : (result.semantic_match ?? 0) >= 45 ? "#f59e0b" : "#ef4444" },
    { label: "Evidence Strength", score: result.evidence_strength ?? 0, issues: 0, id: "evidence", color: (result.evidence_strength ?? 0) >= 70 ? "#10b981" : (result.evidence_strength ?? 0) >= 45 ? "#f59e0b" : "#ef4444" },
    { label: "Seniority Fit", score: result.seniority_fit ?? 0, issues: 0, id: "seniority", color: (result.seniority_fit ?? 0) >= 70 ? "#10b981" : (result.seniority_fit ?? 0) >= 45 ? "#f59e0b" : "#ef4444" },
  ];

  // Match rate badge class
  const matchBadgeClass = matchRate >= 70 ? "match-excellent" : matchRate >= 40 ? "match-good" : "match-poor";

  return (
    <div className="glass-sidebar rounded-2xl overflow-hidden">
      {/* Header with gradient */}
      <div className="sidebar-gradient-header px-5 pt-4 pb-3">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Resume Analysis</p>
        <p className="text-sm font-bold text-foreground truncate mt-0.5">{result.filename}</p>
      </div>

      {/* Match Rate Ring */}
      <div className="flex flex-col items-center py-6">
        <ScoreRing score={overall_score} grade={letter_grade} />
        <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold border ${matchBadgeClass}`}>
          {matchedCount}/{totalKw} keywords matched ({matchRate}%)
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-5 py-4 border-t border-border/50 space-y-2.5">
        <button
          onClick={onRescan}
          disabled={isRescanning}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-60 shadow-lg shadow-primary/20"
        >
          <RefreshCw className={`h-4 w-4 ${isRescanning ? "animate-spin" : ""}`} />
          {isRescanning ? "Rescanning…" : "Upload & rescan"}
        </button>
        <button
          onClick={onRunAI}
          disabled={aiLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition-all disabled:opacity-60"
        >
          <Sparkles className={`h-4 w-4 text-primary ${aiLoading ? "animate-pulse" : ""}`} />
          {aiLoading ? "Optimizing…" : "✨ AI Optimize"}
        </button>
        {rescanError && (
          <p className="text-xs text-red-500 text-center">{rescanError}</p>
        )}
      </div>

      {result.seniority_analysis && (
        <div className="px-5 py-3 border-t border-border/50">
          <SeniorityBadge 
            jdLevel={result.seniority_analysis.jd_level.level}
            resumeLevel={result.seniority_analysis.resume_level.level}
            gapSeverity={result.seniority_analysis.gap.gap_severity}
          />
        </div>
      )}

      {/* Category Bars */}
      <div className="px-5 py-4 flex flex-col gap-1 relative border-t border-border/50">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Score Breakdown</p>
        <div className="space-y-1">
          {categories.map((c, i) => (
            <motion.div 
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <CategoryBar
                label={c.label}
                score={c.score}
                issuesToFix={c.issues}
                color={c.color}
                onClick={() => onScrollToCategory?.(c.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Guide Me */}
      <div className="px-5 py-3 border-t border-border/50">
        <button
          onClick={onNewScan}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          <span>New scan</span>
        </button>
      </div>
    </div>
  );
}
