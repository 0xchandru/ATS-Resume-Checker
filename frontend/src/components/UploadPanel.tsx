import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Zap, BarChart3, Database } from "lucide-react";
import { uploadAndAnalyze } from "../utils/api";
import { AnalysisResult } from "../App";

interface Props {
  onAnalysisComplete: (result: AnalysisResult, file: File, jd: string, scanName?: string) => void;
  initialJD?: string;
}

const ACCEPTED = [".pdf", ".docx"];
const MAX_MB = 10;

const STAGES = [
  "Uploading resume…",
  "Parsing document…",
  "Extracting keywords…",
  "Running ATS analysis…",
  "Computing scores…",
  "Finalizing report…",
];

export default function UploadPanel({ onAnalysisComplete, initialJD = "" }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState(initialJD);
  const [scanName, setScanName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage, setStage] = useState("");
  const [stageIdx, setStageIdx] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (initialJD) setJd(initialJD); }, [initialJD]);

  // Cycle through stages while analyzing
  useEffect(() => {
    if (!isAnalyzing) { setStageIdx(0); return; }
    const t = setInterval(() => setStageIdx(i => Math.min(i + 1, STAGES.length - 1)), 2800);
    return () => clearInterval(t);
  }, [isAnalyzing]);

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

  const canAnalyze = !!file && jd.trim().length >= 50 && !isAnalyzing;

  const handleAnalyze = async () => {
    if (!canAnalyze || !file) return;
    setIsAnalyzing(true); setError("");
    try {
      const result = await uploadAndAnalyze(file, jd, setStage, scanName.trim() || undefined);
      onAnalysisComplete(result, file, jd, scanName.trim() || undefined);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false); setStage(""); setStageIdx(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl mb-4">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-3xl font-black text-foreground tracking-tight">ATS Resume Checker</h2>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          Upload your resume and paste a job description for an instant ATS compatibility score, keyword gap analysis, and actionable suggestions.
        </p>
      </div>

      {/* Card */}
      <div className="bg-card rounded-2xl border border-border shadow-md p-6 space-y-5">
        {/* Scan Name */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Scan Name <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            type="text"
            value={scanName}
            onChange={e => setScanName(e.target.value)}
            placeholder="e.g. Senior SOC Analyst — Google"
            className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
          />
        </div>

        {/* File drop zone */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Resume</label>
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-primary bg-primary/10"
                : file
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-border hover:border-primary/50 hover:bg-primary/5"
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
              <div className="flex items-center justify-center gap-3">
                <div className="bg-emerald-500/10 rounded-xl p-2.5">
                  <FileText className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{file.name}</p>
                  <p className="text-sm text-emerald-500">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto" />
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-semibold text-foreground">Drop your resume here, or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">PDF or DOCX · Max {MAX_MB} MB</p>
              </div>
            )}
          </div>
          {fileError && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {fileError}
            </p>
          )}
        </div>

        {/* JD textarea */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-foreground">Job Description</label>
            <span className={`text-xs font-medium transition-colors ${jd.length >= 50 ? "text-emerald-500" : "text-muted-foreground"}`}>
              {jd.length} chars {jd.length < 50 ? `(${50 - jd.length} more needed)` : "✓"}
            </span>
          </div>
          <textarea
            rows={7}
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the full job description here — include requirements, responsibilities, and skills sections for the most accurate analysis."
            className="w-full bg-background border border-border rounded-xl p-3.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-base transition-all ${
            canAnalyze
              ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md hover:shadow-lg"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-2.5">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{STAGES[stageIdx]}</span>
            </span>
          ) : (
            "Analyze Resume"
          )}
        </button>

        {/* Progress bar */}
        {isAnalyzing && (
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        {[
          { icon: Database, label: "Knowledge Sources", value: "Curated Tech + Cyber KB" },
          { icon: BarChart3, label: "Matching Layers",  value: "5-Layer AI Pipeline" },
          { icon: Zap,       label: "Analysis Points",  value: "100+ Checks" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-xl p-4 text-center hover:border-primary/40 hover:bg-card transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-3">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
