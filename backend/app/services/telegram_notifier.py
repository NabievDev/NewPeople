import httpx
import logging
import os
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

TELEGRAM_BOT_URL = os.environ.get("TELEGRAM_BOT_URL", "http://localhost:3001")
NOTIFY_SECRET = os.environ.get("NOTIFY_SECRET", "")


async def notify_status_change(
    telegram_user_id: int,
    appeal_id: int,
    old_status: str,
    new_status: str
):
    try:
        headers = {}
        if NOTIFY_SECRET:
            headers["Authorization"] = f"Bearer {NOTIFY_SECRET}"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TELEGRAM_BOT_URL}/notify",
                json={
                    "telegram_user_id": telegram_user_id,
                    "appeal_id": appeal_id,
                    "old_status": old_status,
                    "new_status": new_status
                },
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                logger.info(f"Notification sent for appeal {appeal_id}")
                return True
            else:
                logger.warning(f"Failed to send notification: {response.status_code}")
                return False
                
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        return False


async def notify_new_appeal_to_admins(
    appeal_id: int,
    text_preview: str,
    category_name: str,
    is_anonymous: bool,
    db: Session
):
    from app.models.models import AdminTelegramId
    
    try:
        admin_ids = db.query(AdminTelegramId).all()
        if not admin_ids:
            logger.info("No admin telegram IDs configured, skipping notification")
            return True
        
        telegram_ids = [admin.telegram_id for admin in admin_ids]
        
        headers = {}
        if NOTIFY_SECRET:
            headers["Authorization"] = f"Bearer {NOTIFY_SECRET}"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TELEGRAM_BOT_URL}/notify_admins",
                json={
                    "appeal_id": appeal_id,
                    "text_preview": text_preview[:200] if text_preview else "",
                    "category_name": category_name or "Без категории",
                    "is_anonymous": is_anonymous,
                    "admin_telegram_ids": telegram_ids
                },
                headers=headers,
                timeout=15.0
            )
            
            if response.status_code == 200:
                logger.info(f"Admin notification sent for new appeal {appeal_id}")
                return True
            else:
                logger.warning(f"Failed to send admin notification: {response.status_code}")
                return False
                
    except Exception as e:
        logger.error(f"Error sending admin notification: {e}")
        return False
