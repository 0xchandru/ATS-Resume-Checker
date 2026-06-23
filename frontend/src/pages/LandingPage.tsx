import { Zap, Target, FileText, Sparkles, TrendingUp, CheckCircle2, ArrowRight, BarChart3, Brain, Shield, ChevronRight } from "lucide-react";

interface Props {
  onLaunch: () => void;
}

const FEATURES = [
  {
    icon: Target,
    color: "violet",
    title: "ATS Score Analysis",
    desc: "10-layer deep analysis measures keyword match, semantic relevance, formatting compliance, and evidence quality — not just keyword counting.",
  },
  {
    icon: Brain,
    color: "blue",
    title: "AI Role Fit Verdict",
    desc: "Our AI evaluates your actual fit for the role — separating real skills from buzzwords. Honest, actionable, no fluff.",
  },
  {
    icon: Shield,
    color: "cyan",
    title: "Cybersecurity Intelligence",
    desc: "Detects SOC Analyst tiers (L1/L2/L3/Trainee), GRC, Pen Tester, Cloud Security, and 8+ more cyber roles — with tier-specific cert and tool guidance.",
  },
  {
    icon: Sparkles,
    color: "emerald",
    title: "Smart Resume Editor",
    desc: "Edit your resume with live ATS rescoring. See your score change in real time as you add keywords and improve your content.",
  },
  {
    icon: TrendingUp,
    color: "amber",
    title: "Skills Gap Detection",
    desc: "See exactly which skills are missing, which are matched, and how critical each one is to the job description.",
  },
  {
    icon: FileText,
    color: "pink",
    title: "Cover Letter Generator",
    desc: "AI-generated cover letters tailored to each job description, using your resume as context for perfect personalization.",
  },
  {
    icon: BarChart3,
    color: "indigo",
    title: "Score History & Compare",
    desc: "Track your score improvement across multiple resume versions. Compare two resumes side-by-side to see what changed.",
  },
];

const STEPS = [
  { n: "01", title: "Paste Job Description", desc: "Copy the full job posting. Include requirements, responsibilities, and qualifications." },
  { n: "02", title: "Upload Your Resume", desc: "Upload PDF or DOCX, or paste text directly. We parse it with high accuracy." },
  { n: "03", title: "Get Your Full Report", desc: "Instantly see your ATS score, skill gaps, and AI-powered improvement suggestions." },
];

const STATS = [
  { value: "10+", label: "Analysis layers" },
  { value: "99k+", label: "Skills in knowledge base" },
  { value: "< 5s", label: "Analysis time" },
  { value: "8", label: "AI providers supported" },
];

const colorMap: Record<string, string> = {
  violet: "from-violet-600/20 to-violet-600/5 border-violet-500/20 text-violet-400",
  blue:   "from-blue-600/20 to-blue-600/5 border-blue-500/20 text-blue-400",
  cyan:   "from-cyan-600/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
  emerald:"from-emerald-600/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  amber:  "from-amber-600/20 to-amber-600/5 border-amber-500/20 text-amber-400",
  pink:   "from-pink-600/20 to-pink-600/5 border-pink-500/20 text-pink-400",
  indigo: "from-indigo-600/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
};

export default function LandingPage({ onLaunch }: Props) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-400 text-xs font-bold uppercase tracking-widest mb-8">
            <Zap className="h-3 w-3" />
            AI-Powered · 10+ Analysis Layers · Cyber Role Intelligence · Free
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-foreground leading-[1.05] tracking-tight mb-6">
            Beat the{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
              ATS Filter
            </span>
            <br />
            Land More Interviews
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The most advanced ATS resume checker — deep skills analysis, AI role-fit verdict,
            cybersecurity role intelligence (SOC L1/L2/L3, GRC, Pen Test, Cloud Sec), live score
            editor, and keyword gap detection. Free, instant, no signup.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={onLaunch}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-base font-bold hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-2xl shadow-violet-500/30"
            >
              <Zap className="h-5 w-5" />
              Analyze My Resume Free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onLaunch}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
            >
              <FileText className="h-4 w-4" />
              View Sample Report
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-2xl font-black text-foreground">{value}</span>
                <span className="text-xs text-muted-foreground mt-1 text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/40">
          <span className="text-xs font-medium uppercase tracking-widest">Scroll to explore</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/30 to-transparent" />
        </div>
      </section>

      {/* Cybersecurity Focus Banner */}
      <section className="py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-6 py-5 flex flex-col sm:flex-row items-center gap-4 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[60px]" />
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/25 shrink-0 text-2xl">
              🛡️
            </div>
            <div className="relative z-10 text-center sm:text-left">
              <p className="text-sm font-bold text-cyan-300 mb-1">Cybersecurity Role Intelligence</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Built specifically for SOC Analyst (L1 / L2 / L3 / Trainee / Fresher), Pen Tester,
                GRC Analyst, Threat Intel, Cloud Security, DFIR, SIEM Engineer, and more.
                Cert-aware scoring, tier-specific leniency, and tool gap analysis.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 shrink-0">
              {["SOC L1", "SOC L2", "SOC L3", "Trainee", "GRC", "Pen Test", "Cloud Sec", "DFIR"].map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Features</span>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-3 mb-4">
              Everything you need to get hired
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              More than just a keyword checker — a complete resume intelligence platform
              that tells you exactly what to fix and how.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className={`group relative p-6 rounded-2xl bg-gradient-to-br border transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10 ${colorMap[color]}`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br border mb-4 ${colorMap[color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/6 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">How it works</span>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-3 mb-4">
              Full analysis in under 5 seconds
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-5xl font-black text-violet-600/20 mb-4 leading-none">{n}</div>
                <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                {i < 2 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="h-5 w-5 text-violet-500/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison vs competitors */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Why we're better</span>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-3">
              More depth than any other tool
            </h2>
          </div>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/[0.06] px-6 py-4">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Feature</div>
              <div className="text-center text-xs font-bold text-violet-400 uppercase tracking-wider">ATSOptimize</div>
              <div className="text-center text-xs font-bold text-muted-foreground/50 uppercase tracking-wider">Others</div>
            </div>
            {[
              ["Keyword matching", true, true],
              ["Semantic / AI matching", true, false],
              ["Evidence quality scoring", true, false],
              ["Seniority gap analysis", true, false],
              ["Cyber role tier detection (SOC L1/L2/L3)", true, false],
              ["Live Smart Editor + rescore", true, false],
              ["Role fit verdict", true, false],
              ["Cover letter generation", true, false],
              ["Score history tracking", true, false],
              ["99,000+ skill knowledge base", true, false],
              ["8 AI provider options", true, false],
            ].map(([label, ours, theirs], i) => (
              <div
                key={i}
                className="grid grid-cols-3 px-6 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm text-foreground/80">{label as string}</span>
                <div className="flex justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex justify-center">
                  {theirs
                    ? <CheckCircle2 className="h-4 w-4 text-muted-foreground/40" />
                    : <span className="text-muted-foreground/30 text-lg leading-none">—</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative p-12 rounded-3xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 to-transparent" />
            </div>
            <div className="relative z-10">
              <Zap className="h-10 w-10 text-violet-400 mx-auto mb-6" />
              <h2 className="text-3xl font-black text-foreground mb-4">
                Ready to optimize your resume?
              </h2>
              <p className="text-muted-foreground mb-8">
                Free. Instant. No signup required.
              </p>
              <button
                onClick={onLaunch}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-2xl shadow-violet-500/30"
              >
                <Zap className="h-5 w-5" />
                Start Free Analysis
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/[0.06] text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500">
            <Zap className="h-3 w-3 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">ATS<span className="text-violet-400">Optimize</span></span>
        </div>
        <p className="text-xs text-muted-foreground">AI-powered resume intelligence · Cybersecurity role intelligence · Beat the ATS filter</p>
      </footer>
    </div>
  );
}
