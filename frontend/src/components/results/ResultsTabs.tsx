import { Printer, Bookmark } from "lucide-react";

interface Props {
  activeTab: "report" | "job_description";
  onTabChange: (tab: "report" | "job_description") => void;
  onPrint?: () => void;
}

export default function ResultsTabs({ activeTab, onTabChange, onPrint }: Props) {
  return (
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
  );
}
