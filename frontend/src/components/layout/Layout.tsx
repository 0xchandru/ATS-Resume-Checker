import { View, Theme } from "../../App";
import { Home, FileText, History, PlusCircle, Sun, Moon, Zap, Menu, X } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  activeView: View;
  onViewChange: (view: View) => void;
  hasResult: boolean;
  children: React.ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
}

const navItems = [
  { id: "upload" as View, label: "New Scan", icon: PlusCircle, accent: true },
  { id: "home" as View, label: "Home", icon: Home },
  { id: "results" as View, label: "Results", icon: FileText },
  { id: "history" as View, label: "History", icon: History },
];

export default function Layout({ activeView, onViewChange, hasResult, children, theme, onToggleTheme }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-background text-foreground flex ${theme === "light" ? "light" : ""}`}>
      {/* Radial violet glow at top */}
      <div className="fixed inset-0 pointer-events-none radial-glow z-0" />

      {/* Left Icon Sidebar — Desktop */}
      <aside className="hidden lg:flex flex-col w-14 fixed inset-y-0 left-0 z-40 border-r border-white/[0.06] bg-sidebar">
        {/* Logo */}
        <div className="flex items-center justify-center h-14 border-b border-white/[0.06]">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/30">
            <Zap className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Nav Icons */}
        <nav className="flex-1 flex flex-col items-center py-4 gap-1">
          {navItems.map(({ id, label, icon: Icon }, i) => {
            if (i === 0) {
              return (
                <button
                  key="new-scan"
                  onClick={() => onViewChange("upload")}
                  data-testid="btn-new-scan"
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white hover:opacity-90 transition-all shadow-lg shadow-violet-500/25 mb-3"
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            }
            const disabled = id === "results" && !hasResult;
            const highlighted = activeView === id;

            return (
              <button
                key={`${id}-${i}`}
                onClick={() => !disabled && onViewChange(id)}
                disabled={disabled}
                data-testid={`btn-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                  highlighted
                    ? "bg-violet-600/20 text-violet-400"
                    : disabled
                    ? "text-muted-foreground/25 cursor-not-allowed"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                }`}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </nav>

        {/* Bottom — theme toggle */}
        <div className="flex flex-col items-center py-4 gap-2 border-t border-white/[0.06]">
          <button
            onClick={onToggleTheme}
            data-testid="btn-theme-toggle"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
            title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -ml-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            data-testid="btn-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">ATS<span className="text-violet-400">Optimize</span></span>
          </div>
        </div>
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground"
          data-testid="btn-mobile-theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-64 bg-card h-full border-r border-white/[0.06] p-4 pt-16"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { onViewChange("upload"); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-500 text-white rounded-xl text-sm font-bold mb-4 shadow-lg shadow-violet-500/20"
            >
              <PlusCircle className="h-5 w-5" />
              New Scan
            </button>
            <nav className="space-y-1">
              {navItems.slice(1).map(({ id, label, icon: Icon }, i) => {
                const disabled = id === "results" && !hasResult;
                return (
                  <button
                    key={`mobile-${id}-${i}`}
                    onClick={() => { if (!disabled) { onViewChange(id); setMobileMenuOpen(false); } }}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeView === id
                        ? "bg-violet-600/15 text-violet-400"
                        : disabled
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-14 min-h-screen pt-14 lg:pt-0 relative z-10">
        {activeView === "upload" ? (
          <div className="h-[calc(100vh-3.5rem)] lg:h-screen">
            {children}
          </div>
        ) : (
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
