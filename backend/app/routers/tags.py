from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import PublicTag, InternalTag, User
from app.schemas.schemas import Tag, TagCreate, TagUpdate, TagReorder
from app.routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("", response_model=List[Tag])
async def get_all_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    public_tags = db.query(PublicTag).order_by(PublicTag.order).all()
    internal_tags = db.query(InternalTag).order_by(InternalTag.order).all()
    all_tags = []
    for tag in public_tags:
        all_tags.append(Tag(id=tag.id, name=tag.name, color=tag.color or "#00C9C8", is_public=True, order=tag.order or 0, created_at=tag.created_at))
    for tag in internal_tags:
        all_tags.append(Tag(id=tag.id, name=tag.name, color=tag.color or "#6B7280", is_public=False, order=tag.order or 0, created_at=tag.created_at))
    return all_tags

@router.get("/public", response_model=List[Tag])
async def get_public_tags(db: Session = Depends(get_db)):
    tags = db.query(PublicTag).order_by(PublicTag.order).all()
    return [Tag(id=tag.id, name=tag.name, color=tag.color or "#00C9C8", is_public=True, order=tag.order or 0, created_at=tag.created_at) for tag in tags]

@router.post("/public", response_model=Tag)
async def create_public_tag(
    tag: TagCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    max_order = db.query(PublicTag).count()
    db_tag = PublicTag(**tag.model_dump(), order=max_order)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return Tag(id=db_tag.id, name=db_tag.name, color=db_tag.color or "#00C9C8", is_public=True, order=db_tag.order or 0, created_at=db_tag.created_at)

@router.patch("/public/{tag_id}", response_model=Tag)
async def update_public_tag(
    tag_id: int,
    tag_update: TagUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    tag = db.query(PublicTag).filter(PublicTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    update_data = tag_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tag, field, value)
    
    db.commit()
    db.refresh(tag)
    return Tag(id=tag.id, name=tag.name, color=tag.color or "#00C9C8", is_public=True, order=tag.order or 0, created_at=tag.created_at)

@router.put("/public/reorder")
async def reorder_public_tags(
    reorder_data: TagReorder,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    for index, tag_id in enumerate(reorder_data.tag_ids):
        tag = db.query(PublicTag).filter(PublicTag.id == tag_id).first()
        if tag:
            tag.order = index
    db.commit()
    return {"message": "Tags reordered successfully"}

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
    tags = db.query(InternalTag).order_by(InternalTag.order).all()
    return [Tag(id=tag.id, name=tag.name, color=tag.color or "#6B7280", is_public=False, order=tag.order or 0, created_at=tag.created_at) for tag in tags]

@router.post("/internal", response_model=Tag)
async def create_internal_tag(
    tag: TagCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    max_order = db.query(InternalTag).count()
    db_tag = InternalTag(**tag.model_dump(), order=max_order)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return Tag(id=db_tag.id, name=db_tag.name, color=db_tag.color or "#6B7280", is_public=False, order=db_tag.order or 0, created_at=db_tag.created_at)

@router.patch("/internal/{tag_id}", response_model=Tag)
async def update_internal_tag(
    tag_id: int,
    tag_update: TagUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    tag = db.query(InternalTag).filter(InternalTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    update_data = tag_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tag, field, value)
    
    db.commit()
    db.refresh(tag)
    return Tag(id=tag.id, name=tag.name, color=tag.color or "#6B7280", is_public=False, order=tag.order or 0, created_at=tag.created_at)

@router.put("/internal/reorder")
async def reorder_internal_tags(
    reorder_data: TagReorder,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    for index, tag_id in enumerate(reorder_data.tag_ids):
        tag = db.query(InternalTag).filter(InternalTag.id == tag_id).first()
        if tag:
            tag.order = index
    db.commit()
    return {"message": "Tags reordered successfully"}

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
