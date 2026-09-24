from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import VerificationMethod, VerificationStatus

class Voter(Base):
    __tablename__ = "voters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    constituencyId = Column(Integer, ForeignKey("constituencies.id", ondelete="RESTRICT"), nullable=False, index=True)
    pollingStationId = Column(Integer, ForeignKey("polling_stations.id", ondelete="RESTRICT"), nullable=False, index=True)
    fullName = Column(String(150), nullable=False)
    voterId = Column(String(50), unique=True, nullable=False, index=True)
    aadhaarHash = Column(String(64), nullable=True)
    dateOfBirth = Column(DateTime, nullable=False)
    gender = Column(String(10), nullable=False)
    address = Column(Text, nullable=False)
    phone = Column(String(20), nullable=True)
    photoUrl = Column(String(500), nullable=True)
    serialNumber = Column(Integer, nullable=False)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    constituency = relationship("Constituency", back_populates="voters")
    pollingStation = relationship("PollingStation", back_populates="voters")
    votes = relationship("Vote", back_populates="voter")
    electionStatuses = relationship("ElectionVoterStatus", back_populates="voter", cascade="all, delete-orphan")
    otpVerifications = relationship("OTPVerification", back_populates="voter", cascade="all, delete-orphan")

class ElectionVoterStatus(Base):
    __tablename__ = "election_voter_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    voterId = Column(Integer, ForeignKey("voters.id", ondelete="CASCADE"), nullable=False, index=True)
    electionId = Column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), nullable=False, index=True)
    hasVoted = Column(Boolean, default=False, nullable=False)
    votedAt = Column(DateTime, nullable=True)

    voter = relationship("Voter", back_populates="electionStatuses")
    election = relationship("Election", back_populates="voterStatuses")

    __table_args__ = (
        UniqueConstraint("voterId", "electionId", name="election_voter_status_voterId_electionId_key"),
    )

class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    voterId = Column(Integer, ForeignKey("voters.id", ondelete="CASCADE"), nullable=False, index=True)
    otp = Column(String(6), nullable=False, index=True)
    method = Column(SQLEnum(VerificationMethod), nullable=False)
    status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.PENDING, nullable=False)
    expiresAt = Column(DateTime, nullable=False)
    verifiedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    voter = relationship("Voter", back_populates="otpVerifications")
