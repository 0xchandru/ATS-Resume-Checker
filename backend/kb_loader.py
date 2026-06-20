import json
import logging
import os
import re
from sqlalchemy import text
from database import engine, SessionLocal
from models import Base, KbMeta
from config import KB_BASE_PATH, SECTION_DATASET_PATH

logger = logging.getLogger(__name__)


def _normalize(s) -> str:
    if s is None or s == "" or (not isinstance(s, str) and not s):
        return ""
    s = str(s).lower().strip()
    s = re.sub(r"[^\w\s.\-]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _load_json(path: str):
    if not os.path.exists(path):
        logger.warning("KB file not found: %s", path)
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _extract_data(raw):
    """Unwrap the {'_metadata': ..., 'data': ...} wrapper common to all KB files."""
    if isinstance(raw, dict) and "data" in raw:
        return raw["data"]
    return raw


def _ensure_tables(conn):
    Base.metadata.create_all(bind=engine)


def _is_initialized(conn) -> bool:
    try:
        result = conn.execute(text("SELECT value FROM kb_meta WHERE key='kb_initialized'"))
        row = result.fetchone()
        return row is not None and row[0] == "true"
    except Exception:
        return False


def load_knowledge_base():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        if _is_initialized(conn):
            logger.info("Knowledge base already initialized — skipping load")
            return

    logger.info("Initializing knowledge base from JSON files...")
    kb = KB_BASE_PATH

    with engine.begin() as conn:
        _load_skills(conn, kb)
        _load_aliases(conn, kb)
        _load_cyber_skills(conn, kb)
        _load_certifications(conn, kb)
        _load_job_titles(conn, kb)
        _load_onet_occupations(conn, kb)
        _load_action_verbs(conn, kb)
        _load_companies(conn, kb)
        _load_universities(conn, kb)
        _load_jd_frequency(conn, kb)
        _load_section_patterns(conn)
        conn.execute(text("INSERT OR REPLACE INTO kb_meta (key, value) VALUES ('kb_initialized', 'true')"))

    logger.info("Knowledge base initialization complete")


def _load_skills(conn, kb: str):
    rows = []
    files = [
        ("skills/skills_flat_lookup.json", None),
        ("skills/skills_master.json", None),
        ("skills/esco_skills.json", "esco"),
        ("skills/onet_skills.json", "onet"),
        ("skills/onet_software_skills.json", "onet"),
    ]
    categories = {}
    cat_raw = _load_json(os.path.join(kb, "skills/skills_by_category.json"))
    cat_data = _extract_data(cat_raw)
    if cat_data:
        if isinstance(cat_data, dict):
            for cat, items in cat_data.items():
                if isinstance(items, list):
                    for item in items:
                        name = item if isinstance(item, str) else item.get("name", "")
                        categories[_normalize(name)] = cat

    seen = set()
    for fname, source in files:
        data = _extract_data(_load_json(os.path.join(kb, fname)))
        if not data:
            continue
        entries = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
        for entry in entries:
            if isinstance(entry, str):
                name = entry
                cat = categories.get(_normalize(name), None)
                domain = None
            elif isinstance(entry, dict):
                name = entry.get("name") or entry.get("canonical_name") or entry.get("skill") or ""
                cat = entry.get("category") or categories.get(_normalize(name))
                domain = entry.get("domain")
                src = entry.get("source") or source
                source = src or source
            else:
                continue
            if not name:
                continue
            norm = _normalize(name)
            if norm in seen:
                continue
            seen.add(norm)
            rows.append({"canonical_name": name, "normalized": norm, "category": cat, "domain": domain, "source": source or "custom"})

    if rows:
        conn.execute(text("DELETE FROM kb_skills"))
        conn.execute(text(
            "INSERT INTO kb_skills (canonical_name, normalized, category, domain, source) VALUES (:canonical_name, :normalized, :category, :domain, :source)"
        ), rows)
    logger.info("kb_skills: %d rows", len(rows))


def _load_aliases(conn, kb: str):
    rows = []
    files = ["skills/skills_aliases.json", "skills/esco_aliases.json"]
    seen = set()
    for fname in files:
        data = _extract_data(_load_json(os.path.join(kb, fname)))
        if not data:
            continue
        if isinstance(data, dict):
            for alias, canonical in data.items():
                if not alias or not canonical:
                    continue
                an = _normalize(alias)
                if an in seen:
                    continue
                seen.add(an)
                rows.append({"alias": alias, "alias_normalized": an, "canonical_name": canonical if isinstance(canonical, str) else str(canonical), "confidence": 1.0})
        elif isinstance(data, list):
            for entry in data:
                if not isinstance(entry, dict):
                    continue
                alias = entry.get("alias") or entry.get("from") or ""
                canonical = entry.get("canonical") or entry.get("to") or entry.get("canonical_name") or ""
                if not alias or not canonical:
                    continue
                an = _normalize(alias)
                if an in seen:
                    continue
                seen.add(an)
                rows.append({"alias": alias, "alias_normalized": an, "canonical_name": canonical, "confidence": float(entry.get("confidence", 1.0))})

    if rows:
        conn.execute(text("DELETE FROM kb_skill_aliases"))
        conn.execute(text(
            "INSERT OR IGNORE INTO kb_skill_aliases (alias, alias_normalized, canonical_name, confidence) VALUES (:alias, :alias_normalized, :canonical_name, :confidence)"
        ), rows)
    logger.info("kb_skill_aliases: %d rows", len(rows))


def _load_cyber_skills(conn, kb: str):
    rows = []
    files = ["skills/cyber_security_skills_ranked.json", "skills/cyber_security_high_precision.json", "skills/cyber_security_skills.json"]
    seen = set()
    for fname in files:
        data = _extract_data(_load_json(os.path.join(kb, fname)))
        if not data:
            continue
        entries = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
        for i, entry in enumerate(entries):
            if isinstance(entry, str):
                name = entry
                rank = i + 1
                precision = None
                domain = "cybersecurity"
            elif isinstance(entry, dict):
                name = entry.get("skill") or entry.get("name") or entry.get("skill_name") or ""
                rank = entry.get("rank") or (i + 1)
                precision = entry.get("precision_level") or entry.get("precision")
                domain = entry.get("domain") or "cybersecurity"
            else:
                continue
            if not name or name in seen:
                continue
            seen.add(name)
            rows.append({"skill_name": name, "rank": rank, "precision_level": precision, "domain": domain})

    if rows:
        conn.execute(text("DELETE FROM kb_cyber_skills"))
        conn.execute(text(
            "INSERT INTO kb_cyber_skills (skill_name, rank, precision_level, domain) VALUES (:skill_name, :rank, :precision_level, :domain)"
        ), rows)
    logger.info("kb_cyber_skills: %d rows", len(rows))


def _load_certifications(conn, kb: str):
    rows = []
    files = ["certifications/certifications_lookup.json", "certifications/cybersecurity_certifications.json"]
    pattern_rows = []
    seen = set()

    pat_data = _extract_data(_load_json(os.path.join(kb, "certifications/certifications_regex.json")))
    if pat_data:
        entries = pat_data if isinstance(pat_data, list) else []
        for entry in entries:
            if isinstance(entry, dict):
                pattern_rows.append({
                    "canonical_name": entry.get("canonical_name") or entry.get("name") or "",
                    "regex_pattern": entry.get("pattern") or entry.get("regex") or ""
                })

    for fname in files:
        data = _extract_data(_load_json(os.path.join(kb, fname)))
        if not data:
            continue
        entries = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
        for entry in entries:
            if isinstance(entry, str):
                name = entry
                issuer = None
                domain = None
            elif isinstance(entry, dict):
                name = entry.get("canonical_name") or entry.get("name") or entry.get("cert") or ""
                issuer = entry.get("issuer")
                domain = entry.get("domain")
            else:
                continue
            if not name or name in seen:
                continue
            seen.add(name)
            rows.append({"canonical_name": name, "issuer": issuer, "domain": domain})

    if rows:
        conn.execute(text("DELETE FROM kb_certifications"))
        conn.execute(text("INSERT INTO kb_certifications (canonical_name, issuer, domain) VALUES (:canonical_name, :issuer, :domain)"), rows)
    if pattern_rows:
        conn.execute(text("DELETE FROM kb_cert_patterns"))
        conn.execute(text("INSERT INTO kb_cert_patterns (canonical_name, regex_pattern) VALUES (:canonical_name, :regex_pattern)"), pattern_rows)
    logger.info("kb_certifications: %d rows, kb_cert_patterns: %d rows", len(rows), len(pattern_rows))


def _load_job_titles(conn, kb: str):
    rows = []
    files = ["job-titles/job_titles_by_level.json", "job-titles/job_titles_lookup.json", "job-titles/job_titles_master.json", "job-titles/onet_job_titles.json"]
    seen = set()
    for fname in files:
        data = _extract_data(_load_json(os.path.join(kb, fname)))
        if not data:
            continue
        if isinstance(data, dict) and fname.endswith("job_titles_by_level.json"):
            for level, titles in data.items():
                titles_list = titles if isinstance(titles, list) else []
                for t in titles_list:
                    name = t if isinstance(t, str) else t.get("title") or t.get("name") or ""
                    if not name:
                        continue
                    norm = _normalize(name)
                    if norm in seen:
                        continue
                    seen.add(norm)
                    rows.append({"canonical_title": name, "normalized": norm, "seniority_level": level, "onet_soc_code": None})
        else:
            entries = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
            for entry in entries:
                if isinstance(entry, str):
                    name = entry
                    level = None
                    soc = None
                elif isinstance(entry, dict):
                    name = entry.get("title") or entry.get("canonical_title") or entry.get("name") or ""
                    level = entry.get("seniority_level") or entry.get("level")
                    soc = entry.get("soc_code") or entry.get("onet_soc_code")
                else:
                    continue
                if not name:
                    continue
                norm = _normalize(name)
                if norm in seen:
                    continue
                seen.add(norm)
                rows.append({"canonical_title": name, "normalized": norm, "seniority_level": level, "onet_soc_code": soc})

    if rows:
        conn.execute(text("DELETE FROM kb_job_titles"))
        conn.execute(text("INSERT INTO kb_job_titles (canonical_title, normalized, seniority_level, onet_soc_code) VALUES (:canonical_title, :normalized, :seniority_level, :onet_soc_code)"), rows)
    logger.info("kb_job_titles: %d rows", len(rows))


def _load_onet_occupations(conn, kb: str):
    rows = []
    data = _extract_data(_load_json(os.path.join(kb, "job-titles/onet_occupations.json")))
    if data:
        entries = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            soc = entry.get("soc_code") or entry.get("code") or ""
            title = entry.get("title") or entry.get("occupation") or ""
            skills = entry.get("typical_skills") or entry.get("skills") or []
            domain = entry.get("domain")
            if not soc:
                continue
            rows.append({"soc_code": soc, "title": title, "typical_skills": json.dumps(skills), "domain": domain})
    if rows:
        conn.execute(text("DELETE FROM kb_onet_occupations"))
        conn.execute(text("INSERT OR REPLACE INTO kb_onet_occupations (soc_code, title, typical_skills, domain) VALUES (:soc_code, :title, :typical_skills, :domain)"), rows)
    logger.info("kb_onet_occupations: %d rows", len(rows))


def _load_action_verbs(conn, kb: str):
    rows = []
    files = ["action-verbs/action_verbs_by_category.json", "action-verbs/action_verbs_flat_lookup.json", "action-verbs/action_verbs_master.json"]
    seen = set()
    for fname in files:
        data = _extract_data(_load_json(os.path.join(kb, fname)))
        if not data:
            continue
        if isinstance(data, dict) and fname.endswith("action_verbs_by_category.json"):
            for cat, verbs in data.items():
                if cat.startswith("_"):
                    continue
                verbs_list = (verbs.get("verbs") or verbs.get("words") or []) if isinstance(verbs, dict) else (verbs if isinstance(verbs, list) else [])
                for v in verbs_list:
                    verb = v if isinstance(v, str) else v.get("verb") or v.get("word") or ""
                    strength = v.get("strength", 2) if isinstance(v, dict) else 2
                    if not verb or verb.lower() in seen:
                        continue
                    seen.add(verb.lower())
                    rows.append({"verb": verb.lower(), "category": cat, "strength": strength})
        else:
            entries = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
            for entry in entries:
                if isinstance(entry, str):
                    verb = entry
                    cat = "generic"
                    strength = 2
                elif isinstance(entry, dict):
                    verb = entry.get("verb") or entry.get("word") or ""
                    cat = entry.get("category") or "generic"
                    strength = entry.get("strength", 2)
                else:
                    continue
                if not verb or verb.lower() in seen:
                    continue
                seen.add(verb.lower())
                rows.append({"verb": verb.lower(), "category": cat, "strength": strength})
    if rows:
        conn.execute(text("DELETE FROM kb_action_verbs"))
        conn.execute(text("INSERT OR REPLACE INTO kb_action_verbs (verb, category, strength) VALUES (:verb, :category, :strength)"), rows)
    logger.info("kb_action_verbs: %d rows", len(rows))


def _load_companies(conn, kb: str):
    rows = []
    alias_rows = []
    files = ["companies/companies_master.json", "companies/companies_lookup.json"]
    seen = set()
    for fname in files:
        data = _extract_data(_load_json(os.path.join(kb, fname)))
        if not data:
            continue
        entries = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
        for entry in entries:
            if isinstance(entry, str):
                name = entry
                industry = None
                tier = None
            elif isinstance(entry, dict):
                name = entry.get("canonical_name") or entry.get("name") or ""
                industry = entry.get("industry")
                tier = entry.get("tier")
            else:
                continue
            if not name:
                continue
            norm = _normalize(name)
            if norm in seen:
                continue
            seen.add(norm)
            rows.append({"canonical_name": name, "normalized": norm, "industry": industry, "tier": tier})

    alias_data = _extract_data(_load_json(os.path.join(kb, "companies/companies_aliases.json")))
    alias_seen = set()
    if alias_data:
        if isinstance(alias_data, dict):
            for company_key, alias_list in alias_data.items():
                if company_key.startswith("_"):
                    continue
                # Format: {company_id: ["Alias1", "Alias2", ...]} or {alias: canonical}
                if isinstance(alias_list, list):
                    # Use first alias as canonical, rest as aliases
                    canonical = alias_list[0] if alias_list else company_key
                    for alias in alias_list[1:]:
                        if not isinstance(alias, str) or not alias:
                            continue
                        an = _normalize(alias)
                        if an in alias_seen:
                            continue
                        alias_seen.add(an)
                        alias_rows.append({"alias": alias, "alias_normalized": an, "canonical_name": canonical})
                elif isinstance(alias_list, str):
                    # Format: {alias: canonical}
                    alias = company_key
                    an = _normalize(alias)
                    if an not in alias_seen:
                        alias_seen.add(an)
                        alias_rows.append({"alias": alias, "alias_normalized": an, "canonical_name": alias_list})
        elif isinstance(alias_data, list):
            for entry in alias_data:
                if isinstance(entry, dict):
                    alias = entry.get("alias") or ""
                    canonical = entry.get("canonical_name") or entry.get("canonical") or ""
                    if not alias or not canonical:
                        continue
                    an = _normalize(alias)
                    if an in alias_seen:
                        continue
                    alias_seen.add(an)
                    alias_rows.append({"alias": alias, "alias_normalized": an, "canonical_name": canonical})

    if rows:
        conn.execute(text("DELETE FROM kb_companies"))
        conn.execute(text("INSERT INTO kb_companies (canonical_name, normalized, industry, tier) VALUES (:canonical_name, :normalized, :industry, :tier)"), rows)
    if alias_rows:
        conn.execute(text("DELETE FROM kb_company_aliases"))
        conn.execute(text("INSERT OR IGNORE INTO kb_company_aliases (alias, alias_normalized, canonical_name) VALUES (:alias, :alias_normalized, :canonical_name)"), alias_rows)
    logger.info("kb_companies: %d rows, kb_company_aliases: %d rows", len(rows), len(alias_rows))


def _load_universities(conn, kb: str):
    rows = []
    files = ["universities/universities_master.json", "universities/universities_lookup.json"]
    seen = set()
    for fname in files:
        data = _extract_data(_load_json(os.path.join(kb, fname)))
        if not data:
            continue
        entries = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
        for entry in entries:
            if isinstance(entry, str):
                name = entry
                country = None
            elif isinstance(entry, dict):
                name = entry.get("canonical_name") or entry.get("name") or ""
                country = entry.get("country")
            else:
                continue
            if not name:
                continue
            norm = _normalize(name)
            if norm in seen:
                continue
            seen.add(norm)
            rows.append({"canonical_name": name, "normalized": norm, "country": country})
    if rows:
        conn.execute(text("DELETE FROM kb_universities"))
        conn.execute(text("INSERT INTO kb_universities (canonical_name, normalized, country) VALUES (:canonical_name, :normalized, :country)"), rows)
    logger.info("kb_universities: %d rows", len(rows))


def _load_jd_frequency(conn, kb: str):
    rows = []
    data = _extract_data(_load_json(os.path.join(kb, "job-descriptions/jd_keyword_frequency.json")))
    if not data:
        return
    if isinstance(data, dict):
        # Format: {"keyword": count, ...}
        for kw, freq in data.items():
            if not kw or kw.startswith("_"):
                continue
            rows.append({"keyword": kw, "keyword_normalized": _normalize(kw), "role_category": "general", "frequency": float(freq) if isinstance(freq, (int, float)) else 0.0})
    elif isinstance(data, list):
        for entry in data:
            if not isinstance(entry, dict):
                continue
            kw = entry.get("keyword") or entry.get("term") or ""
            role_cat = entry.get("role_category") or entry.get("category") or "general"
            freq = entry.get("frequency") or entry.get("freq") or 0.0
            if not kw:
                continue
            rows.append({"keyword": kw, "keyword_normalized": _normalize(kw), "role_category": role_cat, "frequency": float(freq)})
    if rows:
        conn.execute(text("DELETE FROM kb_jd_frequency"))
        conn.execute(text("INSERT INTO kb_jd_frequency (keyword, keyword_normalized, role_category, frequency) VALUES (:keyword, :keyword_normalized, :role_category, :frequency)"), rows)
    logger.info("kb_jd_frequency: %d rows", len(rows))


def _load_section_patterns(conn):
    rows = []
    data = _load_json(SECTION_DATASET_PATH)
    if not data:
        _load_default_section_patterns(conn)
        return
    entries = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        section = entry.get("section_name") or entry.get("section") or ""
        pattern = entry.get("pattern") or entry.get("regex") or ""
        confidence = float(entry.get("confidence", 0.9))
        if not section or not pattern:
            continue
        rows.append({"section_name": section, "pattern": pattern, "confidence": confidence})
    if rows:
        conn.execute(text("DELETE FROM kb_section_patterns"))
        conn.execute(text("INSERT INTO kb_section_patterns (section_name, pattern, confidence) VALUES (:section_name, :pattern, :confidence)"), rows)
        logger.info("kb_section_patterns: %d rows", len(rows))
    else:
        _load_default_section_patterns(conn)


def _load_default_section_patterns(conn):
    defaults = [
        ("contact_info", r"(?i)^(contact|personal\s+info|contact\s+information|personal\s+details)$", 0.95),
        ("summary", r"(?i)^(summary|professional\s+summary|career\s+summary|profile|objective|career\s+objective|about\s+me)$", 0.95),
        ("experience", r"(?i)^(experience|work\s+experience|professional\s+experience|employment|work\s+history|career\s+history)$", 0.95),
        ("education", r"(?i)^(education|academic|academic\s+background|educational\s+background|qualifications)$", 0.95),
        ("skills", r"(?i)^(skills|technical\s+skills|core\s+competencies|competencies|expertise|technologies)$", 0.95),
        ("projects", r"(?i)^(projects|personal\s+projects|key\s+projects|portfolio|github\s+projects)$", 0.9),
        ("certifications", r"(?i)^(certifications|certificates|credentials|licenses|professional\s+certifications)$", 0.9),
        ("awards", r"(?i)^(awards|honors|achievements|recognition|accomplishments)$", 0.85),
        ("languages", r"(?i)^(languages|language\s+skills)$", 0.9),
        ("volunteer", r"(?i)^(volunteer|volunteering|community\s+service|social\s+work)$", 0.85),
        ("publications", r"(?i)^(publications|research|papers|articles|presentations)$", 0.85),
    ]
    rows = [{"section_name": s, "pattern": p, "confidence": c} for s, p, c in defaults]
    conn.execute(text("DELETE FROM kb_section_patterns"))
    conn.execute(text("INSERT INTO kb_section_patterns (section_name, pattern, confidence) VALUES (:section_name, :pattern, :confidence)"), rows)
    logger.info("kb_section_patterns (default): %d rows", len(rows))
