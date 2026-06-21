import { Zap, LogOut, User, Settings, ShieldCheck } from "lucide-react";
import { Theme } from "../../App";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export default function TopNav({ theme, onToggleTheme, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-500 shadow-sm">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg hidden sm:inline-block text-foreground tracking-tight">
            ATS Checker <span className="text-primary font-black">PRO</span>
          </span>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium">
          <a href="#" className="text-foreground transition-colors hover:text-primary">Dashboard</a>
          <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">Jobs</a>
          <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">Resumes</a>
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            title="Toggle Theme"
          >
            {theme === "dark" ? "🌞" : "🌙"}
          </button>
          
          <div className="h-8 w-px bg-border mx-1" />

          <div className="flex items-center gap-3 group relative cursor-pointer">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-sm font-bold text-foreground leading-none">Demo User</span>
              <span className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <ShieldCheck className="h-3 w-3" /> Pro Plan
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/20 to-emerald-500/20 border-2 border-primary/30 flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm">
              DU
            </div>
            
            {/* Simple dropdown hover */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#13141f] border border-white/[0.08] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right backdrop-blur-xl">
              <div className="p-2 space-y-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-white/[0.06] rounded-lg transition-colors">
                  <User className="h-4 w-4 text-muted-foreground" /> Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-white/[0.06] rounded-lg transition-colors">
                  <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                </button>
                <div className="h-px bg-white/[0.06] my-1" />
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
