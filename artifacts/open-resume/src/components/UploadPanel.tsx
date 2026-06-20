import { useState, useCallback, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { uploadAndAnalyze } from "../utils/api";
import { AnalysisResult } from "../App";

interface Props {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

const ACCEPTED = [".pdf", ".docx"];
const MAX_MB = 10;

export default function UploadPanel({ onAnalysisComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!ext || !ACCEPTED.includes(`.${ext}`)) return "Only PDF and DOCX files are supported.";
    if (f.size > MAX_MB * 1024 * 1024) return `File too large. Max ${MAX_MB}MB.`;
    return "";
  };

  const handleFile = (f: File) => {
    const err = validateFile(f);
    setFileError(err);
    setFile(err ? null : f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const canAnalyze = !!file && jd.trim().length >= 50 && !isAnalyzing;

  const handleAnalyze = async () => {
    if (!canAnalyze || !file) return;
    setIsAnalyzing(true);
    setError("");
    try {
      const result = await uploadAndAnalyze(file, jd, setStage);
      onAnalysisComplete(result);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Analysis failed. Please try again.";
      setError(msg);
    } finally {
      setIsAnalyzing(false);
      setStage("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">ATS Resume Checker</h2>
        <p className="mt-2 text-slate-500">Upload your resume + paste a job description to get your ATS score, keyword gaps, and recruiter-grade suggestions.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Resume (PDF or DOCX)</label>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging ? "border-blue-400 bg-blue-50" : file ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
                <div className="text-left">
                  <p className="font-semibold">{file.name}</p>
                  <p className="text-sm text-emerald-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <div className="text-slate-500">
                <Upload className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                <p className="font-medium">Drop your resume here, or click to browse</p>
                <p className="text-sm mt-1">PDF or DOCX · Max {MAX_MB}MB</p>
              </div>
            )}
          </div>
          {fileError && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> {fileError}
            </p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700">Job Description</label>
            <span className={`text-xs ${jd.length >= 50 ? "text-emerald-600" : "text-slate-400"}`}>
              {jd.length} chars {jd.length < 50 && `(${50 - jd.length} more needed)`}
            </span>
          </div>
          <textarea
            rows={6}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here. Include the full text — requirements, responsibilities, and skills sections are most important for analysis."
            className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all ${
            canAnalyze
              ? "bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow"
              : "bg-slate-300 cursor-not-allowed"
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {stage || "Analyzing..."}
            </span>
          ) : (
            "Analyze Resume"
          )}
        </button>

        {!file && !jd && (
          <p className="text-center text-xs text-slate-400">Upload a resume and paste a job description to get started</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { label: "Knowledge Sources", value: "ESCO + O*NET" },
          { label: "Matching Layers", value: "5-Layer AI" },
          { label: "Analysis Points", value: "50+" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-lg font-bold text-blue-600">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
