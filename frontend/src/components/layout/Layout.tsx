import { View, Theme } from "../../App";
import { Home, FileText, History, PlusCircle, Sun, Moon, User, Settings, LogOut, ShieldCheck, Zap, Menu, X } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  activeView: View;
  onViewChange: (view: View) => void;
  hasResult: boolean;
  children: React.ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
}

const sidebarIcons = [
  { id: "upload" as View, label: "New Scan", icon: PlusCircle, accent: true },
  { id: "upload" as View, label: "Home", icon: Home },
  { id: "results" as View, label: "Results", icon: FileText },
  { id: "history" as View, label: "History", icon: History },
];

export default function Layout({ activeView, onViewChange, hasResult, children, theme, onToggleTheme }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-background text-foreground flex ${theme === "dark" ? "" : "light"}`}>
      {/* Left Icon Sidebar — Desktop */}
      <aside className="hidden lg:flex flex-col w-14 bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="flex items-center justify-center h-14 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-400 shadow-sm shadow-primary/20">
            <Zap className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Nav Icons */}
        <nav className="flex-1 flex flex-col items-center py-4 gap-1">
          {sidebarIcons.map(({ id, label, icon: Icon, accent }, i) => {
            if (i === 0) {
              // New Scan button (accent)
              return (
                <button
                  key="new-scan"
                  onClick={() => onViewChange("upload")}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-md shadow-primary/20 mb-3"
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            }
            const disabled = id === "results" && !hasResult;
            return (
              <button
                key={`${id}-${i}`}
                onClick={() => !disabled && onViewChange(id)}
                disabled={disabled}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                  activeView === id
                    ? "bg-sidebar-accent text-foreground"
                    : disabled
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                }`}
                title={label}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col items-center py-4 gap-2 border-t border-sidebar-border">
          <button
            onClick={onToggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
            title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-400">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-foreground">ATS Checker <span className="text-primary font-black">PRO</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 bg-card h-full border-r border-border p-4 pt-16" onClick={e => e.stopPropagation()}>
            <nav className="space-y-1">
              {sidebarIcons.slice(1).map(({ id, label, icon: Icon }, i) => {
                const disabled = id === "results" && !hasResult;
                return (
                  <button
                    key={`mobile-${id}-${i}`}
                    onClick={() => { if (!disabled) { onViewChange(id); setMobileMenuOpen(false); } }}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      activeView === id
                        ? "bg-primary/10 text-primary"
                        : disabled
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-6 pt-4 border-t border-border space-y-1">
              <button
                onClick={() => { onViewChange("upload"); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
              >
                <PlusCircle className="h-5 w-5" />
                New Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-14 min-h-screen pt-14 lg:pt-0">
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
