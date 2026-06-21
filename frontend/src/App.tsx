import { useState, useEffect, useCallback } from "react";
import Layout from "./components/Layout";
import UploadPanel from "./components/UploadPanel";
import ScanModal from "./components/ScanModal";
import ResultsSidebar from "./components/ResultsSidebar";
import ResultsTabs from "./components/ResultsTabs";
import SearchabilitySection from "./components/SearchabilitySection";
import HardSkillsSection from "./components/HardSkillsSection";
import SoftSkillsSection from "./components/SoftSkillsSection";
import RecruiterTipsSection from "./components/RecruiterTipsSection";
import FormattingSection from "./components/FormattingSection";
import JobDescriptionTab from "./components/JobDescriptionTab";
import AIVerdict, { type AIEvaluation } from "./components/AIVerdict";
import HistoryPanel from "./components/HistoryPanel";
import AuthPanel from "./components/AuthPanel";
import { getHistory, uploadAndAnalyze, runAIEvaluation } from "./utils/api";

export type View = "upload" | "results" | "history" | "compare";
export type Theme = "dark" | "light";

export interface CategoryScore {
  score: number;
  issues_to_fix: number;
  [key: string]: any;
}

export interface AnalysisResult {
  scan_id: string;
  filename: string;
  file_type: string;
  timestamp: string;
  processing_time_seconds: number;
  overall_score: number;
  letter_grade: string;
  sub_scores: Record<string, any>;
  category_scores?: {
    searchability: CategoryScore;
    hard_skills: CategoryScore;
    soft_skills: CategoryScore;
    recruiter_tips: CategoryScore;
    formatting: CategoryScore;
  };
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanError, setRescanError] = useState("");
  const [resultsTab, setResultsTab] = useState<"report" | "job_description">("report");
  const [showScanModal, setShowScanModal] = useState(false);

  const [aiEvaluation, setAiEvaluation] = useState<AIEvaluation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("ats-theme", theme);
  }, [theme]);

  useEffect(() => { refreshHistory(); }, []);

  const refreshHistory = async () => {
    try { setHistory(await getHistory()); } catch { }
  };

  const handleAnalysisComplete = (result: AnalysisResult, file: File, jd: string, _scanName?: string) => {
    setCurrentResult(result);
    setCurrentFile(file);
    setCurrentJD(jd);
    setAiEvaluation(null);
    setAiError(null);
    setResultsTab("report");
    setShowScanModal(false);
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
    setResultsTab("report");
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

  const handleScrollToCategory = (category: string) => {
    const el = document.getElementById(category);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!isAuthenticated) {
    return (
      <div className={theme === "dark" ? "dark" : "light"}>
        <div className="min-h-screen bg-background">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-sm"
            >
              {theme === "dark" ? "🌞" : "🌙"}
            </button>
          </div>
          <AuthPanel onLogin={() => setIsAuthenticated(true)} />
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeView={activeView}
      onViewChange={setActiveView}
      hasResult={!!currentResult}
      theme={theme}
      onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
      onLogout={() => setIsAuthenticated(false)}
    >
      {activeView === "upload" && (
        <UploadPanel
          onAnalysisComplete={handleAnalysisComplete}
          initialJD={currentJD}
        />
      )}

      {activeView === "results" && currentResult && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Sidebar — Jobscan style */}
          <aside className="w-full lg:w-64 lg:sticky lg:top-6 shrink-0">
            <ResultsSidebar
              result={currentResult}
              onNewScan={handleNewScan}
              onRescan={() => setShowScanModal(true)}
              isRescanning={isRescanning}
              rescanError={rescanError}
              onRunAI={handleRunAI}
              aiLoading={aiLoading}
              onScrollToCategory={handleScrollToCategory}
            />
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <ResultsTabs
              activeTab={resultsTab}
              onTabChange={setResultsTab}
              onPrint={() => window.print()}
            />

            {/* Tab Content */}
            <div className="bg-card rounded-b-2xl border border-t-0 border-border shadow-sm">
              {resultsTab === "report" && (
                <div className="p-6 space-y-10">
                  {/* ATS Tips Banner */}
                  <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20">
                        <span className="text-amber-500 text-lg">⚡</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">ATS-Specific Tips</p>
                        <p className="text-xs text-muted-foreground">
                          Analyzed in {currentResult.processing_time_seconds?.toFixed(1)}s with 5-layer AI pipeline
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Searchability */}
                  <SearchabilitySection result={currentResult} />

                  {/* Divider */}
                  <hr className="border-border" />

                  {/* Hard Skills */}
                  <HardSkillsSection
                    keywords={currentResult.keywords}
                    resumeText={currentResult.resume_preview}
                    jdText={currentResult.jd_preview}
                  />

                  {/* Divider */}
                  <hr className="border-border" />

                  {/* Soft Skills */}
                  <SoftSkillsSection keywords={currentResult.keywords} />

                  {/* Divider */}
                  <hr className="border-border" />

                  {/* Recruiter Tips */}
                  <RecruiterTipsSection
                    feedback={currentResult.feedback}
                    actionVerbs={currentResult.action_verbs}
                    formatting={currentResult.formatting}
                    subScores={currentResult.sub_scores}
                  />

                  {/* Divider */}
                  <hr className="border-border" />

                  {/* Formatting */}
                  <FormattingSection formatting={currentResult.formatting} />

                  {/* AI Verdict (below formatting) */}
                  {(aiEvaluation || aiLoading || aiError) && (
                    <>
                      <hr className="border-border" />
                      <AIVerdict
                        evaluation={aiEvaluation}
                        isLoading={aiLoading}
                        error={aiError}
                        onRun={handleRunAI}
                      />
                    </>
                  )}
                </div>
              )}

              {resultsTab === "job_description" && (
                <JobDescriptionTab
                  jdText={currentResult.jd_preview || currentJD}
                  keywords={currentResult.keywords}
                  onRescanWithNewJD={handleRescan}
                  isRescanning={isRescanning}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {activeView === "results" && !currentResult && (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-4">
          <p className="text-lg">No analysis result yet.</p>
          <button
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110 transition-all"
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

      {/* ── Scan Modal overlay — shown when "Upload & Rescan" is clicked ── */}
      <ScanModal
        open={showScanModal}
        onClose={() => setShowScanModal(false)}
        onAnalysisComplete={handleAnalysisComplete}
        initialJD={currentJD}
      />

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
