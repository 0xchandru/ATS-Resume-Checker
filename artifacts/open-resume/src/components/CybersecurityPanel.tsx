import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface Props {
  cyber: any;
}

export default function CybersecurityPanel({ cyber }: Props) {
  if (!cyber) return null;
  const { detected_certs = [], missing_critical_certs = [], ranked_skills_found = [], ranked_skills_missing = [], security_score = 0 } = cyber;

  const scoreColor = security_score >= 70 ? "#10b981" : security_score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 border-l-4 border-l-emerald-500">
      <div className="flex items-center gap-3 mb-5">
        <Shield className="h-6 w-6 text-emerald-600" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cybersecurity Analysis</h2>
          <p className="text-sm text-slate-500">Cybersecurity vertical detected — specialized analysis active</p>
        </div>
        <div className="ml-auto text-center">
          <p className="text-2xl font-bold" style={{ color: scoreColor }}>{security_score}</p>
          <p className="text-xs text-slate-500">Security Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills Found */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" /> Skills Found ({ranked_skills_found.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {ranked_skills_found.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-xs font-bold text-emerald-600 w-6 text-center">#{s.rank}</span>
                <span className="text-sm text-slate-700 flex-1">{s.skill}</span>
                {s.precision_level && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{s.precision_level}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Skills Missing */}
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
            <ShieldAlert className="h-4 w-4" /> Skills Missing ({ranked_skills_missing.length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {ranked_skills_missing.slice(0, 10).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-xs font-bold text-red-500 w-6 text-center">#{s.rank}</span>
                <span className="text-sm text-slate-700 flex-1">{s.skill}</span>
                {s.precision_level && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">{s.precision_level}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Certs */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Certifications Detected ({detected_certs.length})</h3>
          {detected_certs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {detected_certs.map((c: string, i: number) => (
                <span key={i} className="text-xs px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-medium">{c}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No certifications detected</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Missing Key Certifications</h3>
          {missing_critical_certs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {missing_critical_certs.map((c: string, i: number) => (
                <span key={i} className="text-xs px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full font-medium">{c}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-600">All key certifications present</p>
          )}
        </div>
      </div>
    </div>
  );
}
