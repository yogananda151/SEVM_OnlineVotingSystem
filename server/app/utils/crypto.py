import hmac
import hashlib
import secrets
import time
import json
import bcrypt
from app.config import settings

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def compare_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def generate_vote_hash(data: dict) -> str:
    payload = json.dumps(data, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def hash_aadhaar(aadhaar: str) -> str:
    secret = settings.AADHAAR_HMAC_SECRET.encode("utf-8")
    return hmac.new(secret, aadhaar.encode("utf-8"), hashlib.sha256).hexdigest()

def generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)

def generate_reference_number() -> str:
    # Base36 encoded timestamp
    timestamp = hex(int(time.time() * 1000))[2:].upper()
    random_bytes = secrets.token_hex(3).upper()
    return f"VOTE-{timestamp}-{random_bytes}"
