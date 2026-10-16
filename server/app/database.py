from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator, Tuple
from app.config import settings

db_url, connect_args = settings.get_database_engine_params()

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> Tuple[bool, str]:
    """Tests live database connectivity safely."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "Database connection operational."
    except Exception as e:
        # Avoid leaking database passwords in error messages
        err_msg = str(e)
        if "@" in err_msg and "://" in err_msg:
            err_msg = "Database connection error (credentials masked)"
        return False, err_msg
