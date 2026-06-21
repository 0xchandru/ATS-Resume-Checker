import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  Building2, Briefcase, Sparkles, Zap, X
} from "lucide-react";
import { uploadAndAnalyze, parseResume } from "../../utils/api";
import { AnalysisResult } from "../../App";
import RichTextEditor from "../common/RichTextEditor";

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
  const [isParsing, setIsParsing] = useState(false);
  const [isFormattingJD, setIsFormattingJD] = useState(false);
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

  const handleFile = async (f: File) => {
    const err = validateFile(f);
    setFileError(err);
    if (err) { setFile(null); setError(""); return; }
    setFile(f);
    setError("");
    setIsParsing(true);
    setResumeText("Parsing document, please wait...");
    try {
      const res = await parseResume(f);
      setResumeText(res.text || "");
    } catch {
      setResumeText("");
      setError("Failed to auto-parse document. You can still paste text manually.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFormatJD = async () => {
    if (!jd || jd.length < 50) return;
    setIsFormattingJD(true);
    setError("");
    try {
      const res = await fetch("/api/format_jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_text: jd })
      });
      if (!res.ok) throw new Error("Failed to format JD");
      const data = await res.json();
      setJd(data.text);
    } catch {
      setError("Failed to format JD. Ensure backend is running and API key is set.");
    } finally {
      setIsFormattingJD(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, []);

  const hasResume = !!file || resumeText.trim().length > 50;
  const canAnalyze = hasResume && jd.trim().length >= 50 && !isAnalyzing && !isParsing;

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
      const result = await uploadAndAnalyze(uploadFile, jd, resumeText, () => {}, effectiveScanName || undefined);
      onAnalysisComplete(result, uploadFile, jd, effectiveScanName || undefined);
    } catch (err: any) {
      setError(err?.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setStageIdx(0);
    }
  };

  const jdCharCount = jd.replace(/<[^>]*>/g, "").length;
  const resumeCharCount = resumeText.replace(/<[^>]*>/g, "").length;

  return (
    <div className="w-full max-w-[1400px] mx-auto h-full min-h-[calc(100vh-4rem)] flex flex-col pb-6 px-4 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 flex-shrink-0 gap-4 mt-5 lg:mt-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 pulse-dot" />
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">AI-Powered Analysis</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Create New Scan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Paste your job description and upload your resume for instant ATS analysis.</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          data-testid="btn-analyze"
          className={`px-7 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 min-w-[180px] shrink-0 ${
            canAnalyze
              ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-violet-500/25"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="truncate max-w-[140px]">{STAGES[stageIdx]}</span>
            </>
          ) : isParsing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Parsing…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Analyze Resume
            </>
          )}
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 border border-white/[0.07] rounded-2xl overflow-hidden flex flex-col lg:flex-row bg-card/60 backdrop-blur-xl shadow-xl shadow-black/20">

        {/* LEFT: Job Description */}
        <div className="flex-1 flex flex-col p-6 lg:p-7 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          <div className="flex items-center justify-between mb-5 flex-shrink-0">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Briefcase className="h-4 w-4 text-blue-400" />
              </div>
              Job Details
            </h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors ${
              jdCharCount >= 50
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-muted text-muted-foreground border-border"
            }`}>
              {jdCharCount >= 50 ? `✓ ${jdCharCount} chars` : `${Math.max(0, 50 - jdCharCount)} more needed`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5 flex-shrink-0">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Company
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Google"
                data-testid="input-company"
                className="w-full bg-background/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-transparent transition-all font-medium placeholder:text-muted-foreground/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. SOC Analyst"
                data-testid="input-job-title"
                className="w-full bg-background/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-transparent transition-all font-medium placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between flex-shrink-0">
              <span>Job Description</span>
              <button
                onClick={handleFormatJD}
                disabled={isFormattingJD || jdCharCount < 50}
                data-testid="btn-format-jd"
                className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg hover:bg-violet-500/15 disabled:opacity-40 transition-colors"
              >
                {isFormattingJD ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Format & Clean
              </button>
            </label>
            <div className="flex-1 border border-white/[0.07] rounded-xl overflow-hidden bg-background/30 focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-transparent transition-all">
              <RichTextEditor
                value={jd}
                onChange={setJd}
                placeholder="Paste the full job description here. Include responsibilities, requirements, and qualifications for the best ATS match..."
                minHeight="100%"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Resume */}
        <div className="flex-1 flex flex-col p-6 lg:p-7 bg-white/[0.01]">
          <div className="flex items-center justify-between mb-5 flex-shrink-0">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <FileText className="h-4 w-4 text-emerald-400" />
              </div>
              Resume
            </h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors ${
              hasResume
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-muted text-muted-foreground border-border"
            }`}>
              {hasResume ? "Ready ✓" : "Required"}
            </span>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            data-testid="dropzone-resume"
            className={`mb-5 flex-shrink-0 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all select-none ${
              isDragging
                ? "border-violet-500 bg-violet-500/10 upload-shimmer"
                : file
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-white/[0.08] hover:border-violet-500/40 hover:bg-violet-500/5"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              data-testid="input-file"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="font-semibold text-sm text-foreground truncate max-w-[200px]">{file.name}</p>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <p className="text-xs text-emerald-400">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <Upload className="h-6 w-6 text-violet-400/60" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Click to upload resume</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Drag & drop PDF or DOCX · Max {MAX_MB} MB</p>
                </div>
              </div>
            )}
          </div>

          {fileError && (
            <p className="text-xs font-medium text-red-400 mb-4 flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {fileError}
            </p>
          )}

          <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Or paste text</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="flex-1 flex flex-col min-h-[200px] lg:min-h-0">
            <div className="flex-1 border border-white/[0.07] rounded-xl overflow-hidden bg-background/30 focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-transparent transition-all">
              <RichTextEditor
                value={resumeText}
                onChange={setResumeText}
                placeholder={file ? "Resume parsed. Review or edit the text below if needed." : "Alternatively, paste your full resume text here..."}
                minHeight="100%"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
              {resumeCharCount > 0 ? `${resumeCharCount} characters` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm font-medium text-red-400 flex-1">{error}</p>
          <button
            onClick={() => setError("")}
            className="p-1.5 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Analysis progress */}
      {isAnalyzing && (
        <div className="mt-4 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center gap-3">
          <Loader2 className="h-4 w-4 text-violet-400 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-300">{STAGES[stageIdx]}</p>
            <div className="mt-1.5 h-1 bg-violet-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-1000"
                style={{ width: `${((stageIdx + 1) / STAGES.length) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{Math.round(((stageIdx + 1) / STAGES.length) * 100)}%</span>
        </div>
      )}
    </div>
  );
}
