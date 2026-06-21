import { useMemo } from "react";
import { Edit3, RefreshCw } from "lucide-react";
import { useState } from "react";

interface Props {
  jdText: string;
  keywords: any;
  onRescanWithNewJD?: (jd: string) => void;
  isRescanning?: boolean;
}

export default function JobDescriptionTab({ jdText, keywords, onRescanWithNewJD, isRescanning }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(jdText);

  const matchedSet = useMemo(
    () => new Set<string>((keywords?.matched || []).map((m: any) => m.keyword.toLowerCase())),
    [keywords]
  );
  const missingSet = useMemo(
    () => new Set<string>((keywords?.missing || []).map((m: any) => m.keyword.toLowerCase())),
    [keywords]
  );

  const highlighted = useMemo(() => {
    if (!jdText) return null;
    const allKw = [...matchedSet, ...missingSet].sort((a, b) => b.length - a.length);
    if (allKw.length === 0) return <span>{jdText}</span>;
    const escaped = allKw.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    return jdText.split(regex).map((part, i) => {
      const lower = part.toLowerCase();
      if (matchedSet.has(lower)) {
        return (
          <mark key={i} className="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5 font-semibold not-italic cursor-help" title="Found in resume">
            {part}
          </mark>
        );
      }
      if (missingSet.has(lower)) {
        return (
          <mark key={i} className="bg-red-500/20 text-red-400 rounded-sm px-0.5 font-semibold not-italic cursor-help" title="Missing from resume">
            {part}
          </mark>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, [jdText, matchedSet, missingSet]);

  return (
    <div className="p-6">
      {/* Header with edit button */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/30 inline-block border border-emerald-500/50" />
            Matched in resume
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500/30 inline-block border border-red-500/50" />
            Missing from resume
          </span>
        </div>
        <button
          onClick={() => { setEditing(!editing); setDraft(jdText); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Update scan information
        </button>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="mb-5 p-4 bg-muted/30 border border-border rounded-xl">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
            Edit Job Description
          </label>
          <textarea
            className="w-full h-48 bg-card border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 font-mono"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Paste updated job description…"
          />
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onRescanWithNewJD?.(draft); setEditing(false); }}
              disabled={isRescanning || draft.trim().length < 50}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRescanning ? "animate-spin" : ""}`} />
              {isRescanning ? "Rescanning…" : "Rescan with Updated JD"}
            </button>
          </div>
        </div>
      )}

      {/* JD Content */}
      <div className="bg-muted/30 border border-border rounded-xl p-6">
        <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
          {highlighted}
        </p>
      </div>
    </div>
  );
}
