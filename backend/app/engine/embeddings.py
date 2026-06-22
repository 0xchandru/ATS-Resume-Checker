import logging
import threading

logger = logging.getLogger(__name__)

_spacy_model = None
_spacy_lock = threading.Lock()

_st_model = None
_st_lock = threading.Lock()
_st_loaded = False

_keybert_model = None
_keybert_lock = threading.Lock()
_keybert_loaded = False


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


def get_keybert():
    """Return a cached KeyBERT instance backed by the shared ST model.

    Passing the already-loaded SentenceTransformer to KeyBERT prevents it
    from spinning up its own copy of all-MiniLM-L6-v2, which would otherwise
    result in three separate 90 MB model loads (JD extraction, resume
    extraction, semantic matcher) per analysis request.
    """
    global _keybert_model, _keybert_loaded
    if not _keybert_loaded:
        with _keybert_lock:
            if not _keybert_loaded:
                from keybert import KeyBERT
                # Reuse the shared sentence-transformer — avoids loading
                # the model a second time just for keyword extraction.
                shared_st = get_sentence_transformer()
                logger.info("Loading KeyBERT (reusing shared all-MiniLM-L6-v2)…")
                _keybert_model = KeyBERT(model=shared_st)
                _keybert_loaded = True
                logger.info("KeyBERT loaded")
    return _keybert_model
