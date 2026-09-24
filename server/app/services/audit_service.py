from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.enums import AuditAction

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: AuditAction,
        module: str,
        description: str,
        user_id: Optional[int] = None,
        election_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Any] = None,
    ) -> AuditLog:
        log_entry = AuditLog(
            userId=user_id,
            electionId=election_id,
            action=action,
            module=module,
            description=description,
            ipAddress=ip_address,
            userAgent=user_agent,
            metadata_=metadata,
        )
        db.add(log_entry)
        db.commit()
        return log_entry

audit_service = AuditService()
