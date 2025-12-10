from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, BigInteger, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from typing import Optional, List, Dict
import os
from pathlib import Path

USE_SQLITE = os.environ.get("USE_SQLITE", "true").lower() == "true"

if USE_SQLITE:
    db_path = Path(__file__).parent.parent / "backend" / "citizens_appeals.db"
    DATABASE_URL = f"sqlite:///{db_path}"
else:
    DATABASE_URL = os.environ.get("DATABASE_URL", "")
    if not DATABASE_URL:
        raise Exception("DATABASE_URL environment variable is not set!")

connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    engine_kwargs = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


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
    status = Column(String, nullable=False, default="new")
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


def get_user_appeals(telegram_user_id: int) -> List[Appeal]:
    db = SessionLocal()
    try:
        appeals = db.query(Appeal).filter(
            Appeal.telegram_user_id == telegram_user_id
        ).order_by(Appeal.created_at.desc()).all()
        db.expunge_all()
        return appeals
    finally:
        db.close()


def get_appeal_by_id(appeal_id: int) -> Optional[Appeal]:
    db = SessionLocal()
    try:
        appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
        if appeal:
            db.expunge(appeal)
        return appeal
    finally:
        db.close()


def get_status_config(status_key: str) -> Optional[AppealStatusConfig]:
    db = SessionLocal()
    try:
        config = db.query(AppealStatusConfig).filter(
            AppealStatusConfig.status_key == status_key
        ).first()
        if config:
            db.expunge(config)
        return config
    finally:
        db.close()


def get_category_name(category_id: int) -> str:
    db = SessionLocal()
    try:
        category = db.query(Category).filter(Category.id == category_id).first()
        return category.name if category else "Не указана"
    finally:
        db.close()


def get_all_status_configs() -> List[AppealStatusConfig]:
    db = SessionLocal()
    try:
        configs = db.query(AppealStatusConfig).filter(
            AppealStatusConfig.status_key.isnot(None),
            AppealStatusConfig.status_key != ""
        ).order_by(AppealStatusConfig.order).all()
        for config in configs:
            db.expunge(config)
        return configs
    finally:
        db.close()


def get_all_status_configs_dict() -> Dict[str, AppealStatusConfig]:
    configs = get_all_status_configs()
    return {config.status_key: config for config in configs}


COLOR_EMOJI_MAP = {
    "#3B82F6": "🔵",
    "#F59E0B": "🟡",
    "#10B981": "🟢",
    "#EF4444": "🔴",
    "#6B7280": "⚪",
    "#00C9C8": "🔵",
    "#22C55E": "🟢",
}


def get_status_emoji(status_key: str, color: Optional[str] = None) -> str:
    config = get_status_config(status_key)
    if config and config.color:
        emoji = COLOR_EMOJI_MAP.get(config.color)
        if emoji:
            return emoji
    if color and color in COLOR_EMOJI_MAP:
        return COLOR_EMOJI_MAP[color]
    default_emojis = {
        "new": "🆕",
        "in_progress": "🔄",
        "resolved": "✅",
        "rejected": "❌",
    }
    return default_emojis.get(status_key, "📋")


def get_color_emoji(color: Optional[str]) -> str:
    if color is None:
        return "⚪"
    return COLOR_EMOJI_MAP.get(color, "⚪")


def get_status_display_info(status_key: str) -> Dict[str, str]:
    config = get_status_config(status_key)
    if config:
        return {
            "name": config.name,
            "emoji": get_status_emoji(status_key, config.color),
            "description": config.description or "",
            "color": config.color or "#6B7280"
        }
    default_info = {
        "new": {"name": "Новое", "emoji": "🆕", "description": "Обращение только поступило", "color": "#3B82F6"},
        "in_progress": {"name": "В работе", "emoji": "🔄", "description": "Обращение находится в обработке", "color": "#F59E0B"},
        "resolved": {"name": "Решено", "emoji": "✅", "description": "Обращение успешно обработано", "color": "#10B981"},
        "rejected": {"name": "Отклонено", "emoji": "❌", "description": "Обращение отклонено", "color": "#EF4444"},
    }
    return default_info.get(status_key, {"name": status_key, "emoji": "📋", "description": "", "color": "#6B7280"})


def count_appeals_by_status(appeals: List[Appeal]) -> Dict[str, int]:
    status_counts = {}
    for appeal in appeals:
        status = str(appeal.status)
        status_counts[status] = status_counts.get(status, 0) + 1
    return status_counts
