import { useEffect, useRef } from "react";
import { AnalysisResult } from "../App";
import { RefreshCw, PlusCircle, Sparkles, HelpCircle } from "lucide-react";

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
    <div className="relative inline-flex items-center justify-center">
      <svg width="148" height="148" viewBox="0 0 148 148">
        {/* Outer glow ring */}
        <circle cx="74" cy="74" r="64" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.1" />
        {/* Background track */}
        <circle cx="74" cy="74" r="58" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        {/* Score arc */}
        <circle
          ref={ringRef}
          cx="74" cy="74" r="58"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
          transform="rotate(-90 74 74)"
          className="score-ring-glow"
          style={{ "--glow-color": `${color}60` } as React.CSSProperties}
        />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <p className="text-4xl font-black leading-none" style={{ color }}>{Math.round(score)}</p>
        <p className="text-xs text-muted-foreground mt-1 font-semibold tracking-wider uppercase">
          {score >= 75 ? "Great" : score >= 50 ? "Fair" : "Low"}
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
  const barRef = useRef<HTMLDivElement>(null);
  const barColor = color || scoreToColor(score);

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.width = "0%";
    const t = setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.transition = "width 1s cubic-bezier(.4,0,.2,1)";
        barRef.current.style.width = `${Math.min(100, score)}%`;
      }
    }, 200);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <button
      onClick={onClick}
      className="w-full group text-left hover:bg-muted/30 rounded-lg px-3 py-2 -mx-3 transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {issuesToFix > 0 ? (
          <span className="text-xs text-muted-foreground font-medium">
            {issuesToFix} issue{issuesToFix > 1 ? "s" : ""} to fix
          </span>
        ) : (
          <span className="text-xs text-emerald-500 font-medium">✓</span>
        )}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          ref={barRef}
          className="h-full rounded-full category-bar"
          style={{ backgroundColor: barColor, width: "0%" }}
        />
      </div>
    </button>
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

  // Prefer backend-computed category_scores; fall back to client-side derivation
  const cs = category_scores;

  const matchRate = keywords?.match_rate ? Math.round(keywords.match_rate * 100) : 0;

  const searchabilityScore = cs?.searchability?.score ?? Math.round(
    ((sub_scores?.section_completeness?.score || 0) * 0.5 +
    (sub_scores?.keyword_match?.score || 0) * 0.5)
  );
  const searchabilityIssues = cs?.searchability?.issues_to_fix ?? ((sections?.missing?.length || 0) + (matchRate < 50 ? 1 : 0));

  const hardSkillsScore = cs?.hard_skills?.score ?? Math.round(sub_scores?.keyword_match?.score || 0);
  const hardSkillsIssues = cs?.hard_skills?.issues_to_fix ?? (keywords?.missing?.filter((m: any) =>
    m.jd_importance === "critical" || m.jd_importance === "high"
  )?.length || 0);

  const softSkillsScore = cs?.soft_skills?.score ?? Math.round(sub_scores?.semantic_relevance?.score || 0);
  const softSkillsIssues = cs?.soft_skills?.issues_to_fix ?? Math.min(keywords?.missing?.filter((m: any) =>
    m.jd_importance === "medium" || m.jd_importance === "low"
  )?.length || 0, 5);

  const recruiterScore = cs?.recruiter_tips?.score ?? Math.round(sub_scores?.impact_quantification?.score || 0);
  const recruiterIssues = cs?.recruiter_tips?.issues_to_fix ?? (feedback?.filter((f: any) => f.priority === "important")?.length || 0);

  const formattingScore = cs?.formatting?.score ?? Math.round(sub_scores?.format_compliance?.score || 0);
  const formattingIssues = cs?.formatting?.issues_to_fix ?? (formatting?.issues?.filter((i: any) =>
    i.severity === "critical" || i.severity === "warning"
  )?.length || 0);

  const categories = [
    { label: "Searchability", score: searchabilityScore, issues: searchabilityIssues, id: "searchability" },
    { label: "Hard Skills", score: hardSkillsScore, issues: hardSkillsIssues, id: "hard-skills" },
    { label: "Soft Skills", score: softSkillsScore, issues: softSkillsIssues, id: "soft-skills" },
    { label: "Recruiter Tips", score: recruiterScore, issues: recruiterIssues, id: "recruiter-tips" },
    { label: "Formatting", score: formattingScore, issues: formattingIssues, id: "formatting" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
      {/* Header with scan info */}
      <div className="px-5 pt-3 pb-2 border-b border-border/50">
        <p className="text-xs text-muted-foreground">Resume scan results</p>
        <p className="text-sm font-semibold text-foreground truncate">{result.filename}</p>
      </div>

      {/* Match Rate Ring */}
      <div className="flex flex-col items-center py-5 border-b border-border">
        <p className="text-sm font-bold text-foreground mb-3">Match Rate</p>
        <ScoreRing score={overall_score} grade={letter_grade} />
      </div>

      {/* Action Buttons */}
      <div className="px-5 py-4 border-b border-border space-y-2.5">
        <button
          onClick={onRescan}
          disabled={isRescanning}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-60 shadow-md shadow-primary/20"
        >
          <RefreshCw className={`h-4 w-4 ${isRescanning ? "animate-spin" : ""}`} />
          {isRescanning ? "Rescanning…" : "Upload & rescan"}
        </button>
        <button
          onClick={onRunAI}
          disabled={aiLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60"
        >
          <Sparkles className={`h-4 w-4 text-primary ${aiLoading ? "animate-pulse" : ""}`} />
          {aiLoading ? "Optimizing…" : "✨ AI Optimize"}
        </button>
        {rescanError && (
          <p className="text-xs text-red-500 text-center">{rescanError}</p>
        )}
      </div>

      {/* Category Bars */}
      <div className="px-5 py-4 space-y-1">
        {categories.map((cat) => (
          <CategoryBar
            key={cat.id}
            label={cat.label}
            score={cat.score}
            issuesToFix={cat.issues}
            onClick={() => onScrollToCategory?.(cat.id)}
          />
        ))}
      </div>

      {/* Guide Me */}
      <div className="px-5 py-3 border-t border-border">
        <button
          onClick={onNewScan}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Guide me</span>
        </button>
      </div>
    </div>
  );
}
