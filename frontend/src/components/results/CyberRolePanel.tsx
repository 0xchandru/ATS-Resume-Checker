import { Shield, ShieldCheck, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Layers, Award, Wrench, BookOpen } from "lucide-react";
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
    seniority_leniency?: number;
  };
  soc_tier?: string | null;
  soc_tier_display?: string | null;
  soc_tier_description?: string | null;
  soc_tier_key_certs?: string[];
  soc_tier_key_tools?: string[];
  soc_tier_key_skills?: string[];
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

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  trainee: {
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/25",
    text: "text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  },
  l1: {
    bg: "bg-blue-500/8",
    border: "border-blue-500/25",
    text: "text-blue-300",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  },
  l2: {
    bg: "bg-violet-500/8",
    border: "border-violet-500/25",
    text: "text-violet-300",
    badge: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  },
  l3: {
    bg: "bg-amber-500/8",
    border: "border-amber-500/25",
    text: "text-amber-300",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  },
};

function TierBadge({ tier, display }: { tier: string; display: string }) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.l1;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${colors.badge}`}>
      {display.split(" / ")[0].replace("SOC Analyst ", "").toUpperCase()}
    </span>
  );
}

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
    scoring_modifiers,
    soc_tier,
    soc_tier_display,
    soc_tier_description,
    soc_tier_key_certs = [],
    soc_tier_key_tools = [],
    soc_tier_key_skills = [],
  } = cyberDetection;

  const icon = ROLE_ICONS[role_type] || "🔒";
  const confidencePct = Math.round(confidence * 100);
  const allToolSignals = detected_signals?.tool_signals || [];
  const allCertSignals = detected_signals?.cert_signals || [];
  const allKwSignals = detected_signals?.keyword_signals?.slice(0, 6) || [];

  const matchedCerts = certifications?.matched || [];
  const missingCerts = certifications?.missing?.slice(0, 4) || [];

  const tierColors = soc_tier ? (TIER_COLORS[soc_tier] || TIER_COLORS.l1) : null;
  const leniencyPct = scoring_modifiers?.seniority_leniency
    ? Math.round(scoring_modifiers.seniority_leniency * 100)
    : 0;

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
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs font-bold text-cyan-300">{role_display} Role Detected</p>
              {soc_tier && soc_tier_display && (
                <TierBadge tier={soc_tier} display={soc_tier_display} />
              )}
              {!soc_tier && is_junior_role && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  ENTRY LEVEL
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
              {soc_tier ? soc_tier_description : role_description}
            </p>
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
            <div className="px-4 pb-4 space-y-3.5 border-t border-cyan-500/10 pt-3">

              {/* SOC Tier Roadmap */}
              {soc_tier && soc_tier_display && tierColors && (
                <div className={`rounded-lg ${tierColors.bg} border ${tierColors.border} px-3 py-2.5`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Layers className={`h-3 w-3 ${tierColors.text}`} />
                    <p className={`text-[10px] font-bold ${tierColors.text}`}>
                      {soc_tier_display}
                    </p>
                  </div>

                  {soc_tier_key_certs.length > 0 && (
                    <div className="mb-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Award className="h-2.5 w-2.5 text-muted-foreground" />
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Target Certs for This Tier</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {soc_tier_key_certs.slice(0, 4).map(cert => (
                          <span key={cert} className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-foreground/70">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {soc_tier_key_tools.length > 0 && (
                    <div className="mb-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Wrench className="h-2.5 w-2.5 text-muted-foreground" />
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Key Tools</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {soc_tier_key_tools.slice(0, 4).map(tool => (
                          <span key={tool} className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {soc_tier_key_skills.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <BookOpen className="h-2.5 w-2.5 text-muted-foreground" />
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Core Skills</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {soc_tier_key_skills.slice(0, 4).map(skill => (
                          <span key={skill} className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Detected JD Signals */}
              {(allToolSignals.length > 0 || allCertSignals.length > 0 || allKwSignals.length > 0) && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-400 mb-2">
                    JD Signals Detected
                  </p>
                  <div className="space-y-1.5">
                    {allToolSignals.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-start">
                        <span className="text-[9px] text-muted-foreground mr-1 mt-0.5 shrink-0">Tools:</span>
                        {allToolSignals.slice(0, 6).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {allCertSignals.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-start">
                        <span className="text-[9px] text-muted-foreground mr-1 mt-0.5 shrink-0">Certs:</span>
                        {allCertSignals.slice(0, 4).map(c => (
                          <span key={c} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    {allKwSignals.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-start">
                        <span className="text-[9px] text-muted-foreground mr-1 mt-0.5 shrink-0">Keywords:</span>
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
                    {resume_cyber_signals.slice(0, 10).map(t => (
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

              {/* Score notes */}
              <div className="rounded-lg bg-cyan-500/8 border border-cyan-500/15 px-3 py-2 space-y-1">
                {(scoring_modifiers?.cert_bonus_multiplier ?? 1) > 1 && (
                  <p className="text-[10px] text-cyan-300 leading-snug">
                    <Shield className="h-3 w-3 inline mr-1 mb-0.5" />
                    Certifications are weighted{" "}
                    <strong>{scoring_modifiers!.cert_bonus_multiplier}×</strong> for this role.
                  </p>
                )}
                {leniencyPct > 0 && (
                  <p className="text-[10px] text-emerald-300 leading-snug">
                    <CheckCircle2 className="h-3 w-3 inline mr-1 mb-0.5" />
                    Entry-level leniency: scoring is adjusted <strong>+{leniencyPct}%</strong> toward the ceiling for your tier.
                  </p>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
