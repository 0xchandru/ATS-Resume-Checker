import { useState, useCallback, useRef, useEffect } from "react";
import {
  X, Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  Building2, Briefcase, Info, Zap
} from "lucide-react";
import { uploadAndAnalyze } from "../../utils/api";
import { AnalysisResult } from "../../App";

interface Props {
  open: boolean;
  onClose: () => void;
  onAnalysisComplete: (result: AnalysisResult, file: File, jd: string, scanName: string) => void;
  initialJD?: string;
}

const STAGES = [
  "Uploading resume…",
  "Parsing document…",
  "Extracting keywords…",
  "Running ATS analysis…",
  "Computing scores…",
  "Finalising report…",
];

const ACCEPTED = [".pdf", ".docx"];
const MAX_MB = 10;

export default function ScanModal({ open, onClose, onAnalysisComplete, initialJD = "" }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jd, setJd] = useState(initialJD);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setJd(initialJD);
      setFile(null);
      setResumeText("");
      setCompanyName("");
      setJobTitle("");
      setFileError("");
      setError("");
      setIsAnalyzing(false);
      setStageIdx(0);
    }
  }, [open, initialJD]);

  useEffect(() => {
    if (!isAnalyzing) { setStageIdx(0); return; }
    const t = setInterval(() => setStageIdx(i => Math.min(i + 1, STAGES.length - 1)), 2500);
    return () => clearInterval(t);
  }, [isAnalyzing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !isAnalyzing) onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isAnalyzing, onClose]);

  const validateFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ext || !ACCEPTED.includes(`.${ext}`)) return "Only PDF and DOCX files are supported.";
    if (f.size > MAX_MB * 1024 * 1024) return `File too large. Max ${MAX_MB} MB.`;
    return "";
  };

  const handleFile = (f: File) => {
    const err = validateFile(f);
    setFileError(err);
    if (!err) {
      setFile(f);
      setError("");
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, []);

  const effectiveScanName =
    (jobTitle.trim() && companyName.trim() ? `${jobTitle.trim()} — ${companyName.trim()}` : "") ||
    jobTitle.trim() || companyName.trim() || "Resume Scan";

  const hasResume = !!file || resumeText.trim().length > 50;
  const canAnalyze = hasResume && jd.trim().length >= 50 && !isAnalyzing;

  const handleSubmit = async () => {
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    setError("");

    let uploadFile = file;
    if (!uploadFile && resumeText.trim()) {
      const blob = new Blob([resumeText.trim()], { type: "text/plain" });
      uploadFile = new File([blob], "resume.txt", { type: "text/plain" });
    }
    if (!uploadFile) return;

    try {
      const result = await uploadAndAnalyze(uploadFile, jd, () => {}, effectiveScanName);
      onAnalysisComplete(result, uploadFile, jd, effectiveScanName);
    } catch (err: any) {
      setError(err?.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setStageIdx(0);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !isAnalyzing) onClose(); }}
    >
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-bold text-foreground text-base">Create New Scan</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — two columns */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border min-h-full">

            {/* LEFT — Job Details */}
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Job Details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paste the job posting so we can compare it against your resume.
                </p>
              </div>

              {/* Company + Job Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    <Building2 className="inline h-3 w-3 mr-1" />Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Google"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    <Briefcase className="inline h-3 w-3 mr-1" />Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="e.g. SOC Analyst"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              {/* Job Description */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Job Description <span className="text-red-400">*</span>
                  </label>
                  <span className={`text-xs font-medium transition-colors ${jd.length >= 50 ? "text-emerald-500" : "text-muted-foreground/60"}`}>
                    {jd.length >= 50 ? `✓ ${jd.length} chars` : `${50 - jd.length} more chars needed`}
                  </span>
                </div>
                <textarea
                  rows={14}
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                  placeholder="Paste the full job description here — include responsibilities, requirements, and skills sections for the most accurate analysis."
                  className="flex-1 w-full bg-background border border-border rounded-xl px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none transition-colors leading-relaxed"
                  style={{ minHeight: "280px" }}
                />
              </div>

              {/* Tip banner */}
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Include the full responsibilities and qualifications sections for the best results.
                </p>
              </div>
            </div>

            {/* RIGHT — Resume */}
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Resume</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload your resume file or paste the text below.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : file
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-border hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {file ? (
                  <div className="flex items-center gap-3 justify-center">
                    <div className="bg-emerald-500/10 rounded-xl p-2.5">
                      <FileText className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-sm">{file.name}</p>
                      <p className="text-xs text-emerald-500 mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Click to upload your resume</p>
                      <p className="text-xs text-muted-foreground mt-0.5">PDF or DOCX · Max {MAX_MB} MB</p>
                    </div>
                  </div>
                )}
              </div>

              {fileError && (
                <p className="text-xs text-red-500 flex items-center gap-1.5 -mt-2">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {fileError}
                </p>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">or paste below</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Resume text paste */}
              <div className="flex-1 flex flex-col">
                {file && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-primary text-primary-foreground rounded-xl mb-2 text-sm font-medium">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">File loaded: "{file.name}"</span>
                  </div>
                )}
                <textarea
                  rows={file ? 8 : 11}
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder={file ? "Optional: paste resume text to override the uploaded file's text content." : "Paste your resume text here as an alternative to uploading a file…"}
                  className="flex-1 w-full bg-background border border-border rounded-xl px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none transition-colors leading-relaxed font-mono"
                  style={{ minHeight: file ? "160px" : "220px" }}
                />
              </div>

              {/* Readiness checklist */}
              <div className="space-y-1.5">
                {[
                  { label: "Job description pasted", ok: jd.trim().length >= 50 },
                  { label: "Resume ready", ok: hasResume },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? "bg-emerald-500/20" : "bg-muted"}`}>
                      {ok
                        ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                      }
                    </div>
                    <span className={`text-xs ${ok ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-6 py-4 flex items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-400 truncate">{error}</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <p className="text-xs text-muted-foreground">{STAGES[stageIdx]}</p>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {effectiveScanName && !isAnalyzing && (
            <p className="text-xs text-muted-foreground flex-1 truncate">
              Scan: <span className="text-foreground font-medium">{effectiveScanName}</span>
            </p>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={isAnalyzing}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canAnalyze}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md ${
                canAnalyze
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysing…
                </span>
              ) : (
                "Create Scan"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
