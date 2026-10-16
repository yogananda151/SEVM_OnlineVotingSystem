import sys
import os
import getpass
from datetime import datetime

# Add server directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine, check_db_connection
from app.config import settings
from app.models.enums import UserRole, ElectionStatus, MachineStatus, AuditAction
from app.models.user import User, ElectionCommissioner, ElectionOfficer
from app.models.location import Region, Constituency, PollingStation
from app.models.election import Election, ElectionConstituency
from app.models.party_candidate import PoliticalParty, Candidate
from app.models.voter import Voter
from app.models.system import Setting
from app.models.audit import AuditLog
from app.utils.crypto import hash_password
import app.models  # load models


def _get_account_password(env_var_name: str, account_label: str) -> str:
    """Safely retrieves password from environment variable, interactive prompt, or dev fallback."""
    # 1. Check environment variable / settings
    pwd = os.environ.get(env_var_name) or getattr(settings, env_var_name, None)
    if pwd and pwd.strip():
        return pwd.strip()

    # 2. Interactive prompt if in terminal
    if sys.stdin.isatty():
        print(f"[*] Enter initial password for {account_label} (will not be echoed):")
        pwd = getpass.getpass(f"  {account_label} Password: ")
        if pwd and len(pwd.strip()) >= 8:
            return pwd.strip()
        print("[WARN] Password entered was too short (minimum 8 characters required).")

    # 3. Development-only fallback if allowed
    if settings.ENV.lower() != "production":
        dev_default = "Admin@DevPass2025!" if "COMMISSIONER" in env_var_name else "Officer@DevPass2025!"
        print(
            f"[INFO] Using development fallback password for {account_label}. "
            f"Set {env_var_name} in production."
        )
        return dev_default

    raise ValueError(
        f"Missing required environment variable '{env_var_name}' to initialize {account_label}. "
        "In production, initial credentials must be supplied via environment variables."
    )


def seed_database():
    print("=" * 60)
    print("  SMART EVM – SYNTHETIC DATA SEEDER")
    print(f"  Target: {settings.safe_database_url}")
    print("=" * 60)

    connected, msg = check_db_connection()
    if not connected:
        print(f"[ERROR] Cannot connect to database: {msg}")
        sys.exit(1)

    # Ensure schema exists
    Base.metadata.create_all(bind=engine)
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
            s = db.query(Setting).filter(Setting.key == key).first()
            if not s:
                db.add(Setting(key=key, value=val, group=grp, label=label))
        db.commit()
        print("[OK] System settings verified.")

        # 2. Chief Election Commissioner (Admin)
        comm_email = "commissioner@evm.gov.in"
        comm_user = db.query(User).filter(User.email == comm_email).first()
        if not comm_user:
            comm_pwd = _get_account_password("SEED_COMMISSIONER_PASSWORD", "Chief Election Commissioner")
            comm_user = User(
                email=comm_email,
                passwordHash=hash_password(comm_pwd),
                role=UserRole.COMMISSIONER,
                isActive=True,
            )
            db.add(comm_user)
            db.flush()
            comm = ElectionCommissioner(
                userId=comm_user.id,
                fullName="Chief Election Commissioner",
                employeeId="ECI-0001",
                phone="+91-9000000001",
                designation="Chief Election Commissioner",
            )
            db.add(comm)
            db.commit()
            print(f"[OK] Commissioner account created for '{comm_email}'. (Password securely stored)")
        else:
            print(f"[INFO] Commissioner account '{comm_email}' already exists. Existing credentials preserved.")

        # 3. Political Parties (Synthetic)
        parties_data = [
            (1, "National Democratic Alliance", "NDA", "Lotus", "#FF6B35", 1998),
            (2, "United Progressive Alliance", "UPA", "Hand", "#2196F3", 2004),
            (3, "People's Progressive Party", "PPP", "Rising Sun", "#4CAF50", 2010),
        ]
        parties = {}
        for pid, name, abbr, sym, color, year in parties_data:
            p = db.query(PoliticalParty).filter(PoliticalParty.id == pid).first()
            if not p:
                p = PoliticalParty(
                    id=pid,
                    name=name,
                    abbreviation=abbr,
                    symbol=sym,
                    color=color,
                    foundedYear=year,
                )
                db.add(p)
                db.commit()
            parties[pid] = p
        print("[OK] Political parties verified.")

        # 4. Election (Synthetic Demonstration)
        election = db.query(Election).filter(Election.id == 1).first()
        if not election:
            election = Election(
                id=1,
                name="General Elections 2025",
                description="Indian General Elections – Lok Sabha 2025 (Simulation)",
                electionType="General",
                scheduledDate=datetime(2025, 4, 15),
                status=ElectionStatus.DRAFT,
            )
            db.add(election)
            db.commit()
            print("[OK] Synthetic Election created.")
        else:
            print("[INFO] Election already exists.")

        # 5. Region
        region = db.query(Region).filter(Region.code == "REG-DL").first()
        if not region:
            region = Region(
                name="National Capital Territory of Delhi",
                code="REG-DL",
                description="Delhi NCT Region",
                isActive=True,
            )
            db.add(region)
            db.commit()
            db.refresh(region)
            print("[OK] Region verified.")

        # 6. Constituency
        constituency = db.query(Constituency).filter(Constituency.code == "DL-01").first()
        if not constituency:
            constituency = Constituency(
                regionId=region.id,
                name="Central Delhi",
                code="DL-01",
                description="Central Delhi Parliamentary Constituency",
                isActive=True,
            )
            db.add(constituency)
            db.commit()
            db.refresh(constituency)
            print("[OK] Constituency verified.")

        # Link Election & Constituency
        link = (
            db.query(ElectionConstituency)
            .filter(
                ElectionConstituency.electionId == election.id,
                ElectionConstituency.constituencyId == constituency.id,
            )
            .first()
        )
        if not link:
            db.add(ElectionConstituency(electionId=election.id, constituencyId=constituency.id))
            db.commit()
            print("[OK] Election constituency link created.")

        # 7. Polling Station
        station = db.query(PollingStation).filter(PollingStation.code == "PS-DL-001").first()
        if not station:
            station = PollingStation(
                constituencyId=constituency.id,
                name="Government Primary School – Booth 1",
                code="PS-DL-001",
                address="12, Rajendra Prasad Road, New Delhi – 110001",
                totalBooths=1,
            )
            db.add(station)
            db.commit()
            db.refresh(station)
            print("[OK] Polling station verified.")

        # 8. Polling Officer Account
        officer_email = "officer1@evm.gov.in"
        officer_user = db.query(User).filter(User.email == officer_email).first()
        if not officer_user:
            officer_pwd = _get_account_password("SEED_OFFICER_PASSWORD", "Polling Officer")
            officer_user = User(
                email=officer_email,
                passwordHash=hash_password(officer_pwd),
                role=UserRole.OFFICER,
                isActive=True,
            )
            db.add(officer_user)
            db.flush()
            officer = ElectionOfficer(
                userId=officer_user.id,
                fullName="Rajesh Kumar Singh",
                employeeId="EO-DL-001",
                phone="+91-9000000002",
                pollingStationId=station.id,
            )
            db.add(officer)
            db.commit()
            db.refresh(officer)
            election.officerId = officer.id
            db.commit()
            print(f"[OK] Polling Officer created for '{officer_email}'. (Password securely stored)")
        else:
            print(f"[INFO] Officer account '{officer_email}' already exists. Existing credentials preserved.")

        # 9. Candidates (Synthetic)
        candidates_data = [
            ("Amit Sharma", 52, "MBA", 1, parties[1].id, False),
            ("Priya Malhotra", 45, "LLB", 2, parties[2].id, False),
            ("Suresh Patel", 58, "B.Com", 3, parties[3].id, False),
            ("Independent Candidate", 40, "Graduate", 4, None, True),
        ]
        for name, age, qual, sno, party_id, is_ind in candidates_data:
            c = (
                db.query(Candidate)
                .filter(Candidate.electionId == election.id, Candidate.serialNumber == sno)
                .first()
            )
            if not c:
                db.add(
                    Candidate(
                        electionId=election.id,
                        constituencyId=constituency.id,
                        partyId=party_id,
                        fullName=name,
                        age=age,
                        qualification=qual,
                        serialNumber=sno,
                        isIndependent=is_ind,
                    )
                )
        db.commit()
        print("[OK] Synthetic candidates verified.")

        # 10. Sample Synthetic Voters
        voter_count = db.query(Voter).filter(Voter.constituencyId == constituency.id).count()
        if voter_count == 0:
            for i in range(1, 21):
                v = Voter(
                    constituencyId=constituency.id,
                    pollingStationId=station.id,
                    fullName=f"Demonstration Voter {i}",
                    voterId=f"DL/01/001/{i:04d}",
                    aadhaarHash=f"hash_{i:012d}",
                    dateOfBirth=datetime(1975 + (i % 25), (i % 12) + 1, (i % 28) + 1),
                    gender="Female" if i % 3 == 0 else "Male",
                    address=f"{i}, Demonstration Street, New Delhi – 110001",
                    serialNumber=i,
                    phone=f"+91-90000{i:05d}",
                )
                db.add(v)
            db.commit()
            print("[OK] Synthetic demonstration voters created (20 records).")

        # Record Audit Log
        if comm_user:
            audit = AuditLog(
                userId=comm_user.id,
                action=AuditAction.CREATE,
                module="System",
                description="Database seeded with demonstration records via Python FastAPI.",
                ipAddress="127.0.0.1",
            )
            db.add(audit)
            db.commit()

        # Run candidate party symbol arrangement if available
        try:
            from scripts.arrange_parties_candidates import arrange_parties_and_candidates
            arrange_parties_and_candidates()
        except Exception as e:
            print(f"[INFO] Skipping candidate symbol arrangement: {e}")

        print("=" * 60)
        print("  SEEDING COMPLETE")
        print("  All initial demonstration data is verified and idempotent.")
        print(f"  Commissioner login: {comm_email}")
        print(f"  Officer login:      {officer_email}")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during database seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
