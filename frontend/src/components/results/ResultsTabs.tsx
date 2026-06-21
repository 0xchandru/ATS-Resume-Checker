import { Printer, Bookmark, Sparkles } from "lucide-react";
import SmartEditorTab from "../editor/SmartEditorTab";

interface Props {
  activeTab: "report" | "job_description" | "skills_matrix" | "smart_editor" | "cover_letter" | "resume_preview";
  onTabChange: (tab: "report" | "job_description" | "skills_matrix" | "smart_editor" | "cover_letter" | "resume_preview") => void;
  onPrint?: () => void;
  analysis?: any;
  jd?: string;
}

export default function ResultsTabs({ activeTab, onTabChange, onPrint, analysis, jd }: Props) {
  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between border-b border-border bg-card rounded-t-2xl">
        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => onTabChange("report")}
            className={`px-6 py-3.5 text-sm font-semibold transition-colors relative ${
              activeTab === "report"
                ? "text-foreground tab-active"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Resume Report
          </button>
          <button
            onClick={() => onTabChange("job_description")}
            className={`px-6 py-3.5 text-sm font-semibold transition-colors relative ${
              activeTab === "job_description"
                ? "text-foreground tab-active"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Job Description
          </button>
          <button
            onClick={() => onTabChange("skills_matrix")}
            className={`px-6 py-3.5 text-sm font-semibold transition-colors relative ${
              activeTab === "skills_matrix"
                ? "text-foreground tab-active"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Skills Matrix
          </button>
          <button
            onClick={() => onTabChange("cover_letter")}
            className={`px-6 py-3.5 text-sm font-semibold transition-colors relative ${
              activeTab === "cover_letter"
                ? "text-foreground tab-active"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cover Letter
          </button>
          <button
            onClick={() => onTabChange("resume_preview")}
            className={`px-6 py-3.5 text-sm font-semibold transition-colors relative ${
              activeTab === "resume_preview"
                ? "text-foreground tab-active"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Resume Preview
          </button>
          <button
            onClick={() => onTabChange("smart_editor")}
            className={`px-6 py-3.5 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
              activeTab === "smart_editor"
                ? "text-foreground tab-active"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Smart Editor
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 pr-3">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Track
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>
      
      {activeTab === "smart_editor" && (
        <SmartEditorTab analysis={analysis} jd={jd || ""} />
      )}
    </div>
  );
}
