from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, BigInteger, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import os

DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "citizens_appeals.db")
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
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
