import httpx
import logging
import os

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
