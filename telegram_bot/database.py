from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, BigInteger, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from typing import Optional
import enum
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "")

if not DATABASE_URL:
    raise Exception("DATABASE_URL environment variable is not set!")

connect_args = {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class AppealStatus(str, enum.Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class AppealStatusConfig(Base):
    __tablename__ = "appeal_status_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    status_key = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#6B7280")
    description = Column(Text, nullable=True)
    order = Column(Integer, default=0)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey('categories.id', ondelete='CASCADE'), nullable=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


appeal_public_tags = Table(
    'appeal_public_tags',
    Base.metadata,
    Column('appeal_id', Integer, ForeignKey('appeals.id', ondelete='CASCADE')),
    Column('tag_id', Integer, ForeignKey('public_tags.id', ondelete='CASCADE'))
)


class PublicTag(Base):
    __tablename__ = "public_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#00C9C8")
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Appeal(Base):
    __tablename__ = "appeals"
    
    id = Column(Integer, primary_key=True, index=True)
    is_anonymous = Column(Boolean, default=False)
    author_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    text = Column(Text, nullable=False)
    status = Column(Enum(AppealStatus), nullable=False, default=AppealStatus.NEW)
    media_files = Column(Text, nullable=True)
    telegram_user_id = Column(BigInteger, nullable=True, index=True)
    telegram_username = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    category = relationship("Category")
    public_tags = relationship("PublicTag", secondary=appeal_public_tags)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_appeals(telegram_user_id: int):
    db = SessionLocal()
    try:
        appeals = db.query(Appeal).filter(
            Appeal.telegram_user_id == telegram_user_id
        ).order_by(Appeal.created_at.desc()).all()
        return appeals
    finally:
        db.close()


def get_appeal_by_id(appeal_id: int):
    db = SessionLocal()
    try:
        appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
        return appeal
    finally:
        db.close()


def get_status_config(status_key: str):
    db = SessionLocal()
    try:
        config = db.query(AppealStatusConfig).filter(
            AppealStatusConfig.status_key == status_key
        ).first()
        return config
    finally:
        db.close()


def get_category_name(category_id: int):
    db = SessionLocal()
    try:
        category = db.query(Category).filter(Category.id == category_id).first()
        return category.name if category else "Не указана"
    finally:
        db.close()


def get_all_status_configs():
    db = SessionLocal()
    try:
        configs = db.query(AppealStatusConfig).filter(
            AppealStatusConfig.status_key.isnot(None),
            AppealStatusConfig.status_key != ""
        ).order_by(AppealStatusConfig.order).all()
        return configs
    finally:
        db.close()


STATUS_EMOJI_MAP = {
    "new": "🆕",
    "in_progress": "🔄",
    "resolved": "✅",
    "rejected": "❌"
}

COLOR_EMOJI_MAP = {
    "#3B82F6": "🔵",
    "#F59E0B": "🟡",
    "#10B981": "🟢",
    "#EF4444": "🔴",
    "#6B7280": "⚪"
}


def get_status_emoji(status_key: str, color: Optional[str] = None) -> str:
    if status_key in STATUS_EMOJI_MAP:
        return STATUS_EMOJI_MAP[status_key]
    if color and color in COLOR_EMOJI_MAP:
        return COLOR_EMOJI_MAP[color]
    return "📋"


def get_color_emoji(color: Optional[str]) -> str:
    if color is None:
        return "⚪"
    return COLOR_EMOJI_MAP.get(color, "⚪")
