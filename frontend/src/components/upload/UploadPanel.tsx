import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  Building2, Briefcase, Sparkles, Zap, Info, FileUp, X
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
    } catch (e: any) {
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
    } catch (e: any) {
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
      setError(err?.response?.data?.detail || err?.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setStageIdx(0);
    }
  };

  const jdCharCount = jd.replace(/<[^>]*>/g, "").length;
  const resumeCharCount = resumeText.replace(/<[^>]*>/g, "").length;

  return (
    <div className="w-full max-w-[1400px] mx-auto h-full min-h-[calc(100vh-4rem)] flex flex-col pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 flex-shrink-0 gap-4 mt-4 lg:mt-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Create New Scan</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">Paste your job description and resume for instant ATS analysis.</p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className={`px-8 py-3.5 rounded-2xl text-base font-bold transition-all shadow-lg flex items-center justify-center gap-2 min-w-[200px] ${
            canAnalyze
              ? "bg-primary text-primary-foreground hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 shadow-primary/25"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {STAGES[stageIdx]}
            </>
          ) : isParsing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Parsing…
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              Analyze Resume
            </>
          )}
        </button>
      </div>

      {/* Main Body Grid */}
      <div className="flex-1 bg-card/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden flex flex-col lg:flex-row">
        
        {/* LEFT COLUMN: Job Description */}
        <div className="flex-1 flex flex-col p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border/50">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h3 className="font-black text-xl text-foreground flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 rounded-lg"><Briefcase className="h-5 w-5 text-blue-500" /></div>
                Job Details
              </h3>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${jdCharCount >= 50 ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
              {jdCharCount >= 50 ? `✓ ${jdCharCount} chars` : `${Math.max(0, 50 - jdCharCount)} more chars required`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 flex-shrink-0">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5"/> Company Name</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Google" className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5"/> Job Title</label>
              <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. SOC Analyst" className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow font-medium" />
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Job Description</span>
              <button onClick={handleFormatJD} disabled={isFormattingJD || jdCharCount < 50} className="text-primary bg-primary/10 px-3 py-1 rounded-md hover:bg-primary/20 flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                {isFormattingJD ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Format & Clean
              </button>
            </label>
            <div className="flex-1 border border-border rounded-2xl overflow-hidden bg-background/50 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-transparent transition-shadow">
              <RichTextEditor value={jd} onChange={setJd} placeholder="Paste the full job description here. Include responsibilities, requirements, and qualifications for the best ATS match..." minHeight="100%" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Resume */}
        <div className="flex-1 flex flex-col p-6 lg:p-8 bg-muted/5 relative">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <h3 className="font-black text-xl text-foreground flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><FileText className="h-5 w-5 text-emerald-500" /></div>
                Resume
              </h3>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${hasResume ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
              {hasResume ? "Ready ✓" : "Required"}
            </span>
          </div>

          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`mb-6 flex-shrink-0 border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
              isDragging ? "border-primary bg-primary/10 scale-[1.02]" : file ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-emerald-500/15 rounded-2xl p-4 shadow-sm"><FileText className="h-10 w-10 text-emerald-600 dark:text-emerald-400" /></div>
                <p className="font-bold text-foreground text-lg tracking-tight">{file.name}</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-background border border-border shadow-sm flex items-center justify-center"><Upload className="h-8 w-8 text-primary/60" /></div>
                <div>
                  <p className="font-bold text-foreground text-lg">Click to upload resume</p>
                  <p className="text-sm font-medium text-muted-foreground mt-1">Drag & drop PDF or DOCX · Max {MAX_MB} MB</p>
                </div>
              </div>
            )}
          </div>
          
          {fileError && <p className="text-sm font-medium text-red-500 mb-4 flex items-center justify-center gap-1.5 bg-red-500/10 py-2 rounded-lg"><AlertCircle className="h-4 w-4" /> {fileError}</p>}

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-3 py-1 rounded-full">Or paste raw text</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0">
            <div className="flex-1 border border-border rounded-2xl overflow-hidden bg-background/50 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-transparent transition-shadow">
              <RichTextEditor value={resumeText} onChange={setResumeText} placeholder={file ? "Resume successfully uploaded. You can manually review or edit the parsed text here if needed." : "Alternatively, paste your full resume text here..."} minHeight="100%" />
            </div>
          </div>
        </div>

      </div>
      
      {error && (
        <div className="mt-6 flex items-center gap-3 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl shadow-sm">
          <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
          <p className="text-base font-bold text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError("")} className="ml-auto p-2 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500/20 transition-colors"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
