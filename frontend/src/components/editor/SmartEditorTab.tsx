import { useState, useMemo } from "react";
import { AnalysisResult } from "../../App";
import {
  Sparkles, Edit3, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, Loader2, Copy
} from "lucide-react";
import { apiFetch } from "../../utils/api";

interface Props {
  analysis: AnalysisResult;
  jd: string;
}

// ─── Data Model ────────────────────────────────────────────────────────────────

type SectionType = "summary" | "skills" | "education" | "experience" | "projects" | "certifications" | "generic";

interface SubEntry {
  heading: string;
  bullets: string[];
}

interface Section {
  title: string;
  type: SectionType;
  /** Flat content: paragraphs for summary, chip labels for skills, bullets for generic/certs */
  items: string[];
  /** Grouped entries: individual jobs/projects/degrees with their own bullets */
  entries: SubEntry[];
}

interface EditingItem {
  sIdx: number;
  eIdx: number | null; // null = flat item, number = entry index
  iIdx: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function detectSectionType(title: string): SectionType {
  const t = title.toLowerCase();
  if (/summar|objective|profile|about|overview/.test(t)) return "summary";
  if (/skill|technolog|competenc|expertise|proficien|stack|tool|platform|language/.test(t)) return "skills";
  if (/education|academic|degree|qualif|university|college/.test(t)) return "education";
  if (/experience|employment|work history|career|position/.test(t)) return "experience";
  if (/project|portfolio/.test(t)) return "projects";
  if (/certif|license|credential|accredit|award/.test(t)) return "certifications";
  return "generic";
}

/** Split a raw skills string on commas / pipes / semicolons into individual chips */
function splitSkillLine(line: string): string[] {
  if (/[,|;·•]/.test(line)) {
    return line.split(/[,|;·•]/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 60);
  }
  return line.length < 60 ? [line.trim()] : [];
}

/** True if a line looks like a sub-entry heading within an experience/projects/education section */
function isSubHeading(line: string): boolean {
  if (line.length < 3 || line.length > 120) return false;
  const stripped = line.replace(/^[•\-–—●*]\s*/, "");
  // It starts with a bullet → it's a bullet, not a heading
  if (stripped !== line) return false;
  // All-caps short line = heading
  if (line === line.toUpperCase() && line.length < 80) return true;
  // Title-cased and no sentence-ending punctuation
  const firstChar = line[0];
  const seemsTitle = firstChar === firstChar.toUpperCase() && !line.endsWith(".");
  // Contains typical entry patterns: company | role | dates
  const hasDate = /\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present/i.test(line);
  // Avoid treating normal long sentences as headings
  const wordCount = line.split(" ").length;
  return seemsTitle && (hasDate || wordCount <= 10);
}

// ─── HTML Parser ───────────────────────────────────────────────────────────────

function parseResumeHtml(html: string): Section[] {
  if (!html) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const sections: Section[] = [];
    let curSection: Section | null = null;
    let curEntry: SubEntry | null = null;

    const pushEntry = () => {
      if (curEntry && curSection) {
        // Only push entries with actual content
        if (curEntry.bullets.length > 0 || curEntry.heading) {
          curSection.entries.push(curEntry);
        }
        curEntry = null;
      }
    };

    const pushSection = () => {
      pushEntry();
      if (curSection) sections.push(curSection);
      curSection = null;
    };

    const addText = (text: string) => {
      if (!text || !curSection) return;
      const clean = text.trim();
      if (!clean) return;
      if (curSection.type === "summary") {
        curSection.items.push(clean);
      } else if (curSection.type === "skills") {
        splitSkillLine(clean).forEach(chip => curSection!.items.push(chip));
      } else if (curEntry) {
        curEntry.bullets.push(clean);
      } else {
        curSection.items.push(clean);
      }
    };

    for (const node of Array.from(doc.body.children)) {
      const tag = node.tagName.toLowerCase();

      if (tag === "h1" || tag === "h2") {
        pushSection();
        const title = node.textContent?.trim() || "Section";
        curSection = { title, type: detectSectionType(title), items: [], entries: [] };

      } else if (tag === "h3") {
        if (!curSection) {
          // Orphan h3 — treat as a section start
          curSection = { title: node.textContent?.trim() || "Section", type: "generic", items: [], entries: [] };
        } else {
          pushEntry();
          const hasEntries = ["education", "experience", "projects"].includes(curSection.type);
          if (hasEntries) {
            curEntry = { heading: node.textContent?.trim() || "", bullets: [] };
          } else {
            // In skills / summary / generic — treat h3 text as an item
            addText(node.textContent?.trim() || "");
          }
        }

      } else if (tag === "ul" || tag === "ol") {
        for (const li of Array.from(node.querySelectorAll("li"))) {
          const text = li.textContent?.trim();
          if (text && text.length > 1) {
            if (curSection?.type === "skills") {
              splitSkillLine(text).forEach(chip => curSection!.items.push(chip));
            } else if (curEntry) {
              curEntry.bullets.push(text);
            } else if (curSection) {
              curSection.items.push(text);
            }
          }
        }

      } else if (tag === "p" || tag === "div" || tag === "span") {
        addText(node.textContent?.trim() || "");
      }
    }
    pushSection();

    return sections.filter(s => s.title && (s.items.length > 0 || s.entries.length > 0));
  } catch {
    return [];
  }
}

// ─── Plain-text Parser ─────────────────────────────────────────────────────────

function parsePlainText(text: string): Section[] {
  if (!text) return [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const sections: Section[] = [];
  let curSection: Section | null = null;
  let curEntry: SubEntry | null = null;

  const SECTION_HEADING = (line: string) =>
    line.length < 70 &&
    (line === line.toUpperCase() ||
      /^(SUMMARY|OBJECTIVE|EXPERIENCE|EDUCATION|SKILL|PROJECT|CERTIF|AWARD|ACHIEVEMENT|PUBLICATION|LANGUAGE|INTEREST|VOLUNTEER|PROFILE|ABOUT)/i.test(line));

  const pushEntry = () => {
    if (curEntry && curSection && (curEntry.bullets.length > 0)) {
      curSection.entries.push(curEntry);
      curEntry = null;
    }
  };

  const pushSection = () => {
    pushEntry();
    if (curSection) sections.push(curSection);
    curSection = null;
  };

  for (const line of lines) {
    if (SECTION_HEADING(line)) {
      pushSection();
      curSection = { title: line, type: detectSectionType(line), items: [], entries: [] };
      continue;
    }

    if (!curSection) {
      curSection = { title: "Overview", type: "generic", items: [], entries: [] };
    }

    const strippedBullet = line.replace(/^[•\-–—●*]\s*/, "");
    const isBullet = strippedBullet !== line;
    const clean = strippedBullet.trim();
    if (!clean) continue;

    if (curSection.type === "summary") {
      curSection.items.push(clean);
      continue;
    }

    if (curSection.type === "skills") {
      splitSkillLine(clean).forEach(chip => curSection!.items.push(chip));
      continue;
    }

    const supportsEntries = ["education", "experience", "projects"].includes(curSection.type);

    if (supportsEntries) {
      if (!isBullet && isSubHeading(line)) {
        pushEntry();
        curEntry = { heading: line, bullets: [] };
      } else if (curEntry) {
        curEntry.bullets.push(clean);
      } else {
        // No sub-heading yet — check if this looks like one
        if (!isBullet && isSubHeading(line)) {
          curEntry = { heading: line, bullets: [] };
        } else {
          curSection.items.push(clean);
        }
      }
    } else {
      curSection.items.push(clean);
    }
  }
  pushSection();

  return sections.filter(s => s.title && (s.items.length > 0 || s.entries.length > 0));
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SmartEditorTab({ analysis, jd }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5]));
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedText, setOptimizedText] = useState("");
  const [error, setError] = useState("");

  const resumeHtml = (analysis as any).resume_html || "";
  const resumeText = analysis.resume_full || "";

  const sections = useMemo(
    () => (resumeHtml ? parseResumeHtml(resumeHtml) : parsePlainText(resumeText)),
    [resumeHtml, resumeText]
  );

  const allMissingSkills = useMemo(() => analysis.keywords?.missing || [], [analysis.keywords]);

  const recommendations = useMemo(() => {
    const a: string[] = analysis.role_fit?.recommendations || [];
    const b: string[] = (analysis as any).feedback?.recommendations || [];
    return [...new Set([...a, ...b])].slice(0, 8);
  }, [analysis]);

  const issues = useMemo(() => {
    const result: string[] = [];
    const kw = analysis.keywords;
    const matchRate = kw?.match_rate || 0;
    const keywordOnly = kw?.matched?.filter((m: any) => m.match_type === "unsupported_claim").length || 0;
    const missing = kw?.missing?.length || 0;
    const evidenceScore = (analysis as any).evidence_strength || 0;
    if (matchRate < 0.5) result.push(`Keyword match ${Math.round(matchRate * 100)}% — add more JD terms`);
    if (keywordOnly > 10) result.push(`${keywordOnly} skills without proof — add metrics`);
    if (missing > 5) result.push(`${missing} JD skills missing — see left panel`);
    if (evidenceScore < 40) result.push("Low evidence strength — quantify achievements (%, $, time)");
    return result;
  }, [analysis]);

  const getSectionProblems = (title: string): string[] => {
    const t = title.toLowerCase();
    const ev = (analysis as any).evidence_strength || 0;
    const weakVerbs: string[] = (analysis as any).action_verbs?.weak_verbs || [];
    const result: string[] = [];
    if (/summar|object|profile/.test(t) && ev < 50) result.push("No quantified achievements");
    if (/experience|work|employ/.test(t)) {
      if (ev < 50) result.push("Add metrics (%, $, time saved)");
      if (weakVerbs.length > 2) result.push(`${weakVerbs.length} weak action verbs`);
    }
    if (/skill/.test(t)) {
      const uo = analysis.keywords?.matched?.filter((m: any) => m.match_type === "unsupported_claim").length || 0;
      if (uo > 5) result.push(`${uo} skills need evidence`);
    }
    return result;
  };

  const toggleSection = (idx: number) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const getEditingBullet = (): string => {
    if (!editingItem) return "";
    const sec = sections[editingItem.sIdx];
    if (!sec) return "";
    if (editingItem.eIdx !== null) {
      return sec.entries[editingItem.eIdx]?.bullets[editingItem.iIdx] || "";
    }
    return sec.items[editingItem.iIdx] || "";
  };

  const handleOptimize = async () => {
    const bullet = getEditingBullet();
    if (!selectedSkill || !bullet) return;
    setIsOptimizing(true);
    setError("");
    setOptimizedText("");
    try {
      const res = await apiFetch("/editor/optimize_bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bullet_text: bullet, missing_skill: selectedSkill, jd_context: jd.substring(0, 500) }),
      });
      const data = await res.json();
      setOptimizedText(data.rewritten_bullet);
    } catch (err: any) {
      setError(err?.message || "Optimisation failed. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const isEditing = (sIdx: number, eIdx: number | null, iIdx: number) =>
    editingItem?.sIdx === sIdx && editingItem?.eIdx === eIdx && editingItem?.iIdx === iIdx;

  const toggleEdit = (sIdx: number, eIdx: number | null, iIdx: number) => {
    if (isEditing(sIdx, eIdx, iIdx)) {
      setEditingItem(null);
    } else {
      setEditingItem({ sIdx, eIdx, iIdx });
    }
    setOptimizedText("");
    setError("");
  };

  // ── Inline optimise panel (shared) ─────────────────────────────────────────
  const OptimisePanel = () => (
    <div className="ml-5 mt-1.5 mb-2 p-4 bg-gradient-to-br from-violet-500/8 to-indigo-500/6 border border-violet-500/20 rounded-xl space-y-3">
      {!selectedSkill ? (
        <p className="text-xs text-amber-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Select a missing skill from the left panel first
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
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
            >
              {isOptimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {isOptimizing ? "Optimising…" : optimizedText ? "Regenerate" : "Optimise"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {optimizedText && (
            <div className="space-y-2">
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">AI Rewrite</p>
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
  );

  // ── Bullet row (reusable) ───────────────────────────────────────────────────
  const BulletRow = ({ text, sIdx, eIdx, iIdx }: { text: string; sIdx: number; eIdx: number | null; iIdx: number }) => {
    const active = isEditing(sIdx, eIdx, iIdx);
    return (
      <div>
        <div className={`group flex items-start gap-2.5 p-2 rounded-xl border transition-all ${active ? "border-violet-500/30 bg-violet-500/5" : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.025]"}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25 mt-[0.45rem] shrink-0" />
          <span className="flex-1 text-sm text-foreground/80 leading-relaxed">{text}</span>
          <button
            onClick={() => toggleEdit(sIdx, eIdx, iIdx)}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/18 transition-all shrink-0 ml-1"
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </button>
        </div>
        {active && <OptimisePanel />}
      </div>
    );
  };

  // ── Section renderers ───────────────────────────────────────────────────────

  const renderSummary = (section: Section, sIdx: number) => (
    <div className="px-4 pb-4 space-y-2">
      {section.items.map((para, i) => (
        <p key={i} className="text-sm text-foreground/80 leading-relaxed">{para}</p>
      ))}
    </div>
  );

  const renderSkills = (section: Section, _sIdx: number) => {
    const chips = section.items.filter(Boolean);
    // Group by detecting category lines (short all-caps or colon-ending lines)
    const groups: { label: string; chips: string[] }[] = [];
    let cur: { label: string; chips: string[] } | null = null;
    for (const chip of chips) {
      if (chip.endsWith(":") || (chip === chip.toUpperCase() && chip.length < 40)) {
        if (cur && cur.chips.length > 0) groups.push(cur);
        cur = { label: chip.replace(/:$/, ""), chips: [] };
      } else {
        if (!cur) cur = { label: "", chips: [] };
        cur.chips.push(chip);
      }
    }
    if (cur && cur.chips.length > 0) groups.push(cur);

    if (groups.length === 0) return null;

    return (
      <div className="px-4 pb-4 space-y-3">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && (
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest mb-1.5">{g.label}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {g.chips.map((chip, ci) => (
                <span
                  key={ci}
                  className="px-2.5 py-1 text-xs font-medium bg-white/[0.04] border border-white/[0.08] rounded-lg text-foreground/70"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEntries = (section: Section, sIdx: number) => (
    <div className="px-4 pb-4 space-y-4">
      {/* Flat items (before any sub-entry) */}
      {section.items.length > 0 && (
        <div className="space-y-1">
          {section.items.map((item, iIdx) => (
            <BulletRow key={iIdx} text={item} sIdx={sIdx} eIdx={null} iIdx={iIdx} />
          ))}
        </div>
      )}
      {/* Sub-entries (individual jobs / projects / degrees) */}
      {section.entries.map((entry, eIdx) => (
        <div key={eIdx} className="border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Entry heading */}
          <div className="px-3 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-foreground/90 leading-snug">{entry.heading}</p>
          </div>
          {/* Entry bullets */}
          {entry.bullets.length > 0 && (
            <div className="px-3 py-2 space-y-1">
              {entry.bullets.map((b, iIdx) => (
                <BulletRow key={iIdx} text={b} sIdx={sIdx} eIdx={eIdx} iIdx={iIdx} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderGeneric = (section: Section, sIdx: number) => (
    <div className="px-4 pb-4 space-y-1">
      {section.items.map((item, iIdx) => (
        <BulletRow key={iIdx} text={item} sIdx={sIdx} eIdx={null} iIdx={iIdx} />
      ))}
    </div>
  );

  const renderSection = (section: Section, sIdx: number) => {
    switch (section.type) {
      case "summary": return renderSummary(section, sIdx);
      case "skills": return renderSkills(section, sIdx);
      case "education":
      case "experience":
      case "projects": return renderEntries(section, sIdx);
      default: return renderGeneric(section, sIdx);
    }
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[720px] divide-x divide-white/[0.06]">

      {/* Left sidebar */}
      <div className="w-64 xl:w-72 shrink-0 flex flex-col overflow-y-auto">
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
                    onClick={() => { setSelectedSkill(kw); setOptimizedText(""); setError(""); }}
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
                Hover a bullet below and click <Edit3 className="inline w-2.5 h-2.5" /> Edit
              </p>
            </div>
          )}
        </div>

        {issues.length > 0 && (
          <div className="p-4 border-b border-white/[0.06]">
            <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3">Issues to Fix</h3>
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

        {recommendations.length > 0 && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3">Suggestions</h3>
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

      {/* Main editor */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-sm font-black text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Smart Resume Editor
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a missing skill → hover a bullet → click Edit to optimise with AI
          </p>
        </div>

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
                <button
                  onClick={() => toggleSection(sIdx)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground shrink-0">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-sm font-bold text-foreground truncate">{section.title}</span>
                    <span className="text-[10px] text-muted-foreground/40 bg-white/[0.04] px-2 py-0.5 rounded-full shrink-0 capitalize">
                      {section.type}
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

                {isExpanded && problems.length > 0 && (
                  <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                    {problems.map((p, pi) => (
                      <span key={pi} className="text-[10px] text-amber-400 bg-amber-500/8 border border-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {isExpanded && renderSection(section, sIdx)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
