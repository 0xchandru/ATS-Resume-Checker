import { useEffect, useRef, useState } from "react";

const CIRC = 2 * Math.PI * 52;

function ScoreRing({ score }: { score: number }) {
  const ref = useRef<SVGCircleElement>(null);
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const offset = CIRC * (1 - score / 100);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.strokeDashoffset = `${CIRC}`;
    const t = setTimeout(() => {
      if (ref.current) {
        ref.current.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)";
        ref.current.style.strokeDashoffset = `${offset}`;
      }
    }, 100);
    return () => clearTimeout(t);
  }, [offset]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r="60" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.12" />
        <circle cx="68" cy="68" r="52" fill="none" stroke="#1e2a3a" strokeWidth="11" />
        <circle
          ref={ref}
          cx="68" cy="68" r="52"
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
          transform="rotate(-90 68 68)"
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-black" style={{ color }}>{score}</p>
        <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mt-0.5">
          {score >= 75 ? "Great" : score >= 50 ? "Fair" : "Low"}
        </p>
      </div>
    </div>
  );
}

function CategoryBar({ label, score, issues, id, onClick }: { label: string; score: number; issues: number; id: string; onClick?: () => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.width = "0%";
    const t = setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.transition = "width 1.1s cubic-bezier(.4,0,.2,1)";
        barRef.current.style.width = `${Math.min(100, score)}%`;
      }
    }, 300);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <button
      onClick={onClick}
      className="w-full group text-left hover:bg-white/5 rounded-lg px-3 py-2.5 -mx-3 transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        {issues > 0 ? (
          <span className="text-xs text-slate-400">{issues} issue{issues > 1 ? "s" : ""}</span>
        ) : (
          <span className="text-xs text-emerald-400 font-semibold">✓ Done</span>
        )}
      </div>
      <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
        <div ref={barRef} className="h-full rounded-full" style={{ backgroundColor: color, width: "0%" }} />
      </div>
    </button>
  );
}

function SkillChip({ label, matched }: { label: string; matched: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
      matched
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
        : "bg-red-500/10 text-red-300 border-red-500/20"
    }`}>
      {matched ? "✓" : "✕"} {label}
    </span>
  );
}

function CheckItem({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
        pass ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/15 text-red-400"
      }`}>
        {pass ? "✓" : "✕"}
      </div>
      <span className="text-sm text-slate-300">{label}</span>
      {!pass && <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">Fix</span>}
    </div>
  );
}

export function ATSLayout() {
  const [activeTab, setActiveTab] = useState<"report" | "jd">("report");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const score = 67;
  const categories = [
    { id: "searchability", label: "Searchability", score: 82, issues: 1 },
    { id: "hard-skills", label: "Hard Skills", score: 61, issues: 4 },
    { id: "soft-skills", label: "Soft Skills", score: 48, issues: 3 },
    { id: "recruiter-tips", label: "Recruiter Tips", score: 55, issues: 5 },
    { id: "formatting", label: "Formatting", score: 90, issues: 0 },
  ];

  const hardMatched = ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "REST APIs"];
  const hardMissing = ["Kubernetes", "Terraform", "Redis", "GraphQL"];
  const softMatched = ["Leadership", "Communication", "Problem-solving"];
  const softMissing = ["Agile", "Cross-functional", "Stakeholder"];

  return (
    <div className="min-h-screen flex" style={{
      background: "hsl(222,47%,6%)",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "hsl(210,40%,93%)",
    }}>
      {/* Slim icon sidebar */}
      <aside style={{ background: "hsl(222,47%,5%)", borderRight: "1px solid hsl(222,30%,14%)" }}
        className="hidden lg:flex flex-col w-14 fixed inset-y-0 left-0 z-40 items-center py-4 gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black"
          style={{ background: "linear-gradient(135deg,hsl(217,91%,60%),hsl(200,90%,60%))" }}>⚡</div>
        <div className="h-px w-8 bg-slate-700/60 my-1" />
        {["🏠","📄","📋"].map((icon, i) => (
          <button key={i} className={`w-10 h-10 rounded-xl text-base flex items-center justify-center transition-all hover:bg-white/8 ${i === 1 ? "bg-blue-500/15 text-blue-400" : "text-slate-500"}`}>
            {icon}
          </button>
        ))}
        <div className="flex-1" />
        <button className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-300 text-sm transition-colors">🌙</button>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-14 flex flex-col lg:flex-row gap-5 p-5 lg:p-7 min-h-screen items-start">

        {/* Results Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-7">
          <div className="rounded-2xl overflow-hidden border" style={{
            background: "hsl(222,44%,8%)",
            borderColor: "hsl(222,30%,14%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
          }}>
            {/* File header */}
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid hsl(222,30%,12%)" }}>
              <p className="text-xs text-slate-500 mb-0.5">Resume scan</p>
              <p className="text-sm font-semibold text-slate-200 truncate">john_doe_resume.pdf</p>
            </div>

            {/* Score ring */}
            <div className="flex flex-col items-center pt-5 pb-4" style={{ borderBottom: "1px solid hsl(222,30%,12%)" }}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Match Rate</p>
              <ScoreRing score={score} />
              <p className="text-xs text-slate-500 mt-3">vs. job description</p>
            </div>

            {/* Action buttons */}
            <div className="px-5 py-4 space-y-2.5" style={{ borderBottom: "1px solid hsl(222,30%,12%)" }}>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                style={{ background: "hsl(217,91%,60%)", boxShadow: "0 4px 16px hsla(217,91%,60%,0.3)" }}>
                🔄 Upload & Rescan
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-200 border transition-colors hover:bg-white/5"
                style={{ borderColor: "hsl(222,30%,18%)", background: "transparent" }}>
                ✨ AI Optimize
              </button>
            </div>

            {/* Category bars */}
            <div className="px-5 py-4 space-y-0.5">
              {categories.map(cat => (
                <CategoryBar
                  key={cat.id}
                  {...cat}
                  onClick={() => setActiveSection(cat.id)}
                />
              ))}
            </div>

            <div className="px-5 py-3 text-center" style={{ borderTop: "1px solid hsl(222,30%,12%)" }}>
              <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">❓ Guide me</button>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex border-b mb-0" style={{ borderColor: "hsl(222,30%,14%)" }}>
            {[{ id: "report", label: "📊 Resume Report" }, { id: "jd", label: "📝 Job Description" }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 text-sm font-semibold transition-all relative ${
                  activeTab === tab.id ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-sm" style={{ background: "hsl(217,91%,60%)" }} />
                )}
              </button>
            ))}
          </div>

          <div className="rounded-b-2xl rounded-tr-2xl border border-t-0" style={{
            background: "hsl(222,44%,8%)",
            borderColor: "hsl(222,30%,14%)",
          }}>
            {activeTab === "report" && (
              <div className="p-6 space-y-8">
                {/* Banner */}
                <div className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{ background: "hsla(35,96%,60%,0.08)", borderColor: "hsla(35,96%,60%,0.2)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: "hsla(35,96%,60%,0.15)" }}>⚡</div>
                  <div>
                    <p className="text-sm font-bold text-slate-100">ATS-Specific Tips</p>
                    <p className="text-xs text-slate-400">Analyzed in 2.3s with 5-layer AI pipeline</p>
                  </div>
                </div>

                {/* Searchability */}
                <section id="searchability">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "hsla(217,91%,60%,0.15)" }}>🔍</div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">Searchability</h3>
                      <p className="text-xs text-slate-400">Contact info, sections & job title match</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">82%</span>
                  </div>
                  <div className="rounded-xl border p-4 space-y-1" style={{ background: "hsl(222,47%,7%)", borderColor: "hsl(222,30%,14%)" }}>
                    <CheckItem label="Email address detected" pass={true} />
                    <CheckItem label="Phone number detected" pass={true} />
                    <CheckItem label="Professional summary found" pass={true} />
                    <CheckItem label="Job title aligns with JD" pass={false} />
                    <CheckItem label="LinkedIn URL present" pass={false} />
                  </div>
                </section>

                <hr style={{ borderColor: "hsl(222,30%,12%)" }} />

                {/* Hard Skills */}
                <section id="hard-skills">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "hsla(217,91%,60%,0.15)" }}>🎯</div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">Hard Skills</h3>
                      <p className="text-xs text-slate-400">Technical keyword matching</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">61%</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">✓ Matched ({hardMatched.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {hardMatched.map(s => <SkillChip key={s} label={s} matched={true} />)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">✕ Missing ({hardMissing.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {hardMissing.map(s => <SkillChip key={s} label={s} matched={false} />)}
                      </div>
                    </div>
                  </div>
                </section>

                <hr style={{ borderColor: "hsl(222,30%,12%)" }} />

                {/* Soft Skills */}
                <section id="soft-skills">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "hsla(152,68%,50%,0.15)" }}>🤝</div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">Soft Skills</h3>
                      <p className="text-xs text-slate-400">Interpersonal & behavioral keywords</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-full">48%</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {softMatched.map(s => <SkillChip key={s} label={s} matched={true} />)}
                    {softMissing.map(s => <SkillChip key={s} label={s} matched={false} />)}
                  </div>
                  <div className="mt-4 rounded-xl border p-4" style={{ background: "hsla(35,96%,60%,0.06)", borderColor: "hsla(35,96%,60%,0.15)" }}>
                    <p className="text-xs text-amber-300"><span className="font-bold">💡 Tip:</span> Add "cross-functional collaboration" and "agile methodology" to your summary section.</p>
                  </div>
                </section>

                <hr style={{ borderColor: "hsl(222,30%,12%)" }} />

                {/* Recruiter Tips */}
                <section id="recruiter-tips">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "hsla(350,85%,70%,0.15)" }}>💡</div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">Recruiter Tips</h3>
                      <p className="text-xs text-slate-400">Measurable results, action verbs & length</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">55%</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Quantified Bullets", value: "3/11", color: "#f59e0b", detail: "Add metrics to 8 more bullets" },
                      { label: "Action Verb Quality", value: "Good", color: "#10b981", detail: "Strong verbs detected" },
                      { label: "Resume Length", value: "1 page", color: "#3b82f6", detail: "Ideal for <10 yrs experience" },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-xl border p-4 text-center" style={{ background: "hsl(222,47%,7%)", borderColor: "hsl(222,30%,14%)" }}>
                        <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                        <p className="text-xl font-black mb-1" style={{ color: stat.color }}>{stat.value}</p>
                        <p className="text-xs text-slate-400">{stat.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <hr style={{ borderColor: "hsl(222,30%,12%)" }} />

                {/* Formatting */}
                <section id="formatting">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "hsla(190,90%,60%,0.15)" }}>📐</div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">Formatting</h3>
                      <p className="text-xs text-slate-400">Layout, fonts & ATS compatibility</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">90%</span>
                  </div>
                  <div className="rounded-xl border p-4" style={{ background: "hsla(152,68%,50%,0.06)", borderColor: "hsla(152,68%,50%,0.15)" }}>
                    <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                      <span className="text-lg">✅</span> No critical formatting issues detected
                    </p>
                    <p className="text-xs text-slate-400 mt-1 ml-7">Single column layout • Standard fonts • PDF format • No tables/images</p>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "jd" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-100">Job Description</h3>
                  <button className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors">✏️ Edit & Rescan</button>
                </div>
                <div className="rounded-xl border p-5 text-sm leading-relaxed text-slate-300 space-y-2" style={{ background: "hsl(222,47%,7%)", borderColor: "hsl(222,30%,14%)" }}>
                  <p>We are looking for a <mark style={{ background: "rgba(16,185,129,0.25)", color: "#6ee7b7", borderRadius: "3px", padding: "1px 3px" }}>Python</mark> backend engineer proficient in <mark style={{ background: "rgba(16,185,129,0.25)", color: "#6ee7b7", borderRadius: "3px", padding: "1px 3px" }}>FastAPI</mark> and <mark style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", borderRadius: "3px", padding: "1px 3px" }}>Kubernetes</mark> to join our platform team.</p>
                  <p>You will design and deploy microservices on <mark style={{ background: "rgba(16,185,129,0.25)", color: "#6ee7b7", borderRadius: "3px", padding: "1px 3px" }}>AWS</mark>, optimize <mark style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", borderRadius: "3px", padding: "1px 3px" }}>Redis</mark> caching layers, and work with <mark style={{ background: "rgba(16,185,129,0.25)", color: "#6ee7b7", borderRadius: "3px", padding: "1px 3px" }}>PostgreSQL</mark> and <mark style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", borderRadius: "3px", padding: "1px 3px" }}>GraphQL</mark>.</p>
                  <p>Strong experience with <mark style={{ background: "rgba(16,185,129,0.25)", color: "#6ee7b7", borderRadius: "3px", padding: "1px 3px" }}>Docker</mark> and <mark style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", borderRadius: "3px", padding: "1px 3px" }}>Terraform</mark> is required. <mark style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", borderRadius: "3px", padding: "1px 3px" }}>Agile</mark> mindset and excellent <mark style={{ background: "rgba(16,185,129,0.25)", color: "#6ee7b7", borderRadius: "3px", padding: "1px 3px" }}>communication</mark> skills expected.</p>
                  <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: "1px solid hsl(222,30%,14%)" }}>
                    <span className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "rgba(16,185,129,0.4)" }} /> Matched</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "rgba(239,68,68,0.3)" }} /> Missing</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
