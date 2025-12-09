from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import AdminTelegramId
from app.schemas.schemas import (
    AdminTelegramId as AdminTelegramIdSchema,
    AdminTelegramIdCreate
)
from app.routers.auth import require_admin

router = APIRouter(prefix="/admin-telegram-ids", tags=["admin-notifications"])


@router.get("", response_model=List[AdminTelegramIdSchema])
async def get_admin_telegram_ids(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(AdminTelegramId).order_by(AdminTelegramId.created_at.desc()).all()


@router.post("", response_model=AdminTelegramIdSchema)
async def create_admin_telegram_id(
    data: AdminTelegramIdCreate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(AdminTelegramId).filter(
        AdminTelegramId.telegram_id == data.telegram_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This Telegram ID already exists")
    
    admin_id = AdminTelegramId(
        telegram_id=data.telegram_id,
        name=data.name
    )
    db.add(admin_id)
    db.commit()
    db.refresh(admin_id)
    return admin_id


@router.delete("/{id}")
async def delete_admin_telegram_id(
    id: int,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    admin_id = db.query(AdminTelegramId).filter(AdminTelegramId.id == id).first()
    if not admin_id:
        raise HTTPException(status_code=404, detail="Admin Telegram ID not found")
    
    db.delete(admin_id)
    db.commit()
    return {"message": "Admin Telegram ID deleted"}
