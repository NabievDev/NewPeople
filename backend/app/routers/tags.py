from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import PublicTag, InternalTag, User
from app.schemas.schemas import Tag, TagCreate
from app.routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("", response_model=List[Tag])
async def get_all_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    public_tags = db.query(PublicTag).all()
    internal_tags = db.query(InternalTag).all()
    all_tags = []
    for tag in public_tags:
        all_tags.append(Tag(id=tag.id, name=tag.name, color=tag.color or "#00C9C8", is_public=True, created_at=tag.created_at))
    for tag in internal_tags:
        all_tags.append(Tag(id=tag.id, name=tag.name, color=tag.color or "#6B7280", is_public=False, created_at=tag.created_at))
    return all_tags

@router.get("/public", response_model=List[Tag])
async def get_public_tags(db: Session = Depends(get_db)):
    tags = db.query(PublicTag).all()
    return [Tag(id=tag.id, name=tag.name, color=tag.color or "#00C9C8", is_public=True, created_at=tag.created_at) for tag in tags]

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
    return Tag(id=db_tag.id, name=db_tag.name, color=db_tag.color or "#00C9C8", is_public=True, created_at=db_tag.created_at)

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
    return [Tag(id=tag.id, name=tag.name, color=tag.color or "#6B7280", is_public=False, created_at=tag.created_at) for tag in tags]

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
    return Tag(id=db_tag.id, name=db_tag.name, color=db_tag.color or "#6B7280", is_public=False, created_at=db_tag.created_at)

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
