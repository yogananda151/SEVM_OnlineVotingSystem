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

# In-memory storage for burned/used ballot clearance tokens to prevent replay attacks
_burned_tokens = set()

def generate_ballot_token(voter_id: int, election_id: int, polling_station_id: int, expires_in_sec: int = 300) -> str:
    """
    Generates a cryptographically signed, single-use Ballot Clearance Token
    that authorizes the voting machine for exactly one ballot.
    """
    import base64
    payload = {
        "voter_id": voter_id,
        "election_id": election_id,
        "polling_station_id": polling_station_id,
        "nonce": secrets.token_hex(12),
        "exp": int(time.time()) + expires_in_sec,
    }
    encoded_payload = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")
    secret_key = settings.JWT_SECRET.encode("utf-8")
    signature = hmac.new(secret_key, encoded_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{encoded_payload}.{signature}"

def verify_and_burn_ballot_token(token: str, expected_voter_id: int, expected_station_id: int) -> dict:
    """
    Verifies HMAC signature, checks expiry, matches voter & station, and burns the token so it cannot be reused.
    """
    import base64
    if not token or "." not in token:
        raise ValueError("Invalid ballot clearance token format.")
    
    parts = token.split(".")
    if len(parts) != 2:
        raise ValueError("Malformed ballot clearance token.")
        
    encoded_payload, signature = parts
    secret_key = settings.JWT_SECRET.encode("utf-8")
    expected_sig = hmac.new(secret_key, encoded_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    
    if not hmac.compare_digest(signature, expected_sig):
        raise ValueError("Ballot clearance token signature verification failed. Possible fraud or tampering.")
        
    try:
        payload_bytes = base64.urlsafe_b64decode(encoded_payload.encode("utf-8"))
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        raise ValueError("Corrupted ballot token payload.")
        
    now = int(time.time())
    if payload.get("exp", 0) < now:
        raise ValueError("Ballot clearance token has expired. Please verify again at the booth.")
        
    if payload.get("voter_id") != expected_voter_id:
        raise ValueError("Ballot token voter mismatch. Impersonation detected.")
        
    if payload.get("polling_station_id") != expected_station_id:
        raise ValueError("Ballot token station mismatch. Cross-station voting prohibited.")
        
    nonce = payload.get("nonce")
    if nonce in _burned_tokens:
        raise ValueError("This ballot clearance token has ALREADY BEEN USED. Duplicate voting blocked.")
        
    # Atomically burn the token
    _burned_tokens.add(nonce)
    return payload

def compute_chained_vote_hash(election_id: int, candidate_id: int, prev_hash: str, nonce: str, timestamp: str) -> str:
    """
    Computes a cryptographic block-chained hash linking this vote to the previous vote
    in the election, creating an append-only tamper-evident Merkle/blockchain audit trail.
    """
    payload = f"{election_id}:{candidate_id}:{prev_hash}:{nonce}:{timestamp}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

