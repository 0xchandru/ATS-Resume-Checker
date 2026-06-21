import { useState, useCallback, useRef, useEffect } from "react";
import {
  X, Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  Briefcase, FileSearch, Tag, Building2
} from "lucide-react";
import { uploadAndAnalyze } from "../utils/api";
import { AnalysisResult } from "../App";

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
  const [jd, setJd] = useState(initialJD);
  const [scanName, setScanName] = useState("");
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
      setScanName("");
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
    setFile(err ? null : f);
    setError("");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, []);

  const effectiveScanName = scanName.trim() ||
    (jobTitle.trim() && companyName.trim() ? `${jobTitle.trim()} @ ${companyName.trim()}` : "") ||
    jobTitle.trim() || companyName.trim();

  const canAnalyze = !!file && jd.trim().length >= 50 && !isAnalyzing;

  const handleSubmit = async () => {
    if (!canAnalyze || !file) return;
    setIsAnalyzing(true);
    setError("");
    try {
      const result = await uploadAndAnalyze(file, jd, () => {}, effectiveScanName || undefined);
      onAnalysisComplete(result, file, jd, effectiveScanName);
    } catch (err: any) {
      setError(err?.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setStageIdx(0);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSearch className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-base">New Scan</h2>
              <p className="text-xs text-muted-foreground">Add your job details and resume to get your ATS score</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

            {/* LEFT — Job Details */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Job Details</h3>
              </div>

              {/* Scan name */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  <Tag className="inline h-3 w-3 mr-1" />Scan Name <span className="font-normal normal-case text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={scanName}
                  onChange={e => setScanName(e.target.value)}
                  placeholder="e.g. SOC Analyst — Dream Company"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Company + Job Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    <Building2 className="inline h-3 w-3 mr-1" />Company
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Google, Apple…"
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="SOC Analyst…"
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              {/* JD */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Job Description <span className="text-red-400">*</span>
                  </label>
                  <span className={`text-xs font-medium transition-colors ${jd.length >= 50 ? "text-emerald-500" : "text-muted-foreground/60"}`}>
                    {jd.length >= 50 ? "✓ Ready" : `${50 - jd.length} more chars`}
                  </span>
                </div>
                <textarea
                  rows={12}
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                  placeholder="Paste the full job description here — include requirements, responsibilities, and skills for the most accurate analysis."
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none transition-colors"
                />
              </div>
            </div>

            {/* RIGHT — Resume */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Resume</h3>
              </div>

              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
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
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-emerald-500/10 rounded-xl p-3">
                      <FileText className="h-7 w-7 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{file.name}</p>
                      <p className="text-xs text-emerald-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-muted rounded-xl p-3">
                      <Upload className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Drop your resume here</p>
                      <p className="text-xs text-muted-foreground mt-0.5">or click to browse · PDF or DOCX · Max {MAX_MB} MB</p>
                    </div>
                  </div>
                )}
              </div>

              {fileError && (
                <p className="text-xs text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {fileError}
                </p>
              )}

              {/* Scan name preview */}
              {effectiveScanName && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                  <Tag className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <p className="text-xs text-primary font-medium truncate">Scan: "{effectiveScanName}"</p>
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-1.5 pt-2">
                {[
                  { label: "Job description pasted", ok: jd.trim().length >= 50 },
                  { label: "Resume uploaded", ok: !!file },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? "bg-emerald-500/20" : "bg-muted"}`}>
                      {ok ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                      )}
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
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
                />
              </div>
            </div>
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
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                canAnalyze
                  ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysing…
                </span>
              ) : (
                "Analyse Resume"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
