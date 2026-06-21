from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from backend.app.config import DB_PATH
import logging
import os

logger = logging.getLogger(__name__)

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

REQUIRED_TABLES = {"scan_records", "scan_results", "kb_skills"}


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create all tables and verify the required ones exist.

    Imports all ORM models so Base.metadata is fully populated before
    create_all() runs.  Raises RuntimeError if any required table is missing
    after creation (indicates a model/import problem).
    """
    import backend.app.models  # noqa: F401 — ensures every ORM class registers with Base

    Base.metadata.create_all(bind=engine)

    insp = inspect(engine)
    existing = set(insp.get_table_names())
    missing = REQUIRED_TABLES - existing
    if missing:
        raise RuntimeError(
            f"Database initialisation failed — required tables not created: {sorted(missing)}"
        )

    logger.info(
        "Database ready — %d tables present, required tables verified: %s",
        len(existing),
        sorted(REQUIRED_TABLES),
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
