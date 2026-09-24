from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import ElectionStatus

class Election(Base):
    __tablename__ = "elections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    electionType = Column(String(100), nullable=False)
    scheduledDate = Column(DateTime, nullable=False, index=True)
    startTime = Column(DateTime, nullable=True)
    endTime = Column(DateTime, nullable=True)
    status = Column(SQLEnum(ElectionStatus), default=ElectionStatus.DRAFT, nullable=False, index=True)
    isResultPublished = Column(Boolean, default=False, nullable=False)
    officerId = Column(Integer, ForeignKey("election_officers.id", ondelete="SET NULL"), nullable=True, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    officer = relationship("ElectionOfficer", back_populates="elections")
    electionConstituencies = relationship("ElectionConstituency", back_populates="election", cascade="all, delete-orphan")
    candidates = relationship("Candidate", back_populates="election", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="election")
    voterStatuses = relationship("ElectionVoterStatus", back_populates="election", cascade="all, delete-orphan")
    auditLogs = relationship("AuditLog", back_populates="election")
    notifications = relationship("Notification", back_populates="election")

class ElectionConstituency(Base):
    __tablename__ = "election_constituencies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    electionId = Column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), nullable=False, index=True)
    constituencyId = Column(Integer, ForeignKey("constituencies.id", ondelete="RESTRICT"), nullable=False, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    election = relationship("Election", back_populates="electionConstituencies")
    constituency = relationship("Constituency", back_populates="electionLinks")

    __table_args__ = (
        UniqueConstraint("electionId", "constituencyId", name="election_constituencies_electionId_constituencyId_key"),
    )
