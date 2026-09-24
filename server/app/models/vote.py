from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    voterId = Column(Integer, ForeignKey("voters.id", ondelete="RESTRICT"), nullable=False)
    electionId = Column(Integer, ForeignKey("elections.id", ondelete="RESTRICT"), nullable=False, index=True)
    candidateId = Column(Integer, ForeignKey("candidates.id", ondelete="RESTRICT"), nullable=False, index=True)
    pollingStationId = Column(Integer, ForeignKey("polling_stations.id", ondelete="RESTRICT"), nullable=False, index=True)
    voteHash = Column(String(64), unique=True, nullable=False)
    referenceNumber = Column(String(50), unique=True, nullable=False)
    isVerified = Column(Boolean, default=False, nullable=False)
    castAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    voter = relationship("Voter", back_populates="votes")
    election = relationship("Election", back_populates="votes")
    candidate = relationship("Candidate", back_populates="votes")
    pollingStation = relationship("PollingStation", back_populates="votes")
    vvpat = relationship("DigitalVVPAT", back_populates="vote", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("voterId", "electionId", name="votes_voterId_electionId_key"),
    )

class DigitalVVPAT(Base):
    __tablename__ = "digital_vvpat"

    id = Column(Integer, primary_key=True, autoincrement=True)
    voteId = Column(Integer, ForeignKey("votes.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    candidateId = Column(Integer, ForeignKey("candidates.id", ondelete="RESTRICT"), nullable=False, index=True)
    candidateName = Column(String(150), nullable=False)
    partyName = Column(String(200), nullable=False)
    partySymbolUrl = Column(String(500), nullable=True)
    electionName = Column(String(200), nullable=False)
    referenceNumber = Column(String(50), nullable=False)
    voteHash = Column(String(64), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    vote = relationship("Vote", back_populates="vvpat")
    candidate = relationship("Candidate", back_populates="vvpatRecords")
