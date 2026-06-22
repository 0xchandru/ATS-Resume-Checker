import { Printer, Download, Sparkles } from "lucide-react";
import SmartEditorTab from "../editor/SmartEditorTab";

type Tab = "report" | "job_description" | "skills_matrix" | "smart_editor" | "cover_letter" | "resume_preview";

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onPrint?: () => void;
  analysis?: any;
  jd?: string;
  scanId?: string;
  onResumeUpdate?: (resumeHtml: string, resumeText: string) => void;
  onScoreUpdate?: (scores: any) => void;
  onRescoringChange?: (v: boolean) => void;
}

const TABS: { id: Tab; label: string; icon?: any }[] = [
  { id: "report", label: "Resume Report" },
  { id: "job_description", label: "Job Description" },
  { id: "skills_matrix", label: "Skills Matrix" },
  { id: "cover_letter", label: "Cover Letter" },
  { id: "resume_preview", label: "Resume Preview" },
  { id: "smart_editor", label: "Smart Editor", icon: Sparkles },
];

export default function ResultsTabs({ activeTab, onTabChange, onPrint, analysis, jd, scanId, onResumeUpdate, onScoreUpdate, onRescoringChange }: Props) {
  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-card rounded-t-2xl overflow-x-auto">
        {/* Tabs */}
        <div className="flex shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              data-testid={`tab-${id}`}
              className={`px-5 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === id
                  ? "text-foreground tab-active"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 pr-3 shrink-0">
          <button
            onClick={onPrint}
            data-testid="btn-print"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      {activeTab === "smart_editor" && (
        <SmartEditorTab
          analysis={analysis}
          jd={jd || ""}
          scanId={scanId}
          onResumeUpdate={onResumeUpdate}
          onScoreUpdate={onScoreUpdate}
          onRescoringChange={onRescoringChange}
        />
      )}
    </div>
  );
}
