from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from sqlalchemy.sql import func
from database import Base
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ── ORM models ──────────────────────────────────────────────────────────────

class ScanRecord(Base):
    __tablename__ = "scan_records"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String, unique=True, index=True, nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size_mb = Column(Float)
    jd_length = Column(Integer)
    jd_text = Column(Text)
    file_path = Column(String)
    status = Column(String, default="uploaded")
    created_at = Column(DateTime, server_default=func.now())


class ScanResult(Base):
    __tablename__ = "scan_results"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String, unique=True, index=True, nullable=False)
    overall_score = Column(Float)
    letter_grade = Column(String)
    result_json = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


# ── Knowledge-base ORM models ────────────────────────────────────────────────

class KbMeta(Base):
    __tablename__ = "kb_meta"
    key = Column(String, primary_key=True)
    value = Column(String)


class KbSkill(Base):
    __tablename__ = "kb_skills"
    id = Column(Integer, primary_key=True, autoincrement=True)
    canonical_name = Column(String, nullable=False)
    normalized = Column(String, nullable=False, index=True)
    category = Column(String)
    domain = Column(String)
    source = Column(String)


class KbSkillAlias(Base):
    __tablename__ = "kb_skill_aliases"
    id = Column(Integer, primary_key=True, autoincrement=True)
    alias = Column(String, unique=True, nullable=False)
    alias_normalized = Column(String, nullable=False, index=True)
    canonical_name = Column(String, nullable=False)
    confidence = Column(Float, default=1.0)


class KbCyberSkill(Base):
    __tablename__ = "kb_cyber_skills"
    id = Column(Integer, primary_key=True, autoincrement=True)
    skill_name = Column(String, nullable=False)
    rank = Column(Integer)
    precision_level = Column(String)
    domain = Column(String)


class KbCertification(Base):
    __tablename__ = "kb_certifications"
    id = Column(Integer, primary_key=True, autoincrement=True)
    canonical_name = Column(String, nullable=False)
    issuer = Column(String)
    domain = Column(String)


class KbCertPattern(Base):
    __tablename__ = "kb_cert_patterns"
    id = Column(Integer, primary_key=True, autoincrement=True)
    canonical_name = Column(String, nullable=False)
    regex_pattern = Column(String, nullable=False)


class KbJobTitle(Base):
    __tablename__ = "kb_job_titles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    canonical_title = Column(String, nullable=False)
    normalized = Column(String, nullable=False, index=True)
    seniority_level = Column(String)
    onet_soc_code = Column(String)


class KbOnetOccupation(Base):
    __tablename__ = "kb_onet_occupations"
    soc_code = Column(String, primary_key=True)
    title = Column(String)
    typical_skills = Column(Text)
    domain = Column(String)


class KbActionVerb(Base):
    __tablename__ = "kb_action_verbs"
    verb = Column(String, primary_key=True)
    category = Column(String)
    strength = Column(Integer)


class KbCompany(Base):
    __tablename__ = "kb_companies"
    id = Column(Integer, primary_key=True, autoincrement=True)
    canonical_name = Column(String, nullable=False)
    normalized = Column(String, nullable=False, index=True)
    industry = Column(String)
    tier = Column(String)


class KbCompanyAlias(Base):
    __tablename__ = "kb_company_aliases"
    alias = Column(String, primary_key=True)
    alias_normalized = Column(String, nullable=False, index=True)
    canonical_name = Column(String, nullable=False)


class KbUniversity(Base):
    __tablename__ = "kb_universities"
    id = Column(Integer, primary_key=True, autoincrement=True)
    canonical_name = Column(String, nullable=False)
    normalized = Column(String, nullable=False, index=True)
    country = Column(String)


class KbJdFrequency(Base):
    __tablename__ = "kb_jd_frequency"
    id = Column(Integer, primary_key=True, autoincrement=True)
    keyword = Column(String, nullable=False)
    keyword_normalized = Column(String, nullable=False, index=True)
    role_category = Column(String)
    frequency = Column(Float)


class KbSectionPattern(Base):
    __tablename__ = "kb_section_patterns"
    id = Column(Integer, primary_key=True, autoincrement=True)
    section_name = Column(String, nullable=False)
    pattern = Column(String, nullable=False)
    confidence = Column(Float)


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    scan_id: str
    filename: str
    file_type: str
    file_size_mb: float
    jd_length: int
    status: str


class HistorySummary(BaseModel):
    scan_id: str
    filename: str
    overall_score: float
    letter_grade: str
    timestamp: str
    jd_preview_50_chars: str


class AnalysisResponse(BaseModel):
    scan_id: str
    filename: str
    file_type: str
    timestamp: str
    processing_time_seconds: float
    overall_score: float
    letter_grade: str
    sub_scores: dict
    keywords: dict
    career_intelligence: dict
    action_verbs: dict
    sections: dict
    formatting: dict
    skill_prediction: dict
    cybersecurity_analysis: Optional[dict]
    feedback: List[dict]
    resume_preview: str
    jd_preview: str
