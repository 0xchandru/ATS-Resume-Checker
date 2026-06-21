import { useEffect, useRef } from "react";
import { AnalysisResult } from "../../App";
import { scoreToColor } from "../../utils/formatters";

interface Props {
  result: AnalysisResult;
}

const SUB_SCORE_LABELS: Record<string, { label: string; desc: string }> = {
  keyword_match: { label: "Keyword Match", desc: "How many JD keywords appear in your resume across all matching layers" },
  semantic_relevance: { label: "Semantic Relevance", desc: "Overall topic alignment between your resume and the job description" },
  section_completeness: { label: "Section Completeness", desc: "How many expected resume sections are present" },
  format_compliance: { label: "Format Compliance", desc: "Absence of ATS-blocking formatting issues" },
  impact_quantification: { label: "Impact Quantification", desc: "Percentage of experience bullets containing measurable metrics" },
};

const CIRCUMFERENCE = 2 * Math.PI * 80;

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const color = scoreToColor(score);
  const target = CIRCUMFERENCE * (1 - score / 100);

  useEffect(() => {
    if (!ringRef.current) return;
    ringRef.current.style.strokeDashoffset = `${CIRCUMFERENCE}`;
    const timer = setTimeout(() => {
      if (ringRef.current) {
        ringRef.current.style.transition = "stroke-dashoffset 1.2s ease-out";
        ringRef.current.style.strokeDashoffset = `${target}`;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [score, target]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="192" height="192" viewBox="0 0 192 192">
        <circle cx="96" cy="96" r="80" fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          ref={ringRef}
          cx="96" cy="96" r="80"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
          transform="rotate(-90 96 96)"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-5xl font-bold" style={{ color }}>{Math.round(score)}</p>
        <p className="text-2xl font-bold text-slate-700">{grade}</p>
        <p className="text-xs text-slate-400 mt-1">ATS Score</p>
      </div>
    </div>
  );
}

function SubScoreBar({ name, data }: { name: string; data: any }) {
  const barRef = useRef<HTMLDivElement>(null);
  const meta = SUB_SCORE_LABELS[name] || { label: name, desc: "" };
  const color = scoreToColor(data.score);

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.width = "0%";
    const timer = setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.transition = "width 1s ease-out";
        barRef.current.style.width = `${data.score}%`;
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [data.score]);

  return (
    <div className="group relative">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-slate-700">{meta.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">+{data.weighted_contribution?.toFixed(1)} pts</span>
          <span className="text-sm font-bold" style={{ color }}>{Math.round(data.score)}%</span>
        </div>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div ref={barRef} className="h-full rounded-full" style={{ backgroundColor: color, width: "0%" }} />
      </div>
      <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-2 p-2 bg-slate-800 text-white text-xs rounded-lg max-w-xs shadow-lg">
        {meta.desc}
      </div>
    </div>
  );
}

export default function ScoreDashboard({ result }: Props) {
  const { overall_score, letter_grade, sub_scores, processing_time_seconds, filename } = result;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ATS Score Report</h2>
          <p className="text-sm text-slate-500">{filename} · {processing_time_seconds}s analysis</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Improvement potential</p>
          <p className="text-sm font-semibold text-blue-600">+{Math.round(100 - overall_score)} points possible</p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex-shrink-0">
          <ScoreRing score={overall_score} grade={letter_grade} />
        </div>
        <div className="flex-1 w-full space-y-4">
          {Object.entries(sub_scores || {}).map(([key, data]: [string, any]) => (
            <SubScoreBar key={key} name={key} data={data} />
          ))}
        </div>
      </div>
    </div>
  );
}
