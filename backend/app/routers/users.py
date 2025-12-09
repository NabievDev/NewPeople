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
    from app.models.models import appeal_internal_tags, appeal_public_tags, InternalTag, PublicTag
    from app.schemas.schemas import TagStatistics
    from datetime import datetime
    
    total_appeals = db.query(Appeal).count()
    new_appeals = db.query(Appeal).filter(Appeal.status == "new").count()
    in_progress_appeals = db.query(Appeal).filter(Appeal.status == "in_progress").count()
    resolved_appeals = db.query(Appeal).filter(Appeal.status == "resolved").count()
    rejected_appeals = db.query(Appeal).filter(Appeal.status == "rejected").count()
    
    # Public tag statistics
    public_tag_stats = []
    public_tags = db.query(PublicTag).all()
    for tag in public_tags:
        count = db.query(appeal_public_tags).filter(appeal_public_tags.c.tag_id == tag.id).count()
        public_tag_stats.append(TagStatistics(
            tag_id=tag.id,
            tag_name=tag.name,
            count=count,
            is_public=True
        ))
    
    # Internal tag statistics
    internal_tag_stats = []
    internal_tags = db.query(InternalTag).all()
    for tag in internal_tags:
        count = db.query(appeal_internal_tags).filter(appeal_internal_tags.c.tag_id == tag.id).count()
        internal_tag_stats.append(TagStatistics(
            tag_id=tag.id,
            tag_name=tag.name,
            count=count,
            is_public=False
        ))
    
    # Calculate average resolution time (from new to resolved/rejected)
    resolved_or_rejected = db.query(Appeal).filter(
        Appeal.status.in_(["resolved", "rejected"])
    ).all()
    
    average_resolution_time = None
    if resolved_or_rejected:
        total_seconds = 0
        count = 0
        for appeal in resolved_or_rejected:
            if appeal.created_at and appeal.updated_at:
                diff = appeal.updated_at - appeal.created_at
                total_seconds += diff.total_seconds()
                count += 1
        
        if count > 0:
            avg_seconds = total_seconds / count
            weeks = int(avg_seconds // (7 * 24 * 3600))
            remaining = avg_seconds % (7 * 24 * 3600)
            days = int(remaining // (24 * 3600))
            remaining = remaining % (24 * 3600)
            hours = int(remaining // 3600)
            remaining = remaining % 3600
            minutes = int(remaining // 60)
            
            average_resolution_time = {
                "weeks": weeks,
                "days": days,
                "hours": hours,
                "minutes": minutes
            }
    
    return Statistics(
        total_appeals=total_appeals,
        new_appeals=new_appeals,
        in_progress_appeals=in_progress_appeals,
        resolved_appeals=resolved_appeals,
        rejected_appeals=rejected_appeals,
        public_tag_stats=public_tag_stats,
        internal_tag_stats=internal_tag_stats,
        average_resolution_time=average_resolution_time
    )
