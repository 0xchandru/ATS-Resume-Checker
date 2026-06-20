import { useState, useEffect, useCallback } from "react";
import Layout from "./components/Layout";
import UploadPanel from "./components/UploadPanel";
import SidebarScore from "./components/SidebarScore";
import TextHighlighter from "./components/TextHighlighter";
import KeywordAnalysis from "./components/KeywordAnalysis";
import SectionDetailReport from "./components/SectionDetailReport";
import FeedbackPanel from "./components/FeedbackPanel";
import FormatChecker from "./components/FormatChecker";
import ActionVerbPanel from "./components/ActionVerbPanel";
import HistoryPanel from "./components/HistoryPanel";
import AIVerdict, { type AIEvaluation } from "./components/AIVerdict";
import { getHistory, uploadAndAnalyze, runAIEvaluation } from "./utils/api";

export type View = "upload" | "results" | "history" | "compare";
export type Theme = "dark" | "light";

export interface AnalysisResult {
  scan_id: string;
  filename: string;
  file_type: string;
  timestamp: string;
  processing_time_seconds: number;
  overall_score: number;
  letter_grade: string;
  sub_scores: Record<string, any>;
  keywords: any;
  career_intelligence: any;
  action_verbs: any;
  sections: any;
  formatting: any;
  skill_prediction: any;
  cybersecurity_analysis: any | null;
  feedback: any[];
  resume_preview: string;
  jd_preview: string;
}

export default function App() {
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentJD, setCurrentJD] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<View>("upload");
  const [compareResult, setCompareResult] = useState<any | null>(null);
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem("ats-theme") as Theme) || "dark"
  );
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanError, setRescanError] = useState("");

  const [aiEvaluation, setAiEvaluation] = useState<AIEvaluation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("ats-theme", theme);
  }, [theme]);

  useEffect(() => { refreshHistory(); }, []);

  const refreshHistory = async () => {
    try { setHistory(await getHistory()); } catch { }
  };

  const handleAnalysisComplete = (result: AnalysisResult, file: File, jd: string) => {
    setCurrentResult(result);
    setCurrentFile(file);
    setCurrentJD(jd);
    setAiEvaluation(null);
    setAiError(null);
    setActiveView("results");
    refreshHistory();
  };

  const handleRescan = useCallback(async (newJD?: string) => {
    if (!currentFile) return;
    const jdToUse = newJD ?? currentJD;
    setIsRescanning(true);
    setRescanError("");
    try {
      const result = await uploadAndAnalyze(currentFile, jdToUse, () => {});
      setCurrentResult(result);
      if (newJD) setCurrentJD(newJD);
      setAiEvaluation(null);
      setAiError(null);
      refreshHistory();
    } catch (e: any) {
      setRescanError(e.message || "Rescan failed");
    } finally {
      setIsRescanning(false);
    }
  }, [currentFile, currentJD]);

  const handleRunAI = useCallback(async () => {
    if (!currentResult) return;
    const resumeText = currentResult.resume_preview;
    const jdText = currentResult.jd_preview;
    if (!resumeText || !jdText) {
      setAiError("Resume or job description text is missing from the scan result.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const evaluation = await runAIEvaluation(resumeText, jdText);
      if (evaluation.error) throw new Error(evaluation.error);
      setAiEvaluation(evaluation as AIEvaluation);
    } catch (e: any) {
      setAiError(e.message || "AI evaluation failed");
    } finally {
      setAiLoading(false);
    }
  }, [currentResult]);

  const handleViewHistoryItem = (result: AnalysisResult) => {
    setCurrentResult(result);
    setCurrentJD(result.jd_preview || "");
    setAiEvaluation(null);
    setAiError(null);
    setActiveView("results");
  };

  const handleCompare = (result: any) => {
    setCompareResult(result);
    setActiveView("compare");
  };

  const handleNewScan = () => {
    setActiveView("upload");
    setCurrentFile(null);
    setCurrentJD("");
    setCurrentResult(null);
    setAiEvaluation(null);
    setAiError(null);
  };

  return (
    <Layout
      activeView={activeView}
      onViewChange={setActiveView}
      hasResult={!!currentResult}
      theme={theme}
      onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
    >
      {activeView === "upload" && (
        <UploadPanel
          onAnalysisComplete={handleAnalysisComplete}
          initialJD={currentJD}
        />
      )}

      {activeView === "results" && currentResult && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <aside className="w-full lg:w-72 lg:sticky lg:top-20 shrink-0 space-y-5">
            <SidebarScore
              result={currentResult}
              onNewScan={handleNewScan}
              onRescan={() => handleRescan()}
              isRescanning={isRescanning}
              rescanError={rescanError}
            />
            <AIVerdict
              evaluation={aiEvaluation}
              isLoading={aiLoading}
              error={aiError}
              onRun={handleRunAI}
            />
          </aside>
          <div className="flex-1 min-w-0 space-y-5">
            <TextHighlighter
              result={currentResult}
              currentJD={currentJD}
              onRescanWithNewJD={handleRescan}
              isRescanning={isRescanning}
            />
            <KeywordAnalysis keywords={currentResult.keywords} />
            <SectionDetailReport
              sections={currentResult.sections}
              keywords={currentResult.keywords}
              feedback={currentResult.feedback}
            />
            <FeedbackPanel feedback={currentResult.feedback} />
            <FormatChecker formatting={currentResult.formatting} />
            <ActionVerbPanel actionVerbs={currentResult.action_verbs} />
          </div>
        </div>
      )}

      {activeView === "results" && !currentResult && (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-4">
          <p className="text-lg">No analysis result yet.</p>
          <button
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
            onClick={() => setActiveView("upload")}
          >
            Upload a Resume
          </button>
        </div>
      )}

      {activeView === "history" && (
        <HistoryPanel
          history={history}
          onViewItem={handleViewHistoryItem}
          onCompare={handleCompare}
        />
      )}

      {activeView === "compare" && compareResult && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-xl font-bold text-foreground mb-5">Resume Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {[compareResult.scan_1, compareResult.scan_2].map((scan: any, i: number) => (
              <div key={i} className="border border-border rounded-xl p-5 bg-muted/30">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  Version {i + 1}
                </p>
                <p className="font-semibold text-foreground truncate">{scan.filename}</p>
                <p className="text-4xl font-bold mt-2" style={{ color: scan.overall_score >= 75 ? "#10b981" : scan.overall_score >= 50 ? "#f59e0b" : "#ef4444" }}>
                  {scan.overall_score}
                </p>
                <p className="text-muted-foreground text-sm">{scan.letter_grade} grade</p>
              </div>
            ))}
          </div>
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-foreground text-sm mb-3">Score Changes</p>
            {Object.entries(compareResult.delta || {}).map(([key, val]: [string, any]) => (
              <div key={key} className="flex justify-between items-center py-1 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                <span className={`text-sm font-bold ${val > 0 ? "text-emerald-500" : val < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                  {val > 0 ? "+" : ""}{typeof val === "number" ? val.toFixed(1) : val}
                </span>
              </div>
            ))}
          </div>
          {compareResult.summary && (
            <p className="mt-4 text-foreground text-sm leading-relaxed bg-primary/10 border border-primary/20 rounded-xl p-3">
              {compareResult.summary}
            </p>
          )}
        </div>
      )}
    </Layout>
  );
}
