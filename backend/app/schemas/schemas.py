from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.models import UserRole, AppealStatus

class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    order: int = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    order: Optional[int] = None

class Category(CategoryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class CategoryTree(Category):
    subcategories: List['CategoryTree'] = []

class TagBase(BaseModel):
    name: str
    color: str = "#00C9C8"

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int
    is_public: bool = True
    created_at: datetime
    
    class Config:
        from_attributes = True

class AppealCreate(BaseModel):
    is_anonymous: bool = False
    author_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category_id: Optional[int] = None
    text: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v, info):
        if not info.data.get('is_anonymous') and not v:
            raise ValueError('Email is required for non-anonymous appeals')
        return v

class AppealUpdate(BaseModel):
    status: Optional[AppealStatus] = None
    public_tag_ids: Optional[List[int]] = None
    internal_tag_ids: Optional[List[int]] = None

class Appeal(BaseModel):
    id: int
    is_anonymous: bool
    author_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    category_id: Optional[int]
    text: str
    status: AppealStatus
    media_files: Optional[str]
    created_at: datetime
    updated_at: datetime
    category: Optional[Category] = None
    public_tags: List[Tag] = []
    internal_tags: List[Tag] = []
    
    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    content: str
    is_internal: bool = False

class Comment(BaseModel):
    id: int
    appeal_id: int
    user_id: int
    text: str
    is_internal: bool
    created_at: datetime
    user: Optional['User'] = None
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.MODERATOR

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class User(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            UserRole: lambda v: str(v).split('.')[-1].lower()
        }

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None

class Statistics(BaseModel):
    total_appeals: int
    appeals_by_category: dict
    appeals_by_internal_tag: dict
    total_moderators: int
    moderator_activity: List[dict]
