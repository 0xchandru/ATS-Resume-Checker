import React, { useState, useEffect } from "react";
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
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            Smart Resume Editor
          </h2>
          <p className="text-muted-foreground text-sm">
            Use AI to naturally weave missing keywords into your existing experience.
          </p>
        </div>
        <button 
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Key className="w-3 h-3" /> API Key
        </button>
      </div>

      {showKeyInput && (
        <div className="bg-card border rounded-lg p-4 flex gap-3 items-center">
          <Key className="w-4 h-4 text-muted-foreground" />
          <input 
            type="password"
            placeholder="OpenAI API Key (sk-...)"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none"
          />
          <button 
            onClick={() => saveKey(apiKey)}
            className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-md font-medium"
          >
            Save
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Missing Skills Sidebar */}
        <div className="bg-card border rounded-xl overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">1. Select a missing skill</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {missingSkills.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No missing skills! 🎉</p>
            ) : (
              <div className="flex flex-wrap gap-2 p-2">
                {missingSkills.map(skill => (
                  <button
                    key={skill}
                    onClick={() => setSelectedSkill(skill)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
                      selectedSkill === skill 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : "bg-background hover:bg-muted border-border"
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
        <div className="md:col-span-2 bg-card border rounded-xl overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">2. Select a bullet point to rewrite</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {bullets.map((b, i) => (
              <div 
                key={i}
                onClick={() => setSelectedBullet(b)}
                className={`p-3 text-sm rounded-lg border cursor-pointer transition-colors ${
                  selectedBullet === b 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                }`}
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Modal/Panel */}
      {selectedBullet && selectedSkill && (
        <div className="bg-gradient-to-r from-primary/10 to-indigo-500/10 border border-primary/20 p-6 rounded-xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> Optimizing Bullet Point
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Original</p>
                  <p className="text-sm bg-background/50 p-3 rounded border text-muted-foreground">{selectedBullet}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-primary uppercase tracking-wider font-semibold flex items-center justify-between">
                    <span>AI Suggestion</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">Adding: {selectedSkill}</span>
                  </p>
                  <div className="text-sm bg-background p-3 rounded border border-primary/30 min-h-[4.5rem]">
                    {isOptimizing ? (
                      <span className="flex items-center gap-2 text-muted-foreground h-full">
                        <Loader2 className="w-4 h-4 animate-spin" /> 
                        Generating perfect rewrite...
                      </span>
                    ) : optimizedText ? (
                      <span className="text-foreground">{optimizedText}</span>
                    ) : error ? (
                      <span className="text-destructive">{error}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Click optimize to generate...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => { setSelectedBullet(""); setOptimizedText(""); }}
              className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted"
            >
              Cancel
            </button>
            <button 
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
            >
              {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {optimizedText ? "Regenerate" : "Optimize with AI"}
            </button>
            {optimizedText && (
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(optimizedText);
                  // Optional: add a tiny notification toast here
                }}
                className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
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
