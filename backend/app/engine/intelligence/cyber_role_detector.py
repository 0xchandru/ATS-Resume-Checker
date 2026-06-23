"""
Cybersecurity Role Intelligence Module

Detects whether a job description is cybersecurity-related, identifies the
specific cyber sub-role (SOC Analyst, Pen Tester, GRC, etc.), and returns
role-specific signals used to boost cert/tool matching weights in scoring.

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
"""

import re
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Role Signal Definitions
# Each role has: title_patterns, tool_signals, cert_signals, keyword_signals
# ─────────────────────────────────────────────────────────────────────────────

_ROLE_SIGNALS: Dict[str, Dict] = {
    "soc_analyst": {
        "display_name": "SOC Analyst",
        "description": "Security Operations Center — monitoring, triage, incident response",
        "title_patterns": [
            r"\bsoc\s*analyst\b", r"\bsecurity\s*operations\b", r"\bsoc\s*l[123]\b",
            r"\bincident\s*resp(onder|onse)\b", r"\bsecurity\s*analyst\b",
            r"\bsoc\s*trainee\b", r"\bsoc\s*(intern|fresher|junior)\b",
            r"\bjunior\s*security\s*analyst\b", r"\bsecurity\s*intern\b",
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
            "comptia security+", "blue team labs",
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

# Seniority signals for cyber roles (fresher/intern/junior friendly)
_JUNIOR_SIGNALS = [
    r"\b(fresher|trainee|intern|junior|entry.?level|l1|level\s*1|beginner)\b"
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
}


def detect_cyber_role(jd_text: str, resume_text: str = "") -> Dict:
    """
    Detect if a job description is cybersecurity-related and identify
    the specific sub-role.

    Returns:
        {
          "is_cyber": bool,
          "confidence": float,           # 0.0 – 1.0
          "role_type": str,              # e.g. "soc_analyst"
          "role_display": str,           # e.g. "SOC Analyst"
          "role_description": str,
          "detected_signals": {
            "title_match": bool,
            "tool_signals": List[str],
            "cert_signals": List[str],
            "keyword_signals": List[str],
          },
          "is_junior_role": bool,
          "resume_cyber_signals": List[str],
          "scoring_modifiers": {         # Passed to scorer
            "cert_bonus_multiplier": float,
            "tool_match_boost": float,
            "keyword_weight_boost": float,
          }
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

    is_cyber = best_score >= 0.08  # At least some signal required

    # Detect seniority within the cyber role
    is_junior = any(
        re.search(p, jd_lower, re.IGNORECASE)
        for p in _JUNIOR_SIGNALS
    )

    # Extract cyber signals from the resume itself
    resume_cyber_signals = _extract_resume_cyber_signals(resume_lower)

    # Compute scoring modifiers based on detected role
    scoring_modifiers = _compute_scoring_modifiers(
        is_cyber, best_score, best_role, is_junior
    )

    role_info = _ROLE_SIGNALS.get(best_role, {})
    confidence = min(1.0, best_score * 2)  # Normalise to 0-1

    return {
        "is_cyber": is_cyber,
        "confidence": round(confidence, 3),
        "role_type": best_role if is_cyber else "",
        "role_display": role_info.get("display_name", "") if is_cyber else "",
        "role_description": role_info.get("description", "") if is_cyber else "",
        "detected_signals": best_signals if is_cyber else {},
        "is_junior_role": is_junior,
        "resume_cyber_signals": resume_cyber_signals,
        "scoring_modifiers": scoring_modifiers,
    }


def _score_role_signals(jd_lower: str, signals: Dict) -> Tuple[float, Dict]:
    """Score a single role against the JD text. Returns (score, detected_dict)."""
    score = 0.0
    detected: Dict = {
        "title_match": False,
        "tool_signals": [],
        "cert_signals": [],
        "keyword_signals": [],
    }

    # Title match (highest weight)
    for pattern in signals.get("title_patterns", []):
        if re.search(pattern, jd_lower, re.IGNORECASE):
            score += 0.35
            detected["title_match"] = True
            break

    # Tool signals
    for tool in signals.get("tool_signals", []):
        if tool.lower() in jd_lower:
            detected["tool_signals"].append(tool)

    tool_score = min(0.25, len(detected["tool_signals"]) * 0.04)
    score += tool_score

    # Cert signals
    for cert in signals.get("cert_signals", []):
        if cert.lower() in jd_lower:
            detected["cert_signals"].append(cert)

    cert_score = min(0.20, len(detected["cert_signals"]) * 0.06)
    score += cert_score

    # Keyword signals
    for kw in signals.get("keyword_signals", []):
        if kw.lower() in jd_lower:
            detected["keyword_signals"].append(kw)

    kw_score = min(0.20, len(detected["keyword_signals"]) * 0.02)
    score += kw_score

    return score, detected


def _extract_resume_cyber_signals(resume_lower: str) -> List[str]:
    """Find cybersecurity tools and terms mentioned in the resume."""
    found = []
    for tool in _GENERAL_CYBER_TOOLS:
        if tool in resume_lower:
            found.append(tool)
    return found[:15]  # Cap at 15 for conciseness


def _compute_scoring_modifiers(
    is_cyber: bool, confidence: float, role_type: str, is_junior: bool
) -> Dict:
    """
    Return scoring weight modifiers for detected cyber roles.

    These modifiers are passed to the scorer so that:
    - Certification matches count more for cyber roles
    - Tool keyword matches get a boost
    - Junior cyber roles get slightly more lenient scoring
    """
    if not is_cyber:
        return {
            "cert_bonus_multiplier": 1.0,
            "tool_match_boost": 0.0,
            "keyword_weight_boost": 0.0,
            "seniority_leniency": 0.0,
        }

    # Boost cert matching for all cyber roles (certs matter a lot in cyber)
    cert_mult = 1.5 + (confidence * 0.5)  # 1.5x to 2.0x

    # Tool boost (cyber roles are very tool-specific)
    tool_boost = 0.05 if confidence > 0.5 else 0.03

    # Keyword boost
    kw_boost = 0.03

    # Junior/fresher roles: slightly more lenient seniority scoring
    seniority_leniency = 0.15 if is_junior else 0.0

    return {
        "cert_bonus_multiplier": round(cert_mult, 2),
        "tool_match_boost": tool_boost,
        "keyword_weight_boost": kw_boost,
        "seniority_leniency": seniority_leniency,
    }


def get_role_specific_missing_certs(role_type: str, resume_text: str) -> List[Dict]:
    """
    Return recommended certifications for a given cyber role that
    are NOT present in the resume. Used for targeted feedback.
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

    return recommendations[:5]  # Top 5 missing certs


def get_role_specific_missing_tools(role_type: str, resume_text: str) -> List[Dict]:
    """
    Return recommended tools for a given cyber role that are NOT
    present in the resume. Used for targeted feedback.
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

    return missing[:6]  # Top 6 missing tools
