import { Zap, UploadCloud, History, Home, Plus, Moon, ChevronDown, RefreshCw, Sparkles, FileText, Target, BarChart3, Edit3, Mail, Eye, Info, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const SCORE = 82;
const CIRC = 2 * Math.PI * 54;
const OFFSET = CIRC - (SCORE / 100) * CIRC;

function ScoreArc({ score, color }: { score: number; color: string }) {
  const r = 54; const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <svg viewBox="0 0 130 130" className="-rotate-90 w-full h-full">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#ffffff08" strokeWidth="9" />
      <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
    </svg>
  );
}

export function Dashboard() {
  const tabs = ["Resume Report", "Skills Matrix", "Cover Letter", "Resume Preview", "Smart Editor"];
  const activeTab = 0;

  return (
    <div className="flex h-screen bg-[#0a0b0f] text-white font-['Inter',sans-serif] overflow-hidden">
      {/* Icon Sidebar */}
      <aside className="w-14 flex-shrink-0 border-r border-white/5 flex flex-col items-center py-4 gap-2 bg-[#0e0f14]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-3">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {[
          { icon: Plus, label: "New Scan", active: false },
          { icon: Home, label: "Dashboard", active: true },
          { icon: FileText, label: "Reports", active: false },
          { icon: History, label: "History", active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button key={label} title={label} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-violet-600 text-white" : "text-white/30 hover:text-white hover:bg-white/5"}`}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <div className="flex-1" />
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 transition-colors">
          <Moon className="w-4 h-4" />
        </button>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-xs font-bold">JD</div>
      </aside>

      {/* Scoring Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-white/5 flex flex-col bg-[#0c0d12] overflow-y-auto">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Current Scan</span>
            <ChevronDown className="w-3 h-3 text-white/30" />
          </div>
          <div className="text-xs text-white/30 truncate">Sr. Security Engineer @ CrowdStrike</div>
        </div>

        {/* Score Ring */}
        <div className="p-5 flex flex-col items-center border-b border-white/5">
          <div className="relative w-32 h-32">
            <ScoreArc score={SCORE} color="#7c3aed" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white leading-none">{SCORE}</span>
              <span className="text-[10px] text-white/30 mt-0.5">ATS SCORE</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">B+ Match</span>
            <span className="text-xs text-white/30">Good</span>
          </div>
          <p className="text-[10px] text-white/25 text-center mt-2 leading-relaxed">Add 3 missing skills to reach an A grade</p>
        </div>

        {/* Category Breakdown */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Score Breakdown</div>
          {[
            { label: "Keyword Match", val: 78, color: "#7c3aed" },
            { label: "Skills Coverage", val: 65, color: "#6366f1" },
            { label: "Format & Parsing", val: 91, color: "#06b6d4" },
            { label: "Recruiter Readiness", val: 74, color: "#10b981" },
            { label: "Impact Evidence", val: 68, color: "#f59e0b" },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-white/40">{label}</span>
                <span className="text-white/60 font-medium">{val}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-xs font-medium hover:bg-white/10 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Upload & Rescan
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> AI Optimize
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 border-b border-white/5 px-6 py-3 flex items-center justify-between bg-[#0a0b0f]">
          <div>
            <h1 className="text-sm font-semibold text-white">Resume Analysis Report</h1>
            <p className="text-xs text-white/30">Senior Security Engineer · CrowdStrike · Analyzed just now</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs text-white/50 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors">Export PDF</button>
            <button className="px-3 py-1.5 text-xs text-white/50 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors">Share</button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-white/5 px-6 flex gap-1 pt-2">
          {tabs.map((tab, i) => (
            <button key={tab} className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${i === activeTab
              ? "text-white border-violet-500"
              : "text-white/30 hover:text-white/60 border-transparent"
            }`}>
              {[Target, BarChart3, Mail, Eye, Edit3][i] && (() => {
                const Icon = [Target, BarChart3, Mail, Eye, Edit3][i];
                return <Icon className="w-3 h-3" />;
              })()}
              {tab}
            </button>
          ))}
        </div>

        {/* Report content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* AI Verdict */}
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-600/8 to-indigo-600/5 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-violet-400 uppercase tracking-wide">AI Verdict</div>
                  <div className="text-sm font-semibold text-white mt-0.5">Strong Match — Senior Security Engineer</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20">Strong</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-white/30 font-medium mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-500" /> What Matches
                </div>
                {["Penetration Testing (5yr)", "CISSP Certification", "Cloud Security (AWS)", "Incident Response", "SIEM/SOAR Tools"].map(k => (
                  <div key={k} className="flex items-center gap-2 text-xs text-emerald-400 mb-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />{k}
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs text-white/30 font-medium mb-2 flex items-center gap-1.5">
                  <XCircle className="w-3 h-3 text-red-500" /> What's Missing
                </div>
                {["Zero Trust Architecture", "Threat Modeling", "SOC 2 Compliance", "MITRE ATT&CK Framework"].map(k => (
                  <div key={k} className="flex items-center gap-2 text-xs text-red-400 mb-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />{k}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Keyword section */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Keyword Analysis</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500" />18 matched</span>
                <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500" />7 missing</span>
                <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500" />3 partial</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { kw: "Penetration Testing", t: "match" }, { kw: "CISSP", t: "match" },
                { kw: "AWS Security", t: "match" }, { kw: "Incident Response", t: "match" },
                { kw: "SIEM", t: "match" }, { kw: "Network Security", t: "match" },
                { kw: "Vulnerability Assessment", t: "match" }, { kw: "Python", t: "match" },
                { kw: "Zero Trust", t: "miss" }, { kw: "Threat Modeling", t: "miss" },
                { kw: "SOC 2", t: "miss" }, { kw: "MITRE ATT&CK", t: "miss" },
                { kw: "DevSecOps", t: "partial" }, { kw: "Kubernetes Security", t: "partial" },
                { kw: "Firewall Management", t: "match" }, { kw: "Risk Assessment", t: "match" },
              ].map(({ kw, t }) => (
                <span key={kw} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${t === "match"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : t === "miss"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>{kw}</span>
              ))}
            </div>
          </div>

          {/* Skills Gap */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Skills Gap Analysis</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { cat: "Security Skills", items: [{ k: "Penetration Testing", has: true }, { k: "Zero Trust Architecture", has: false }, { k: "Threat Modeling", has: false }, { k: "CISSP", has: true }] },
                { cat: "Cloud & DevOps", items: [{ k: "AWS Security", has: true }, { k: "DevSecOps", has: false }, { k: "Kubernetes Security", has: false }, { k: "Terraform", has: true }] },
              ].map(({ cat, items }) => (
                <div key={cat}>
                  <div className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">{cat}</div>
                  <div className="space-y-2">
                    {items.map(({ k, has }) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        {has
                          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        }
                        <span className={has ? "text-white/70" : "text-white/30"}>{k}</span>
                        {!has && <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-red-500/10 text-red-400 border border-red-500/20">Add this</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section scores */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Section Analysis</span>
            </div>
            <div className="space-y-3">
              {[
                { sec: "Contact Information", score: 100, status: "ok", note: "All required fields present" },
                { sec: "Professional Summary", score: 72, status: "warn", note: "Missing target role keywords" },
                { sec: "Work Experience", score: 85, status: "ok", note: "Good impact statements found" },
                { sec: "Skills Section", score: 63, status: "warn", note: "4 required skills missing" },
                { sec: "Education", score: 95, status: "ok", note: "CS degree detected" },
                { sec: "Certifications", score: 80, status: "ok", note: "CISSP, CEH found" },
              ].map(({ sec, score, status, note }) => (
                <div key={sec} className="flex items-center gap-3">
                  <div className="w-6 flex-shrink-0">
                    {status === "ok"
                      ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : <AlertCircle className="w-4 h-4 text-amber-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-white/70">{sec}</span>
                      <span className="text-xs text-white/40 ml-2">{score}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${score}%`, backgroundColor: score >= 85 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <div className="text-[10px] text-white/25 mt-1">{note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recruiter Tips */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-white">Recruiter Readiness</span>
              <span className="ml-auto text-xs text-white/30">74% score</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="text-white/30 font-medium mb-1">Impact Quantification</div>
                {[
                  { t: "Reduced incident response time by 40%", ok: true },
                  { t: "Managed 8-person security team", ok: true },
                  { t: "Summary lacks measurable outcomes", ok: false },
                ].map(({ t, ok }) => (
                  <div key={t} className={`flex items-start gap-1.5 ${ok ? "text-white/50" : "text-amber-400"}`}>
                    {ok ? <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                    {t}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-white/30 font-medium mb-1">Action Verbs</div>
                {[
                  { t: "Strong: Architected, Led, Implemented", ok: true },
                  { t: "Weak: 'Responsible for' found 2x", ok: false },
                  { t: "Replace with 'Managed', 'Delivered'", ok: false },
                ].map(({ t, ok }) => (
                  <div key={t} className={`flex items-start gap-1.5 ${ok ? "text-white/50" : "text-amber-400"}`}>
                    {ok ? <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
