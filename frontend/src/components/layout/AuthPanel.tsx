import { useState } from "react";
import { Github, Mail, ArrowRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function AuthPanel({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1200);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
      {/* Premium background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-emerald-500 rounded-2xl shadow-lg shadow-primary/25 mb-4 transform hover:scale-105 transition-transform">
            <Zap className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-4xl font-black tracking-tight text-foreground">
          ATS Resume Checker
        </h2>
        <p className="mt-3 text-center text-muted-foreground text-lg">
          Outsmart the ATS. Land the interview.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px] relative z-10">
        <div className="bg-card/70 backdrop-blur-xl py-10 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:rounded-3xl sm:px-12 border border-white/10 dark:border-white/5">
          <div className="space-y-6">
            <div>
              <button 
                onClick={handleMockLogin}
                className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-border rounded-xl shadow-sm bg-card text-sm font-semibold text-foreground hover:bg-muted focus:outline-none transition-all hover:scale-[1.02]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>
            <div>
              <button 
                onClick={handleMockLogin}
                className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-border rounded-xl shadow-sm bg-card text-sm font-semibold text-foreground hover:bg-muted focus:outline-none transition-all hover:scale-[1.02]"
              >
                <Github className="h-5 w-5" />
                Continue with GitHub
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleMockLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 sm:text-sm bg-background border border-border rounded-xl py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-primary/20 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
              >
                {isLoading ? "Authenticating..." : "Sign in / Register"}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>

        {/* Value props */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground leading-tight">Compare your resume against real ATS parsers</span>
          </div>
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground leading-tight">Private & secure — your data stays yours</span>
          </div>
        </div>
      </div>
    </div>
  );
}
