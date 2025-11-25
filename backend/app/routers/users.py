from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.models import User as UserModel, UserRole
from app.schemas.schemas import User, UserCreate, UserUpdate, Statistics
from app.routers.auth import get_current_user, require_admin
from sqlalchemy import func
from app.models.models import Appeal, Comment

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[User])
async def get_users(
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.query(UserModel).all()
    return users

@router.post("", response_model=User)
async def create_user(
    user: UserCreate,
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing_user = db.query(UserModel).filter(UserModel.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = db.query(UserModel).filter(UserModel.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    if 'password' in update_data:
        update_data['hashed_password'] = get_password_hash(update_data.pop('password'))
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/statistics", response_model=Statistics)
async def get_statistics(
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    total_appeals = db.query(Appeal).count()
    
    appeals_by_category = {}
    category_stats = db.query(
        Appeal.category_id,
        func.count(Appeal.id)
    ).group_by(Appeal.category_id).all()
    
    for cat_id, count in category_stats:
        appeals_by_category[str(cat_id) if cat_id else "Uncategorized"] = count
    
    appeals_by_internal_tag = {}
    from app.models.models import appeal_internal_tags, InternalTag
    tag_stats = db.query(
        InternalTag.name,
        func.count(appeal_internal_tags.c.appeal_id)
    ).join(appeal_internal_tags).group_by(InternalTag.id).all()
    
    for tag_name, count in tag_stats:
        appeals_by_internal_tag[tag_name] = count
    
    total_moderators = db.query(UserModel).filter(UserModel.is_active == True).count()
    
    moderator_activity = []
    moderators = db.query(UserModel).all()
    for moderator in moderators:
        comment_count = db.query(Comment).filter(Comment.user_id == moderator.id).count()
        moderator_activity.append({
            "username": moderator.username,
            "comments": comment_count
        })
    
    return Statistics(
        total_appeals=total_appeals,
        appeals_by_category=appeals_by_category,
        appeals_by_internal_tag=appeals_by_internal_tag,
        total_moderators=total_moderators,
        moderator_activity=moderator_activity
    )
