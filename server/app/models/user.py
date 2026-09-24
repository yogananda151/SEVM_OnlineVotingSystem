from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enums import UserRole

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    passwordHash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, index=True)
    isActive = Column(Boolean, default=True, nullable=False)
    lastLoginAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    commissioner = relationship("ElectionCommissioner", back_populates="user", uselist=False, cascade="all, delete-orphan")
    officer = relationship("ElectionOfficer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    loginLogs = relationship("LoginLog", back_populates="user", cascade="all, delete-orphan")
    auditLogs = relationship("AuditLog", back_populates="user")

class ElectionCommissioner(Base):
    __tablename__ = "election_commissioners"

    id = Column(Integer, primary_key=True, autoincrement=True)
    userId = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    fullName = Column(String(150), nullable=False)
    employeeId = Column(String(50), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    designation = Column(String(100), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="commissioner")

class ElectionOfficer(Base):
    __tablename__ = "election_officers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    userId = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    fullName = Column(String(150), nullable=False)
    employeeId = Column(String(50), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    pollingStationId = Column(Integer, ForeignKey("polling_stations.id", ondelete="SET NULL"), nullable=True, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="officer")
    pollingStation = relationship("PollingStation", back_populates="officers")
    elections = relationship("Election", back_populates="officer")

class LoginLog(Base):
    __tablename__ = "login_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    userId = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ipAddress = Column(String(45), nullable=False)
    userAgent = Column(String(500), nullable=True)
    success = Column(Boolean, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="loginLogs")
