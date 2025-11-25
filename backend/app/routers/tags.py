from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import PublicTag, InternalTag, User
from app.schemas.schemas import Tag, TagCreate
from app.routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("/public", response_model=List[Tag])
async def get_public_tags(db: Session = Depends(get_db)):
    tags = db.query(PublicTag).all()
    return tags

@router.post("/public", response_model=Tag)
async def create_public_tag(
    tag: TagCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    db_tag = PublicTag(**tag.model_dump())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag

@router.delete("/public/{tag_id}")
async def delete_public_tag(
    tag_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    tag = db.query(PublicTag).filter(PublicTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return {"message": "Tag deleted successfully"}

@router.get("/internal", response_model=List[Tag])
async def get_internal_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tags = db.query(InternalTag).all()
    return tags

@router.post("/internal", response_model=Tag)
async def create_internal_tag(
    tag: TagCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    db_tag = InternalTag(**tag.model_dump())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag

@router.delete("/internal/{tag_id}")
async def delete_internal_tag(
    tag_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    tag = db.query(InternalTag).filter(InternalTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return {"message": "Tag deleted successfully"}
