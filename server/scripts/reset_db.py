import sys
import os
import json
from datetime import datetime
from sqlalchemy import text, inspect

# Add server directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.enums import UserRole, AuditAction
from app.models.user import User, ElectionCommissioner
from app.models.system import Setting
from app.models.audit import AuditLog
from app.utils.crypto import hash_password


def backup_database():
    """Backup all table data to JSON before wiping."""
    backup_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backups"))
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"backup_before_reset_{timestamp}.json")

    data = {}
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        for t in tables:
            res = conn.execute(text(f"SELECT * FROM `{t}`"))
            cols = list(res.keys())
            rows = []
            for row in res.fetchall():
                row_dict = {}
                for col, val in zip(cols, row):
                    if isinstance(val, (datetime, bytes)):
                        row_dict[col] = str(val)
                    else:
                        row_dict[col] = val
                rows.append(row_dict)
            data[t] = rows

    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)

    total_rows = sum(len(v) for v in data.values())
    print(f"[*] Backup created: {backup_file} ({total_rows} rows saved)")
    return backup_file


def reset_database(create_backup: bool = True):
    print("=" * 60)
    print("  SMART EVM – DATABASE RESET")
    print("=" * 60)

    if create_backup:
        backup_database()

    print("[*] Truncating all database tables...")
    with engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        for table in tables:
            conn.execute(text(f"TRUNCATE TABLE `{table}`;"))
            print(f"  [-] Cleared table: `{table}`")
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()

    print("[*] Initializing fresh baseline system settings and Commissioner...")
    db = SessionLocal()
    try:
        # 1. System Settings
        default_settings = [
            ("app_name", "Smart EVM – Online Voting System", "general", "Application Name"),
            ("app_logo", "", "general", "Application Logo URL"),
            ("otp_expiry_minutes", "5", "security", "OTP Expiry (minutes)"),
            ("session_timeout_minutes", "480", "security", "Session Timeout (minutes)"),
            ("vvpat_display_seconds", "7", "voting", "VVPAT Display Duration (seconds)"),
            ("max_login_attempts", "5", "security", "Max Login Attempts"),
        ]
        for key, val, grp, label in default_settings:
            db.add(Setting(key=key, value=val, group=grp, label=label))
        db.commit()
        print("  [+] Created default system settings")

        # 2. Chief Election Commissioner Admin User
        comm_user = User(
            email="commissioner@evm.gov.in",
            passwordHash=hash_password("Admin@12345"),
            role=UserRole.COMMISSIONER,
            isActive=True,
        )
        db.add(comm_user)
        db.flush()

        comm_profile = ElectionCommissioner(
            userId=comm_user.id,
            fullName="Chief Election Commissioner",
            employeeId="ECI-0001",
            phone="+91-9000000001",
            designation="Chief Election Commissioner",
        )
        db.add(comm_profile)
        db.commit()
        print("  [+] Created Chief Election Commissioner account")

        # 3. Initial Audit Log
        audit = AuditLog(
            userId=comm_user.id,
            action=AuditAction.CREATE,
            module="System",
            description="Database reset to fresh baseline state with Commissioner admin credentials.",
            ipAddress="127.0.0.1",
        )
        db.add(audit)
        db.commit()
        print("  [+] Recorded initial reset audit log")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed during re-initialization: {e}")
        raise
    finally:
        db.close()

    # Verify counts
    print("\n" + "=" * 60)
    print("  CURRENT DATABASE STATUS")
    print("=" * 60)
    with engine.connect() as conn:
        inspector = inspect(engine)
        for t in sorted(inspector.get_table_names()):
            count = conn.execute(text(f"SELECT COUNT(*) FROM `{t}`")).scalar()
            print(f"  {t.ljust(25)} : {count} rows")

    print("\n" + "=" * 60)
    print("  LOGIN CREDENTIALS TO TEST FROM STARTING")
    print("=" * 60)
    print("  Role       : Commissioner (Admin)")
    print("  Email      : commissioner@evm.gov.in")
    print("  Password   : Admin@12345")
    print("  Web Portal : http://localhost:5173")
    print("=" * 60)


if __name__ == "__main__":
    reset_database(create_backup=True)
