import { useState } from "react";
import {
  Shield, Target, Zap, ChevronRight, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Clock, FileText, Brain, BarChart3,
  Lock, Terminal, Cpu, Network, Eye, Award, ArrowUpRight,
  CircleDot, Activity, Layers, BookOpen
} from "lucide-react";

const SCORE = 74;
const ROLE = "SOC Analyst L2";
const MATCH_GRADE = "B+";

const DIMENSIONS = [
  { label: "Hard Skills Match", score: 82, weight: "25%", icon: Target, color: "#6366f1" },
  { label: "Domain Alignment",  score: 79, weight: "15%", icon: Brain,  color: "#8b5cf6" },
  { label: "Evidence Quality",  score: 61, weight: "15%", icon: Eye,    color: "#f59e0b" },
  { label: "Seniority Fit",     score: 90, weight: "15%", icon: Award,  color: "#10b981" },
  { label: "ATS Parseability",  score: 88, weight: "15%", icon: Cpu,    color: "#06b6d4" },
  { label: "Section Complete",  score: 67, weight: "8%",  icon: Layers, color: "#f97316" },
  { label: "Impact Metrics",    score: 44, weight: "7%",  icon: BarChart3, color: "#ef4444" },
];

const MATCHED_SKILLS = [
  { skill: "SIEM (Splunk)", tier: "exact",    critical: true  },
  { skill: "Incident Response", tier: "exact", critical: true },
  { skill: "Threat Hunting",  tier: "semantic", critical: true },
  { skill: "IDS/IPS",         tier: "exact",   critical: false },
  { skill: "MITRE ATT&CK",    tier: "semantic", critical: true },
  { skill: "Log Analysis",    tier: "lemma",   critical: false },
  { skill: "SOAR",            tier: "semantic", critical: false },
  { skill: "Network Forensics", tier: "exact", critical: true },
];

const MISSING_SKILLS = [
  { skill: "Vulnerability Management", critical: true,  suggestion: "Add: Conducted vuln scans using Nessus/Qualys" },
  { skill: "EDR Tools (CrowdStrike)",  critical: true,  suggestion: "Add if used: Deployed CrowdStrike Falcon across endpoints" },
  { skill: "Cloud Security (AWS)",     critical: false, suggestion: "Add AWS Security Hub / GuardDuty if applicable" },
  { skill: "Threat Intelligence",      critical: false, suggestion: "Mention STIX/TAXII, MISP, or ISACs" },
];

const CERTS = [
  { name: "CompTIA Security+", status: "matched",  bonus: "+1.5 pts" },
  { name: "CompTIA CySA+",     status: "matched",  bonus: "+1.5 pts" },
  { name: "CEH",               status: "missing",  bonus: "+2.0 pts available" },
  { name: "GCIH",              status: "missing",  bonus: "+2.0 pts available" },
];

const UNSUPPORTED = [
  "Threat Hunting — keyword present but no concrete example",
  "SOAR Automation — listed as skill but no bullet proves it",
];

const TABS = ["Overview", "Skills", "Evidence", "Certs & Edu", "Editor"];

function ScoreRing({ score }: { score: number }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / 100, 1);
  const stroke = circ * (1 - pct);
  const color = score >= 80 ? "#10b981" : score >= 65 ? "#6366f1" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#1e2535" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="14"
          strokeDasharray={circ} strokeDashoffset={stroke}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white font-['Space_Grotesk']">{score}</span>
        <span className="text-xs text-slate-400 mt-0.5">ATS SCORE</span>
        <span className="text-sm font-bold mt-1" style={{ color }}>{MATCH_GRADE}</span>
      </div>
    </div>
  );
}

function DimensionBar({ d }: { d: typeof DIMENSIONS[0] }) {
  const Icon = d.icon;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: d.color }} />
          <span className="text-xs text-slate-300">{d.label}</span>
          <span className="text-xs text-slate-600">({d.weight})</span>
        </div>
        <span className="text-xs font-bold text-white">{d.score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${d.score}%`,
            background: `linear-gradient(90deg, ${d.color}99, ${d.color})`,
            boxShadow: `0 0 6px ${d.color}60`
          }}
        />
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    exact:    { label: "EXACT",    color: "#10b981", bg: "#10b98115" },
    semantic: { label: "SEMANTIC", color: "#6366f1", bg: "#6366f115" },
    lemma:    { label: "LEMMA",    color: "#06b6d4", bg: "#06b6d415" },
  };
  const t = map[tier] ?? { label: tier.toUpperCase(), color: "#94a3b8", bg: "#94a3b815" };
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider"
      style={{ color: t.color, background: t.bg, border: `1px solid ${t.color}30` }}
    >
      {t.label}
    </span>
  );
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div
      className="min-h-screen text-slate-200 font-['Inter']"
      style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0d1220 50%, #0a0e1a 100%)" }}
    >
      <link rel="stylesheet" media="print" onLoad={(e) => { (e.target as HTMLLinkElement).media = "all"; }}
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" />

      {/* Top bar */}
      <header className="border-b border-slate-800/60 px-6 py-3 flex items-center justify-between"
        style={{ background: "rgba(13,18,32,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white font-['Space_Grotesk'] text-sm tracking-wide">ATSec</span>
          <span className="text-slate-600 text-xs">|</span>
          <span className="text-slate-400 text-xs">Resume Intelligence Platform</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300"
            style={{ background: "#1a2035", border: "1px solid #2a3050" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-['JetBrains_Mono']">NVIDIA · llama-3.1-8b</span>
          </div>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            New Analysis
          </button>
        </div>
      </header>

      {/* Role banner */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-slate-800/40"
        style={{ background: "rgba(99,102,241,0.06)" }}>
        <Terminal className="w-4 h-4 text-indigo-400" />
        <span className="text-xs text-slate-400">Detected Role:</span>
        <span className="text-xs font-semibold text-indigo-300 font-['Space_Grotesk']">{ROLE}</span>
        <span className="text-slate-700">·</span>
        <span className="text-xs text-slate-500">Mid-level Cybersecurity · SOC Operations</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Analyzed 0.8s ago</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-slate-800/40">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-xs font-medium rounded-t-lg transition-all"
            style={{
              color: activeTab === tab ? "#6366f1" : "#64748b",
              borderBottom: activeTab === tab ? "2px solid #6366f1" : "2px solid transparent",
              background: activeTab === tab ? "rgba(99,102,241,0.08)" : "transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="p-6 grid grid-cols-12 gap-5">

        {/* Left column */}
        <div className="col-span-4 space-y-4">

          {/* Score card */}
          <div className="rounded-xl p-5 flex flex-col items-center gap-4"
            style={{ background: "#0f1628", border: "1px solid #1e2a45" }}>
            <ScoreRing score={SCORE} />
            <div className="w-full text-center">
              <p className="text-xs text-slate-500 mb-1">Analysis complete for</p>
              <p className="text-sm font-semibold text-white font-['Space_Grotesk']">Senior_SOC_Analyst_2024.pdf</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="px-2 py-1 rounded-md text-xs font-medium text-amber-300"
                  style={{ background: "#f59e0b15", border: "1px solid #f59e0b30" }}>
                  ⚡ 2 Critical Gaps
                </span>
                <span className="px-2 py-1 rounded-md text-xs font-medium text-indigo-300"
                  style={{ background: "#6366f115", border: "1px solid #6366f130" }}>
                  +8 Improvements
                </span>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: "#0f1628", border: "1px solid #1e2a45" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white font-['Space_Grotesk'] uppercase tracking-wider">Score Breakdown</span>
              <Activity className="w-3.5 h-3.5 text-slate-600" />
            </div>
            {DIMENSIONS.map(d => <DimensionBar key={d.label} d={d} />)}
          </div>

          {/* Certs */}
          <div className="rounded-xl p-4"
            style={{ background: "#0f1628", border: "1px solid #1e2a45" }}>
            <span className="text-xs font-semibold text-white font-['Space_Grotesk'] uppercase tracking-wider">Certifications</span>
            <div className="mt-3 space-y-2">
              {CERTS.map(c => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {c.status === "matched"
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                    <span className="text-xs text-slate-300">{c.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono ${c.status === "matched" ? "text-emerald-500" : "text-slate-600"}`}>
                    {c.bonus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right columns */}
        <div className="col-span-8 space-y-4">

          {/* Top row: matched + missing */}
          <div className="grid grid-cols-2 gap-4">

            {/* Matched skills */}
            <div className="rounded-xl p-4" style={{ background: "#0f1628", border: "1px solid #1e2a45" }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white font-['Space_Grotesk'] uppercase tracking-wider">
                  Matched Skills
                </span>
                <span className="ml-auto text-xs text-emerald-400 font-mono">{MATCHED_SKILLS.length}</span>
              </div>
              <div className="space-y-2">
                {MATCHED_SKILLS.map(s => (
                  <div key={s.skill} className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      {s.critical && <CircleDot className="w-3 h-3 text-indigo-400" />}
                      <span className="text-xs text-slate-300">{s.skill}</span>
                    </div>
                    <TierBadge tier={s.tier} />
                  </div>
                ))}
              </div>
            </div>

            {/* Missing skills */}
            <div className="rounded-xl p-4" style={{ background: "#0f1628", border: "1px solid #1e2a45" }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white font-['Space_Grotesk'] uppercase tracking-wider">
                  Gaps to Fix
                </span>
                <span className="ml-auto text-xs text-amber-400 font-mono">{MISSING_SKILLS.length}</span>
              </div>
              <div className="space-y-2.5">
                {MISSING_SKILLS.map(s => (
                  <div key={s.skill} className="rounded-lg p-2.5"
                    style={{ background: s.critical ? "#7c3aed08" : "#1a2035", border: `1px solid ${s.critical ? "#7c3aed30" : "#1e2a45"}` }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {s.critical
                        ? <XCircle className="w-3 h-3 text-red-400" />
                        : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      <span className="text-xs font-medium text-slate-200">{s.skill}</span>
                      {s.critical && (
                        <span className="text-[9px] font-bold text-red-400 px-1 rounded" style={{ background: "#ef444415" }}>
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-['JetBrains_Mono'] leading-relaxed">{s.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Evidence quality panel */}
          <div className="rounded-xl p-4" style={{ background: "#0f1628", border: "1px solid #1e2a45" }}>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-white font-['Space_Grotesk'] uppercase tracking-wider">
                Evidence Quality — Unsupported Claims
              </span>
              <span className="ml-auto text-xs text-violet-400">Fix these to +7 pts</span>
            </div>
            <div className="space-y-2">
              {UNSUPPORTED.map((u, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: "#f59e0b08", border: "1px solid #f59e0b20" }}>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-slate-300">{u}</span>
                  <button className="ml-auto flex items-center gap-1 text-[10px] text-indigo-400 font-medium whitespace-nowrap">
                    Fix in Editor <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* AI Verdict */}
          <div className="rounded-xl p-4" style={{ background: "#0f1628", border: "1px solid #1e2a45" }}>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-white font-['Space_Grotesk'] uppercase tracking-wider">
                AI Role Fit Verdict
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-[10px] text-slate-500 font-['JetBrains_Mono']">meta/llama-3.1-8b</span>
              </div>
            </div>
            <div className="rounded-lg p-3 text-xs text-slate-300 leading-relaxed"
              style={{ background: "#070b15", border: "1px solid #131b2e", fontFamily: "'Inter', sans-serif" }}>
              <span className="text-indigo-300 font-semibold">Strong foundational match for SOC L2.</span>{" "}
              Your SIEM experience with Splunk and certified Security+ / CySA+ credentials are directly
              aligned to the role requirements. The primary gap is{" "}
              <span className="text-amber-300">Vulnerability Management</span> — the JD explicitly requires
              experience with Nessus or Qualys, and your resume contains no evidence of this.
              Adding one quantified bullet (e.g.,{" "}
              <span className="text-emerald-300 font-['JetBrains_Mono'] text-[10px]">
                "Reduced critical CVE exposure by 40% by leading monthly Nessus scan cycles"
              </span>
              ) would significantly raise your score and address the most critical recruiter filter.
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                <FileText className="w-3.5 h-3.5" />
                Generate Cover Letter
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300"
                style={{ background: "#1a2035", border: "1px solid #2a3050" }}>
                <TrendingUp className="w-3.5 h-3.5" />
                Open Smart Editor
              </button>
            </div>
          </div>

          {/* Quick action checklist */}
          <div className="rounded-xl p-4" style={{ background: "#0f1628", border: "1px solid #1e2a45" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white font-['Space_Grotesk'] uppercase tracking-wider">
                Priority Action Plan
              </span>
              <span className="ml-auto text-xs text-slate-500">Score potential: 74 → 89</span>
            </div>
            <div className="space-y-2">
              {[
                { text: "Add Vulnerability Management bullet with Nessus/Qualys", pts: "+6", priority: "critical" },
                { text: "Prove SOAR experience with a concrete automation example", pts: "+4", priority: "high" },
                { text: "Add CrowdStrike EDR endpoint count or coverage metric", pts: "+3", priority: "high" },
                { text: "Quantify at least 3 more impact bullets (currently 44/100)", pts: "+2", priority: "medium" },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    a.priority === "critical" ? "bg-red-400" : a.priority === "high" ? "bg-amber-400" : "bg-blue-400"
                  }`} />
                  <span className="text-xs text-slate-300 flex-1">{a.text}</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{a.pts}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="px-6 py-3 border-t border-slate-800/60 flex items-center gap-4 text-xs text-slate-600"
        style={{ background: "rgba(13,18,32,0.95)" }}>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          <span>Your data is never stored beyond your session</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Network className="w-3 h-3" />
          <span>99k+ skills · ESCO/O*NET · 50+ cyber roles</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" />
          <span>History</span>
        </div>
      </div>
    </div>
  );
}
