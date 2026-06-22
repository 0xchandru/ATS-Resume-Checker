import { useState, useRef } from "react";
import {
  Copy, Check, Sparkles, Loader2, RefreshCw, Download,
  FileText, ChevronDown, Edit3, Eye
} from "lucide-react";

interface CoverLetterData {
  company_name: string;
  role_title: string;
  greeting: string;
  paragraphs: string[];
  sign_off: string;
  candidate_placeholder: string;
  tone: string;
}

interface Props {
  resumeText: string;
  jdText: string;
}

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "confident", label: "Confident" },
  { value: "creative", label: "Creative" },
  { value: "executive", label: "Executive" },
];

function getTodayDate() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function CoverLetterTab({ resumeText, jdText }: Props) {
  const [letterData, setLetterData] = useState<CoverLetterData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [tone, setTone] = useState("professional");
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [editedParagraphs, setEditedParagraphs] = useState<string[]>([]);
  const letterRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/cover_letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, jd_text: jdText, tone }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errData.detail || "Generation failed");
      }
      const data = await res.json();

      // Handle both new structured format and legacy plain text
      if (data.paragraphs && Array.isArray(data.paragraphs)) {
        setLetterData(data as CoverLetterData);
        setEditedParagraphs(data.paragraphs);
      } else if (data.cover_letter) {
        // Legacy fallback
        const lines = (data.cover_letter as string).split("\n\n").filter(Boolean);
        const synthetic: CoverLetterData = {
          company_name: "the company",
          role_title: "this position",
          greeting: lines[0] || "Dear Hiring Manager,",
          paragraphs: lines.slice(1, -1),
          sign_off: "Sincerely,",
          candidate_placeholder: "[Your Name]",
          tone,
        };
        setLetterData(synthetic);
        setEditedParagraphs(synthetic.paragraphs);
      }
      setMode("view");
    } catch (e: any) {
      setError(e.message || "Failed to generate cover letter. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeParagraphs = mode === "edit" ? editedParagraphs : (letterData?.paragraphs ?? []);

  const getPlainText = () => {
    if (!letterData) return "";
    return [
      getTodayDate(),
      "",
      letterData.greeting,
      "",
      ...activeParagraphs,
      "",
      letterData.sign_off,
      letterData.candidate_placeholder,
    ].join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getPlainText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportPDF = () => {
    if (!letterData) return;

    const content = [
      `<p style="text-align:right;color:#555;margin-bottom:24px;">${getTodayDate()}</p>`,
      `<p style="margin-bottom:6px;font-weight:600;">${letterData.company_name !== "the company" ? letterData.company_name : ""}</p>`,
      `<p style="margin-bottom:24px;">${letterData.greeting}</p>`,
      ...activeParagraphs.map(p => `<p style="margin-bottom:16px;line-height:1.7;">${p}</p>`),
      `<p style="margin-top:32px;margin-bottom:4px;">${letterData.sign_off}</p>`,
      `<p style="font-weight:600;">${letterData.candidate_placeholder}</p>`,
    ].join("\n");

    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Cover Letter</title>
          <style>
            @media print { @page { margin: 1.2in 1in; } body { -webkit-print-color-adjust: exact; } }
            body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; color: #1a1a1a; line-height: 1.6; max-width: 680px; margin: 40px auto; padding: 0 20px; }
            p { margin: 0 0 12pt 0; }
            h1 { font-size: 13pt; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 6pt; margin-bottom: 20pt; }
          </style>
        </head>
        <body>
          <h1>Cover Letter — ${letterData.role_title}</h1>
          ${content}
          <script>window.onload = () => { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="p-6 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" />
            AI Cover Letter
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            GLM-powered cover letter tailored to this job description.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tone picker */}
          <div className="relative">
            <button
              onClick={() => setShowToneMenu(p => !p)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] border border-white/[0.07] text-foreground/80 rounded-xl text-sm font-semibold hover:bg-white/[0.07] transition-colors"
              data-testid="btn-tone-picker"
            >
              {TONES.find(t => t.value === tone)?.label ?? "Professional"}
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {showToneMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 min-w-[140px] overflow-hidden">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setTone(t.value); setShowToneMenu(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      tone === t.value
                        ? "bg-violet-500/15 text-violet-300 font-semibold"
                        : "text-foreground/80 hover:bg-white/[0.05]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {letterData && (
            <>
              {/* View/Edit toggle */}
              <button
                onClick={() => setMode(m => m === "view" ? "edit" : "view")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] border border-white/[0.07] text-foreground/80 rounded-xl text-sm font-semibold hover:bg-white/[0.07] transition-colors"
                data-testid="btn-toggle-edit"
              >
                {mode === "view" ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {mode === "view" ? "Edit" : "Preview"}
              </button>

              {/* Copy */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] border border-white/[0.07] text-foreground/80 rounded-xl text-sm font-semibold hover:bg-white/[0.07] transition-colors"
                data-testid="btn-copy-letter"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>

              {/* Export PDF */}
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] border border-white/[0.07] text-foreground/80 rounded-xl text-sm font-semibold hover:bg-white/[0.07] transition-colors"
                data-testid="btn-export-pdf"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </>
          )}

          {/* Generate / Regenerate */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !resumeText || !jdText}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-violet-500/20"
            data-testid="btn-generate-letter"
          >
            {isGenerating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : letterData ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? "Generating…" : letterData ? "Regenerate" : "Generate Now"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/8 text-red-400 rounded-xl border border-red-500/18 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!letterData && !isGenerating && (
        <div className="flex flex-col items-center justify-center p-14 border border-dashed border-white/[0.08] rounded-2xl text-center bg-white/[0.01]">
          <div className="h-16 w-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
            <FileText className="w-7 h-7 text-violet-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1.5">Ready to Generate</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
            Select your preferred tone, then click Generate. The AI will write a tailored cover letter matched to this specific role and your resume.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center mb-6">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  tone === t.value
                    ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                    : "bg-white/[0.03] text-foreground/60 border-white/[0.07] hover:bg-white/[0.06]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !resumeText || !jdText}
            className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-violet-500/25"
          >
            <Sparkles className="w-4 h-4" />
            Generate Cover Letter
          </button>
        </div>
      )}

      {/* Loading */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
            <Sparkles className="w-5 h-5 text-violet-400 absolute inset-0 m-auto" />
          </div>
          <p className="text-sm text-muted-foreground">Writing your cover letter…</p>
        </div>
      )}

      {/* Letter document */}
      {letterData && !isGenerating && (
        <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-xl">
          {/* Document header bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-white/[0.03] border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Cover Letter — {letterData.role_title}
            </span>
            <span className="text-xs text-muted-foreground capitalize">{tone}</span>
          </div>

          {/* Letter body */}
          <div
            ref={letterRef}
            className="p-8 md:p-12 bg-white/[0.01]"
          >
            {mode === "view" ? (
              <div className="max-w-2xl mx-auto font-serif space-y-5 text-foreground/90 text-[15px] leading-relaxed">
                {/* Date */}
                <p className="text-right text-sm text-muted-foreground not-serif font-sans">
                  {getTodayDate()}
                </p>

                {/* Company info */}
                {letterData.company_name !== "the company" && (
                  <div className="not-serif font-sans space-y-0.5">
                    <p className="font-semibold text-sm text-foreground">{letterData.company_name}</p>
                  </div>
                )}

                {/* Greeting */}
                <p className="font-medium">{letterData.greeting}</p>

                {/* Paragraphs */}
                {activeParagraphs.map((para, i) => (
                  <p key={i} className="leading-[1.85]">{para}</p>
                ))}

                {/* Sign off */}
                <div className="pt-4 space-y-1">
                  <p>{letterData.sign_off}</p>
                  <p className="font-semibold text-foreground">{letterData.candidate_placeholder}</p>
                </div>
              </div>
            ) : (
              /* Edit mode */
              <div className="max-w-2xl mx-auto space-y-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Edit each paragraph below. Changes apply to Copy and PDF export.
                </p>
                {editedParagraphs.map((para, i) => (
                  <div key={i}>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                      Paragraph {i + 1}
                    </label>
                    <textarea
                      value={para}
                      onChange={e => {
                        const updated = [...editedParagraphs];
                        updated[i] = e.target.value;
                        setEditedParagraphs(updated);
                      }}
                      rows={4}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-foreground/90 leading-relaxed resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                      data-testid={`textarea-para-${i}`}
                    />
                  </div>
                ))}
                <button
                  onClick={() => setMode("view")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-500/15 text-violet-300 border border-violet-500/25 rounded-xl text-sm font-semibold hover:bg-violet-500/20 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview Letter
                </button>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-8 py-4 border-t border-white/[0.06] bg-white/[0.02]">
            <p className="text-xs text-muted-foreground">
              AI-generated · Review before sending · Personalize as needed
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.05]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy text
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-violet-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
