import { Building2, GraduationCap, TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { tierBadgeClass } from "../../utils/formatters";

interface Props {
  career: any;
}

const SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "lead", "principal", "director", "vp", "c_suite"];

const SENIORITY_STYLES: Record<string, string> = {
  intern:    "bg-white/[0.04] text-muted-foreground border border-white/[0.08]",
  junior:    "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  mid:       "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
  senior:    "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  lead:      "bg-purple-500/15 text-purple-400 border border-purple-500/25",
  principal: "bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/25",
  director:  "bg-pink-500/15 text-pink-400 border border-pink-500/25",
  vp:        "bg-rose-500/15 text-rose-400 border border-rose-500/25",
  c_suite:   "bg-red-500/15 text-red-400 border border-red-500/25",
};

function SeniorityPill({ level, label }: { level: string; label: string }) {
  const cls = SENIORITY_STYLES[level] || "bg-white/[0.04] text-muted-foreground border border-white/[0.07]";
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">{label}</p>
      <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-bold capitalize ${cls}`}>
        {level?.replace("_", " ") || "Unknown"}
      </span>
    </div>
  );
}

function ScoreRingSmall({ score }: { score: number }) {
  const c = 2 * Math.PI * 28;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          transform="rotate(-90 36 36)" />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

export default function CareerIntelligence({ career }: Props) {
  if (!career) return null;

  const {
    jd_seniority, resume_seniority, seniority_match, seniority_gap_explanation,
    onet_matched_occupation, recognized_companies, recognized_universities,
    jd_normality_analysis,
  } = career;

  const jdIdx = SENIORITY_ORDER.indexOf(jd_seniority);
  const resIdx = SENIORITY_ORDER.indexOf(resume_seniority);
  const gap = Math.abs(jdIdx - resIdx);

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
      <h2 className="text-xl font-black text-foreground mb-5">Career Intelligence</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Seniority */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
          <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-blue-400" /> Seniority Analysis
          </h3>
          <div className="flex items-center justify-center gap-6 mb-4">
            <SeniorityPill level={jd_seniority} label="JD Expects" />
            <div className="flex flex-col items-center gap-1">
              {seniority_match ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <AlertTriangle className={`h-6 w-6 ${gap >= 2 ? "text-red-400" : "text-amber-400"}`} />
              )}
              <span className={`text-xs font-bold ${seniority_match ? "text-emerald-400" : gap >= 2 ? "text-red-400" : "text-amber-400"}`}>
                {seniority_match ? "Match" : `${gap}-level gap`}
              </span>
            </div>
            <SeniorityPill level={resume_seniority} label="Your Resume" />
          </div>
          {!seniority_match && seniority_gap_explanation && (
            <p className="text-xs text-foreground/70 bg-amber-500/8 border border-amber-500/15 rounded-lg p-2.5 leading-relaxed">{seniority_gap_explanation}</p>
          )}
        </div>

        {/* O*NET */}
        {onet_matched_occupation?.soc_code && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
            <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-violet-400" /> O*NET Role Match
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div>
                <p className="font-bold text-foreground text-sm">{onet_matched_occupation.title}</p>
                <p className="text-xs text-muted-foreground">SOC {onet_matched_occupation.soc_code}</p>
              </div>
              <div className="ml-auto text-right">
                <span className="text-lg font-black text-violet-400">{Math.round((onet_matched_occupation.match_confidence || 0) * 100)}%</span>
                <p className="text-[10px] text-muted-foreground">match</p>
              </div>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round((onet_matched_occupation.match_confidence || 0) * 100)}%` }} />
            </div>
            {onet_matched_occupation.occupation_expected_missing_skills?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{onet_matched_occupation.explanation}</p>
                <div className="flex flex-wrap gap-1">
                  {onet_matched_occupation.occupation_expected_missing_skills.map((s: string) => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-red-500/8 border border-red-500/15 text-red-400 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Companies */}
        {recognized_companies?.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
            <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Recognized Companies
            </h3>
            <div className="space-y-2">
              {recognized_companies.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-foreground/90">{c.canonical}</p>
                    <p className="text-xs text-muted-foreground">{c.industry}</p>
                  </div>
                  {c.tier && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tierBadgeClass(c.tier)}`}>{c.tier}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Universities */}
        {recognized_universities?.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
            <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" /> Recognized Universities
            </h3>
            <div className="space-y-2">
              {recognized_universities.map((u: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-lg">
                  <p className="text-sm font-semibold text-foreground/90">{u.canonical}</p>
                  <span className="text-xs text-muted-foreground">{u.country}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JD Normality */}
        {jd_normality_analysis && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 lg:col-span-2">
            <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-blue-400" /> JD Quality Score
              <span className="text-[10px] text-muted-foreground/50 font-normal normal-case">(checks if JD is well-written)</span>
            </h3>
            <div className="flex items-center gap-4">
              <ScoreRingSmall score={jd_normality_analysis.jd_normality_score} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground/85 mb-1">{jd_normality_analysis.note}</p>
                <p className="text-xs text-muted-foreground">Role: {jd_normality_analysis.role_category_detected}</p>
                {jd_normality_analysis.atypical_missing_from_jd?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-muted-foreground/60">Commonly expected but missing:</span>
                    {jd_normality_analysis.atypical_missing_from_jd.map((k: string) => (
                      <span key={k} className="text-xs px-2 py-0.5 bg-amber-500/8 border border-amber-500/15 text-amber-400 rounded-full">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
