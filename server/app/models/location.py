from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import MachineStatus

class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    constituencies = relationship("Constituency", back_populates="region")

class Constituency(Base):
    __tablename__ = "constituencies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    regionId = Column(Integer, ForeignKey("regions.id", ondelete="RESTRICT"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    region = relationship("Region", back_populates="constituencies")
    pollingStations = relationship("PollingStation", back_populates="constituency")
    electionLinks = relationship("ElectionConstituency", back_populates="constituency")
    candidates = relationship("Candidate", back_populates="constituency")
    voters = relationship("Voter", back_populates="constituency")

class PollingStation(Base):
    __tablename__ = "polling_stations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    constituencyId = Column(Integer, ForeignKey("constituencies.id", ondelete="RESTRICT"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    address = Column(Text, nullable=False)
    capacity = Column(Integer, default=1000, nullable=False)
    totalBooths = Column(Integer, default=1, nullable=False)
    machineStatus = Column(SQLEnum(MachineStatus), default=MachineStatus.IDLE, nullable=False)
    isPollingActive = Column(Boolean, default=False, nullable=False)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    constituency = relationship("Constituency", back_populates="pollingStations")
    officers = relationship("ElectionOfficer", back_populates="pollingStation")
    voters = relationship("Voter", back_populates="pollingStation")
    votes = relationship("Vote", back_populates="pollingStation")
