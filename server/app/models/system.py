from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    electionId = Column(Integer, ForeignKey("elections.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info", nullable=False)
    isRead = Column(Boolean, default=False, nullable=False, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    election = relationship("Election", back_populates="notifications")

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    group = Column(String(50), default="general", nullable=False, index=True)
    label = Column(String(200), nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
