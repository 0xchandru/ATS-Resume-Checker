import { View, Theme } from "../App";
import { FileText, BarChart3, History, Zap, Sun, Moon } from "lucide-react";

interface LayoutProps {
  activeView: View;
  onViewChange: (view: View) => void;
  hasResult: boolean;
  children: React.ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
}

const navItems = [
  { id: "upload" as View, label: "Scan", icon: FileText },
  { id: "results" as View, label: "Results", icon: BarChart3 },
  { id: "history" as View, label: "History", icon: History },
];

export default function Layout({ activeView, onViewChange, hasResult, children, theme, onToggleTheme }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="bg-primary rounded-lg p-1.5 shadow-sm">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground leading-none">ATS Resume Checker</h1>
                <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">ESCO · O*NET · 5-Layer AI</p>
              </div>
            </div>

            {/* Nav + theme toggle */}
            <div className="flex items-center gap-1">
              <nav className="flex items-center gap-0.5">
                {navItems.map(({ id, label, icon: Icon }) => {
                  const disabled = id === "results" && !hasResult;
                  return (
                    <button
                      key={id}
                      onClick={() => !disabled && onViewChange(id)}
                      disabled={disabled}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeView === id
                          ? "bg-primary/15 text-primary"
                          : disabled
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="w-px h-5 bg-border mx-1" />

              <button
                onClick={onToggleTheme}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark"
                  ? <Sun className="h-4 w-4" />
                  : <Moon className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
