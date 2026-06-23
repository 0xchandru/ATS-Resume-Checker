"""
Cybersecurity Role Intelligence Module

Detects whether a job description is cybersecurity-related, identifies the
specific cyber sub-role (SOC Analyst, Pen Tester, GRC, etc.), and for SOC
roles additionally detects the seniority tier (L1 / L2 / L3 / Trainee).

Supported role types:
  soc_analyst      — SOC L1/L2/L3, Security Operations, Incident Response
  pen_tester       — Penetration Tester, Red Team, Offensive Security
  grc_analyst      — GRC, Risk & Compliance, Audit, Policy
  threat_intel     — Threat Intelligence, CTI, OSINT
  cloud_security   — Cloud Security Engineer, AWS/Azure Security
  forensics        — Digital Forensics, DFIR, Malware Analyst
  security_engineer — Security Engineer, AppSec, DevSecOps
  blue_team        — Defensive Security, Detection Engineering
  siem_engineer    — SIEM Engineer, Detection Engineer, Security Analyst
  general_security — General Cybersecurity / InfoSec (catch-all)

SOC Analyst tiers (when role_type == "soc_analyst"):
  trainee  — SOC Trainee / Fresher / Intern / Graduate  (0–6 months)
  l1       — SOC Analyst L1 / Tier 1  (monitoring, basic triage)
  l2       — SOC Analyst L2 / Tier 2  (investigation, IR escalation)
  l3       — SOC Analyst L3 / Senior  (threat hunting, detection eng)
"""

import re
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Role Signal Definitions
# ─────────────────────────────────────────────────────────────────────────────

_ROLE_SIGNALS: Dict[str, Dict] = {
    "soc_analyst": {
        "display_name": "SOC Analyst",
        "description": "Security Operations Center — monitoring, triage, incident response",
        "title_patterns": [
            r"\bsoc\s*analyst\b", r"\bsecurity\s*operations\b", r"\bsoc\s*l[123]\b",
            r"\bincident\s*resp(onder|onse)\b", r"\bsecurity\s*analyst\b",
            r"\bsoc\s*trainee\b", r"\bsoc\s*(intern|fresher|junior|graduate)\b",
            r"\bjunior\s*security\s*analyst\b", r"\bsecurity\s*intern\b",
            r"\bsoc\s*engineer\b", r"\btier\s*[123]\s*analyst\b",
            r"\blevel\s*[123]\s*soc\b",
        ],
        "tool_signals": [
            "splunk", "qradar", "sentinel", "elastic siem", "elastic stack",
            "solarwinds", "secureworks", "arcsight", "logrhythm", "exabeam",
            "crowdstrike", "sentinelone", "carbon black", "cybereason",
            "servicenow", "jira", "pagerduty", "misp", "thehive",
            "wireshark", "tcpdump", "zeek", "suricata", "snort",
        ],
        "cert_signals": [
            "security+", "sec+", "ceh", "ecih", "btl1", "btl2",
            "cysa+", "csa+", "gcih", "gcia", "gsec", "gmon",
            "comptia security+", "blue team labs", "google cybersecurity",
        ],
        "keyword_signals": [
            "triage", "alert", "siem", "soar", "playbook", "runbook",
            "ioc", "threat hunting", "log analysis", "event correlation",
            "escalation", "ticket", "edr", "xdr", "ndr", "ueba",
            "mitre att&ck", "diamond model", "kill chain", "watchlist",
            "false positive", "true positive", "threat indicator",
        ],
    },
    "pen_tester": {
        "display_name": "Penetration Tester",
        "description": "Offensive security, red teaming, vulnerability assessment",
        "title_patterns": [
            r"\bpen(etration)?\s*test(er|ing)\b", r"\bred\s*team\b",
            r"\boffensive\s*security\b", r"\bethical\s*hack(er|ing)\b",
            r"\bvulnerability\s*(assessm|analyst)\b", r"\bsecurity\s*tester\b",
            r"\bbug\s*bounty\b", r"\bapplication\s*security\s*tester\b",
        ],
        "tool_signals": [
            "metasploit", "burp suite", "nmap", "nessus", "openvas",
            "cobalt strike", "empire", "bloodhound", "mimikatz",
            "kali linux", "parrot os", "beef", "sqlmap", "hydra",
            "john the ripper", "hashcat", "nikto", "dirbuster", "gobuster",
            "aircrack-ng", "wireshark", "tcpdump", "responder",
            "impacket", "crackmapexec", "powershell empire",
        ],
        "cert_signals": [
            "oscp", "osce", "osep", "oswe", "osed", "osee",
            "ceh", "cpent", "pentest+", "ewapt", "ejpt",
            "gpen", "gwapt", "gxpn", "pnpt",
        ],
        "keyword_signals": [
            "exploit", "payload", "shellcode", "privilege escalation",
            "lateral movement", "c2", "command and control", "persistence",
            "enumeration", "recon", "post-exploitation", "phishing simulation",
            "social engineering", "web application testing", "network testing",
            "active directory", "azure ad", "kerberoasting", "pass-the-hash",
        ],
    },
    "grc_analyst": {
        "display_name": "GRC Analyst",
        "description": "Governance, Risk & Compliance — audits, frameworks, policy",
        "title_patterns": [
            r"\bgrc\b", r"\bgovernance.{0,20}risk.{0,20}compliance\b",
            r"\brisk\s*analyst\b", r"\bcompliance\s*analyst\b",
            r"\binformation\s*security\s*risk\b", r"\baudit(or)?\b",
            r"\biso\s*27001\s*lead\b", r"\brisk\s*manager\b",
        ],
        "tool_signals": [
            "servicenow grc", "archer", "rsa archer", "metricstream",
            "qualys", "tenable", "rapid7", "nexpose",
            "nist", "iso 27001", "soc 2", "pci dss", "hipaa",
        ],
        "cert_signals": [
            "cism", "crisc", "cgeit", "cisa", "cissp", "grcp", "grca",
            "iso 27001 lead auditor", "iso 27001 lead implementer",
            "pci dss qsa", "cipp", "cipm",
        ],
        "keyword_signals": [
            "risk assessment", "risk register", "control framework",
            "policy", "procedure", "audit", "compliance", "regulatory",
            "iso 27001", "nist csf", "soc 2", "pci dss", "hipaa", "gdpr",
            "third party risk", "vendor risk", "bcp", "bcm", "dpia",
            "data classification", "security awareness", "bia",
        ],
    },
    "threat_intel": {
        "display_name": "Threat Intelligence Analyst",
        "description": "CTI, OSINT, threat actor tracking, intelligence reports",
        "title_patterns": [
            r"\bthreat\s*intel(ligence)?\b", r"\bcti\b",
            r"\bosint\b", r"\bcyber\s*intel(ligence)?\b",
            r"\bthreat\s*research(er)?\b", r"\bintelligence\s*analyst\b",
        ],
        "tool_signals": [
            "misp", "opencti", "anomali", "recorded future", "threatconnect",
            "maltego", "shodan", "censys", "virustotal", "any.run",
            "hybrid analysis", "joe sandbox", "cuckoo sandbox",
            "yara", "zeek", "stix", "taxii",
        ],
        "cert_signals": [
            "gcti", "ctia", "cctia", "sans for578", "sans for610",
            "grem", "gcfe",
        ],
        "keyword_signals": [
            "ioc", "ioa", "ttp", "apt", "threat actor", "campaign",
            "attribution", "darkweb", "dark web", "paste site",
            "osint", "intelligence report", "threat feed", "indicator",
            "malware analysis", "reverse engineering", "yara rule",
            "stix/taxii", "mitre att&ck", "diamond model",
        ],
    },
    "cloud_security": {
        "display_name": "Cloud Security Engineer",
        "description": "Cloud security, IAM, CSPM, DevSecOps on AWS/Azure/GCP",
        "title_patterns": [
            r"\bcloud\s*security\b", r"\bdevsecops\b",
            r"\bsecurity\s*engineer\b.*\b(aws|azure|gcp|cloud)\b",
            r"\b(aws|azure|gcp)\s*security\b", r"\bcspm\b",
            r"\bapplication\s*security\s*engineer\b",
        ],
        "tool_signals": [
            "aws security hub", "azure defender", "gcp security command center",
            "prisma cloud", "lacework", "orca security", "wiz", "aqua security",
            "hashicorp vault", "terraform", "kubernetes", "docker",
            "iam", "kms", "cloudtrail", "guardduty", "macie",
            "sonarqube", "checkmarx", "veracode", "snyk",
        ],
        "cert_signals": [
            "aws certified security specialty", "azure security engineer",
            "gcp professional cloud security engineer",
            "ccsp", "ccsk", "csslp", "cissp",
        ],
        "keyword_signals": [
            "iam", "zero trust", "cspm", "cnapp", "sast", "dast", "sca",
            "container security", "kubernetes security", "secret management",
            "infrastructure as code", "devsecops", "shift left",
            "cloud posture", "misconfiguration", "data lake security",
            "api security", "oauth", "service mesh",
        ],
    },
    "forensics": {
        "display_name": "Digital Forensics / DFIR",
        "description": "Digital forensics, incident response, malware analysis",
        "title_patterns": [
            r"\bdigital\s*forensic\b", r"\bdfir\b",
            r"\bmalware\s*(analyst|researcher|engineer)\b",
            r"\bforensic\s*investigator\b", r"\bincident\s*response\b",
        ],
        "tool_signals": [
            "autopsy", "ftk", "encase", "x-ways", "volatility",
            "rekall", "sleuth kit", "axiom", "cellebrite",
            "wireshark", "tcpdump", "cuckoo", "any.run",
            "floss", "ghidra", "ida pro", "binary ninja", "radare2",
        ],
        "cert_signals": [
            "gcfe", "gcfa", "gnfa", "gcfr", "grem",
            "cfce", "cfe", "ence", "sans for500", "sans for508",
        ],
        "keyword_signals": [
            "forensic", "disk image", "memory dump", "artifact",
            "chain of custody", "evidence", "file carving",
            "registry analysis", "log analysis", "timeline",
            "rootkit", "malware", "ransomware", "reverse engineering",
            "dynamic analysis", "static analysis", "sandbox",
        ],
    },
    "siem_engineer": {
        "display_name": "SIEM / Detection Engineer",
        "description": "SIEM tuning, detection rule writing, security analytics",
        "title_patterns": [
            r"\bsiem\s*engineer\b", r"\bdetection\s*engineer\b",
            r"\bsecurity\s*analytics\b", r"\bsplunk\s*(admin|engineer|developer)\b",
            r"\bsecurity\s*data\s*(engineer|scientist)\b",
        ],
        "tool_signals": [
            "splunk", "splunk enterprise security", "es", "qradar",
            "sentinel", "elastic siem", "kibana", "opensearch",
            "logstash", "fluentd", "kafka", "sigma",
        ],
        "cert_signals": [
            "splunk core certified", "splunk enterprise security certified admin",
            "elastic certified security analyst", "gcda",
        ],
        "keyword_signals": [
            "detection rule", "sigma rule", "spl", "kql", "aql",
            "use case", "content development", "threat detection",
            "log source", "onboarding", "parsing", "normalization",
            "correlation", "alert tuning", "false positive reduction",
        ],
    },
    "general_security": {
        "display_name": "Cybersecurity Professional",
        "description": "General information security role",
        "title_patterns": [
            r"\bcyber\s*security\b", r"\binformation\s*security\b",
            r"\binfosec\b", r"\bnetwork\s*security\b",
            r"\bsecurity\s*specialist\b", r"\bsecurity\s*consultant\b",
            r"\bsecurity\s*administrator\b",
        ],
        "tool_signals": [
            "firewall", "ids", "ips", "vpn", "pam", "dlp",
            "nac", "endpoint security", "email security",
        ],
        "cert_signals": [
            "security+", "cissp", "cism", "ceh", "sscp",
            "network+", "comptia",
        ],
        "keyword_signals": [
            "cybersecurity", "information security", "network security",
            "vulnerability", "patch management", "access control",
            "authentication", "encryption", "firewall", "intrusion",
        ],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# SOC Analyst Tier System
# Applies only when role_type == "soc_analyst"
# ─────────────────────────────────────────────────────────────────────────────

_SOC_TIERS: Dict[str, Dict] = {
    "trainee": {
        "display": "SOC Trainee / Fresher / Intern",
        "description": "Entry-level training role — basic monitoring, log review, hands-on learning",
        "patterns": [
            r"\bsoc\s*(trainee|intern|fresher|apprentice|graduate)\b",
            r"\b(trainee|fresher|intern|apprentice)\s*soc\b",
            r"\bentry.?level\s*(soc|security)\b",
            r"\bgraduate\s*(soc|security)\b",
            r"\b(0|zero).?experience\b",
            r"\bfresh\s*(graduate|out)\b",
            r"\bno\s*experience\s*required\b",
        ],
        "key_certs": [
            "CompTIA Security+", "Google Cybersecurity Certificate",
            "BTL1 (Blue Team Labs Level 1)", "CompTIA Network+",
            "CompTIA IT Fundamentals (ITF+)", "Certified in Cybersecurity (CC) — ISC2",
        ],
        "key_tools": ["Splunk (basic)", "Wireshark", "Nmap", "Linux CLI", "Windows Event Viewer"],
        "key_skills": [
            "networking fundamentals", "TCP/IP protocols", "OS fundamentals",
            "basic log analysis", "security concepts", "CIA triad",
        ],
        "leniency": 0.30,
    },
    "l1": {
        "display": "SOC Analyst L1 / Tier 1",
        "description": "First-line monitoring, alert triage, ticket creation, initial incident handling",
        "patterns": [
            r"\bsoc\s*l1\b", r"\bsoc\s*level\s*1\b", r"\btier\s*1\s*(soc|analyst|security)\b",
            r"\blevel\s*1\s*soc\b", r"\bl1\s*(analyst|engineer|soc)\b",
            r"\bjunior\s*soc\b", r"\bjunior\s*security\s*analyst\b",
        ],
        "key_certs": [
            "CompTIA Security+", "BTL1 (Blue Team Labs Level 1)",
            "CompTIA CySA+ (CS0-003)", "EC-Council ECIH",
            "IBM QRadar SIEM Foundation",
        ],
        "key_tools": ["Splunk", "IBM QRadar", "Microsoft Sentinel", "ServiceNow", "JIRA", "CrowdStrike"],
        "key_skills": [
            "alert triage", "SIEM monitoring", "IOC identification",
            "ticket handling", "playbook execution", "basic IR",
        ],
        "leniency": 0.20,
    },
    "l2": {
        "display": "SOC Analyst L2 / Tier 2",
        "description": "Deep investigation, IR escalation, basic threat hunting, L1 mentoring",
        "patterns": [
            r"\bsoc\s*l2\b", r"\bsoc\s*level\s*2\b", r"\btier\s*2\s*(soc|analyst|security)\b",
            r"\blevel\s*2\s*soc\b", r"\bl2\s*(analyst|engineer|soc)\b",
            r"\bmid.?level\s*soc\b", r"\bintermediate\s*soc\b",
        ],
        "key_certs": [
            "CompTIA CySA+ (CS0-003)", "EC-Council CEH", "GIAC GCIH",
            "EC-Council ECIH", "BTL2 (Blue Team Labs Level 2)",
        ],
        "key_tools": [
            "Splunk ES", "CrowdStrike Falcon", "Wireshark",
            "MISP", "TheHive", "Zeek",
        ],
        "key_skills": [
            "incident response", "threat hunting basics", "malware triage",
            "MITRE ATT&CK mapping", "forensic analysis", "network forensics",
        ],
        "leniency": 0.10,
    },
    "l3": {
        "display": "SOC Analyst L3 / Senior SOC",
        "description": "Advanced threat hunting, detection rule authoring, SOC improvements, L1/L2 mentoring",
        "patterns": [
            r"\bsoc\s*l3\b", r"\bsoc\s*level\s*3\b", r"\btier\s*3\s*(soc|analyst|security)\b",
            r"\blevel\s*3\s*soc\b", r"\bl3\s*(analyst|engineer|soc)\b",
            r"\bsenior\s*soc\b", r"\blead\s*soc\b", r"\bsoc\s*lead\b",
        ],
        "key_certs": [
            "GIAC GCIA", "GIAC GCIH", "GIAC GCDA", "CISSP",
            "EC-Council CEH Master", "SANS FOR508",
        ],
        "key_tools": [
            "Sigma", "YARA", "Elastic Stack", "Zeek", "Suricata",
            "Velociraptor", "OpenCTI",
        ],
        "key_skills": [
            "threat hunting", "detection rule authoring", "sigma rules",
            "MITRE ATT&CK framework", "SOC leadership", "purple team",
        ],
        "leniency": 0.0,
    },
}

# Generic seniority patterns (used when no tier-specific pattern matches)
_JUNIOR_SIGNALS = [
    r"\b(fresher|trainee|intern|junior|entry.?level|l1|level\s*1|beginner|graduate|apprentice)\b"
]
_SENIOR_SIGNALS = [
    r"\b(senior|lead|principal|staff|l2|l3|level\s*[23]|experienced|mid.?level)\b"
]

# Tools that span all cyber roles
_GENERAL_CYBER_TOOLS = {
    "splunk", "qradar", "sentinel", "siem", "soar", "edr", "xdr",
    "crowdstrike", "sentinelone", "carbon black", "cylance",
    "nessus", "qualys", "rapid7", "tenable", "metasploit",
    "kali linux", "burp suite", "wireshark", "nmap",
    "misp", "opencti", "threatconnect", "anomali",
    "palo alto", "checkpoint", "fortinet", "cisco asa",
    "active directory", "azure ad", "ldap", "radius",
    "python", "powershell", "bash", "linux", "regex",
    "zeek", "suricata", "snort", "volatility", "autopsy",
    "maltego", "shodan", "virustotal", "sigma", "yara",
    "thehive", "cortex", "jira", "servicenow",
}


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def detect_cyber_role(jd_text: str, resume_text: str = "") -> Dict:
    """
    Detect if a job description is cybersecurity-related and identify
    the specific sub-role and (for SOC roles) the seniority tier.

    Returns:
        {
          "is_cyber": bool,
          "confidence": float,
          "role_type": str,
          "role_display": str,
          "role_description": str,
          "detected_signals": { ... },
          "is_junior_role": bool,
          "resume_cyber_signals": List[str],
          "soc_tier": str | None,             # "trainee"|"l1"|"l2"|"l3"|None
          "soc_tier_display": str | None,
          "soc_tier_description": str | None,
          "soc_tier_key_certs": List[str],
          "soc_tier_key_tools": List[str],
          "soc_tier_key_skills": List[str],
          "scoring_modifiers": { ... },
        }
    """
    jd_lower = jd_text.lower()
    resume_lower = resume_text.lower()

    best_role: str = ""
    best_score: float = 0.0
    best_signals: Dict = {}

    for role_type, signals in _ROLE_SIGNALS.items():
        score, detected = _score_role_signals(jd_lower, signals)
        if score > best_score:
            best_score = score
            best_role = role_type
            best_signals = detected

    is_cyber = best_score >= 0.08

    # Generic seniority detection
    is_junior = any(
        re.search(p, jd_lower, re.IGNORECASE)
        for p in _JUNIOR_SIGNALS
    )

    # SOC-specific tier detection
    soc_tier: Optional[str] = None
    soc_tier_info: Dict = {}
    if is_cyber and best_role == "soc_analyst":
        soc_tier, soc_tier_info = _detect_soc_tier(jd_lower)

    # Resume cyber signals
    resume_cyber_signals = _extract_resume_cyber_signals(resume_lower)

    # Scoring modifiers
    scoring_modifiers = _compute_scoring_modifiers(
        is_cyber, best_score, best_role, is_junior, soc_tier
    )

    role_info = _ROLE_SIGNALS.get(best_role, {})
    confidence = min(1.0, best_score * 2)

    return {
        "is_cyber": is_cyber,
        "confidence": round(confidence, 3),
        "role_type": best_role if is_cyber else "",
        "role_display": role_info.get("display_name", "") if is_cyber else "",
        "role_description": role_info.get("description", "") if is_cyber else "",
        "detected_signals": best_signals if is_cyber else {},
        "is_junior_role": is_junior,
        "resume_cyber_signals": resume_cyber_signals,
        "soc_tier": soc_tier,
        "soc_tier_display": soc_tier_info.get("display") if soc_tier else None,
        "soc_tier_description": soc_tier_info.get("description") if soc_tier else None,
        "soc_tier_key_certs": soc_tier_info.get("key_certs", []) if soc_tier else [],
        "soc_tier_key_tools": soc_tier_info.get("key_tools", []) if soc_tier else [],
        "soc_tier_key_skills": soc_tier_info.get("key_skills", []) if soc_tier else [],
        "scoring_modifiers": scoring_modifiers,
    }


def _detect_soc_tier(jd_lower: str) -> Tuple[Optional[str], Dict]:
    """
    Detect SOC analyst seniority tier from JD text.
    Returns (tier_key, tier_info_dict).
    Checks tiers in specificity order: l3 → l2 → l1 → trainee.
    Falls back to None if no tier-specific pattern matches.
    """
    for tier_key in ("l3", "l2", "l1", "trainee"):
        tier_info = _SOC_TIERS[tier_key]
        for pattern in tier_info["patterns"]:
            if re.search(pattern, jd_lower, re.IGNORECASE):
                return tier_key, tier_info

    # Infer tier from generic seniority if no explicit tier matched
    if re.search(r"\b(senior|lead|principal|l3|level\s*3)\b", jd_lower, re.IGNORECASE):
        return "l3", _SOC_TIERS["l3"]
    if re.search(r"\b(mid.?level|intermediate|l2|level\s*2|2\+?\s*year)\b", jd_lower, re.IGNORECASE):
        return "l2", _SOC_TIERS["l2"]
    if re.search(r"\b(junior|entry.?level|fresher|trainee|intern|graduate|l1|level\s*1)\b", jd_lower, re.IGNORECASE):
        return "trainee", _SOC_TIERS["trainee"]
    if re.search(r"\b(1\+?\s*year|one\s*year|0.?1\s*year)\b", jd_lower, re.IGNORECASE):
        return "l1", _SOC_TIERS["l1"]

    return None, {}


def _score_role_signals(jd_lower: str, signals: Dict) -> Tuple[float, Dict]:
    """Score a single role against the JD text. Returns (score, detected_dict)."""
    score = 0.0
    detected: Dict = {
        "title_match": False,
        "tool_signals": [],
        "cert_signals": [],
        "keyword_signals": [],
    }

    for pattern in signals.get("title_patterns", []):
        if re.search(pattern, jd_lower, re.IGNORECASE):
            score += 0.35
            detected["title_match"] = True
            break

    for tool in signals.get("tool_signals", []):
        if tool.lower() in jd_lower:
            detected["tool_signals"].append(tool)
    tool_score = min(0.25, len(detected["tool_signals"]) * 0.04)
    score += tool_score

    for cert in signals.get("cert_signals", []):
        if cert.lower() in jd_lower:
            detected["cert_signals"].append(cert)
    cert_score = min(0.20, len(detected["cert_signals"]) * 0.06)
    score += cert_score

    for kw in signals.get("keyword_signals", []):
        if kw.lower() in jd_lower:
            detected["keyword_signals"].append(kw)
    kw_score = min(0.20, len(detected["keyword_signals"]) * 0.02)
    score += kw_score

    return score, detected


def _extract_resume_cyber_signals(resume_lower: str) -> List[str]:
    """Find cybersecurity tools/terms mentioned in the resume."""
    found = []
    for tool in _GENERAL_CYBER_TOOLS:
        if tool in resume_lower:
            found.append(tool)
    return found[:15]


def _compute_scoring_modifiers(
    is_cyber: bool,
    confidence: float,
    role_type: str,
    is_junior: bool,
    soc_tier: Optional[str] = None,
) -> Dict:
    """
    Return scoring weight modifiers for detected cyber roles.
    SOC tier leniency overrides generic junior leniency for soc_analyst roles.
    """
    if not is_cyber:
        return {
            "cert_bonus_multiplier": 1.0,
            "tool_match_boost": 0.0,
            "keyword_weight_boost": 0.0,
            "seniority_leniency": 0.0,
        }

    cert_mult = 1.5 + (confidence * 0.5)
    tool_boost = 0.05 if confidence > 0.5 else 0.03
    kw_boost = 0.03

    # Tier-specific leniency for SOC roles
    if role_type == "soc_analyst" and soc_tier and soc_tier in _SOC_TIERS:
        seniority_leniency = _SOC_TIERS[soc_tier]["leniency"]
    elif is_junior:
        seniority_leniency = 0.15
    else:
        seniority_leniency = 0.0

    return {
        "cert_bonus_multiplier": round(cert_mult, 2),
        "tool_match_boost": tool_boost,
        "keyword_weight_boost": kw_boost,
        "seniority_leniency": seniority_leniency,
    }


def get_role_specific_missing_certs(role_type: str, resume_text: str) -> List[Dict]:
    """
    Return recommended certifications for a given cyber role that
    are NOT present in the resume.
    """
    signals = _ROLE_SIGNALS.get(role_type, {})
    certs = signals.get("cert_signals", [])
    resume_lower = resume_text.lower()

    recommendations = []
    for cert in certs:
        if cert.lower() not in resume_lower:
            recommendations.append({
                "cert": cert,
                "role_type": role_type,
                "priority": "high" if len(recommendations) < 3 else "medium",
            })

    return recommendations[:5]


def get_tier_specific_missing_certs(soc_tier: str, resume_text: str) -> List[Dict]:
    """
    Return recommended certifications for a specific SOC tier that
    are NOT present in the resume. Provides more targeted advice than
    the generic role-level cert recommendations.
    """
    tier_info = _SOC_TIERS.get(soc_tier, {})
    certs = tier_info.get("key_certs", [])
    resume_lower = resume_text.lower()

    recommendations = []
    for cert in certs:
        cert_lower = cert.lower()
        # Strip parenthetical notes for matching
        clean = re.sub(r"\s*\(.*?\)", "", cert_lower).strip()
        if clean not in resume_lower and cert_lower not in resume_lower:
            recommendations.append({
                "cert": cert,
                "soc_tier": soc_tier,
                "priority": "high" if len(recommendations) < 2 else "medium",
            })

    return recommendations[:4]


def get_role_specific_missing_tools(role_type: str, resume_text: str) -> List[Dict]:
    """
    Return recommended tools for a given cyber role that are NOT
    present in the resume.
    """
    signals = _ROLE_SIGNALS.get(role_type, {})
    tools = signals.get("tool_signals", [])
    resume_lower = resume_text.lower()

    missing = []
    for tool in tools:
        if tool.lower() not in resume_lower:
            missing.append({
                "tool": tool,
                "role_type": role_type,
                "priority": "high" if len(missing) < 3 else "medium",
            })

    return missing[:6]


def get_all_soc_tiers() -> Dict[str, Dict]:
    """Return the full SOC tier definitions (for use by external modules)."""
    return {
        k: {
            "display": v["display"],
            "description": v["description"],
            "key_certs": v["key_certs"],
            "key_tools": v["key_tools"],
            "key_skills": v["key_skills"],
            "leniency": v["leniency"],
        }
        for k, v in _SOC_TIERS.items()
    }
