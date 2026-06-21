import os
from dotenv import load_dotenv

# Load root .env file BEFORE importing any other app modules
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

import time  # noqa: E402
import logging  # noqa: E402
# pyrefly: ignore [missing-import]
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from contextlib import asynccontextmanager  # noqa: E402

from backend.app.database import engine, init_db  # noqa: E402
from backend.app.kb_loader import load_knowledge_base  # noqa: E402
from backend.app.routers import upload, analyze, history, compare, export, evaluate, cover_letter, portfolio  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)

_start_time = time.time()
_kb_initialized = False
_kb_tables_loaded = 0
_spacy_loaded = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _kb_initialized, _kb_tables_loaded, _spacy_loaded
    logger.info("Starting ATS Resume Checker backend...")
    init_db()
    try:
        load_knowledge_base()
        _kb_initialized = True
        from sqlalchemy import text, inspect
        insp = inspect(engine)
        _kb_tables_loaded = len([t for t in insp.get_table_names() if t.startswith("kb_")])
        logger.info("KB tables loaded: %d", _kb_tables_loaded)
    except Exception as e:
        logger.error("KB initialization failed: %s", e)
    try:
        from backend.app.engine.embeddings import get_spacy
        get_spacy()
        _spacy_loaded = True
        logger.info("spaCy model ready")
    except Exception as e:
        logger.warning("spaCy preload failed (will load on first request): %s", e)
    logger.info("Backend ready on port %s", os.environ.get("PORT", "8787"))
    yield
    logger.info("Backend shutting down")


app = FastAPI(
    title="ATS Resume Checker API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(compare.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(evaluate.router, prefix="/api")
app.include_router(cover_letter.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")


@app.get("/api/health")
def health():
    from backend.app.engine.embeddings import _st_loaded
    return {
        "status": "ok",
        "version": "2.0.0",
        "kb_initialized": _kb_initialized,
        "kb_tables_loaded": _kb_tables_loaded,
        "spacy_model": "en_core_web_sm",
        "sentence_transformer_loaded": _st_loaded,
        "db_path": str(engine.url),
        "uptime_seconds": round(time.time() - _start_time, 1),
    }


@app.get("/api/healthz")
def healthz():
    return {"status": "ok"}
