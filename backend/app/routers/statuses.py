from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import AppealStatusConfig as AppealStatusConfigModel, User
from app.schemas.schemas import (
    AppealStatusConfig,
    AppealStatusConfigCreate,
    AppealStatusConfigUpdate,
    StatusReorder
)
from app.routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/statuses", tags=["statuses"])

@router.get("", response_model=List[AppealStatusConfig])
async def get_all_statuses(db: Session = Depends(get_db)):
    statuses = db.query(AppealStatusConfigModel).order_by(AppealStatusConfigModel.order).all()
    return statuses

@router.post("", response_model=AppealStatusConfig)
async def create_status(
    status: AppealStatusConfigCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(AppealStatusConfigModel).filter(
        AppealStatusConfigModel.status_key == status.status_key
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Status with this key already exists")
    
    max_order = db.query(AppealStatusConfigModel).count()
    db_status = AppealStatusConfigModel(
        **status.model_dump(),
        order=max_order,
        is_system=False
    )
    db.add(db_status)
    db.commit()
    db.refresh(db_status)
    return db_status

@router.patch("/{status_id}", response_model=AppealStatusConfig)
async def update_status(
    status_id: int,
    status_update: AppealStatusConfigUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    status = db.query(AppealStatusConfigModel).filter(AppealStatusConfigModel.id == status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    update_data = status_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(status, field, value)
    
    db.commit()
    db.refresh(status)
    return status

@router.put("/reorder")
async def reorder_statuses(
    reorder_data: StatusReorder,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    for index, status_id in enumerate(reorder_data.status_ids):
        status = db.query(AppealStatusConfigModel).filter(AppealStatusConfigModel.id == status_id).first()
        if status:
            status.order = index
    db.commit()
    return {"message": "Statuses reordered successfully"}

@router.delete("/{status_id}")
async def delete_status(
    status_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    status = db.query(AppealStatusConfigModel).filter(AppealStatusConfigModel.id == status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    if status.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system status")
    
    db.delete(status)
    db.commit()
    return {"message": "Status deleted successfully"}
