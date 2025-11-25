from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey, Table, Enum
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
    created_at = Column(DateTime, default=datetime.utcnow)
    
    appeals = relationship("Appeal", secondary=appeal_public_tags, back_populates="public_tags")

class InternalTag(Base):
    __tablename__ = "internal_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#6B7280")
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    category = relationship("Category")
    public_tags = relationship("PublicTag", secondary=appeal_public_tags, back_populates="appeals")
    internal_tags = relationship("InternalTag", secondary=appeal_internal_tags, back_populates="appeals")
    comments = relationship("Comment", back_populates="appeal", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    appeal_id = Column(Integer, ForeignKey('appeals.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    text = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    appeal = relationship("Appeal", back_populates="comments")
    user = relationship("User")
