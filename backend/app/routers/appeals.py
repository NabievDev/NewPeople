from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from typing import List, Optional
import json
import os
import uuid
from app.core.database import get_db
from app.core.config import settings
from app.models.models import Appeal, User, PublicTag, InternalTag, Comment, AppealHistory, HistoryActionType, AppealStatus
from app.schemas.schemas import (
    Appeal as AppealSchema, 
    AppealCreate, 
    AppealUpdate,
    CommentCreate,
    Comment as CommentSchema,
    AppealHistoryItem
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/appeals", tags=["appeals"])

def add_history_entry(db: Session, appeal_id: int, user_id: int, action_type: HistoryActionType, 
                      old_value: str = None, new_value: str = None, details: str = None):
    history = AppealHistory(
        appeal_id=appeal_id,
        user_id=user_id,
        action_type=action_type,
        old_value=old_value,
        new_value=new_value,
        details=details
    )
    db.add(history)

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
            if file.filename:
                file_extension = os.path.splitext(file.filename)[1]
                unique_filename = f"{uuid.uuid4()}{file_extension}"
                file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
                
                with open(file_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                
                media_file_paths.append({
                    "path": file_path,
                    "original_name": file.filename,
                    "unique_name": unique_filename
                })
    
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

@router.get("/search")
async def search_appeals(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    search_term = f"%{q}%"
    
    # Search in appeal text, author name, and comments
    appeals = db.query(Appeal).outerjoin(Comment).filter(
        or_(
            Appeal.author_name.ilike(search_term),
            Appeal.text.ilike(search_term),
            Appeal.email.ilike(search_term),
            Comment.text.ilike(search_term)
        )
    ).distinct().order_by(Appeal.created_at.desc()).limit(50).all()
    
    return appeals

@router.get("", response_model=List[AppealSchema])
async def get_appeals(
    status: Optional[str] = None,
    public_tag_id: Optional[int] = None,
    internal_tag_id: Optional[int] = None,
    category_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Appeal)
    
    if status:
        query = query.filter(Appeal.status == status)
    
    if public_tag_id:
        query = query.join(Appeal.public_tags).filter(PublicTag.id == public_tag_id)
    
    if internal_tag_id:
        query = query.join(Appeal.internal_tags).filter(InternalTag.id == internal_tag_id)
    
    if category_id:
        query = query.filter(Appeal.category_id == category_id)
    
    appeals = query.order_by(Appeal.created_at.desc()).offset(skip).limit(limit).all()
    return appeals

@router.get("/{appeal_id}", response_model=AppealSchema)
async def get_appeal(
    appeal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).options(
        joinedload(Appeal.comments).joinedload(Comment.user),
        joinedload(Appeal.public_tags),
        joinedload(Appeal.internal_tags),
        joinedload(Appeal.category)
    ).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    return appeal

@router.get("/{appeal_id}/history", response_model=List[AppealHistoryItem])
async def get_appeal_history(
    appeal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    history = db.query(AppealHistory).options(
        joinedload(AppealHistory.user)
    ).filter(AppealHistory.appeal_id == appeal_id).order_by(AppealHistory.created_at.desc()).all()
    return history

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
    
    if appeal_update.status is not None and appeal_update.status != appeal.status:
        old_status = appeal.status.value if appeal.status else None
        new_status = appeal_update.status.value if appeal_update.status else None
        add_history_entry(
            db, appeal_id, current_user.id, 
            HistoryActionType.STATUS_CHANGE,
            old_status, new_status
        )
        appeal.status = appeal_update.status
    
    if appeal_update.public_tag_ids is not None:
        old_tags = set(t.id for t in appeal.public_tags)
        new_tags = set(appeal_update.public_tag_ids)
        
        # Log removed tags
        for tag_id in old_tags - new_tags:
            tag = db.query(PublicTag).filter(PublicTag.id == tag_id).first()
            if tag:
                add_history_entry(
                    db, appeal_id, current_user.id,
                    HistoryActionType.TAG_REMOVED,
                    details=json.dumps({"tag_name": tag.name, "tag_type": "public"})
                )
        
        # Log added tags
        for tag_id in new_tags - old_tags:
            tag = db.query(PublicTag).filter(PublicTag.id == tag_id).first()
            if tag:
                add_history_entry(
                    db, appeal_id, current_user.id,
                    HistoryActionType.TAG_ADDED,
                    details=json.dumps({"tag_name": tag.name, "tag_type": "public"})
                )
        
        appeal.public_tags = db.query(PublicTag).filter(PublicTag.id.in_(appeal_update.public_tag_ids)).all()
    
    if appeal_update.internal_tag_ids is not None:
        old_tags = set(t.id for t in appeal.internal_tags)
        new_tags = set(appeal_update.internal_tag_ids)
        
        # Log removed tags
        for tag_id in old_tags - new_tags:
            tag = db.query(InternalTag).filter(InternalTag.id == tag_id).first()
            if tag:
                add_history_entry(
                    db, appeal_id, current_user.id,
                    HistoryActionType.TAG_REMOVED,
                    details=json.dumps({"tag_name": tag.name, "tag_type": "internal"})
                )
        
        # Log added tags
        for tag_id in new_tags - old_tags:
            tag = db.query(InternalTag).filter(InternalTag.id == tag_id).first()
            if tag:
                add_history_entry(
                    db, appeal_id, current_user.id,
                    HistoryActionType.TAG_ADDED,
                    details=json.dumps({"tag_name": tag.name, "tag_type": "internal"})
                )
        
        appeal.internal_tags = db.query(InternalTag).filter(InternalTag.id.in_(appeal_update.internal_tag_ids)).all()
    
    db.commit()
    db.refresh(appeal)
    return appeal

@router.post("/{appeal_id}/comments", response_model=CommentSchema)
async def add_comment(
    appeal_id: int,
    text: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    file_paths = []
    if files:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        for file in files:
            if file.filename:
                file_extension = os.path.splitext(file.filename)[1]
                unique_filename = f"{uuid.uuid4()}{file_extension}"
                file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
                
                with open(file_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                
                file_paths.append({
                    "path": file_path,
                    "original_name": file.filename,
                    "unique_name": unique_filename
                })
    
    comment = Comment(
        appeal_id=appeal_id,
        user_id=current_user.id,
        text=text,
        files=json.dumps(file_paths) if file_paths else None
    )
    db.add(comment)
    
    # Add history entry
    add_history_entry(
        db, appeal_id, current_user.id,
        HistoryActionType.COMMENT_ADDED,
        details=json.dumps({
            "comment_text": text[:200],
            "files_count": len(file_paths)
        })
    )
    
    db.commit()
    db.refresh(comment)
    return comment

@router.get("/{appeal_id}/comments", response_model=List[CommentSchema])
async def get_comments(
    appeal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comments = db.query(Comment).options(
        joinedload(Comment.user)
    ).filter(Comment.appeal_id == appeal_id).order_by(Comment.created_at).all()
    return comments

@router.post("/{appeal_id}/tags/{tag_id}")
async def add_tag_to_appeal(
    appeal_id: int,
    tag_id: int,
    tag_type: str = Query("public", regex="^(public|internal)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    if tag_type == "public":
        tag = db.query(PublicTag).filter(PublicTag.id == tag_id).first()
        if not tag:
            raise HTTPException(status_code=404, detail="Public tag not found")
        if tag not in appeal.public_tags:
            appeal.public_tags.append(tag)
            add_history_entry(
                db, appeal_id, current_user.id,
                HistoryActionType.TAG_ADDED,
                details=json.dumps({"tag_name": tag.name, "tag_type": "public"})
            )
            db.commit()
        return {"message": "Public tag added"}
    else:
        tag = db.query(InternalTag).filter(InternalTag.id == tag_id).first()
        if not tag:
            raise HTTPException(status_code=404, detail="Internal tag not found")
        if tag not in appeal.internal_tags:
            appeal.internal_tags.append(tag)
            add_history_entry(
                db, appeal_id, current_user.id,
                HistoryActionType.TAG_ADDED,
                details=json.dumps({"tag_name": tag.name, "tag_type": "internal"})
            )
            db.commit()
        return {"message": "Internal tag added"}

@router.delete("/{appeal_id}/tags/{tag_id}")
async def remove_tag_from_appeal(
    appeal_id: int,
    tag_id: int,
    tag_type: str = Query("public", regex="^(public|internal)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    if tag_type == "public":
        tag = db.query(PublicTag).filter(PublicTag.id == tag_id).first()
        if tag and tag in appeal.public_tags:
            appeal.public_tags.remove(tag)
            add_history_entry(
                db, appeal_id, current_user.id,
                HistoryActionType.TAG_REMOVED,
                details=json.dumps({"tag_name": tag.name, "tag_type": "public"})
            )
            db.commit()
            return {"message": "Public tag removed"}
    else:
        tag = db.query(InternalTag).filter(InternalTag.id == tag_id).first()
        if tag and tag in appeal.internal_tags:
            appeal.internal_tags.remove(tag)
            add_history_entry(
                db, appeal_id, current_user.id,
                HistoryActionType.TAG_REMOVED,
                details=json.dumps({"tag_name": tag.name, "tag_type": "internal"})
            )
            db.commit()
            return {"message": "Internal tag removed"}
    
    raise HTTPException(status_code=404, detail="Tag not found or not associated with appeal")

@router.get("/files/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
