import { useState } from "react";
import { AnalysisResult } from "../../App";
import { Sparkles, Edit3, Key, Loader2, Check } from "lucide-react";
import { apiFetch } from "../../utils/api";

interface Props {
  analysis: AnalysisResult;
  jd: string;
}

export default function SmartEditorTab({ analysis, jd }: Props) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("openai_api_key") || "");
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem("openai_api_key"));

  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [selectedBullet, setSelectedBullet] = useState<string>("");

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedText, setOptimizedText] = useState("");
  const [error, setError] = useState("");

  const saveKey = (key: string) => {
    localStorage.setItem("openai_api_key", key);
    setApiKey(key);
    setShowKeyInput(false);
  };

  const missingSkills = [
    ...((analysis as any).hard_skills?.missing || []),
    ...((analysis as any).soft_skills?.missing || [])
  ].map(s => s.term);

  const bullets = (analysis.resume_full || "")
    .split(/\n/)
    .filter(b => b.trim().length > 10);

  const handleOptimize = async () => {
    if (!apiKey) { setShowKeyInput(true); return; }
    if (!selectedBullet || !selectedSkill) return;

    setIsOptimizing(true);
    setError("");
    setOptimizedText("");

    try {
      const res = await apiFetch("/editor/optimize_bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet_text: selectedBullet,
          missing_skill: selectedSkill,
          jd_context: jd.substring(0, 500),
          api_key: apiKey
        })
      });
      const data = await res.json();
      setOptimizedText(data.rewritten_bullet);
    } catch (err: any) {
      setError(err?.message || "Optimization failed. Check API key.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Smart Resume Editor
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Use AI to naturally weave missing keywords into your existing experience.
          </p>
        </div>
        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-lg"
        >
          <Key className="w-3.5 h-3.5" /> API Key
        </button>
      </div>

      {/* API Key panel */}
      {showKeyInput && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex gap-3 items-center">
          <Key className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="password"
            placeholder="OpenAI API Key (sk-...)"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={() => saveKey(apiKey)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Missing Skills */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-white/[0.05] bg-white/[0.02]">
            <h3 className="text-xs font-black text-foreground/60 uppercase tracking-wider">1. Select a missing skill</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {missingSkills.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No missing skills! 🎉</p>
            ) : (
              <div className="flex flex-wrap gap-2 p-1">
                {missingSkills.map(skill => (
                  <button
                    key={skill}
                    onClick={() => setSelectedSkill(skill)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                      selectedSkill === skill
                        ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white border-transparent shadow-md shadow-violet-500/20"
                        : "bg-white/[0.04] border-white/[0.07] text-muted-foreground hover:text-foreground hover:bg-white/[0.07]"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resume Bullets */}
        <div className="md:col-span-2 bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-white/[0.05] bg-white/[0.02]">
            <h3 className="text-xs font-black text-foreground/60 uppercase tracking-wider">2. Select a bullet point to rewrite</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {bullets.map((b, i) => (
              <div
                key={i}
                onClick={() => setSelectedBullet(b)}
                className={`p-3 text-sm rounded-xl border cursor-pointer transition-colors leading-relaxed ${
                  selectedBullet === b
                    ? "border-violet-500/40 bg-violet-500/8 text-foreground"
                    : "border-white/[0.05] bg-white/[0.01] text-foreground/70 hover:border-white/[0.1] hover:bg-white/[0.03]"
                }`}
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Panel */}
      {selectedBullet && selectedSkill && (
        <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/8 border border-violet-500/20 p-6 rounded-2xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-violet-400" /> Optimizing Bullet Point
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-black">Original</p>
                  <p className="text-sm bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl text-foreground/70 leading-relaxed">{selectedBullet}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest font-black text-violet-400 flex items-center justify-between">
                    <span>AI Suggestion</span>
                    <span className="bg-violet-500/15 border border-violet-500/25 text-violet-400 px-2 py-0.5 rounded-full text-[9px] font-black">Adding: {selectedSkill}</span>
                  </p>
                  <div className="text-sm bg-white/[0.02] border border-violet-500/25 p-3 rounded-xl min-h-[5rem] leading-relaxed">
                    {isOptimizing ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                        Generating perfect rewrite...
                      </span>
                    ) : optimizedText ? (
                      <span className="text-foreground/90">{optimizedText}</span>
                    ) : error ? (
                      <span className="text-red-400">{error}</span>
                    ) : (
                      <span className="text-muted-foreground/50 italic">Click optimize to generate...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              onClick={() => { setSelectedBullet(""); setOptimizedText(""); }}
              className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-white/[0.06] text-muted-foreground transition-colors border border-white/[0.06]"
            >
              Cancel
            </button>
            <button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white hover:opacity-90 flex items-center gap-2 disabled:opacity-50 transition-opacity shadow-md shadow-violet-500/20"
            >
              {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {optimizedText ? "Regenerate" : "Optimize with AI"}
            </button>
            {optimizedText && (
              <button
                onClick={() => { navigator.clipboard.writeText(optimizedText); }}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" /> Copy Rewrite
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
