import { useState } from "react";
import {
  Sparkles, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, ArrowRight, ShieldAlert, BarChart2, ClipboardList, Tag, Info,
} from "lucide-react";

export interface MissingRequirement {
  skill: string;
  type: "Required" | "Preferred";
  importance: "Critical" | "High" | "Medium" | "Low";
  alias_available: boolean;
}

export interface AIEvaluation {
  verdict: string;
  biggest_blocker: string;
  candidate_level?: string;
  jd_seniority?: string;
  scores: {
    content_match: number;
    ats_parseability: number;
    formatting_risk: "Low" | "Medium" | "High";
    evidence_quality: "Low" | "Medium" | "High";
  };
  strengths: string[];
  problems: Array<{
    severity: "Critical" | "High" | "Medium" | "Low";
    type: string;
    issue: string;
    fix: string;
    required_vs_preferred?: "Required" | "Preferred" | "N/A";
  }>;
  missing_requirements: MissingRequirement[] | string[];
  fix_plan: string[];
  recommendation: string;
  recommendation_reason: string;
}

interface Props {
  evaluation: AIEvaluation | null;
  isLoading: boolean;
  error: string | null;
  onRun: () => void;
}

const SEVERITY_STYLES: Record<string, { dot: string; badge: string; border: string }> = {
  Critical: { dot: "bg-red-500",    badge: "bg-red-500/15 text-red-400 border-red-500/30",          border: "border-red-500/20" },
  High:     { dot: "bg-orange-500", badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",  border: "border-orange-500/20" },
  Medium:   { dot: "bg-amber-400",  badge: "bg-amber-400/15 text-amber-400 border-amber-400/30",     border: "border-amber-400/20" },
  Low:      { dot: "bg-blue-400",   badge: "bg-blue-400/15 text-blue-400 border-blue-400/30",        border: "border-blue-400/20" },
};

const RISK_STYLES: Record<string, string> = {
  Low:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  Medium: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  High:   "text-red-400 bg-red-500/10 border-red-500/25",
};

const RECOMMEND_STYLES: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  "Apply as-is":                  { icon: CheckCircle2,  color: "text-emerald-400", bg: "bg-emerald-500/8",  border: "border-emerald-500/20" },
  "Apply after minor edits":      { icon: AlertTriangle, color: "text-amber-400",   bg: "bg-amber-500/8",    border: "border-amber-500/20" },
  "Apply only after major edits": { icon: XCircle,       color: "text-red-400",     bg: "bg-red-500/8",      border: "border-red-500/20" },
};

const IMPORTANCE_BADGE: Record<string, string> = {
  Critical: "bg-red-500/15 text-red-400 border-red-500/30",
  High:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Medium:   "bg-amber-400/15 text-amber-400 border-amber-400/30",
  Low:      "bg-blue-400/15 text-blue-400 border-blue-400/30",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "#10b981" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function RiskBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${RISK_STYLES[value] ?? RISK_STYLES.Medium}`}>
        {value}
      </span>
    </div>
  );
}

function ProblemCard({ item }: { item: AIEvaluation["problems"][0] }) {
  const [open, setOpen] = useState(false);
  const s = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.Low;
  const rvp = item.required_vs_preferred;
  return (
    <div className={`rounded-xl border ${s.border} bg-white/[0.015] overflow-hidden`}>
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.badge}`}>{item.severity}</span>
              <span className="text-xs text-muted-foreground bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 rounded-full">{item.type}</span>
              {rvp && rvp !== "N/A" && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  rvp === "Required" ? "bg-red-500/10 text-red-400 border-red-500/25" : "bg-blue-400/10 text-blue-400 border-blue-400/25"
                }`}>
                  {rvp}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/85 leading-snug">{item.issue}</p>
            <button
              onClick={() => setOpen(o => !o)}
              className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {open ? "Hide fix" : "Show fix"}
            </button>
            {open && (
              <div className="mt-2 flex items-start gap-2 p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                <ArrowRight className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">{item.fix}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MissingReqRow({ item }: { item: MissingRequirement }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04] last:border-0">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${IMPORTANCE_BADGE[item.importance] ?? IMPORTANCE_BADGE.Low}`}>
        {item.importance}
      </span>
      <span className="text-sm text-foreground/80 flex-1 min-w-0 truncate">{item.skill}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {item.alias_available && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-full">alias ✓</span>
        )}
        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
          item.type === "Required" ? "bg-red-500/10 text-red-400 border-red-500/25" : "bg-blue-400/10 text-blue-400 border-blue-400/25"
        }`}>
          {item.type}
        </span>
      </div>
    </div>
  );
}

function normalizeMissingReqs(raw: AIEvaluation["missing_requirements"]): MissingRequirement[] {
  if (!raw || raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    return (raw as string[]).map(s => ({ skill: s, type: "Required", importance: "Medium", alias_available: false }));
  }
  return raw as MissingRequirement[];
}

export default function AIVerdict({ evaluation, isLoading, error, onRun }: Props) {
  const [showAllProblems, setShowAllProblems] = useState(false);

  const rec = evaluation ? (RECOMMEND_STYLES[evaluation.recommendation] ?? RECOMMEND_STYLES["Apply after minor edits"]) : null;
  const RecIcon = rec?.icon ?? CheckCircle2;

  const problems = evaluation?.problems ?? [];
  const visibleProblems = showAllProblems ? problems : problems.slice(0, 4);
  const missingReqs = evaluation ? normalizeMissingReqs(evaluation.missing_requirements) : [];

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          AI Verdict
        </h2>
        {!evaluation && !isLoading && (
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-violet-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Run AI Analysis
          </button>
        )}
        {(evaluation || isLoading) && (
          <button
            onClick={onRun}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.07] text-muted-foreground text-xs font-medium rounded-lg hover:bg-white/[0.08] transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Re-run
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
          <p className="text-sm font-medium text-foreground">Analyzing your resume…</p>
          <p className="text-xs text-muted-foreground">This takes 5–15 seconds</p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="m-5 p-4 rounded-xl bg-red-500/8 border border-red-500/20 text-sm text-red-400">
          <p className="font-semibold mb-1">Analysis failed</p>
          <p className="text-xs text-red-400/70">{error}</p>
          <button onClick={onRun} className="mt-2 text-xs underline hover:no-underline text-red-400">Try again</button>
        </div>
      )}

      {/* Empty state */}
      {!evaluation && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 px-5 text-center">
          <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-1">
            <Sparkles className="h-6 w-6 text-violet-400" />
          </div>
          <p className="text-sm font-semibold text-foreground">Get an honest AI evaluation</p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            Detects ATS parseability issues, required vs. preferred gaps, and evidence quality — no stopword inflation.
          </p>
          <button
            onClick={onRun}
            className="mt-2 flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25"
          >
            <Sparkles className="h-4 w-4" />
            Run AI Analysis
          </button>
        </div>
      )}

      {evaluation && !isLoading && (
        <div className="p-5 space-y-4">

          {/* Candidate level */}
          {(evaluation.candidate_level || evaluation.jd_seniority) && (
            <div className="flex items-center gap-2 flex-wrap">
              {evaluation.candidate_level && evaluation.candidate_level !== "Unknown" && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 rounded-full">
                  <Tag className="h-3 w-3" />
                  Candidate: <strong className="text-foreground ml-0.5">{evaluation.candidate_level}</strong>
                </span>
              )}
              {evaluation.jd_seniority && evaluation.jd_seniority !== "Unknown" && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 rounded-full">
                  <Info className="h-3 w-3" />
                  Role: <strong className="text-foreground ml-0.5">{evaluation.jd_seniority}-level</strong>
                </span>
              )}
            </div>
          )}

          {/* Recommendation banner */}
          {rec && (
            <div className={`rounded-xl border p-4 ${rec.bg} ${rec.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <RecIcon className={`h-4 w-4 ${rec.color}`} />
                <span className={`text-sm font-bold ${rec.color}`}>{evaluation.recommendation}</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{evaluation.recommendation_reason}</p>
            </div>
          )}

          {/* Verdict + blocker */}
          <div className="space-y-2">
            <div className="flex items-start gap-2.5 p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <BarChart2 className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/85 leading-relaxed">{evaluation.verdict}</p>
            </div>
            <div className="flex items-start gap-2.5 p-3.5 bg-red-500/6 rounded-xl border border-red-500/18">
              <ShieldAlert className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-400 mb-0.5">Biggest Blocker</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{evaluation.biggest_blocker}</p>
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest">Score Breakdown</p>
            <ScoreBar label="Content Match" value={evaluation.scores.content_match} />
            <ScoreBar label="ATS Parseability" value={evaluation.scores.ats_parseability} />
            <div className="pt-1 border-t border-white/[0.05] space-y-2">
              <RiskBadge label="Formatting Risk" value={evaluation.scores.formatting_risk} />
              <RiskBadge label="Evidence Quality" value={evaluation.scores.evidence_quality} />
            </div>
            {evaluation.scores.ats_parseability < 50 && (
              <p className="text-xs text-red-400/80 bg-red-500/8 rounded-lg px-3 py-2 border border-red-500/15 leading-relaxed">
                ATS parseability below 50 — keyword matching may be unreliable. Fix layout issues first.
              </p>
            )}
          </div>

          {/* Strengths */}
          {evaluation.strengths.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Strengths
              </p>
              <ul className="space-y-1.5">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/75">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Problems */}
          {problems.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-400" /> Problems
              </p>
              <div className="space-y-2">
                {visibleProblems.map((p, i) => <ProblemCard key={i} item={p} />)}
              </div>
              {problems.length > 4 && (
                <button
                  onClick={() => setShowAllProblems(s => !s)}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {showAllProblems ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showAllProblems ? "Show less" : `Show ${problems.length - 4} more`}
                </button>
              )}
            </div>
          )}

          {/* Missing requirements */}
          {missingReqs.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Missing Requirements
              </p>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                {missingReqs.map((r, i) => <MissingReqRow key={i} item={r} />)}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground/50">
                "alias ✓" = you have a functional equivalent — only a soft gap.
              </p>
            </div>
          )}

          {/* Fix plan */}
          {evaluation.fix_plan.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-foreground/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-violet-400" /> Fix Plan
              </p>
              <ol className="space-y-2">
                {evaluation.fix_plan.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground/75 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="text-xs text-muted-foreground/40 text-center pt-1">
            AI evaluation — verify against the actual job description before applying
          </p>
        </div>
      )}
    </div>
  );
}
