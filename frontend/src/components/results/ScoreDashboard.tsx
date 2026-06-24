import { useEffect, useRef } from "react";
import { AnalysisResult } from "../../App";
import { scoreToColor } from "../../utils/formatters";
import { Shield, Brain, AlertTriangle } from "lucide-react";

interface Props {
  result: AnalysisResult;
}

const SUB_SCORE_LABELS: Record<string, { label: string; desc: string }> = {
  keyword_match:        { label: "Keyword Match",       desc: "How many JD keywords appear in your resume across all matching layers" },
  semantic_relevance:   { label: "Semantic Relevance",  desc: "Overall topic alignment between your resume and the job description" },
  evidence_quality:     { label: "Evidence Quality",    desc: "How well your skills are substantiated — unsupported keyword claims reduce this score" },
  seniority_fit:        { label: "Seniority Fit",       desc: "Alignment between your experience level and the role's seniority requirements" },
  format_compliance:    { label: "Format Compliance",   desc: "Absence of ATS-blocking formatting issues" },
  section_completeness: { label: "Section Completeness",desc: "How many expected resume sections are present" },
  impact_quantification:{ label: "Impact Quantification",desc: "Quality of quantified achievement bullets — high-impact outcomes count double" },
};

const ROLE_PROFILE_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  cybersecurity: { label: "Cybersecurity weights active", color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20",   Icon: Shield },
  software:      { label: "Software engineering weights", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20", Icon: Brain  },
  default:       { label: "General ATS weights",          color: "text-slate-400",  bg: "bg-white/[0.04] border-white/[0.07]",  Icon: Brain  },
};

const CIRCUMFERENCE = 2 * Math.PI * 80;

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const color = scoreToColor(score);
  const target = CIRCUMFERENCE * (1 - score / 100);

  useEffect(() => {
    if (!ringRef.current) return;
    ringRef.current.style.strokeDashoffset = `${CIRCUMFERENCE}`;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      if (ringRef.current) {
        ringRef.current.style.transition = "stroke-dashoffset 1.2s ease-out";
        ringRef.current.style.strokeDashoffset = `${target}`;
      }
    }));
    return () => cancelAnimationFrame(raf);
  }, [score, target]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="192" height="192" viewBox="0 0 192 192">
        <defs>
          <filter id="score-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
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
          filter="url(#score-glow)"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-5xl font-black tabular-nums" style={{ color }}>{Math.round(score)}</p>
        <p className="text-2xl font-black text-foreground/60">{grade}</p>
        <p className="text-xs text-muted-foreground/50 mt-1 uppercase tracking-widest">ATS Score</p>
      </div>
    </div>
  );
}

function SubScoreDetail({ name, data }: { name: string; data: any }) {
  if (name === "evidence_quality" && data.grade && data.grade !== "N/A") {
    const isWeak = ["D", "F", "C", "C+"].includes(data.grade);
    return (
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
        isWeak ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
      }`}>
        {isWeak && <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />}
        {data.grade}
      </span>
    );
  }
  if (name === "impact_quantification" && data.high_impact_bullets !== undefined) {
    return (
      <span className="text-[10px] text-muted-foreground/50">
        {data.high_impact_bullets} high-impact · {data.quantified_bullets} total
      </span>
    );
  }
  if (name === "seniority_fit" && data.gap_severity) {
    const isGap = data.gap_severity !== "none" && data.gap_severity !== "unknown";
    return isGap ? (
      <span className="text-[10px] text-amber-400 font-medium">{data.gap_severity} gap</span>
    ) : null;
  }
  return null;
}

function SubScoreBar({ name, data }: { name: string; data: any }) {
  const barRef = useRef<HTMLDivElement>(null);
  const meta = SUB_SCORE_LABELS[name] || { label: name, desc: "" };
  const color = scoreToColor(data.score);

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.width = "0%";
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      if (barRef.current) {
        barRef.current.style.transition = "width 1s ease-out";
        barRef.current.style.width = `${data.score}%`;
      }
    }));
    return () => cancelAnimationFrame(raf);
  }, [data.score]);

  return (
    <div className="group relative">
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground/80">{meta.label}</span>
          <SubScoreDetail name={name} data={data} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/50 tabular-nums">+{data.weighted_contribution?.toFixed(1)} pts</span>
          <span className="text-sm font-black tabular-nums" style={{ color }}>{Math.round(data.score)}%</span>
        </div>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div ref={barRef} className="h-full rounded-full" style={{ backgroundColor: color, width: "0%" }} />
      </div>
      {meta.desc && (
        <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-2 p-2.5 bg-[#1a1b26] text-white text-xs rounded-xl max-w-xs shadow-xl border border-white/[0.08] leading-relaxed">
          {meta.desc}
          {data.details && <p className="mt-1 text-muted-foreground">{data.details}</p>}
        </div>
      )}
    </div>
  );
}

export default function ScoreDashboard({ result }: Props) {
  const { overall_score, letter_grade, sub_scores, processing_time_seconds, filename } = result;
  const roleProfile = (result as any).role_profile as string | undefined;
  const profileKey = roleProfile && roleProfile in ROLE_PROFILE_CONFIG ? roleProfile : "default";
  const profile = ROLE_PROFILE_CONFIG[profileKey];
  const ProfileIcon = profile.Icon;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-foreground">ATS Score Report</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{filename} · {processing_time_seconds}s analysis</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1.5">
          {roleProfile && roleProfile !== "default" && (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border ${profile.bg} ${profile.color}`}>
              <ProfileIcon className="w-3 h-3" />
              {profile.label}
            </div>
          )}
          <div>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Improvement potential</p>
            <p className="text-sm font-bold text-violet-400">+{Math.round(100 - overall_score)} points possible</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="shrink-0">
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
