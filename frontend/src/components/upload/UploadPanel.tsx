import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  Building2, Briefcase, Info, Zap, BarChart3, Database, Shield
} from "lucide-react";
import { uploadAndAnalyze } from "../../utils/api";
import { AnalysisResult } from "../../App";

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

  useEffect(() => { if (initialJD) setJd(initialJD); }, [initialJD]);

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

  const hasResume = !!file || resumeText.trim().length > 50;
  const canAnalyze = hasResume && jd.trim().length >= 50 && !isAnalyzing;

  const effectiveScanName =
    (jobTitle.trim() && companyName.trim() ? `${jobTitle.trim()} — ${companyName.trim()}` : "") ||
    jobTitle.trim() || companyName.trim();

  const handleAnalyze = async () => {
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
      const result = await uploadAndAnalyze(uploadFile, jd, () => {}, effectiveScanName || undefined);
      onAnalysisComplete(result, uploadFile, jd, effectiveScanName || undefined);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setStageIdx(0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl mb-4 shadow-lg shadow-primary/10">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-3xl font-black text-foreground tracking-tight">ATS Resume Checker</h2>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto text-sm">
          Paste the job description and upload your resume for an instant ATS score, keyword gap analysis, and actionable feedback.
        </p>
      </div>

      {/* Main card — two columns */}
      <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">

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

            {/* JD */}
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
                placeholder="Paste the full job description here — include responsibilities, requirements, and skills for the most accurate analysis."
                className="flex-1 w-full bg-background border border-border rounded-xl px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none transition-colors leading-relaxed"
                style={{ minHeight: "260px" }}
              />
            </div>

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
                    <p className="text-xs text-emerald-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
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

            {/* Resume text area */}
            <div className="flex-1 flex flex-col">
              {file && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-primary text-primary-foreground rounded-xl mb-2 text-sm font-medium">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">File loaded: "{file.name}"</span>
                </div>
              )}
              <textarea
                rows={file ? 6 : 10}
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder={file ? "Optional: override the uploaded file's text content." : "Paste your resume text here as an alternative to uploading a file…"}
                className="flex-1 w-full bg-background border border-border rounded-xl px-3.5 py-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none transition-colors leading-relaxed font-mono"
                style={{ minHeight: file ? "120px" : "200px" }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="space-y-3">
              {isAnalyzing && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{STAGES[stageIdx]}</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-1000"
                      style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

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
                  "Create Scan"
                )}
              </button>

              {effectiveScanName && (
                <p className="text-center text-xs text-muted-foreground">
                  Scan: <span className="text-foreground font-medium">{effectiveScanName}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        {[
          { icon: Database, label: "Knowledge Sources", value: "Curated Tech + Cyber KB" },
          { icon: BarChart3, label: "Matching Layers", value: "5-Layer AI Pipeline" },
          { icon: Shield, label: "Analysis Points", value: "100+ ATS Checks" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-card/50 border border-border/60 rounded-xl p-4 text-center hover:border-primary/40 hover:bg-card transition-all hover:shadow-md hover:-translate-y-0.5">
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
