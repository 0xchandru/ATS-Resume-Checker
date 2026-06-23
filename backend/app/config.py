import os

_HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _find_kb_base() -> str:
    """Locate the knowledge-base dataset directory."""
    candidates = [
        os.path.join(_HERE, "data", "kb"),
        os.path.join(_HERE, "data", "knowledge-base"),
    ]
    for path in candidates:
        if os.path.isdir(path):
            return path
    return candidates[0]

def _find_section_dataset() -> str:
    candidates = [
        os.path.join(_HERE, "data", "section-dataset.json"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return candidates[0]

KB_BASE_PATH = _find_kb_base()
SECTION_DATASET_PATH = _find_section_dataset()
DB_PATH = os.environ.get("DB_PATH", os.path.join(_HERE, "data", "ats_platform.db"))
UPLOADS_PATH = os.path.join(_HERE, "uploads")

FUZZY_THRESHOLD = 82
SEMANTIC_THRESHOLD = 0.68
MAX_FILE_SIZE_MB = 10
SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt"]
MAX_HISTORY = 10

SENIORITY_LEVELS = ["intern", "junior", "mid", "senior", "lead", "principal", "director", "vp", "c_suite"]

EXPECTED_SECTIONS = ["contact_info", "summary", "experience", "education", "skills", "projects"]
OPTIONAL_SECTIONS = ["certifications", "publications", "awards", "volunteer", "languages"]

KEYWORD_DENSITY_THRESHOLD = 15

# ── Scoring weights ─────────────────────────────────────────────────────────
# keyword_match is the primary ATS signal; format_compliance is critical
# because unparseable resumes score 0 in Workday/Taleo; semantic_relevance
# is downweighted because en_core_web_sm cannot do deep matching.
SCORING_WEIGHTS = {
    "keyword_match": 0.40,
    "semantic_relevance": 0.15,
    "section_completeness": 0.10,
    "format_compliance": 0.25,
    "impact_quantification": 0.10,
}

GRADE_THRESHOLDS = [
    (90, "A+"), (82, "A"), (74, "B+"), (65, "B"),
    (55, "C+"), (44, "C"), (33, "D"), (0, "F"),
]

CYBER_DETECTION_THRESHOLD = 0.15

LAYER_MULTIPLIERS = {
    "alias": 1.0,
    "exact": 1.0,
    "kb_lookup": 0.98,
    "fuzzy": 0.85,
    "semantic": 0.75,
}

IMPORTANCE_THRESHOLDS = {
    "critical": 0.8,
    "high": 0.6,
    "medium": 0.4,
}

WEAK_VERB_STRENGTH = 1
STRONG_VERB_RATIO_THRESHOLD = 0.6
QUANTIFICATION_THRESHOLD = 50

# ── SOC Analyst Tier Scoring ─────────────────────────────────────────────────
# Controls how much the overall score is softened for each seniority tier.
# A leniency of 0.20 means the raw score is nudged 20% toward a higher ceiling
# so that fresher candidates are not penalised for not having 3+ years of tools.
SOC_TIER_LENIENCY = {
    "trainee": 0.30,  # 0–6 months experience — very lenient
    "l1":      0.20,  # Tier 1 monitoring role
    "l2":      0.10,  # Intermediate investigation role
    "l3":      0.00,  # Senior / threat-hunting — no leniency
}

# Minimum keyword match score for fresh/trainee candidates before leniency
# adjustment. Prevents a 10% raw score from inflating unrealistically.
SOC_TRAINEE_MIN_KW_SCORE = 20.0
