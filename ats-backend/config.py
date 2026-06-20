import os

_HERE = os.path.dirname(os.path.abspath(__file__))

KB_BASE_PATH = os.path.join(_HERE, "..", ".migration-backup", "open-source-tools", "datasets", "knowledge-base")
SECTION_DATASET_PATH = os.path.join(_HERE, "..", ".migration-backup", "open-source-tools", "tools", "section-detection", "section-dataset.json")
DB_PATH = os.path.join(_HERE, "data", "ats_platform.db")
UPLOADS_PATH = os.path.join(_HERE, "uploads")

FUZZY_THRESHOLD = 82
SEMANTIC_THRESHOLD = 0.72
MAX_FILE_SIZE_MB = 10
SUPPORTED_EXTENSIONS = [".pdf", ".docx"]
MAX_HISTORY = 10

SENIORITY_LEVELS = ["intern", "junior", "mid", "senior", "lead", "principal", "director", "vp", "c_suite"]

EXPECTED_SECTIONS = ["contact_info", "summary", "experience", "education", "skills", "projects", "certifications"]

KEYWORD_DENSITY_THRESHOLD = 8

SCORING_WEIGHTS = {
    "keyword_match": 0.35,
    "semantic_relevance": 0.25,
    "section_completeness": 0.15,
    "format_compliance": 0.15,
    "impact_quantification": 0.10,
}

GRADE_THRESHOLDS = [
    (95, "A+"), (90, "A"), (85, "B+"), (75, "B"),
    (65, "C+"), (50, "C"), (35, "D"), (0, "F"),
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
