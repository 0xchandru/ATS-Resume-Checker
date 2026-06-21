import { useEffect, useRef } from "react";
import { AnalysisResult } from "../../App";
import { RefreshCw, PlusCircle, Search, Award, Cpu, AlignLeft, Target } from "lucide-react";
import { scoreToColor } from "../../utils/formatters";

interface Props {
  result: AnalysisResult;
  onNewScan: () => void;
  onRescan: () => void;
  isRescanning: boolean;
  rescanError?: string;
}

const CIRC = 2 * Math.PI * 52;

const FACTORS = [
  { key: "keyword_match",        label: "Searchability",    icon: Search },
  { key: "semantic_relevance",   label: "Semantic Match",   icon: Target },
  { key: "section_completeness", label: "Sections",         icon: AlignLeft },
  { key: "format_compliance",    label: "Formatting",       icon: Cpu },
  { key: "impact_quantification",label: "Impact",           icon: Award },
];

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
      <svg width="128" height="128" viewBox="0 0 128 128">
        {/* bg track */}
        <circle cx="64" cy="64" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        {/* value arc */}
        <circle
          ref={ringRef}
          cx="64" cy="64" r="52"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
          transform="rotate(-90 64 64)"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
        {/* glow ring at score end — decorative */}
        <circle
          cx="64" cy="64" r="52"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.15"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <p className="text-3xl font-black leading-none" style={{ color }}>{Math.round(score)}</p>
        <p className="text-lg font-bold text-foreground mt-0.5">{grade}</p>
        <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">ATS Score</p>
      </div>
    </div>
  );
}

function FactorBar({ label, score, icon: Icon }: { label: string; score: number; icon: any }) {
  const barRef = useRef<HTMLDivElement>(null);
  const color = scoreToColor(score);

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.width = "0%";
    const t = setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.transition = "width 0.9s cubic-bezier(.4,0,.2,1)";
        barRef.current.style.width = `${score}%`;
      }
    }, 200);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
        </div>
        <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color }}>
          {Math.round(score)}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: "0%", boxShadow: `0 0 4px ${color}80` }}
        />
      </div>
    </div>
  );
}

export default function SidebarScore({ result, onNewScan, onRescan, isRescanning, rescanError }: Props) {
  const { overall_score, letter_grade, sub_scores, filename, processing_time_seconds, keywords } = result;
  const matchRate = keywords?.match_rate ? Math.round(keywords.match_rate * 100) : 0;
  const matchColor = scoreToColor(matchRate);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex flex-col items-center gap-3">
          <ScoreRing score={overall_score} grade={letter_grade} />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground truncate max-w-[200px]" title={filename}>
              {filename}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Analyzed in {processing_time_seconds?.toFixed(1)}s
            </p>
          </div>
        </div>

        {/* Match rate */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Match Rate</span>
            <span className="text-sm font-bold" style={{ color: matchColor }}>{matchRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${matchRate}%`, backgroundColor: matchColor }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {keywords?.matched_count || 0} of {keywords?.total_jd_keywords || 0} keywords matched
          </p>
        </div>
      </div>

      {/* Factor bars */}
      <div className="px-5 py-4 border-b border-border space-y-3.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resume Factors</p>
        {FACTORS.map(({ key, label, icon }) => {
          const data = sub_scores?.[key];
          if (!data) return null;
          const score = typeof data === "object" ? data.score : data;
          return <FactorBar key={key} label={label} score={score} icon={icon} />;
        })}
      </div>

      {/* Improvement potential */}
      <div className="px-5 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Improvement potential</span>
          <span className="text-xs font-bold text-primary">
            +{Math.round(100 - overall_score)} pts
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 space-y-2.5">
        <button
          onClick={onRescan}
          disabled={isRescanning}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRescanning ? "animate-spin" : ""}`} />
          {isRescanning ? "Rescanning…" : "Rescan Resume"}
        </button>
        <button
          onClick={onNewScan}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 hover:text-foreground transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          New Scan
        </button>
        {rescanError && (
          <p className="text-xs text-red-500 text-center">{rescanError}</p>
        )}
      </div>
    </div>
  );
}
