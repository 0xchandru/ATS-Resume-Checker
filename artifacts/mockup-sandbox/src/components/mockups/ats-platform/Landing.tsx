import { ArrowRight, CheckCircle2, Zap, Target, TrendingUp, Shield, ChevronRight, Star, BarChart3, FileText, Search, Award } from "lucide-react";

const SCORE = 82;
const CIRCUMFERENCE = 2 * Math.PI * 54;
const OFFSET = CIRCUMFERENCE - (SCORE / 100) * CIRCUMFERENCE;

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#ffffff10" strokeWidth="7" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: "-52px" }}>
        <span className="text-xl font-bold text-white">{score}%</span>
      </div>
      <span className="text-xs text-white/50 font-medium mt-1">{label}</span>
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white font-['Inter',sans-serif] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/5 backdrop-blur-xl bg-[#0a0b0f]/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight">ATSOptimize</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">How it works</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Blog</a>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-sm text-white/60 hover:text-white transition-colors">Sign in</button>
          <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-8 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-indigo-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            AI-Powered ATS Optimization Platform
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            Land more interviews<br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              with ATS optimization
            </span>
          </h1>

          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your resume, paste any job description, and get an instant ATS compatibility score with actionable recommendations to beat the applicant tracking system.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30">
              Analyze My Resume Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-6 py-3 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium rounded-xl transition-colors bg-white/5">
              See a sample report
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-4 text-xs text-white/30">Free to use · No account required · Instant results</p>
        </div>

        {/* Hero preview card */}
        <div className="relative max-w-4xl mx-auto mt-16">
          {/* Outer glow frame */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-violet-600/20 to-transparent blur-2xl scale-105" />
          <div className="relative rounded-2xl border border-white/10 bg-[#0e0f15] overflow-hidden shadow-2xl">
            {/* Window bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="mx-auto w-48 h-5 rounded-md bg-white/5 flex items-center px-2">
                  <span className="text-[10px] text-white/20">atsoptimize.ai/scan/result</span>
                </div>
              </div>
            </div>

            {/* App preview */}
            <div className="flex">
              {/* Left sidebar */}
              <div className="w-56 border-r border-white/5 p-4 flex flex-col gap-4">
                <div className="text-xs font-medium text-white/30 uppercase tracking-wider mb-1">ATS Score</div>

                {/* Big score */}
                <div className="flex flex-col items-center py-4">
                  <div className="relative w-28 h-28">
                    <svg viewBox="0 0 120 120" className="-rotate-90 w-full h-full">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#ffffff08" strokeWidth="8" />
                      <circle cx="60" cy="60" r="54" fill="none" stroke="url(#scoreGrad)" strokeWidth="8"
                        strokeDasharray={CIRCUMFERENCE} strokeDashoffset={OFFSET} strokeLinecap="round" />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#7c3aed" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-white">{SCORE}</span>
                      <span className="text-[10px] text-white/40">/ 100</span>
                    </div>
                  </div>
                  <div className="mt-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">B+ Match</div>
                </div>

                {/* Category bars */}
                {[
                  { label: "Keyword Match", val: 78, color: "bg-violet-500" },
                  { label: "Skills Coverage", val: 65, color: "bg-indigo-500" },
                  { label: "Format Score", val: 91, color: "bg-cyan-500" },
                  { label: "Recruiter Fit", val: 74, color: "bg-emerald-500" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white/60">{val}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-5">
                {/* Tab bar */}
                <div className="flex gap-1 mb-4">
                  {["Resume Report", "Skills Matrix", "Cover Letter", "Editor"].map((t, i) => (
                    <button key={t} className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${i === 0 ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>{t}</button>
                  ))}
                </div>

                {/* Role verdict */}
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-violet-400 font-medium mb-1">AI VERDICT</div>
                      <div className="text-sm font-semibold text-white">Strong Match — Senior Security Engineer</div>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">82%</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div>
                      <div className="text-white/30 mb-1.5 font-medium">✓ What Matches</div>
                      {["Penetration Testing", "CISSP Certification", "Cloud Security (AWS)"].map(k => (
                        <div key={k} className="flex items-center gap-1 text-emerald-400 mb-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                          {k}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-white/30 mb-1.5 font-medium">✗ What's Missing</div>
                      {["Zero Trust Architecture", "Threat Modeling", "SOC 2 Compliance"].map(k => (
                        <div key={k} className="flex items-center gap-1 text-red-400 mb-1">
                          <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                          {k}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Keyword row */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { kw: "Penetration Testing", match: true },
                    { kw: "CISSP", match: true },
                    { kw: "AWS Security", match: true },
                    { kw: "Zero Trust", match: false },
                    { kw: "Threat Modeling", match: false },
                    { kw: "SIEM/SOAR", match: true },
                    { kw: "SOC 2", match: false },
                  ].map(({ kw, match }) => (
                    <span key={kw} className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${match
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>{kw}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-8 text-center">
          {[
            { val: "2.4M+", label: "Resumes Analyzed" },
            { val: "87%", label: "Interview Rate Increase" },
            { val: "15K+", label: "Skills in Database" },
            { val: "< 10s", label: "Analysis Time" },
          ].map(({ val, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-white mb-1">{val}</div>
              <div className="text-sm text-white/40">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-white/40 text-xs font-medium mb-4">
              <BarChart3 className="w-3 h-3" /> Everything you need
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Smarter analysis. Better results.</h2>
            <p className="text-white/40 max-w-xl mx-auto">Get deep insights into how ATS systems evaluate your resume and exactly what changes to make.</p>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {[
              { icon: Target, title: "ATS Match Score", desc: "Real-time compatibility scoring against any job description with detailed breakdown by category.", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
              { icon: Search, title: "Keyword Analysis", desc: "Identify exactly which keywords are missing, matched, or overused compared to the job requirements.", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
              { icon: TrendingUp, title: "Skills Gap Report", desc: "Visual side-by-side comparison of your skills vs. job requirements with priority recommendations.", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
              { icon: FileText, title: "Section Analysis", desc: "Score every section of your resume — contact, summary, experience, education, and skills.", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { icon: Shield, title: "ATS Compatibility", desc: "Detect parsing issues like tables, graphics, and multi-column layouts that break ATS systems.", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
              { icon: Award, title: "AI Recommendations", desc: "Get AI-generated improvements for your summary, experience bullets, and keyword placement.", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
            ].map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div key={title} className={`p-5 rounded-2xl border ${border} ${bg} group hover:scale-[1.02] transition-transform cursor-default`}>
                <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-8 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-white mb-3">Get results in 3 steps</h2>
            <p className="text-white/40">From upload to actionable insights in under 30 seconds.</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { step: "01", title: "Upload Your Resume", desc: "Drag & drop your PDF or DOCX. We parse it instantly with our advanced extraction engine.", icon: FileText },
              { step: "02", title: "Paste Job Description", desc: "Copy any job posting and we extract the keywords, skills, and requirements the ATS will scan for.", icon: Search },
              { step: "03", title: "Get Your ATS Report", desc: "Receive a detailed match report with your score, missing keywords, and personalized recommendations.", icon: BarChart3 },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <div key={step} className="relative">
                {i < 2 && (
                  <div className="absolute top-7 left-[calc(100%+4px)] w-[calc(100%-8px)] h-px bg-gradient-to-r from-white/20 to-transparent hidden lg:block" style={{ width: "48px", right: "-48px", left: "auto" }} />
                )}
                <div className="flex flex-col items-start">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="text-xs font-bold text-violet-500 mb-2 tracking-widest">{step}</div>
                  <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Trusted by job seekers</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: "Sarah K.", role: "Software Engineer", text: "My ATS score went from 54% to 89% after following the recommendations. Got 3 interviews in the first week.", stars: 5 },
              { name: "Marcus R.", role: "Product Manager", text: "The keyword analysis is incredibly detailed. I finally understand what ATS systems are actually looking for.", stars: 5 },
              { name: "Priya M.", role: "Data Scientist", text: "The skills gap analysis saved me hours of research. Clear, actionable, and the results speak for themselves.", stars: 5 },
            ].map(({ name, role, text, stars }) => (
              <div key={name} className="p-5 rounded-2xl border border-white/8 bg-white/[0.03] flex flex-col gap-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-white/60 leading-relaxed flex-1">"{text}"</p>
                <div>
                  <div className="text-sm font-medium text-white">{name}</div>
                  <div className="text-xs text-white/30">{role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-600/10 to-indigo-600/5 p-14 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent" />
            <h2 className="relative text-4xl font-bold text-white mb-4">Ready to beat the ATS?</h2>
            <p className="relative text-white/40 mb-8 max-w-md mx-auto">Start optimizing your resume for free — no account, no credit card required.</p>
            <button className="relative flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all mx-auto shadow-xl shadow-violet-600/30">
              Analyze My Resume Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="relative mt-5 flex items-center justify-center gap-6 text-xs text-white/30">
              {["Free to use", "Instant results", "No signup needed"].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-white text-sm">ATSOptimize</span>
          </div>
          <p className="text-xs text-white/20">© 2025 ATSOptimize. Built for job seekers.</p>
          <div className="flex gap-6 text-xs text-white/30">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/60 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
