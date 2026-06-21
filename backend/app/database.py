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

    # Ensure any new columns added to ORM models are present in existing SQLite tables.
    # SQLAlchemy's create_all() does not alter existing tables, so add missing columns
    # via ALTER TABLE for simple column types to avoid manual migrations in dev.
    for table_name in existing & REQUIRED_TABLES:
        try:
            expected = []
            if table_name in Base.metadata.tables:
                expected = [c.name for c in Base.metadata.tables[table_name].columns]
            else:
                continue

            existing_cols = [c["name"] for c in insp.get_columns(table_name)]
            missing_cols = [c for c in expected if c not in existing_cols]
            if not missing_cols:
                continue

            conn = engine.connect()
            for colname in missing_cols:
                col = Base.metadata.tables[table_name].columns[colname]
                # Map SQLAlchemy types to SQLite types (simple mapping for common types)
                coltype = col.type
                try:
                    from sqlalchemy import String, Integer, Float, Text, DateTime, JSON

                    if isinstance(coltype, Integer):
                        sql_type = "INTEGER"
                    elif isinstance(coltype, Float):
                        sql_type = "REAL"
                    elif isinstance(coltype, (Text,)):
                        sql_type = "TEXT"
                    elif isinstance(coltype, DateTime):
                        sql_type = "TEXT"
                    else:
                        # default to TEXT for String, JSON, and unknown types
                        sql_type = "TEXT"
                except Exception:
                    sql_type = "TEXT"

                alter_sql = f'ALTER TABLE {table_name} ADD COLUMN {colname} {sql_type}'
                try:
                    conn.execute(text(alter_sql))
                    logger.info("Added missing column '%s' to table '%s'", colname, table_name)
                except Exception as e:
                    logger.warning("Failed to add column %s to %s: %s", colname, table_name, e)
            conn.close()
        except Exception:
            # Be conservative: don't crash startup for migration helpers
            logger.exception("Error while checking/adding missing columns for %s", table_name)

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
