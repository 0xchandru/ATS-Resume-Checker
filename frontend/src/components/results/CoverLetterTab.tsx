import { useState } from "react";
import { Copy, Check, Sparkles, Loader2, RefreshCw } from "lucide-react";
import RichTextEditor from "../common/RichTextEditor";

interface Props {
  resumeText: string;
  jdText: string;
}

export default function CoverLetterTab({ resumeText, jdText }: Props) {
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/cover_letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, jd_text: jdText }),
      });
      if (!response.ok) throw new Error("Failed to generate cover letter");
      const data = await response.json();
      setCoverLetter(data.cover_letter);
    } catch {
      setError("Failed to generate cover letter. Ensure backend is running and API key is valid.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = coverLetter;
    navigator.clipboard.writeText(tempDiv.innerText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-foreground">AI Cover Letter</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Generate a tailored cover letter based on your resume and the job description.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {coverLetter && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] border border-white/[0.07] text-foreground/80 rounded-xl text-sm font-semibold hover:bg-white/[0.07] transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !resumeText || !jdText}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-violet-500/20"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : coverLetter ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? "Generating..." : coverLetter ? "Regenerate" : "Generate Now"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/8 text-red-400 rounded-xl border border-red-500/18 text-sm">
          {error}
        </div>
      )}

      {coverLetter ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden min-h-[500px]">
          <RichTextEditor value={coverLetter} onChange={setCoverLetter} minHeight="500px" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/[0.08] rounded-2xl text-center bg-white/[0.01]">
          <div className="h-16 w-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-violet-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1.5">No Cover Letter Yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
            Click generate to create an AI-written cover letter tailored to this specific job description.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-violet-500/25"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? "Generating..." : "Generate Cover Letter"}
          </button>
        </div>
      )}
    </div>
  );
}
