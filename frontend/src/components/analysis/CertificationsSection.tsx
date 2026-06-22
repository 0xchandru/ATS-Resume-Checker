import { Award, CheckCircle2, XCircle, Star, Shield, TrendingUp } from "lucide-react";

interface Cert {
  certification: string;
  acronym?: string;
  match_type?: string;
  matched_as?: string;
  importance?: string;
  value?: string;
  relevance_score?: number;
  job_alignment?: string;
}

interface CertData {
  matched: Cert[];
  missing: Cert[];
  bonus: Cert[];
  matched_count: number;
  missing_count: number;
  bonus_count: number;
  score: number;
}

interface Props {
  certifications?: CertData;
}

function CertBadge({ cert, variant }: { cert: Cert; variant: "matched" | "missing" | "bonus" }) {
  const styles = {
    matched: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    missing: "bg-red-500/8 text-red-400 border-red-500/18",
    bonus: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };

  const icons = {
    matched: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    missing: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    bonus: <Star className="w-3.5 h-3.5 shrink-0" />,
  };

  const label = cert.acronym && cert.acronym !== cert.certification
    ? `${cert.certification} (${cert.acronym})`
    : cert.certification;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${styles[variant]}`}>
      {icons[variant]}
      <span>{label}</span>
      {variant === "missing" && cert.importance === "high" && (
        <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-red-500/20 text-red-300 ml-1">
          HIGH
        </span>
      )}
      {variant === "matched" && cert.match_type === "normalized_match" && (
        <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 ml-1">
          ALIAS
        </span>
      )}
    </div>
  );
}

export default function CertificationsSection({ certifications }: Props) {
  if (!certifications) return null;

  const { matched = [], missing = [], bonus = [], score } = certifications;
  const total = matched.length + missing.length;

  if (total === 0 && bonus.length === 0) {
    return (
      <div id="certifications" className="scroll-mt-6">
        <div className="flex items-center gap-3 mb-3">
          <Award className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-black text-foreground">Certifications</h2>
        </div>
        <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <p className="text-sm text-muted-foreground">
            No certifications detected in resume or job description. Adding relevant industry certifications can significantly strengthen your application.
          </p>
        </div>
      </div>
    );
  }

  const scoreColor = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div id="certifications" className="scroll-mt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-violet-400" />
          <h2 className="text-xl font-black text-foreground">Certifications</h2>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {matched.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              {matched.length} matched
            </span>
          )}
          {missing.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
              {missing.length} missing
            </span>
          )}
          {bonus.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
              {bonus.length} bonus
            </span>
          )}
        </div>

        {total > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{Math.round(score)}% match</span>
            <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${score}%`, background: scoreColor }}
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        <strong className="text-foreground/80">Note:</strong> Certifications are evaluated separately from technical skills. Matched certifications demonstrate verified expertise valued by the role.
      </p>

      <div className="space-y-4">
        {/* Matched */}
        {matched.length > 0 && (
          <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                Verified Certifications ({matched.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {matched.map((c, i) => (
                <CertBadge key={i} cert={c} variant="matched" />
              ))}
            </div>
          </div>
        )}

        {/* Missing */}
        {missing.length > 0 && (
          <div className="p-4 bg-red-500/[0.04] border border-red-500/15 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">
                Required / Preferred from JD ({missing.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {missing.map((c, i) => (
                <CertBadge key={i} cert={c} variant="missing" />
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Consider pursuing these certifications to strengthen your candidacy. Many can be obtained within weeks and significantly improve your ATS score for this role.
            </p>
          </div>
        )}

        {/* Bonus */}
        {bonus.length > 0 && (
          <div className="p-4 bg-violet-500/[0.04] border border-violet-500/15 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider">
                Additional Certifications ({bonus.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {bonus.map((c, i) => (
                <CertBadge key={i} cert={c} variant="bonus" />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              These are not required by the JD but add credibility and may be relevant to mention in your cover letter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
