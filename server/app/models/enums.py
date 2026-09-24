import enum

class UserRole(str, enum.Enum):
    COMMISSIONER = "COMMISSIONER"
    OFFICER = "OFFICER"

class ElectionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"
    RESULTS_PUBLISHED = "RESULTS_PUBLISHED"

class MachineStatus(str, enum.Enum):
    IDLE = "IDLE"
    ACTIVE = "ACTIVE"
    LOCKED = "LOCKED"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"

class VerificationMethod(str, enum.Enum):
    AADHAAR = "AADHAAR"
    VOTER_ID = "VOTER_ID"

class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"

class AuditAction(str, enum.Enum):
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    VOTE_CAST = "VOTE_CAST"
    VERIFY_VOTER = "VERIFY_VOTER"
    LOCK_MACHINE = "LOCK_MACHINE"
    UNLOCK_MACHINE = "UNLOCK_MACHINE"
    PAUSE_POLLING = "PAUSE_POLLING"
    RESUME_POLLING = "RESUME_POLLING"
    CLOSE_POLLING = "CLOSE_POLLING"
    PUBLISH_RESULTS = "PUBLISH_RESULTS"
    BACKUP = "BACKUP"
    RESTORE = "RESTORE"
    EXPORT = "EXPORT"
