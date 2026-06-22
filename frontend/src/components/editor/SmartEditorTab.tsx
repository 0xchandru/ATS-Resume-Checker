import { useState, useMemo } from "react";
import { AnalysisResult } from "../../App";
import {
  Sparkles, Edit3, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, Loader2, Copy, Key
} from "lucide-react";
import { apiFetch } from "../../utils/api";

interface Props {
  analysis: AnalysisResult;
  jd: string;
}

interface Section {
  title: string;
  items: string[];
}

function parseResumeHtml(html: string): Section[] {
  if (!html) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const sections: Section[] = [];
    let current: Section | null = null;

    for (const node of Array.from(doc.body.children)) {
      const tag = node.tagName.toLowerCase();
      if (tag === "h1" || tag === "h2" || tag === "h3") {
        if (current) sections.push(current);
        current = { title: node.textContent?.trim() || "Section", items: [] };
      } else if (current) {
        if (tag === "ul" || tag === "ol") {
          for (const li of Array.from(node.querySelectorAll("li"))) {
            const text = li.textContent?.trim();
            if (text && text.length > 2) current.items.push(text);
          }
        } else {
          const text = node.textContent?.trim();
          if (text && text.length > 2) current.items.push(text);
        }
      }
    }
    if (current) sections.push(current);
    return sections.filter((s) => s.title && s.items.length > 0);
  } catch {
    return [];
  }
}

function parsePlainText(text: string): Section[] {
  if (!text) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections: Section[] = [];
  let current: Section | null = null;

  const isHeading = (line: string) =>
    line.length < 70 &&
    (line === line.toUpperCase() ||
      /^(SUMMARY|OBJECTIVE|EXPERIENCE|EDUCATION|SKILL|PROJECT|CERTIF|AWARD|ACHIEVEMENT|PUBLICATION|LANGUAGE|INTEREST|VOLUNTEER)/i.test(line));

  for (const line of lines) {
    if (isHeading(line)) {
      if (current) sections.push(current);
      current = { title: line, items: [] };
    } else if (current) {
      current.items.push(line.replace(/^[•\-–—]\s*/, ""));
    } else {
      current = { title: "Overview", items: [line] };
    }
  }
  if (current) sections.push(current);
  return sections.filter((s) => s.items.length > 0);
}

export default function SmartEditorTab({ analysis, jd }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 5])
  );
  const [editingItem, setEditingItem] = useState<{ sIdx: number; iIdx: number } | null>(null);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedText, setOptimizedText] = useState("");
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("openai_api_key") || "");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");

  const resumeHtml = (analysis as any).resume_html || "";
  const resumeText = analysis.resume_full || "";

  const sections = useMemo(() => {
    const parsed = resumeHtml ? parseResumeHtml(resumeHtml) : parsePlainText(resumeText);
    return parsed;
  }, [resumeHtml, resumeText]);

  const missingSkills = useMemo(() => {
    const all: any[] = analysis.keywords?.missing || [];
    return all.filter((s) => {
      const imp = (s.importance || s.priority || "medium").toLowerCase();
      return imp === "critical" || imp === "high";
    });
  }, [analysis.keywords]);

  const allMissingSkills = useMemo(() => {
    return analysis.keywords?.missing || [];
  }, [analysis.keywords]);

  const recommendations = useMemo(() => {
    const roleFitRecs: string[] = analysis.role_fit?.recommendations || [];
    const feedbackRecs: string[] = (analysis as any).feedback?.recommendations || [];
    const combined = [...roleFitRecs, ...feedbackRecs];
    return [...new Set(combined)].slice(0, 8);
  }, [analysis]);

  const issues = useMemo(() => {
    const result: string[] = [];
    const kw = analysis.keywords;
    const matchRate = kw?.match_rate || 0;
    const keywordOnly = kw?.matched?.filter((m: any) => m.match_type === "unsupported_claim").length || 0;
    const missing = kw?.missing?.length || 0;
    const evidenceScore = (analysis as any).evidence_strength || 0;

    if (matchRate < 0.5) result.push(`Keyword match only ${Math.round(matchRate * 100)}% — add more JD terms`);
    if (keywordOnly > 10) result.push(`${keywordOnly} skills listed without proof — add metrics/outcomes`);
    if (missing > 5) result.push(`${missing} JD skills missing — see left sidebar`);
    if (evidenceScore < 40) result.push("Evidence strength low — quantify achievements (%, $, time)");
    return result;
  }, [analysis]);

  const getSectionProblems = (title: string): string[] => {
    const t = title.toLowerCase();
    const problems: string[] = [];
    const evidenceScore = (analysis as any).evidence_strength || 0;
    const actionVerbs = (analysis as any).action_verbs || {};
    const weakVerbs: string[] = actionVerbs.weak_verbs || [];

    if (t.includes("summar") || t.includes("object") || t.includes("profile")) {
      if (evidenceScore < 50) problems.push("No quantified achievements");
    }
    if (t.includes("experience") || t.includes("work") || t.includes("employ")) {
      if (evidenceScore < 50) problems.push("Add metrics (%, $, time saved)");
      if (weakVerbs.length > 2) problems.push(`${weakVerbs.length} weak action verbs`);
    }
    if (t.includes("skill")) {
      const keywordOnly = analysis.keywords?.matched?.filter((m: any) => m.match_type === "unsupported_claim").length || 0;
      if (keywordOnly > 5) problems.push(`${keywordOnly} skills need evidence`);
    }
    return problems;
  };

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleOptimize = async (bullet: string) => {
    if (!selectedSkill || !apiKey) return;
    setIsOptimizing(true);
    setError("");
    setOptimizedText("");
    try {
      const res = await apiFetch("/editor/optimize_bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet_text: bullet,
          missing_skill: selectedSkill,
          jd_context: jd.substring(0, 500),
          api_key: apiKey,
        }),
      });
      const data = await res.json();
      setOptimizedText(data.rewritten_bullet);
    } catch (err: any) {
      setError(err?.message || "Optimization failed. Check your API key.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const saveKey = () => {
    localStorage.setItem("openai_api_key", keyDraft);
    setApiKey(keyDraft);
    setShowKeyInput(false);
    setKeyDraft("");
  };

  const editingBullet =
    editingItem ? sections[editingItem.sIdx]?.items[editingItem.iIdx] || "" : "";

  return (
    <div className="flex min-h-[720px] divide-x divide-white/[0.06]">
      {/* ── Left sidebar ── */}
      <div className="w-64 xl:w-72 shrink-0 flex flex-col overflow-y-auto">
        {/* Missing Skills */}
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Missing Skills
          </h3>
          {allMissingSkills.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">All key skills found! 🎉</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allMissingSkills.map((s: any, i: number) => {
                const kw = typeof s === "string" ? s : s.keyword || s.term || "";
                const imp = (s.importance || s.priority || "medium").toLowerCase();
                if (!kw) return null;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedSkill(kw);
                      setOptimizedText("");
                      setError("");
                    }}
                    title={`Importance: ${imp}`}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                      selectedSkill === kw
                        ? "bg-violet-600 text-white border-violet-400 shadow-sm shadow-violet-500/20"
                        : imp === "critical"
                        ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15"
                        : imp === "high"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15"
                        : "bg-white/[0.04] text-muted-foreground border-white/[0.07] hover:bg-white/[0.07]"
                    }`}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
          )}
          {selectedSkill && (
            <div className="mt-3 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <p className="text-[10px] text-violet-400 font-bold">✓ Selected: {selectedSkill}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Now click <Edit3 className="inline w-2.5 h-2.5" /> Edit on any bullet below
              </p>
            </div>
          )}
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="p-4 border-b border-white/[0.06]">
            <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3">
              Issues to Fix
            </h3>
            <div className="space-y-2">
              {issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-foreground/70 leading-snug">{issue}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {recommendations.length > 0 && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3">
              Suggestions
            </h3>
            <div className="space-y-2.5">
              {recommendations.map((rec: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-foreground/70 leading-snug">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Main editor ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Smart Resume Editor
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a missing skill → hover a bullet → click Edit to optimise with AI
            </p>
          </div>
          <button
            onClick={() => { setShowKeyInput((v) => !v); setKeyDraft(apiKey); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shrink-0 ${
              apiKey
                ? "text-emerald-400 bg-emerald-500/8 border-emerald-500/20"
                : "text-amber-400 bg-amber-500/10 border-amber-500/20"
            }`}
          >
            <Key className="w-3 h-3" />
            {apiKey ? "API Key ✓" : "Set API Key"}
          </button>
        </div>

        {/* API Key panel */}
        {showKeyInput && (
          <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
            <input
              type="password"
              placeholder="OpenAI API key (sk-…)"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveKey()}
              className="flex-1 bg-transparent border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm outline-none text-foreground placeholder:text-muted-foreground focus:border-violet-500/40"
            />
            <button
              onClick={saveKey}
              className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        )}

        {/* Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground text-sm">No sections detected.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Upload a resume with section headings (Summary, Experience, Skills…) to use the Smart Editor.
              </p>
            </div>
          )}

          {sections.map((section, sIdx) => {
            const isExpanded = expandedSections.has(sIdx);
            const problems = getSectionProblems(section.title);

            return (
              <div key={sIdx} className="border border-white/[0.07] rounded-xl overflow-hidden bg-white/[0.01]">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(sIdx)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground shrink-0">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-sm font-bold text-foreground truncate">{section.title}</span>
                    <span className="text-[10px] text-muted-foreground/40 bg-white/[0.04] px-2 py-0.5 rounded-full shrink-0">
                      {section.items.length}
                    </span>
                  </div>
                  {problems.length > 0 && (
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-[10px] text-amber-400 font-semibold">
                        {problems.length} issue{problems.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </button>

                {/* Problems row */}
                {isExpanded && problems.length > 0 && (
                  <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                    {problems.map((p, pi) => (
                      <span
                        key={pi}
                        className="text-[10px] text-amber-400 bg-amber-500/8 border border-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-1"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Items */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-1.5">
                    {section.items.map((item, iIdx) => {
                      const isActive = editingItem?.sIdx === sIdx && editingItem?.iIdx === iIdx;
                      return (
                        <div key={iIdx}>
                          <div
                            className={`group flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                              isActive
                                ? "border-violet-500/30 bg-violet-500/5"
                                : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.025]"
                            }`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25 mt-[0.45rem] shrink-0" />
                            <span className="flex-1 text-sm text-foreground/80 leading-relaxed">{item}</span>
                            <button
                              onClick={() => {
                                if (isActive) {
                                  setEditingItem(null);
                                  setOptimizedText("");
                                  setError("");
                                } else {
                                  setEditingItem({ sIdx, iIdx });
                                  setOptimizedText("");
                                  setError("");
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/18 transition-all shrink-0 ml-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </button>
                          </div>

                          {/* Inline AI optimisation panel */}
                          {isActive && (
                            <div className="ml-5 mt-1.5 mb-2 p-4 bg-gradient-to-br from-violet-500/8 to-indigo-500/6 border border-violet-500/20 rounded-xl space-y-3">
                              {!selectedSkill ? (
                                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  Select a missing skill from the left panel first
                                </p>
                              ) : !apiKey ? (
                                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  Set your OpenAI API key using the button above
                                </p>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] text-violet-400 font-black uppercase tracking-wider">
                                      Weaving in:{" "}
                                      <span className="bg-violet-500/20 border border-violet-500/30 px-1.5 py-0.5 rounded text-violet-300 font-bold normal-case">
                                        {selectedSkill}
                                      </span>
                                    </span>
                                    <button
                                      onClick={() => handleOptimize(editingBullet)}
                                      disabled={isOptimizing}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
                                    >
                                      {isOptimizing ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Sparkles className="w-3 h-3" />
                                      )}
                                      {isOptimizing ? "Optimising…" : optimizedText ? "Regenerate" : "Optimise"}
                                    </button>
                                  </div>

                                  {error && (
                                    <p className="text-xs text-red-400">{error}</p>
                                  )}

                                  {optimizedText && (
                                    <div className="space-y-2">
                                      <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                                        AI Rewrite
                                      </p>
                                      <div className="text-sm bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl text-foreground/90 leading-relaxed">
                                        {optimizedText}
                                      </div>
                                      <button
                                        onClick={() => navigator.clipboard.writeText(optimizedText)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                        Copy Rewrite
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
