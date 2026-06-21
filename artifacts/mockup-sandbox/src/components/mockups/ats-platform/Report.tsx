import { ArrowLeft, Download, Share2, Zap, CheckCircle, XCircle, AlertCircle, ChevronRight, Sparkles, Target, BarChart3, TrendingUp, Shield, RefreshCw } from "lucide-react";

const SCORE = 82;
const CIRC = 2 * Math.PI * 54;
const OFF = CIRC - (SCORE / 100) * CIRC;

function MiniRing({ score, color, size = 64 }: { score: number; color: string; size?: number }) {
  const r = 26; const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" className="-rotate-90 w-full h-full">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ffffff08" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{score}%</span>
      </div>
    </div>
  );
}

export function Report() {
  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white font-['Inter',sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0b0f]/90 backdrop-blur-xl px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Scanner
            </button>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">ATSOptimize</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
              <Share2 className="w-3 h-3" /> Share
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
              <Download className="w-3 h-3" /> Export PDF
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
              <RefreshCw className="w-3 h-3" /> Rescan
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        {/* Meta */}
        <div>
          <h1 className="text-xl font-bold text-white mb-1">ATS Analysis Report</h1>
          <p className="text-sm text-white/40">Senior Security Engineer · CrowdStrike, Inc. · Analyzed June 21, 2025</p>
        </div>

        {/* Score hero card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="relative grid grid-cols-[auto_1fr] gap-8 items-center">
            {/* Big ring */}
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 130 130" className="-rotate-90 w-full h-full">
                  <circle cx="65" cy="65" r="54" fill="none" stroke="#ffffff08" strokeWidth="9" />
                  <circle cx="65" cy="65" r="54" fill="none" stroke="url(#g1)" strokeWidth="9"
                    strokeDasharray={CIRC} strokeDashoffset={OFF} strokeLinecap="round" />
                  <defs>
                    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white leading-none">{SCORE}</span>
                  <span className="text-xs text-white/30 mt-0.5">/ 100</span>
                </div>
              </div>
              <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/20">B+ Grade</div>
              <p className="text-[10px] text-white/25 text-center mt-2 max-w-[120px]">3 changes away from an A</p>
            </div>

            {/* Score grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Keyword Match", score: 78, color: "#7c3aed", icon: Target },
                { label: "Skills Coverage", score: 65, color: "#6366f1", icon: BarChart3 },
                { label: "Format & Parsing", score: 91, color: "#06b6d4", icon: Shield },
                { label: "Recruiter Readiness", score: 74, color: "#10b981", icon: TrendingUp },
              ].map(({ label, score, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <MiniRing score={score} color={color} size={52} />
                  <div>
                    <div className="text-xs font-medium text-white/70 mb-0.5">{label}</div>
                    <div className="text-[10px] text-white/30">
                      {score >= 85 ? "Excellent" : score >= 70 ? "Good" : "Needs work"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Keyword Match Card — side by side visual */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="text-sm font-semibold text-white">Keyword Coverage</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-white/40">18 matched</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-white/40">7 missing</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-white/40">3 partial</span></div>
            </div>
          </div>
          <div className="p-5 grid grid-cols-2 gap-6">
            {/* JD side */}
            <div>
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-3">Job Description Keywords</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { kw: "Penetration Testing", m: "match" }, { kw: "CISSP", m: "match" }, { kw: "AWS Security", m: "match" },
                  { kw: "Zero Trust", m: "miss" }, { kw: "SIEM/SOAR", m: "match" }, { kw: "Threat Modeling", m: "miss" },
                  { kw: "Incident Response", m: "match" }, { kw: "SOC 2", m: "miss" }, { kw: "Python", m: "match" },
                  { kw: "MITRE ATT&CK", m: "miss" }, { kw: "DevSecOps", m: "partial" }, { kw: "Kubernetes", m: "partial" },
                  { kw: "Network Security", m: "match" }, { kw: "Vulnerability Management", m: "match" },
                ].map(({ kw, m }) => (
                  <span key={kw} className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${m === "match" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : m === "miss" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{kw}</span>
                ))}
              </div>
            </div>
            {/* Resume side */}
            <div>
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-3">Your Resume Keywords</div>
              <div className="flex flex-wrap gap-1.5">
                {["Penetration Testing", "CISSP", "CEH", "AWS Security", "SIEM", "Splunk", "Incident Response", "Python", "Bash", "Network Security", "Firewall Management", "Vulnerability Assessment", "Risk Management", "Terraform", "Linux Security"].map(kw => (
                  <span key={kw} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/50 border border-white/10">{kw}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Priority Recommendations */}
        <div className="rounded-2xl border border-violet-500/20 bg-violet-600/5 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-white">Top Recommendations</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-medium border border-violet-500/30">AI Generated</span>
          </div>
          <div className="space-y-3">
            {[
              { priority: "Critical", color: "text-red-400 bg-red-500/10 border-red-500/20", action: "Add 'Zero Trust Architecture' to your Skills section — this appears 3x in the job description and is the highest-weighted missing term." },
              { priority: "High", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", action: "Include 'Threat Modeling' in your experience bullet under your security architect role to demonstrate hands-on experience." },
              { priority: "High", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", action: "Add 'MITRE ATT&CK Framework' to your summary or skills section — required by the JD and commonly scanned by ATS systems." },
              { priority: "Medium", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", action: "Quantify your summary: replace 'experienced security professional' with specific outcomes like 'reduced breach risk by X% across Y systems'." },
            ].map(({ priority, color, action }, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02]">
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${color}`}>{priority}</span>
                <p className="text-xs text-white/60 leading-relaxed">{action}</p>
                <button className="flex-shrink-0 p-1 rounded-lg hover:bg-white/5 text-white/20 hover:text-white/50 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section Analysis */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-sm font-semibold text-white">Section-by-Section Analysis</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { sec: "Contact Info", score: 100, status: "ok", issues: [], note: "All required fields present" },
              { sec: "Summary", score: 72, status: "warn", issues: ["Missing target keywords", "Not role-specific"], note: "Add security-specific keywords" },
              { sec: "Experience", score: 85, status: "ok", issues: [], note: "Good impact statements" },
              { sec: "Skills", score: 63, status: "warn", issues: ["4 skills missing", "Add Zero Trust"], note: "Add 4 required skills" },
              { sec: "Education", score: 95, status: "ok", issues: [], note: "CS degree detected" },
              { sec: "Certifications", score: 80, status: "ok", issues: [], note: "CISSP, CEH found" },
            ].map(({ sec, score, status, issues, note }) => (
              <div key={sec} className={`p-4 rounded-xl border ${status === "ok" ? "border-emerald-500/15 bg-emerald-500/5" : "border-amber-500/15 bg-amber-500/5"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white/70">{sec}</span>
                  {status === "ok"
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  }
                </div>
                <div className="text-2xl font-bold text-white mb-1">{score}%</div>
                <div className="h-1 rounded-full bg-white/10 mb-2">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: score >= 85 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <p className="text-[10px] text-white/30">{note}</p>
                {issues.map(iss => <p key={iss} className="text-[10px] text-amber-400 mt-0.5">· {iss}</p>)}
              </div>
            ))}
          </div>
        </div>

        {/* ATS Compatibility Warnings */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-white">ATS Compatibility</span>
            <span className="ml-auto text-xs text-emerald-400">91% compatible</span>
          </div>
          <div className="space-y-2">
            {[
              { ok: true, label: "Standard fonts detected", detail: "Times New Roman, Arial — ATS-safe" },
              { ok: true, label: "Single column layout", detail: "No complex multi-column detected" },
              { ok: true, label: "No images or icons", detail: "Pure text content — parses correctly" },
              { ok: true, label: "Standard section headings", detail: "'Experience', 'Education', 'Skills' — recognized" },
              { ok: false, label: "Header may be skipped", detail: "Contact info in header — some ATS skip headers" },
              { ok: false, label: "Page length: 3 pages", detail: "Recommend trimming to 2 pages for senior roles" },
            ].map(({ ok, label, detail }) => (
              <div key={label} className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
                {ok ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                <div>
                  <div className="text-xs font-medium text-white/70">{label}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-600/10 to-indigo-600/5 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Ready to improve your score?</h3>
            <p className="text-xs text-white/40">Apply the top 3 recommendations above and rescan — estimated score: <span className="text-emerald-400 font-semibold">91%</span></p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2.5 text-xs border border-white/10 text-white/60 rounded-xl hover:bg-white/5 transition-colors">Open Smart Editor</button>
            <button className="flex items-center gap-1.5 px-4 py-2.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors font-medium">
              <Sparkles className="w-3.5 h-3.5" /> AI Fix Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
