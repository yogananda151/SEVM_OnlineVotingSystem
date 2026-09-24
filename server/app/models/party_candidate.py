from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class PoliticalParty(Base):
    __tablename__ = "political_parties"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    abbreviation = Column(String(20), nullable=False)
    symbol = Column(String(255), nullable=True)
    symbolUrl = Column(String(500), nullable=True)
    color = Column(String(7), default="#1a73e8", nullable=False)
    foundedYear = Column(Integer, nullable=True)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    candidates = relationship("Candidate", back_populates="party")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    electionId = Column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), nullable=False, index=True)
    constituencyId = Column(Integer, ForeignKey("constituencies.id", ondelete="RESTRICT"), nullable=False, index=True)
    partyId = Column(Integer, ForeignKey("political_parties.id", ondelete="SET NULL"), nullable=True, index=True)
    fullName = Column(String(150), nullable=False)
    photoUrl = Column(String(500), nullable=True)
    age = Column(Integer, nullable=False)
    qualification = Column(String(200), nullable=True)
    serialNumber = Column(Integer, nullable=False)
    isIndependent = Column(Boolean, default=False, nullable=False)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    election = relationship("Election", back_populates="candidates")
    constituency = relationship("Constituency", back_populates="candidates")
    party = relationship("PoliticalParty", back_populates="candidates")
    votes = relationship("Vote", back_populates="candidate")
    vvpatRecords = relationship("DigitalVVPAT", back_populates="candidate")

    __table_args__ = (
        UniqueConstraint("electionId", "constituencyId", "serialNumber", name="candidates_electionId_constituencyId_serialNumber_key"),
    )
