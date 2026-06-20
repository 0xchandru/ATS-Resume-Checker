import logging
import threading

logger = logging.getLogger(__name__)

_spacy_model = None
_spacy_lock = threading.Lock()

_st_model = None
_st_lock = threading.Lock()
_st_loaded = False


def get_spacy():
    global _spacy_model
    if _spacy_model is None:
        with _spacy_lock:
            if _spacy_model is None:
                import spacy
                try:
                    _spacy_model = spacy.load("en_core_web_sm")
                    logger.info("spaCy en_core_web_sm loaded")
                except OSError:
                    logger.warning("en_core_web_sm not found, downloading...")
                    from spacy.cli import download
                    download("en_core_web_sm")
                    _spacy_model = spacy.load("en_core_web_sm")
    return _spacy_model


def get_sentence_transformer():
    global _st_model, _st_loaded
    if not _st_loaded:
        with _st_lock:
            if not _st_loaded:
                from sentence_transformers import SentenceTransformer
                logger.info("Loading sentence-transformers all-MiniLM-L6-v2 (lazy)...")
                _st_model = SentenceTransformer("all-MiniLM-L6-v2")
                _st_loaded = True
                logger.info("sentence-transformers loaded")
    return _st_model
