from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import os
import uuid
from app.core.database import get_db
from app.core.config import settings
from app.models.models import Appeal, User, PublicTag, InternalTag, Comment
from app.schemas.schemas import (
    Appeal as AppealSchema, 
    AppealCreate, 
    AppealUpdate,
    CommentCreate,
    Comment as CommentSchema
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/appeals", tags=["appeals"])

@router.post("", response_model=AppealSchema)
async def create_appeal(
    is_anonymous: bool = Form(False),
    author_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    text: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db)
):
    if not is_anonymous and not email:
        raise HTTPException(status_code=400, detail="Email is required for non-anonymous appeals")
    
    media_file_paths = []
    if files:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        for file in files:
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
            
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            media_file_paths.append(file_path)
    
    appeal = Appeal(
        is_anonymous=is_anonymous,
        author_name=author_name if not is_anonymous else None,
        email=email if not is_anonymous else None,
        phone=phone,
        category_id=category_id,
        text=text,
        media_files=json.dumps(media_file_paths) if media_file_paths else None
    )
    db.add(appeal)
    db.commit()
    db.refresh(appeal)
    return appeal

@router.get("", response_model=List[AppealSchema])
async def get_appeals(
    internal_tag_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Appeal)
    if internal_tag_id:
        query = query.join(Appeal.internal_tags).filter(InternalTag.id == internal_tag_id)
    appeals = query.order_by(Appeal.created_at.desc()).offset(skip).limit(limit).all()
    return appeals

@router.get("/{appeal_id}", response_model=AppealSchema)
async def get_appeal(
    appeal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    return appeal

@router.patch("/{appeal_id}", response_model=AppealSchema)
@router.put("/{appeal_id}", response_model=AppealSchema)
async def update_appeal(
    appeal_id: int,
    appeal_update: AppealUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    if appeal_update.status is not None:
        appeal.status = appeal_update.status
    
    if appeal_update.public_tag_ids is not None:
        appeal.public_tags = db.query(PublicTag).filter(PublicTag.id.in_(appeal_update.public_tag_ids)).all()
    
    if appeal_update.internal_tag_ids is not None:
        appeal.internal_tags = db.query(InternalTag).filter(InternalTag.id.in_(appeal_update.internal_tag_ids)).all()
    
    db.commit()
    db.refresh(appeal)
    return appeal

@router.post("/{appeal_id}/comments", response_model=CommentSchema)
async def add_comment(
    appeal_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    comment = Comment(
        appeal_id=appeal_id,
        user_id=current_user.id,
        text=comment_data.content,
        is_internal=comment_data.is_internal
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@router.get("/{appeal_id}/comments", response_model=List[CommentSchema])
async def get_comments(
    appeal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comments = db.query(Comment).filter(Comment.appeal_id == appeal_id).order_by(Comment.created_at).all()
    return comments

@router.post("/{appeal_id}/tags/{tag_id}")
async def add_tag_to_appeal(
    appeal_id: int,
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    public_tag = db.query(PublicTag).filter(PublicTag.id == tag_id).first()
    if public_tag:
        if public_tag not in appeal.public_tags:
            appeal.public_tags.append(public_tag)
            db.commit()
        return {"message": "Public tag added"}
    
    internal_tag = db.query(InternalTag).filter(InternalTag.id == tag_id).first()
    if internal_tag:
        if internal_tag not in appeal.internal_tags:
            appeal.internal_tags.append(internal_tag)
            db.commit()
        return {"message": "Internal tag added"}
    
    raise HTTPException(status_code=404, detail="Tag not found")

@router.delete("/{appeal_id}/tags/{tag_id}")
async def remove_tag_from_appeal(
    appeal_id: int,
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    public_tag = db.query(PublicTag).filter(PublicTag.id == tag_id).first()
    if public_tag and public_tag in appeal.public_tags:
        appeal.public_tags.remove(public_tag)
        db.commit()
        return {"message": "Public tag removed"}
    
    internal_tag = db.query(InternalTag).filter(InternalTag.id == tag_id).first()
    if internal_tag and internal_tag in appeal.internal_tags:
        appeal.internal_tags.remove(internal_tag)
        db.commit()
        return {"message": "Internal tag removed"}
    
    raise HTTPException(status_code=404, detail="Tag not found or not associated with appeal")
