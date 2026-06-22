import { useState, useMemo } from "react";
import { Edit3, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import RichTextEditor from "../common/RichTextEditor";

interface Props {
  jdHtml?: string;
  jdText: string;
  keywords: any;
  onRescanWithNewJD?: (jd: string) => void;
  isRescanning?: boolean;
}

// ─── JD Parser ─────────────────────────────────────────────────────────────────

interface JDSection {
  heading: string;
  items: string[];       // bullet / sub-items
  paragraphs: string[];  // prose lines
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const SECTION_RE =
  /^(about|overview|summary|who we are|the role|role overview|what you.ll do|responsibilities|key responsibilities|duties|what we.re looking for|requirements|minimum requirements|required qualifications|qualifications|skills|technical skills|preferred|nice to have|what we offer|benefits|perks|compensation|why join|our values|location|how to apply|application|about the team|about the company|what you.ll bring|experience|education|key skills|must have|your profile|your responsibilities|the team|the position|the opportunity|job description|role description)/i;

function isHeading(line: string): boolean {
  const clean = line.trim();
  if (!clean || clean.length > 120) return false;

  // All-caps short line
  if (clean === clean.toUpperCase() && clean.length >= 3 && clean.length < 80 && /[A-Z]/.test(clean)) return true;

  // Ends with colon
  if (clean.endsWith(":") && clean.length < 80) return true;

  // Matches known JD section names (with optional trailing colon)
  if (SECTION_RE.test(clean.replace(/:$/, "").trim())) return true;

  return false;
}

function isBullet(line: string): boolean {
  return /^[•\-–—●▪▸*◦]\s/.test(line.trim());
}

function parseJD(raw: string): JDSection[] {
  // Normalise — strip HTML if needed
  const text = raw.includes("<") ? stripHtml(raw) : raw;
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const sections: JDSection[] = [];
  let cur: JDSection | null = null;

  for (const line of lines) {
    if (isHeading(line)) {
      if (cur) sections.push(cur);
      cur = { heading: line.replace(/:$/, "").trim(), items: [], paragraphs: [] };
    } else {
      if (!cur) cur = { heading: "", items: [], paragraphs: [] };
      const stripped = line.replace(/^[•\-–—●▪▸*◦]\s*/, "").trim();
      if (!stripped) continue;
      if (isBullet(line)) {
        cur.items.push(stripped);
      } else {
        // Long line with commas may be a comma-list of skills
        if (stripped.includes(",") && stripped.split(",").length >= 3 && stripped.length < 300) {
          cur.items.push(...stripped.split(",").map(s => s.trim()).filter(Boolean));
        } else {
          cur.paragraphs.push(stripped);
        }
      }
    }
  }
  if (cur && (cur.items.length > 0 || cur.paragraphs.length > 0)) sections.push(cur);

  // If nothing was parsed into sections, return one generic section with all text
  if (sections.length === 0 && text.trim()) {
    return [{ heading: "", items: [], paragraphs: lines }];
  }

  return sections;
}

// ─── Section icon / color map ───────────────────────────────────────────────────

function sectionAccent(heading: string): string {
  const h = heading.toLowerCase();
  if (/responsibilit|duties|you.ll do|what you will/.test(h)) return "blue";
  if (/require|must have|qualification|minimum|experience/.test(h)) return "amber";
  if (/preferred|nice to have|bonus/.test(h)) return "violet";
  if (/benefit|offer|perk|compensation|why join/.test(h)) return "emerald";
  if (/about|overview|who we are|the role/.test(h)) return "sky";
  return "slate";
}

const ACCENT_CLASSES: Record<string, { badge: string; dot: string; heading: string }> = {
  blue:    { badge: "bg-blue-500/10 border-blue-500/20 text-blue-400",    dot: "bg-blue-400",    heading: "text-blue-300" },
  amber:   { badge: "bg-amber-500/10 border-amber-500/20 text-amber-400", dot: "bg-amber-400",   heading: "text-amber-300" },
  violet:  { badge: "bg-violet-500/10 border-violet-500/20 text-violet-400", dot: "bg-violet-400", heading: "text-violet-300" },
  emerald: { badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", dot: "bg-emerald-400", heading: "text-emerald-300" },
  sky:     { badge: "bg-sky-500/10 border-sky-500/20 text-sky-400",       dot: "bg-sky-400",     heading: "text-sky-300" },
  slate:   { badge: "bg-white/[0.06] border-white/[0.08] text-muted-foreground", dot: "bg-muted-foreground", heading: "text-foreground/70" },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function JobDescriptionTab({
  jdHtml,
  jdText,
  keywords,
  onRescanWithNewJD,
  isRescanning,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(jdText);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // Use the richest source available
  const rawContent = jdHtml || jdText || "";

  const sections = useMemo(() => parseJD(rawContent), [rawContent]);

  const toggleSection = (i: number) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div className="p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/25 inline-block border border-emerald-500/40" />
            Matched in resume
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500/25 inline-block border border-red-500/40" />
            Missing from resume
          </span>
        </div>
        <button
          onClick={() => { setEditing(!editing); setDraft(jdText); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 bg-violet-500/8 border border-violet-500/15 rounded-lg hover:bg-violet-500/12 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Update scan information
        </button>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="mb-5 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-2">
            Edit Job Description
          </label>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden mb-3">
            <RichTextEditor
              value={draft}
              onChange={setDraft}
              placeholder="Paste updated job description…"
              minHeight="200px"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-white/[0.04] border border-white/[0.07] rounded-lg hover:bg-white/[0.07] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onRescanWithNewJD?.(draft); setEditing(false); }}
              disabled={isRescanning || draft.trim().length < 50}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md shadow-violet-500/20"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRescanning ? "animate-spin" : ""}`} />
              {isRescanning ? "Rescanning…" : "Rescan with Updated JD"}
            </button>
          </div>
        </div>
      )}

      {/* Structured JD display */}
      <div className="space-y-3">
        {sections.map((sec, i) => {
          const accent = sectionAccent(sec.heading);
          const cls = ACCENT_CLASSES[accent];
          const isOpen = !collapsed.has(i);
          const hasHeading = !!sec.heading;

          return (
            <div key={i} className="border border-white/[0.07] rounded-xl overflow-hidden bg-white/[0.01]">
              {hasHeading && (
                <button
                  onClick={() => toggleSection(i)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-muted-foreground shrink-0">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                    <span className={`text-sm font-bold ${cls.heading}`}>{sec.heading}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls.badge}`}>
                      {sec.items.length > 0 ? `${sec.items.length} items` : `${sec.paragraphs.length} line${sec.paragraphs.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                </button>
              )}

              {(!hasHeading || isOpen) && (
                <div className={`px-4 pb-4 ${hasHeading ? "pt-1" : "pt-4"} space-y-2`}>
                  {/* Prose paragraphs */}
                  {sec.paragraphs.map((p, pi) => (
                    <p key={pi} className="text-sm text-foreground/75 leading-relaxed">{p}</p>
                  ))}

                  {/* Bullet items */}
                  {sec.items.length > 0 && (
                    <ul className="space-y-1.5 mt-1">
                      {sec.items.map((item, ii) => (
                        <li key={ii} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                          <div className={`w-1.5 h-1.5 rounded-full ${cls.dot} mt-[0.45rem] shrink-0`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
