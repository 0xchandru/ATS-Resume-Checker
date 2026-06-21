import { useState, useMemo } from "react";
import { AnalysisResult } from "../../App";
import { Edit3, FileText, Briefcase, Copy, Check, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  result: AnalysisResult;
  currentJD: string;
  onRescanWithNewJD: (jd: string) => void;
  isRescanning: boolean;
}

type TokenType = "matched" | "missing" | "normal";
interface Token { text: string; type: TokenType; }

function tokenize(text: string, matchedSet: Set<string>, missingSet: Set<string>): Token[] {
  if (!text) return [];
  // Build sorted keyword list (longest first for multi-word matching)
  const allKw = [...matchedSet, ...missingSet].sort((a, b) => b.length - a.length);
  if (allKw.length === 0) return [{ text, type: "normal" }];

  const escaped = allKw.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.filter(p => p).map(part => {
    const lower = part.toLowerCase();
    if (matchedSet.has(lower)) return { text: part, type: "matched" };
    if (missingSet.has(lower)) return { text: part, type: "missing" };
    return { text: part, type: "normal" };
  });
}

function HighlightedText({ tokens }: { tokens: Token[] }) {
  return (
    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono">
      {tokens.map((t, i) =>
        t.type === "normal" ? (
          <span key={i}>{t.text}</span>
        ) : (
          <mark
            key={i}
            className={
              t.type === "matched"
                ? "bg-emerald-500/20 text-emerald-400 dark:text-emerald-300 rounded-sm px-0.5 font-semibold not-italic"
                : "bg-red-500/20 text-red-400 dark:text-red-300 rounded-sm px-0.5 font-semibold not-italic"
            }
          >
            {t.text}
          </mark>
        )
      )}
    </p>
  );
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

function CopyBtn({ text, className = "" }: { text: string; className?: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <button
      onClick={copy}
      className={`p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ${className}`}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function TextHighlighter({ result, currentJD, onRescanWithNewJD, isRescanning }: Props) {
  const { resume_preview, jd_preview, keywords } = result;
  const [editingJD, setEditingJD] = useState(false);
  const [jdDraft, setJdDraft] = useState(currentJD || jd_preview || "");
  const [expanded, setExpanded] = useState(false);

  const matchedSet = useMemo(() =>
    new Set<string>((keywords?.matched || []).map((m: any) => m.keyword.toLowerCase())),
    [keywords]
  );
  const missingSet = useMemo(() =>
    new Set<string>((keywords?.missing || []).map((m: any) => m.keyword.toLowerCase())),
    [keywords]
  );

  const resumeTokens = useMemo(() => tokenize(resume_preview || "", matchedSet, new Set()), [resume_preview, matchedSet]);
  const jdTokens = useMemo(() => tokenize(jd_preview || currentJD || "", matchedSet, missingSet), [jd_preview, currentJD, matchedSet, missingSet]);

  const resumeMatchedCount = resumeTokens.filter(t => t.type === "matched").length;
  const jdMatchedCount    = jdTokens.filter(t => t.type === "matched").length;
  const jdMissingCount    = jdTokens.filter(t => t.type === "missing").length;

  const resumeWords = resume_preview?.split(/\s+/).filter(Boolean).length || 0;
  const jdWords     = (jd_preview || currentJD || "").split(/\s+/).filter(Boolean).length || 0;

  const PREVIEW_LENGTH = 600;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Resume vs Job Description
        </h2>
        <div className="flex items-center gap-2">
          {/* legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block" />
              <span className="text-muted-foreground">Matched</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70 inline-block" />
              <span className="text-muted-foreground">Missing</span>
            </span>
          </div>
          <button
            onClick={() => { setEditingJD(!editingJD); setJdDraft(currentJD || jd_preview || ""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit JD
          </button>
        </div>
      </div>

      {/* Edit JD panel */}
      {editingJD && (
        <div className="px-5 py-4 bg-muted/30 border-b border-border">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
            Job Description — Edit & Rescan
          </label>
          <textarea
            className="w-full h-36 bg-card border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 font-mono"
            value={jdDraft}
            onChange={e => setJdDraft(e.target.value)}
            placeholder="Paste updated job description…"
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => setEditingJD(false)}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onRescanWithNewJD(jdDraft); setEditingJD(false); }}
              disabled={isRescanning || jdDraft.trim().length < 50}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRescanning ? "animate-spin" : ""}`} />
              {isRescanning ? "Rescanning…" : "Rescan with New JD"}
            </button>
          </div>
        </div>
      )}

      {/* Two-pane preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Resume pane */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Resume</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">{resumeWords} words</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-emerald-500 font-medium">{resumeMatchedCount} matched</span>
              </div>
              <CopyBtn text={resume_preview || ""} />
            </div>
          </div>
          <div className={`bg-muted/30 rounded-xl p-4 overflow-hidden ${expanded ? "" : "max-h-64"}`}>
            <HighlightedText tokens={expanded ? resumeTokens : tokenize((resume_preview || "").slice(0, PREVIEW_LENGTH), matchedSet, new Set())} />
            {!expanded && (resume_preview?.length || 0) > PREVIEW_LENGTH && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>
        </div>

        {/* JD pane */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Job Description</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">{jdWords} words</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-emerald-500 font-medium">{jdMatchedCount} ✓</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-red-500 font-medium">{jdMissingCount} ✗</span>
              </div>
              <CopyBtn text={jd_preview || currentJD || ""} />
            </div>
          </div>
          <div className={`bg-muted/30 rounded-xl p-4 overflow-hidden ${expanded ? "" : "max-h-64"}`}>
            <HighlightedText tokens={expanded ? jdTokens : tokenize((jd_preview || currentJD || "").slice(0, PREVIEW_LENGTH), matchedSet, missingSet)} />
          </div>
        </div>
      </div>

      {/* Show more */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show full text</>}
        </button>
      </div>
    </div>
  );
}
