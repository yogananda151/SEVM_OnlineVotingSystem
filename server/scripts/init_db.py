import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import inspect
from app.config import settings
from app.database import engine, Base, check_db_connection
import app.models  # Ensure all SQLAlchemy models are loaded before create_all


def init_schema():
    print("=" * 60)
    print("  SMART EVM – SCHEMA INITIALIZATION")
    print(f"  Target: {settings.safe_database_url}")
    print("=" * 60)

    # 1. Test Connectivity
    connected, msg = check_db_connection()
    if not connected:
        print(f"[ERROR] Cannot connect to database: {msg}")
        sys.exit(1)

    print("[*] Database connectivity verified.")

    # 2. Create Schema
    try:
        print("[*] Creating all database tables from SQLAlchemy metadata...")
        Base.metadata.create_all(bind=engine)
        inspector = inspect(engine)
        tables = sorted(inspector.get_table_names())
        print(f"[OK] Database schema initialized successfully ({len(tables)} tables present):")
        for t in tables:
            print(f"     - {t}")
    except Exception as e:
        print(f"[ERROR] Failed during schema creation: {e}")
        sys.exit(1)

    print("=" * 60)
    print("  Schema ready. Run 'python scripts/seed.py' if you wish to seed sample data.")
    print("=" * 60)


if __name__ == "__main__":
    init_schema()
