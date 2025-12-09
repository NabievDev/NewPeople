from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey, Table, Enum, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"

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

appeal_public_tags = Table(
    'appeal_public_tags',
    Base.metadata,
    Column('appeal_id', Integer, ForeignKey('appeals.id', ondelete='CASCADE')),
    Column('tag_id', Integer, ForeignKey('public_tags.id', ondelete='CASCADE'))
)

appeal_internal_tags = Table(
    'appeal_internal_tags',
    Base.metadata,
    Column('appeal_id', Integer, ForeignKey('appeals.id', ondelete='CASCADE')),
    Column('tag_id', Integer, ForeignKey('internal_tags.id', ondelete='CASCADE'))
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.MODERATOR)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey('categories.id', ondelete='CASCADE'), nullable=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    parent = relationship("Category", remote_side=[id], backref="subcategories")

class PublicTag(Base):
    __tablename__ = "public_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#00C9C8")
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    appeals = relationship("Appeal", secondary=appeal_public_tags, back_populates="public_tags")

class InternalTag(Base):
    __tablename__ = "internal_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#6B7280")
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    appeals = relationship("Appeal", secondary=appeal_internal_tags, back_populates="internal_tags")

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
    public_tags = relationship("PublicTag", secondary=appeal_public_tags, back_populates="appeals")
    internal_tags = relationship("InternalTag", secondary=appeal_internal_tags, back_populates="appeals")
    comments = relationship("Comment", back_populates="appeal", cascade="all, delete-orphan")
    history = relationship("AppealHistory", back_populates="appeal", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    appeal_id = Column(Integer, ForeignKey('appeals.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    text = Column(Text, nullable=False)
    files = Column(Text, nullable=True)  # JSON array of file paths
    created_at = Column(DateTime, default=datetime.utcnow)
    
    appeal = relationship("Appeal", back_populates="comments")
    user = relationship("User")


class HistoryActionType(str, enum.Enum):
    STATUS_CHANGE = "status_change"
    TAG_ADDED = "tag_added"
    TAG_REMOVED = "tag_removed"
    COMMENT_ADDED = "comment_added"
    FILE_ADDED = "file_added"
    FILE_REMOVED = "file_removed"
    CATEGORY_CHANGED = "category_changed"
    TEXT_EDITED = "text_edited"
    CONTACT_UPDATED = "contact_updated"


class AppealHistory(Base):
    __tablename__ = "appeal_history"
    
    id = Column(Integer, primary_key=True, index=True)
    appeal_id = Column(Integer, ForeignKey('appeals.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action_type = Column(Enum(HistoryActionType), nullable=False)
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    details = Column(Text, nullable=True)  # JSON for additional details like file names, comment text
    created_at = Column(DateTime, default=datetime.utcnow)
    
    appeal = relationship("Appeal", back_populates="history")
    user = relationship("User")


class AdminTelegramId(Base):
    __tablename__ = "admin_telegram_ids"
    
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
