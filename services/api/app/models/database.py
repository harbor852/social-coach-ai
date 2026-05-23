"""SQLAlchemy models for the social coach database."""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Text,
    DateTime,
    JSON,
    ForeignKey,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


# --- Users ---


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nickname = Column(String(100), nullable=True)
    age_stage = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    sessions = relationship("TrainingSession", back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    stage = Column(String(20), nullable=True)
    goals = Column(JSON, nullable=True)
    common_challenges = Column(JSON, nullable=True)
    preferred_tone = Column(String(50), nullable=True)
    skill_scores = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile")


# --- Training ---


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    mode = Column(String(50), nullable=True)
    scene_type = Column(String(100), nullable=True)
    status = Column(String(20), default="active")
    summary = Column(JSON, nullable=True)
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
    turns = relationship("TrainingTurn", back_populates="session")


class TrainingTurn(Base):
    __tablename__ = "training_turns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("training_sessions.id"), nullable=False)
    role = Column(String(20), default="user")
    text = Column(Text, nullable=True)
    audio_url = Column(Text, nullable=True)
    transcript = Column(Text, nullable=True)
    audio_features = Column(JSON, nullable=True)
    feedback = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("TrainingSession", back_populates="turns")


class SkillAssessment(Base):
    __tablename__ = "skill_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    session_id = Column(String(36), ForeignKey("training_sessions.id"), nullable=True)
    clarity = Column(Integer, nullable=True)
    logic = Column(Integer, nullable=True)
    evidence = Column(Integer, nullable=True)
    confidence = Column(Integer, nullable=True)
    etiquette = Column(Integer, nullable=True)
    empathy = Column(Integer, nullable=True)
    boundary = Column(Integer, nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class KnowledgeEntry(Base):
    __tablename__ = "knowledge_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    chunks = Column(JSON, nullable=True)        # list[str]
    embeddings = Column(JSON, nullable=True)    # list[list[float]]
    source_type = Column(String(20), default="text")  # "text" | "document"
    created_at = Column(DateTime, server_default=func.now())


# --- Database setup ---


def get_engine(database_url: str = "sqlite:///./social_coach.db"):
    """Create SQLAlchemy engine."""
    return create_engine(database_url, echo=False, connect_args={"check_same_thread": False})


def init_db(database_url: str = "sqlite:///./social_coach.db"):
    """Initialize database tables."""
    engine = get_engine(database_url)
    Base.metadata.create_all(engine)
    return engine


def get_session_factory(engine):
    """Create a session factory."""
    return sessionmaker(bind=engine)
