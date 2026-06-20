import { Building2, GraduationCap, TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { tierBadgeClass } from "../utils/formatters";

interface Props {
  career: any;
}

const SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "lead", "principal", "director", "vp", "c_suite"];
const SENIORITY_COLORS: Record<string, string> = {
  intern: "bg-slate-200 text-slate-600",
  junior: "bg-blue-100 text-blue-700",
  mid: "bg-cyan-100 text-cyan-700",
  senior: "bg-violet-100 text-violet-700",
  lead: "bg-purple-100 text-purple-700",
  principal: "bg-fuchsia-100 text-fuchsia-700",
  director: "bg-pink-100 text-pink-700",
  vp: "bg-rose-100 text-rose-700",
  c_suite: "bg-red-100 text-red-700",
};

function SeniorityPill({ level, label }: { level: string; label: string }) {
  const cls = SENIORITY_COLORS[level] || "bg-slate-100 text-slate-600";
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${cls}`}>
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
        <circle cx="36" cy="36" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          transform="rotate(-90 36 36)" />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}</span>
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-5">Career Intelligence</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seniority */}
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" /> Seniority Analysis
          </h3>
          <div className="flex items-center justify-center gap-6 mb-4">
            <SeniorityPill level={jd_seniority} label="JD Expects" />
            <div className="flex flex-col items-center gap-1">
              {seniority_match ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <AlertTriangle className={`h-6 w-6 ${gap >= 2 ? "text-red-500" : "text-amber-500"}`} />
              )}
              <span className={`text-xs font-semibold ${seniority_match ? "text-emerald-600" : gap >= 2 ? "text-red-600" : "text-amber-600"}`}>
                {seniority_match ? "Match" : `${gap}-level gap`}
              </span>
            </div>
            <SeniorityPill level={resume_seniority} label="Your Resume" />
          </div>
          {!seniority_match && seniority_gap_explanation && (
            <p className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-2">{seniority_gap_explanation}</p>
          )}
        </div>

        {/* O*NET Occupation Match */}
        {onet_matched_occupation?.soc_code && (
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-500" /> O*NET Role Match
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{onet_matched_occupation.title}</p>
                <p className="text-xs text-slate-500">SOC {onet_matched_occupation.soc_code}</p>
              </div>
              <div className="ml-auto">
                <span className="text-lg font-bold text-violet-600">{Math.round((onet_matched_occupation.match_confidence || 0) * 100)}%</span>
                <p className="text-xs text-slate-400 text-right">match</p>
              </div>
            </div>
            <div className="h-2 bg-slate-200 rounded-full mb-3">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round((onet_matched_occupation.match_confidence || 0) * 100)}%` }} />
            </div>
            {onet_matched_occupation.occupation_expected_missing_skills?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">{onet_matched_occupation.explanation}</p>
                <div className="flex flex-wrap gap-1">
                  {onet_matched_occupation.occupation_expected_missing_skills.map((s: string) => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Companies */}
        {recognized_companies?.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" /> Recognized Companies
            </h3>
            <div className="space-y-2">
              {recognized_companies.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.canonical}</p>
                    <p className="text-xs text-slate-500">{c.industry}</p>
                  </div>
                  {c.tier && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tierBadgeClass(c.tier)}`}>{c.tier}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Universities */}
        {recognized_universities?.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-slate-500" /> Recognized Universities
            </h3>
            <div className="space-y-2">
              {recognized_universities.map((u: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-800">{u.canonical}</p>
                  <span className="text-xs text-slate-500">{u.country}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JD Normality */}
        {jd_normality_analysis && (
          <div className="bg-slate-50 rounded-xl p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" /> JD Quality Score
              <span className="text-xs text-slate-400 font-normal">(unique feature — checks if JD is well-written)</span>
            </h3>
            <div className="flex items-center gap-4">
              <ScoreRingSmall score={jd_normality_analysis.jd_normality_score} />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 mb-1">{jd_normality_analysis.note}</p>
                <p className="text-xs text-slate-500">Role: {jd_normality_analysis.role_category_detected}</p>
                {jd_normality_analysis.atypical_missing_from_jd?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-slate-500">Commonly expected but missing from this JD:</span>
                    {jd_normality_analysis.atypical_missing_from_jd.map((k: string) => (
                      <span key={k} className="text-xs px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full">{k}</span>
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
