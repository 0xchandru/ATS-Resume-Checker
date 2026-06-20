import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import UploadPanel from "./components/UploadPanel";
import ScoreDashboard from "./components/ScoreDashboard";
import KeywordAnalysis from "./components/KeywordAnalysis";
import CareerIntelligence from "./components/CareerIntelligence";
import FormatChecker from "./components/FormatChecker";
import SectionAnalysis from "./components/SectionAnalysis";
import ActionVerbPanel from "./components/ActionVerbPanel";
import FeedbackPanel from "./components/FeedbackPanel";
import SkillPrediction from "./components/SkillPrediction";
import CybersecurityPanel from "./components/CybersecurityPanel";
import HistoryPanel from "./components/HistoryPanel";
import ExportReport from "./components/ExportReport";
import { getHistory } from "./utils/api";

export type View = "upload" | "results" | "history" | "compare";

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
  const [history, setHistory] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<View>("upload");
  const [compareResult, setCompareResult] = useState<any | null>(null);

  useEffect(() => {
    refreshHistory();
  }, []);

  const refreshHistory = async () => {
    try {
      const h = await getHistory();
      setHistory(h);
    } catch {
      // history unavailable on first load
    }
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setCurrentResult(result);
    setActiveView("results");
    refreshHistory();
  };

  const handleViewHistoryItem = (result: AnalysisResult) => {
    setCurrentResult(result);
    setActiveView("results");
  };

  const handleCompare = (result: any) => {
    setCompareResult(result);
    setActiveView("compare");
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView} hasResult={!!currentResult}>
      {activeView === "upload" && (
        <UploadPanel onAnalysisComplete={handleAnalysisComplete} />
      )}

      {activeView === "results" && currentResult && (
        <div className="space-y-6">
          <ScoreDashboard result={currentResult} />
          <FeedbackPanel feedback={currentResult.feedback} />
          <KeywordAnalysis keywords={currentResult.keywords} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionAnalysis sections={currentResult.sections} />
            <FormatChecker formatting={currentResult.formatting} />
          </div>
          <ActionVerbPanel actionVerbs={currentResult.action_verbs} />
          <CareerIntelligence career={currentResult.career_intelligence} />
          <SkillPrediction prediction={currentResult.skill_prediction} />
          {currentResult.cybersecurity_analysis && (
            <CybersecurityPanel cyber={currentResult.cybersecurity_analysis} />
          )}
          <ExportReport result={currentResult} />
        </div>
      )}

      {activeView === "results" && !currentResult && (
        <div className="flex flex-col items-center justify-center h-96 text-slate-500">
          <p className="text-lg">No analysis result yet.</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Resume Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {[compareResult.scan_1, compareResult.scan_2].map((scan: any, i: number) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4">
                  <p className="text-sm text-slate-500">{i === 0 ? "Version 1" : "Version 2"}</p>
                  <p className="font-semibold text-slate-900 truncate">{scan.filename}</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: scan.overall_score >= 75 ? "#10b981" : scan.overall_score >= 50 ? "#f59e0b" : "#ef4444" }}>
                    {scan.overall_score}
                  </p>
                  <p className="text-slate-500 text-sm">{scan.letter_grade} grade</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-semibold text-slate-700 mb-3">Score Changes</p>
              {Object.entries(compareResult.delta || {}).map(([key, val]: [string, any]) => (
                <div key={key} className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-600">{key.replace(/_/g, " ")}</span>
                  <span className={`text-sm font-semibold ${val > 0 ? "text-emerald-600" : val < 0 ? "text-red-600" : "text-slate-500"}`}>
                    {val > 0 ? "+" : ""}{val}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-slate-700 font-medium">{compareResult.summary}</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
