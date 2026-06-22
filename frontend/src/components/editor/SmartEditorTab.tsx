import { useState, useMemo, useCallback, useRef } from "react";
import { AnalysisResult } from "../../App";
import {
  Sparkles, Edit3, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, Loader2, Copy, Check, X, RefreshCw, Download
} from "lucide-react";
import { apiFetch } from "../../utils/api";
import RichTextEditor from "../common/RichTextEditor";

interface Props {
  analysis: AnalysisResult;
  jd: string;
  scanId?: string;
  onResumeUpdate?: (resumeHtml: string, resumeText: string) => void;
  onScoreUpdate?: (scores: any) => void;
  onRescoringChange?: (v: boolean) => void;
}

// ─── Data model ────────────────────────────────────────────────────────────────

type SectionType = "summary" | "skills" | "education" | "experience" | "projects" | "certifications" | "generic";

interface SubEntry { heading: string; bullets: string[] }
interface Section { title: string; type: SectionType; items: string[]; entries: SubEntry[] }

// iIdx === -1 means "edit the entry heading itself"
interface EditingItem { sIdx: number; eIdx: number | null; iIdx: number }

// ─── Section parsing ───────────────────────────────────────────────────────────

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

function splitSkillLine(line: string): string[] {
  if (/[,|;·•]/.test(line))
    return line.split(/[,|;·•]/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 60);
  return line.length < 60 ? [line.trim()] : [];
}

function isSubHeading(line: string): boolean {
  if (line.length < 3 || line.length > 120) return false;
  const stripped = line.replace(/^[•\-–—●*]\s*/, "");
  if (stripped !== line) return false;
  if (line === line.toUpperCase() && line.length < 80) return true;
  const seemsTitle = line[0] === line[0].toUpperCase() && !line.endsWith(".");
  const hasDate = /\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present/i.test(line);
  return seemsTitle && (hasDate || line.split(" ").length <= 10);
}

function parseResumeHtml(html: string): Section[] {
  if (!html) return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const sections: Section[] = [];
    let cur: Section | null = null;
    let curEntry: SubEntry | null = null;

    const pushEntry = () => {
      if (curEntry && cur && (curEntry.bullets.length > 0 || curEntry.heading))
        { cur.entries.push(curEntry); curEntry = null; }
    };
    const pushSection = () => { pushEntry(); if (cur) sections.push(cur); cur = null; };

    const addText = (text: string) => {
      if (!text || !cur) return;
      const clean = text.trim(); if (!clean) return;
      if (cur.type === "summary") {
        // Accumulate all summary paragraphs into one editable block so the
        // user gets a single Edit widget for the whole professional summary.
        if (cur.items.length === 0) cur.items.push(clean);
        else cur.items[0] += " " + clean;
      }
      else if (cur.type === "skills") { splitSkillLine(clean).forEach(c => cur!.items.push(c)); }
      else if (curEntry) { curEntry.bullets.push(clean); }
      else { cur.items.push(clean); }
    };

    const walkNode = (node: Element) => {
      const tag = node.tagName.toLowerCase();
      if (tag === "h1" || tag === "h2") {
        pushSection();
        const title = node.textContent?.trim() || "Section";
        cur = { title, type: detectSectionType(title), items: [], entries: [] };
      } else if (tag === "h3" || tag === "h4") {
        if (!cur) cur = { title: node.textContent?.trim() || "Section", type: "generic", items: [], entries: [] };
        else {
          pushEntry();
          const txt = node.textContent?.trim() || "";
          if (["education","experience","projects"].includes(cur.type))
            curEntry = { heading: txt, bullets: [] };
          else if (cur.type === "skills") cur.items.push(txt + ":");
          else addText(txt);
        }
      } else if (tag === "ul" || tag === "ol") {
        for (const li of Array.from(node.children)) {
          if (li.tagName.toLowerCase() !== "li") continue;
          const text = li.textContent?.trim(); if (!text || text.length < 2) continue;
          if (cur?.type === "skills") {
            const colon = text.indexOf(":");
            if (colon > 0 && colon < text.length - 1 && !text.substring(0, colon).includes(",")) {
              cur.items.push(text.substring(0, colon).trim() + ":");
              text.substring(colon + 1).split(",").map(s => s.trim()).filter(s => s.length > 0 && s.length < 60)
                .forEach(s => cur!.items.push(s));
            } else { splitSkillLine(text).forEach(c => cur!.items.push(c)); }
          } else if (curEntry) curEntry.bullets.push(text);
          else if (cur) cur.items.push(text);
        }
      } else if (tag === "p" || tag === "span") {
        addText(node.textContent?.trim() || "");
      } else if (tag === "div" || tag === "section" || tag === "article" || tag === "main") {
        for (const child of Array.from(node.children)) walkNode(child as Element);
      } else if (tag === "strong" || tag === "b" || tag === "em" || tag === "i") {
        addText(node.textContent?.trim() || "");
      }
    };

    for (const child of Array.from(doc.body.children)) walkNode(child as Element);
    pushSection();
    return sections.filter(s => s.title && (s.items.length > 0 || s.entries.length > 0));
  } catch { return []; }
}

function parsePlainText(text: string): Section[] {
  if (!text) return [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const sections: Section[] = [];
  let cur: Section | null = null;
  let curEntry: SubEntry | null = null;

  const SECTION_HEADING = (line: string) =>
    line.length < 70 && (line === line.toUpperCase() ||
      /^(SUMMARY|OBJECTIVE|EXPERIENCE|EDUCATION|SKILL|PROJECT|CERTIF|AWARD|ACHIEVEMENT|PUBLICATION|LANGUAGE|INTEREST|VOLUNTEER|PROFILE|ABOUT)/i.test(line));

  const pushEntry = () => { if (curEntry && cur && curEntry.bullets.length > 0) { cur.entries.push(curEntry); curEntry = null; } };
  const pushSection = () => { pushEntry(); if (cur) sections.push(cur); cur = null; };

  for (const line of lines) {
    if (SECTION_HEADING(line)) { pushSection(); cur = { title: line, type: detectSectionType(line), items: [], entries: [] }; continue; }
    if (!cur) cur = { title: "Overview", type: "generic", items: [], entries: [] };
    const isBullet = /^[•\-–—●*]\s/.test(line);
    const clean = line.replace(/^[•\-–—●*]\s*/, "").trim();
    if (!clean) continue;
    if (cur.type === "summary") {
      // Accumulate into a single block — same intent as the HTML parser fix.
      if (cur.items.length === 0) cur.items.push(clean);
      else cur.items[0] += " " + clean;
      continue;
    }
    if (cur.type === "skills") {
      const colon = clean.indexOf(":");
      if (colon > 0 && !clean.substring(0, colon).includes(",")) {
        cur.items.push(clean.substring(0, colon).trim() + ":");
        const rest = clean.substring(colon + 1).trim();
        if (rest) rest.split(",").map(s => s.trim()).filter(s => s.length > 0 && s.length < 60)
          .forEach(c => cur!.items.push(c));
      } else { splitSkillLine(clean).forEach(c => cur!.items.push(c)); }
      continue;
    }
    const supportsEntries = ["education","experience","projects"].includes(cur.type);
    if (supportsEntries) {
      if (!isBullet && isSubHeading(line)) { pushEntry(); curEntry = { heading: line, bullets: [] }; }
      else if (curEntry) curEntry.bullets.push(clean);
      else cur.items.push(clean);
    } else { cur.items.push(clean); }
  }
  pushSection();
  return sections.filter(s => s.title && (s.items.length > 0 || s.entries.length > 0));
}

// ─── Reconstruction ────────────────────────────────────────────────────────────

function reconstructHtml(sections: Section[]): string {
  return sections.map(sec => {
    const parts: string[] = [`<h2>${sec.title}</h2>`];
    if (sec.type === "summary") {
      parts.push(...sec.items.map(p => `<p>${p}</p>`));
    } else if (sec.type === "skills") {
      if (sec.items.length) parts.push("<ul>" + sec.items.map(c => `<li>${c}</li>`).join("") + "</ul>");
    } else if (["education","experience","projects"].includes(sec.type)) {
      if (sec.items.length) parts.push("<ul>" + sec.items.map(i => `<li>${i}</li>`).join("") + "</ul>");
      sec.entries.forEach(e => {
        parts.push(`<h3>${e.heading}</h3>`);
        if (e.bullets.length) parts.push("<ul>" + e.bullets.map(b => `<li>${b}</li>`).join("") + "</ul>");
      });
    } else {
      if (sec.items.length) parts.push("<ul>" + sec.items.map(i => `<li>${i}</li>`).join("") + "</ul>");
    }
    return parts.join("\n");
  }).join("\n");
}

function reconstructText(sections: Section[]): string {
  return sections.map(sec => {
    const parts: string[] = [sec.title.toUpperCase()];
    if (sec.type === "summary") parts.push(...sec.items);
    else if (sec.type === "skills") parts.push(sec.items.join(" • "));
    else if (["education","experience","projects"].includes(sec.type)) {
      parts.push(...sec.items.map(i => `• ${i}`));
      sec.entries.forEach(e => { parts.push(e.heading); parts.push(...e.bullets.map(b => `• ${b}`)); });
    } else { parts.push(...sec.items.map(i => `• ${i}`)); }
    return parts.join("\n");
  }).join("\n\n");
}

// Strip HTML to plain text for saving
function htmlToPlain(html: string): string {
  return html
    .replace(/<\/?(p|li|div|br)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SmartEditorTab({
  analysis, jd, scanId,
  onResumeUpdate, onScoreUpdate, onRescoringChange,
}: Props) {
  const resumeHtml = (analysis as any).resume_html || "";
  const resumeText = analysis.resume_full || "";

  const parsed = useMemo(() => {
    if (resumeHtml) {
      const fromHtml = parseResumeHtml(resumeHtml);
      if (fromHtml.length > 0) return fromHtml;
    }
    return parsePlainText(resumeText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sections, setSections] = useState<Section[]>(parsed);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0,1,2,3,4,5,6,7]));
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [manualHtml, setManualHtml] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedText, setOptimizedText] = useState("");
  const [error, setError] = useState("");
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set());
  const [isRescoring, setIsRescoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const rescoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const missing = kw?.missing?.length || 0;
    const ev = (analysis as any).evidence_strength || 0;
    if (matchRate < 0.5) result.push(`Keyword match ${Math.round(matchRate * 100)}% — add more JD terms`);
    if (missing > 5) result.push(`${missing} JD skills missing — see left panel`);
    if (ev < 40) result.push("Low evidence strength — quantify achievements");
    return result;
  }, [analysis]);

  const getSectionProblems = (title: string): string[] => {
    const t = title.toLowerCase(); const ev = (analysis as any).evidence_strength || 0;
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

  const toggleSection = (idx: number) => setExpandedSections(prev => {
    const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next;
  });

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const html = reconstructHtml(sections);
      const res = await apiFetch("/editor/export_pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_html: html, filename: "resume" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume_ats.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const triggerRescore = useCallback((text: string) => {
    if (!scanId || !onScoreUpdate) return;
    if (rescoreTimer.current) clearTimeout(rescoreTimer.current);
    setIsRescoring(true);
    onRescoringChange?.(true);
    rescoreTimer.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/quick_score/${scanId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_text: text }),
        });
        const scores = await res.json();
        onScoreUpdate(scores);
      } catch { /* ignore rescore errors silently */ } finally {
        setIsRescoring(false);
        onRescoringChange?.(false);
      }
    }, 800);
  }, [scanId, onScoreUpdate, onRescoringChange]);

  // ── Apply an edit ──────────────────────────────────────────────────────────
  const applyEdit = useCallback((sIdx: number, eIdx: number | null, iIdx: number, newText: string) => {
    const clean = newText.trim();
    if (!clean) return;

    setSections(prev => {
      const next = prev.map((s, si) => {
        if (si !== sIdx) return s;
        if (eIdx !== null) {
          const entries = s.entries.map((e, ei) => {
            if (ei !== eIdx) return e;
            if (iIdx === -1) return { ...e, heading: clean };  // heading edit
            return { ...e, bullets: e.bullets.map((b, bi) => bi !== iIdx ? b : clean) };
          });
          return { ...s, entries };
        }
        return { ...s, items: s.items.map((item, ii) => ii !== iIdx ? item : clean) };
      });

      const html = reconstructHtml(next);
      const text = reconstructText(next);
      onResumeUpdate?.(html, text);
      triggerRescore(text);
      return next;
    });

    setAppliedItems(prev => new Set(prev).add(`${sIdx}-${eIdx}-${iIdx}`));
    setEditingItem(null);
    setManualHtml("");
    setOptimizedText("");
    setError("");
    setSelectedSkill("");
  }, [onResumeUpdate, triggerRescore]);

  const openEdit = (sIdx: number, eIdx: number | null, iIdx: number, currentText: string) => {
    setEditingItem({ sIdx, eIdx, iIdx });
    setManualHtml(`<p>${currentText}</p>`);
    setOptimizedText("");
    setError("");
  };

  const closeEdit = () => {
    setEditingItem(null);
    setManualHtml("");
    setOptimizedText("");
    setError("");
  };

  const isEditing = (sIdx: number, eIdx: number | null, iIdx: number) =>
    editingItem?.sIdx === sIdx && editingItem?.eIdx === eIdx && editingItem?.iIdx === iIdx;

  const wasApplied = (sIdx: number, eIdx: number | null, iIdx: number) =>
    appliedItems.has(`${sIdx}-${eIdx}-${iIdx}`);

  // ── AI optimise ────────────────────────────────────────────────────────────
  const handleOptimize = async () => {
    if (!selectedSkill || !editingItem) return;
    const bulletText = htmlToPlain(manualHtml);
    setIsOptimizing(true); setError(""); setOptimizedText("");
    try {
      const res = await apiFetch("/editor/optimize_bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bullet_text: bulletText, missing_skill: selectedSkill, jd_context: jd.substring(0, 500) }),
      });
      const data = await res.json();
      setOptimizedText(data.rewritten_bullet || "");
    } catch (err: any) {
      setError(err?.message || "Optimisation failed. Please try again.");
    } finally { setIsOptimizing(false); }
  };

  // ── Inline edit panel ──────────────────────────────────────────────────────
  const EditPanel = ({ sIdx, eIdx, iIdx }: { sIdx: number; eIdx: number | null; iIdx: number }) => (
    <div className="mx-1 mt-1.5 mb-2 border border-violet-500/20 rounded-xl overflow-hidden bg-gradient-to-br from-violet-500/5 to-indigo-500/4">
      {/* Rich text editor */}
      <div className="p-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-violet-400 uppercase tracking-wider">Edit</p>
          <button onClick={closeEdit} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="rounded-xl overflow-hidden border border-white/[0.08]">
          <RichTextEditor
            value={manualHtml}
            onChange={setManualHtml}
            minHeight="110px"
            placeholder="Edit text here…"
          />
        </div>
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={() => applyEdit(sIdx, eIdx, iIdx, htmlToPlain(manualHtml))}
            disabled={!manualHtml.trim() || htmlToPlain(manualHtml).length < 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-500 disabled:opacity-40 transition-colors"
          >
            <Check className="w-3 h-3" /> Apply Edit
          </button>
        </div>
      </div>

      {/* AI skill weaving */}
      <div className="p-3">
        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider mb-2">AI Skill Weaving</p>
        {allMissingSkills.length === 0
          ? <p className="text-xs text-muted-foreground italic">No missing skills detected.</p>
          : (
            <div className="flex flex-wrap gap-1 mb-2">
              {allMissingSkills.slice(0, 14).map((s: any, i: number) => {
                const kw = typeof s === "string" ? s : s.keyword || s.term || "";
                if (!kw) return null;
                return (
                  <button key={i} onClick={() => setSelectedSkill(kw)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all ${
                      selectedSkill === kw
                        ? "bg-violet-600 text-white border-violet-400"
                        : "bg-white/[0.04] text-muted-foreground border-white/[0.07] hover:bg-white/[0.07]"
                    }`}
                  >{kw}</button>
                );
              })}
            </div>
          )
        }
        <div className="flex items-center gap-2">
          <button
            onClick={handleOptimize}
            disabled={!selectedSkill || isOptimizing || htmlToPlain(manualHtml).length < 2}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isOptimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {isOptimizing ? "Weaving…" : "Weave Skill"}
          </button>
          {!selectedSkill && allMissingSkills.length > 0 && (
            <p className="text-[11px] text-muted-foreground">Select a skill chip above first</p>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {optimizedText && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">AI Suggestion</p>
            <div className="text-sm bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-lg text-foreground/90 leading-relaxed">
              {optimizedText}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => applyEdit(sIdx, eIdx, iIdx, optimizedText)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
              >
                <Check className="w-3 h-3" /> Apply AI Rewrite
              </button>
              <button
                onClick={() => { setManualHtml(`<p>${optimizedText}</p>`); setOptimizedText(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] transition-colors"
              >
                <Edit3 className="w-3 h-3" /> Edit First
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(optimizedText)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Item row with Edit button ──────────────────────────────────────────────
  const ItemRow = ({
    text, sIdx, eIdx, iIdx, variant = "bullet"
  }: { text: string; sIdx: number; eIdx: number | null; iIdx: number; variant?: "bullet" | "paragraph" | "chip" }) => {
    const active = isEditing(sIdx, eIdx, iIdx);
    const applied = wasApplied(sIdx, eIdx, iIdx);
    return (
      <div>
        <div className={`group flex items-start gap-2.5 rounded-xl border transition-all
          ${variant === "chip" ? "px-0 py-0 border-transparent inline-flex" : "p-2"}
          ${active ? "border-violet-500/30 bg-violet-500/5" : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.025]"}`}
        >
          {variant === "bullet" && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25 mt-[0.45rem] shrink-0" />}
          {variant === "paragraph"
            ? <p className="flex-1 text-sm text-foreground/80 leading-relaxed">{applied ? <span className="text-emerald-400">{text}</span> : text}</p>
            : variant === "chip"
            ? <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${applied ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-white/[0.04] border-white/[0.08] text-foreground/70"}`}>{text}</span>
            : <span className="flex-1 text-sm text-foreground/80 leading-relaxed">{applied ? <span className="text-emerald-400">{text}</span> : text}</span>
          }
          <button
            onClick={() => active ? closeEdit() : openEdit(sIdx, eIdx, iIdx, text)}
            className={`shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition-all
              ${applied
                ? "opacity-100 text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : "opacity-0 group-hover:opacity-100 text-violet-400 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/18"
              } ${variant === "chip" ? "ml-1" : "ml-1 mt-0.5"}`}
          >
            {applied ? <><Check className="w-2.5 h-2.5" />Edited</> : <><Edit3 className="w-2.5 h-2.5" />Edit</>}
          </button>
        </div>
        {active && <EditPanel sIdx={sIdx} eIdx={eIdx} iIdx={iIdx} />}
      </div>
    );
  };

  // ── Section renderers ──────────────────────────────────────────────────────

  const renderSummary = (section: Section, sIdx: number) => {
    // Show the whole summary as one single editable block.
    // All paragraphs were merged into items[0] during parsing so there is
    // always exactly one item (or zero if the section is empty).
    const fullText = section.items.join(" ").trim();
    if (!fullText) return null;
    return (
      <div className="px-4 pb-4">
        <ItemRow text={fullText} sIdx={sIdx} eIdx={null} iIdx={0} variant="paragraph" />
      </div>
    );
  };

  const renderSkills = (section: Section, sIdx: number) => {
    const chips = section.items.filter(Boolean);
    const groups: { label: string; chips: { text: string; idx: number }[] }[] = [];
    let cur: { label: string; chips: { text: string; idx: number }[] } | null = null;
    chips.forEach((chip, idx) => {
      if (chip.endsWith(":") || (chip === chip.toUpperCase() && chip.length < 40)) {
        if (cur && cur.chips.length > 0) groups.push(cur);
        cur = { label: chip.replace(/:$/, ""), chips: [] };
      } else {
        if (!cur) cur = { label: "", chips: [] };
        cur.chips.push({ text: chip, idx });
      }
    });
    if (cur && cur.chips.length > 0) groups.push(cur);
    return (
      <div className="px-4 pb-4 space-y-3">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest mb-1.5">{g.label}</p>}
            <div className="flex flex-wrap gap-1.5">
              {g.chips.map(({ text, idx }) => (
                <ItemRow key={idx} text={text} sIdx={sIdx} eIdx={null} iIdx={idx} variant="chip" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEntries = (section: Section, sIdx: number) => (
    <div className="px-4 pb-4 space-y-3">
      {section.items.length > 0 && (
        <div className="space-y-1">
          {section.items.map((item, iIdx) => (
            <ItemRow key={iIdx} text={item} sIdx={sIdx} eIdx={null} iIdx={iIdx} variant="bullet" />
          ))}
        </div>
      )}
      {section.entries.map((entry, eIdx) => (
        <div key={eIdx} className="border border-white/[0.07] rounded-xl overflow-hidden">
          {/* Entry heading with edit button */}
          <div className={`group flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/[0.06] transition-all
            ${isEditing(sIdx, eIdx, -1) ? "bg-violet-500/8 border-violet-500/20" : "bg-white/[0.02] hover:bg-white/[0.035]"}`}
          >
            <p className="text-sm font-semibold text-foreground/90 flex-1 min-w-0 truncate">
              {wasApplied(sIdx, eIdx, -1) ? <span className="text-emerald-400">{entry.heading}</span> : entry.heading}
            </p>
            <button
              onClick={() => isEditing(sIdx, eIdx, -1) ? closeEdit() : openEdit(sIdx, eIdx, -1, entry.heading)}
              className={`shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition-all
                ${wasApplied(sIdx, eIdx, -1)
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "opacity-0 group-hover:opacity-100 text-violet-400 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/18"
                }`}
            >
              {wasApplied(sIdx, eIdx, -1)
                ? <><Check className="w-2.5 h-2.5" />Edited</>
                : <><Edit3 className="w-2.5 h-2.5" />Edit</>}
            </button>
          </div>

          {/* Heading edit panel */}
          {isEditing(sIdx, eIdx, -1) && <EditPanel sIdx={sIdx} eIdx={eIdx} iIdx={-1} />}

          {/* Bullets */}
          {entry.bullets.length > 0 && (
            <div className="px-3 py-2 space-y-1">
              {entry.bullets.map((b, iIdx) => (
                <ItemRow key={iIdx} text={b} sIdx={sIdx} eIdx={eIdx} iIdx={iIdx} variant="bullet" />
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
        <ItemRow key={iIdx} text={item} sIdx={sIdx} eIdx={null} iIdx={iIdx} variant="bullet" />
      ))}
    </div>
  );

  const renderSection = (section: Section, sIdx: number) => {
    switch (section.type) {
      case "summary":   return renderSummary(section, sIdx);
      case "skills":    return renderSkills(section, sIdx);
      case "education":
      case "experience":
      case "projects":  return renderEntries(section, sIdx);
      default:          return renderGeneric(section, sIdx);
    }
  };

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[720px] divide-x divide-white/[0.06]">

      {/* Left sidebar */}
      <div className="w-60 xl:w-64 shrink-0 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Missing Skills
          </h3>
          {allMissingSkills.length === 0
            ? <p className="text-xs text-muted-foreground italic">All key skills found!</p>
            : (
              <div className="flex flex-wrap gap-1.5">
                {allMissingSkills.map((s: any, i: number) => {
                  const kw = typeof s === "string" ? s : s.keyword || s.term || "";
                  const imp = (s.importance || s.priority || "medium").toLowerCase();
                  if (!kw) return null;
                  return (
                    <button key={i} onClick={() => setSelectedSkill(kw)} title={`Importance: ${imp}`}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                        selectedSkill === kw
                          ? "bg-violet-600 text-white border-violet-400 shadow-sm shadow-violet-500/20"
                          : imp === "critical" ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15"
                          : imp === "high" ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15"
                          : "bg-white/[0.04] text-muted-foreground border-white/[0.07] hover:bg-white/[0.07]"
                      }`}
                    >{kw}</button>
                  );
                })}
              </div>
            )
          }
          {selectedSkill && (
            <div className="mt-3 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <p className="text-[10px] text-violet-400 font-bold">✓ Active: {selectedSkill}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Click Edit on any item to weave it in</p>
            </div>
          )}
        </div>

        {issues.length > 0 && (
          <div className="p-4 border-b border-white/[0.06]">
            <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3">Issues</h3>
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-1.5 mb-2">
                <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/70 leading-snug">{issue}</p>
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3">Suggestions</h3>
            {recommendations.map((rec: string, i: number) => (
              <div key={i} className="flex items-start gap-1.5 mb-2.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/70 leading-snug">{rec}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-white/[0.06] shrink-0 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Smart Resume Editor
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hover any item and click <strong>Edit</strong> — type manually or weave in a skill with AI.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isRescoring && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                <RefreshCw className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                <span className="text-xs font-bold text-violet-400">Rescoring…</span>
              </div>
            )}
            {appliedItems.size > 0 && !isRescoring && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">{appliedItems.size} edit{appliedItems.size > 1 ? "s" : ""} applied</span>
              </div>
            )}
            <button
              onClick={handleExportPdf}
              disabled={isExporting || sections.length === 0}
              data-testid="button-export-pdf"
              title="Export ATS-friendly PDF"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-40 transition-colors"
            >
              {isExporting
                ? <><Loader2 className="w-3 h-3 animate-spin" />Exporting…</>
                : <><Download className="w-3 h-3" />Export PDF</>
              }
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground text-sm">No sections detected.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Upload a resume with section headings.</p>
            </div>
          )}
          {sections.map((section, sIdx) => {
            const isExpanded = expandedSections.has(sIdx);
            const problems = getSectionProblems(section.title);
            return (
              <div key={sIdx} className="border border-white/[0.07] rounded-xl overflow-hidden bg-white/[0.01]">
                <button onClick={() => toggleSection(sIdx)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground shrink-0">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-sm font-bold text-foreground truncate">{section.title}</span>
                    <span className="text-[10px] text-muted-foreground/40 bg-white/[0.04] px-2 py-0.5 rounded-full shrink-0 capitalize">{section.type}</span>
                  </div>
                  {problems.length > 0 && (
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-[10px] text-amber-400 font-semibold">{problems.length} issue{problems.length > 1 ? "s" : ""}</span>
                    </div>
                  )}
                </button>
                {isExpanded && problems.length > 0 && (
                  <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                    {problems.map((p, pi) => (
                      <span key={pi} className="text-[10px] text-amber-400 bg-amber-500/8 border border-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />{p}
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
