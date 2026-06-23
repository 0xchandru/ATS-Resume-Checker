import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CyberDetection {
  is_cyber: boolean;
  confidence: number;
  role_type: string;
  role_display: string;
  role_description: string;
  is_junior_role: boolean;
  detected_signals?: {
    title_match: boolean;
    tool_signals: string[];
    cert_signals: string[];
    keyword_signals: string[];
  };
  resume_cyber_signals?: string[];
  scoring_modifiers?: {
    cert_bonus_multiplier: number;
  };
}

interface Props {
  cyberDetection: CyberDetection;
  certifications?: {
    matched?: Array<{ name: string; tier?: string }>;
    missing?: Array<{ name: string; importance?: string }>;
  };
}

const ROLE_ICONS: Record<string, string> = {
  soc_analyst: "🛡️",
  pen_tester: "⚔️",
  grc_analyst: "📋",
  threat_intel: "🔭",
  cloud_security: "☁️",
  forensics: "🔬",
  siem_engineer: "📊",
  blue_team: "🔵",
  security_engineer: "⚙️",
  general_security: "🔒",
};

export default function CyberRolePanel({ cyberDetection, certifications }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!cyberDetection?.is_cyber) return null;

  const {
    role_type,
    role_display,
    role_description,
    confidence,
    is_junior_role,
    detected_signals,
    resume_cyber_signals = [],
  } = cyberDetection;

  const icon = ROLE_ICONS[role_type] || "🔒";
  const confidencePct = Math.round(confidence * 100);
  const allToolSignals = detected_signals?.tool_signals || [];
  const allCertSignals = detected_signals?.cert_signals || [];
  const allKwSignals = detected_signals?.keyword_signals?.slice(0, 6) || [];

  const matchedCerts = certifications?.matched || [];
  const missingCerts = certifications?.missing?.slice(0, 4) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-sm shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-cyan-300">{role_display} Role Detected</p>
              {is_junior_role && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  ENTRY LEVEL
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{role_description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Confidence</p>
            <p className="text-xs font-bold text-cyan-400">{confidencePct}%</p>
          </div>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-cyan-500/10 pt-3">

              {/* Detected JD Signals */}
              {(allToolSignals.length > 0 || allCertSignals.length > 0 || allKwSignals.length > 0) && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-400 mb-2">
                    JD Signals Detected
                  </p>
                  <div className="space-y-1.5">
                    {allToolSignals.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] text-muted-foreground mr-1 mt-0.5">Tools:</span>
                        {allToolSignals.slice(0, 6).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {allCertSignals.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] text-muted-foreground mr-1 mt-0.5">Certs:</span>
                        {allCertSignals.slice(0, 4).map(c => (
                          <span key={c} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    {allKwSignals.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] text-muted-foreground mr-1 mt-0.5">Keywords:</span>
                        {allKwSignals.map(k => (
                          <span key={k} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resume Cyber Tools */}
              {resume_cyber_signals.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
                    Cyber Tools on Your Resume
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {resume_cyber_signals.slice(0, 8).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cert Status */}
              {(matchedCerts.length > 0 || missingCerts.length > 0) && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Certification Status
                  </p>
                  <div className="space-y-1">
                    {matchedCerts.slice(0, 3).map(c => (
                      <div key={c.name} className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                        <ShieldCheck className="h-3 w-3 shrink-0" />
                        <span>{c.name}</span>
                      </div>
                    ))}
                    {missingCerts.slice(0, 3).map(c => (
                      <div key={c.name} className="flex items-center gap-1.5 text-[10px] text-amber-400">
                        <ShieldAlert className="h-3 w-3 shrink-0" />
                        <span>{c.name} <span className="text-muted-foreground">(missing)</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cert Boost Note */}
              {(cyberDetection.scoring_modifiers?.cert_bonus_multiplier ?? 1) > 1 && (
                <div className="rounded-lg bg-cyan-500/8 border border-cyan-500/15 px-3 py-2">
                  <p className="text-[10px] text-cyan-300 leading-snug">
                    <Shield className="h-3 w-3 inline mr-1 mb-0.5" />
                    Cyber role detected — certifications are weighted{" "}
                    <strong>{cyberDetection.scoring_modifiers!.cert_bonus_multiplier}×</strong> in your score.
                    Relevant certs have higher impact here than in general IT roles.
                  </p>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
