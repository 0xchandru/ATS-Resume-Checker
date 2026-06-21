"""
Semantic Skill Grouper — Groups related skills so that matching one variant
satisfies the entire concept group.

For example, if JD says "SIEM experience" and resume says "Splunk",
that's a concept match (not a miss).
"""

import logging
from typing import Dict, List, Optional, Tuple
from backend.app.engine.extraction.extractor import normalize

logger = logging.getLogger(__name__)

# ── Predefined skill concept groups ──────────────────────────────────────
# Each group maps a canonical concept → list of known variants/tools
# When any variant is found, the entire concept is considered matched.

SKILL_GROUPS: Dict[str, List[str]] = {
    # Security tools
    "SIEM": [
        "siem", "splunk", "ibm qradar", "qradar", "microsoft sentinel",
        "azure sentinel", "arcsight", "logrhythm", "elastic siem",
        "securonix", "exabeam", "sumo logic", "chronicle",
    ],
    "EDR": [
        "edr", "endpoint detection and response", "crowdstrike",
        "crowdstrike falcon", "sentinelone", "carbon black",
        "microsoft defender for endpoint", "mde", "cylance",
        "cortex xdr", "palo alto xdr", "trellix edr",
    ],
    "Firewall": [
        "firewall", "next-gen firewall", "ngfw", "next generation firewall",
        "palo alto firewall", "fortinet", "fortigate", "cisco asa",
        "checkpoint", "sophos", "firewall management", "firewall rules",
        "firewall policy", "firewall log analysis", "iptables", "pfSense",
    ],
    "IDS/IPS": [
        "ids", "ips", "intrusion detection", "intrusion prevention",
        "snort", "suricata", "zeek", "bro ids",
    ],
    "Vulnerability Scanner": [
        "vulnerability scanner", "vulnerability assessment", "nessus",
        "qualys", "rapid7", "openvas", "nexpose", "tenable",
        "vulnerability management", "vuln scanning",
    ],
    "Threat Intelligence": [
        "threat intelligence", "threat intel", "cti", "cyber threat intelligence",
        "mitre att&ck", "mitre attack", "att&ck framework", "kill chain",
        "ioc", "indicators of compromise", "threat hunting",
        "yara rules", "sigma rules", "stix", "taxii",
    ],
    "Incident Response": [
        "incident response", "ir", "incident management", "incident handling",
        "security incident", "breach response", "containment",
        "eradication", "recovery", "lessons learned",
        "incident triage", "soc operations",
    ],
    "Digital Forensics": [
        "digital forensics", "computer forensics", "forensic analysis",
        "forensic investigation", "memory forensics", "disk forensics",
        "network forensics", "autopsy", "ftk", "encase",
        "volatility", "forensic imaging",
    ],
    "Penetration Testing": [
        "penetration testing", "pentest", "pen testing", "ethical hacking",
        "red team", "red teaming", "offensive security",
        "burp suite", "metasploit", "kali linux", "nmap",
        "gobuster", "ffuf", "sqlmap", "john the ripper",
        "hashcat", "hydra",
    ],
    "Cloud Security": [
        "cloud security", "aws security", "azure security", "gcp security",
        "cloud security posture management", "cspm", "casb",
        "cloud access security broker", "cloud workload protection",
    ],
    "IAM": [
        "iam", "identity and access management", "identity management",
        "access management", "active directory", "azure ad",
        "entra id", "okta", "ping identity", "saml", "oauth",
        "openid connect", "ldap", "mfa", "multi-factor authentication",
        "pam", "privileged access management", "cyberark",
    ],
    "DLP": [
        "dlp", "data loss prevention", "data leak prevention",
        "data protection", "information protection",
    ],
    "Network Security": [
        "network security", "network monitoring", "ndr",
        "network detection and response", "packet analysis",
        "wireshark", "tcpdump", "netflow", "pcap analysis",
        "network segmentation", "zero trust network",
    ],

    # Programming / Scripting
    "Python": [
        "python", "python3", "python 3", "python scripting",
        "python programming", "python automation",
    ],
    "JavaScript": [
        "javascript", "js", "typescript", "ts",
        "node.js", "nodejs", "react", "react.js",
        "angular", "vue", "vue.js", "next.js", "nextjs",
    ],
    "PowerShell": [
        "powershell", "powershell scripting", "pwsh",
    ],
    "Bash/Shell": [
        "bash", "shell scripting", "shell script", "sh",
        "zsh", "linux scripting", "unix scripting",
    ],
    "SQL": [
        "sql", "mysql", "postgresql", "postgres", "sqlite",
        "mssql", "sql server", "oracle sql", "database queries",
        "sql queries", "kusto query language", "kql",
    ],

    # DevOps / Infrastructure
    "Container": [
        "docker", "kubernetes", "k8s", "container", "containerization",
        "container orchestration", "podman", "helm", "container security",
    ],
    "CI/CD": [
        "ci/cd", "cicd", "continuous integration", "continuous deployment",
        "continuous delivery", "jenkins", "github actions",
        "gitlab ci", "azure devops", "terraform", "ansible",
    ],
    "Cloud Platforms": [
        "aws", "amazon web services", "azure", "microsoft azure",
        "gcp", "google cloud", "google cloud platform",
        "cloud computing", "cloud infrastructure",
    ],

    # Compliance & Frameworks
    "Compliance Frameworks": [
        "nist", "nist 800-53", "nist csf", "iso 27001",
        "soc 2", "pci dss", "hipaa", "gdpr", "cis controls",
        "cis benchmarks", "fedramp", "cmmc",
    ],

    # Operating Systems
    "Linux": [
        "linux", "ubuntu", "centos", "rhel", "red hat",
        "debian", "fedora", "kali", "suse", "linux administration",
    ],
    "Windows": [
        "windows", "windows server", "windows administration",
        "windows security", "group policy", "gpo",
    ],

    # Log Management & Monitoring
    "Log Management": [
        "log management", "log analysis", "log monitoring",
        "elk stack", "elasticsearch", "logstash", "kibana",
        "grafana", "prometheus", "datadog", "nagios", "zabbix",
    ],

    # Ticketing & ITSM
    "ITSM": [
        "itsm", "itil", "servicenow", "jira", "freshservice",
        "zendesk", "ticketing system", "incident ticketing",
        "service desk", "help desk",
    ],
}

# Match confidence thresholds
DIRECT_MATCH = 1.0       # Exact keyword or alias found
CONCEPT_MATCH = 0.92     # Different term in same skill group
NEAR_MATCH = 0.80        # Semantically related (via embeddings)
INFERRED_MATCH = 0.65    # Implied by a higher-level skill


def find_group_for_skill(skill_term: str) -> Optional[Tuple[str, str]]:
    """
    Check if a skill term belongs to any predefined skill group.

    Returns:
        (group_name, canonical_term) or None
    """
    norm = normalize(skill_term)

    for group_name, variants in SKILL_GROUPS.items():
        for variant in variants:
            if norm == normalize(variant):
                return (group_name, group_name)
            # Partial containment
            if norm in normalize(variant) or normalize(variant) in norm:
                return (group_name, group_name)

    return None


def group_aware_match(
    jd_keywords: List[str],
    resume_keywords: List[str],
    matched_pairs: List[dict],
) -> List[dict]:
    """
    Enhance match results with concept-level grouping.

    For each JD keyword, check if it belongs to a skill group.
    If any resume keyword belongs to the same group, it's a concept match.

    Args:
        jd_keywords: All JD-extracted keywords
        resume_keywords: All resume-extracted keywords
        matched_pairs: Existing direct/fuzzy/semantic matches from matcher.py

    Returns:
        Enhanced matched_pairs with concept matches added
    """
    # Build set of already-matched JD keywords
    already_matched = {normalize(m.get("jd_keyword", "")) for m in matched_pairs}

    # Build resume skill group membership
    resume_groups: Dict[str, List[str]] = {}
    for rk in resume_keywords:
        group_info = find_group_for_skill(rk)
        if group_info:
            gname = group_info[0]
            if gname not in resume_groups:
                resume_groups[gname] = []
            resume_groups[gname].append(rk)

    # Check unmatched JD keywords for concept matches
    concept_matches = []
    for jk in jd_keywords:
        jk_norm = normalize(jk)
        if jk_norm in already_matched:
            continue

        jd_group = find_group_for_skill(jk)
        if not jd_group:
            continue

        gname = jd_group[0]
        if gname in resume_groups:
            # Found a concept match!
            resume_variant = resume_groups[gname][0]  # Use first match
            concept_matches.append({
                "jd_keyword": jk,
                "resume_keyword": resume_variant,
                "match_type": "concept",
                "confidence": CONCEPT_MATCH,
                "group_name": gname,
                "explanation": f"'{jk}' and '{resume_variant}' are both in the '{gname}' skill group",
            })
            already_matched.add(jk_norm)

    # Categorize existing matches
    for m in matched_pairs:
        if "match_type" not in m:
            m["match_type"] = "direct"
        if "confidence" not in m:
            layer = m.get("match_layer", "exact")
            if layer == "exact" or layer == "alias":
                m["confidence"] = DIRECT_MATCH
            elif layer == "fuzzy":
                m["confidence"] = 0.85
            elif layer == "semantic":
                m["confidence"] = NEAR_MATCH
            else:
                m["confidence"] = DIRECT_MATCH

    return matched_pairs + concept_matches


def classify_match_type(match_layer: str, similarity: float = 1.0) -> Tuple[str, float]:
    """Classify a match into direct/concept/near/inferred categories."""
    if match_layer in ("exact", "alias", "kb_exact"):
        return "direct", DIRECT_MATCH
    elif match_layer == "fuzzy":
        return "near", max(0.75, similarity)
    elif match_layer == "semantic":
        if similarity >= 0.85:
            return "concept", CONCEPT_MATCH
        elif similarity >= 0.70:
            return "near", similarity
        else:
            return "inferred", similarity
    return "direct", DIRECT_MATCH
