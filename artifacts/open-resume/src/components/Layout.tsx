import { View } from "../App";
import { FileText, BarChart3, History, GitCompare, Zap } from "lucide-react";

interface LayoutProps {
  activeView: View;
  onViewChange: (view: View) => void;
  hasResult: boolean;
  children: React.ReactNode;
}

const navItems = [
  { id: "upload" as View, label: "Upload", icon: FileText },
  { id: "results" as View, label: "Results", icon: BarChart3 },
  { id: "history" as View, label: "History", icon: History },
  { id: "compare" as View, label: "Compare", icon: GitCompare },
];

export default function Layout({ activeView, onViewChange, hasResult, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 rounded-lg p-1.5">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">ATS Resume Checker</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Powered by ESCO + O*NET</p>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map(({ id, label, icon: Icon }) => {
                const disabled = (id === "results" || id === "compare") && !hasResult && id !== "history";
                return (
                  <button
                    key={id}
                    onClick={() => !disabled && onViewChange(id)}
                    disabled={disabled}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeView === id
                        ? "bg-blue-50 text-blue-700"
                        : disabled
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
