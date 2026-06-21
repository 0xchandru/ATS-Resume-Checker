import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface Props {
  cyber: any;
}

export default function CybersecurityPanel({ cyber }: Props) {
  if (!cyber) return null;
  const { detected_certs = [], missing_critical_certs = [], ranked_skills_found = [], ranked_skills_missing = [], security_score = 0 } = cyber;

  const scoreColor = security_score >= 70 ? "#10b981" : security_score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] border-l-4 border-l-emerald-500/60 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Shield className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground">Cybersecurity Analysis</h2>
          <p className="text-sm text-muted-foreground">Cybersecurity vertical detected — specialized analysis active</p>
        </div>
        <div className="ml-auto text-center">
          <p className="text-2xl font-black tabular-nums" style={{ color: scoreColor }}>{security_score}</p>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Security Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Skills Found */}
        <div>
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Skills Found ({ranked_skills_found.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {ranked_skills_found.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2.5 bg-emerald-500/8 border border-emerald-500/15 rounded-lg">
                <span className="text-[10px] font-black text-emerald-400 w-6 text-center tabular-nums">#{s.rank}</span>
                <span className="text-sm text-foreground/85 flex-1">{s.skill}</span>
                {s.precision_level && (
                  <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-1.5 py-0.5 rounded font-bold">{s.precision_level}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Skills Missing */}
        <div>
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Skills Missing ({ranked_skills_missing.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {ranked_skills_missing.slice(0, 10).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2.5 bg-red-500/8 border border-red-500/15 rounded-lg">
                <span className="text-[10px] font-black text-red-400 w-6 text-center tabular-nums">#{s.rank}</span>
                <span className="text-sm text-foreground/85 flex-1">{s.skill}</span>
                {s.precision_level && (
                  <span className="text-[10px] bg-red-500/15 border border-red-500/25 text-red-400 px-1.5 py-0.5 rounded font-bold">{s.precision_level}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Certs */}
        <div>
          <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">Certifications Detected ({detected_certs.length})</h3>
          {detected_certs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {detected_certs.map((c: string, i: number) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-semibold">{c}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No certifications detected</p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">Missing Key Certifications</h3>
          {missing_critical_certs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {missing_critical_certs.map((c: string, i: number) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-red-500/8 border border-red-500/15 text-red-400 rounded-full font-semibold">{c}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-400/70 font-medium">All key certifications present</p>
          )}
        </div>
      </div>
    </div>
  );
}
