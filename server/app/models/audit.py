from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import AuditAction

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    userId = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    electionId = Column(Integer, ForeignKey("elections.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(SQLEnum(AuditAction), nullable=False, index=True)
    module = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    ipAddress = Column(String(45), nullable=True)
    userAgent = Column(String(500), nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="auditLogs")
    election = relationship("Election", back_populates="auditLogs")
