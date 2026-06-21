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
    } catch (err: any) {
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">AI Cover Letter</h2>
          <p className="text-sm text-muted-foreground">Generate a tailored cover letter based on your resume and the job description.</p>
        </div>
        <div className="flex items-center gap-3">
          {coverLetter && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-semibold"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !resumeText || !jdText}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : coverLetter ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? "Generating..." : coverLetter ? "Regenerate" : "Generate Now"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-sm">
          {error}
        </div>
      )}

      {coverLetter ? (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[500px]">
          <RichTextEditor value={coverLetter} onChange={setCoverLetter} minHeight="500px" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">No Cover Letter Yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Click the generate button above to create an AI-written cover letter tailored to this specific job description.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-bold transition-colors"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGenerating ? "Generating..." : "Generate Cover Letter"}
          </button>
        </div>
      )}
    </div>
  );
}
