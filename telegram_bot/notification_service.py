from aiogram import Bot
from aiogram.enums import ParseMode
from database import get_status_config
import logging

logger = logging.getLogger(__name__)

STATUS_EMOJI = {
    "new": "🆕",
    "in_progress": "🔄",
    "resolved": "✅",
    "rejected": "❌"
}


async def send_status_notification(
    bot: Bot,
    telegram_user_id: int,
    appeal_id: int,
    old_status: str,
    new_status: str
):
    try:
        new_status_config = get_status_config(new_status)
        old_status_config = get_status_config(old_status)
        
        new_status_name = new_status_config.name if new_status_config else new_status
        old_status_name = old_status_config.name if old_status_config else old_status
        new_status_description = new_status_config.description if new_status_config else ""
        
        new_emoji = STATUS_EMOJI.get(new_status, "📋")
        old_emoji = STATUS_EMOJI.get(old_status, "📋")
        
        message_text = f"""
<b>Изменение статуса обращения</b>

Статус вашего обращения <b>#{appeal_id}</b> изменился:

{old_emoji} <s>{old_status_name}</s>  →  {new_emoji} <b>{new_status_name}</b>

{f'<i>{new_status_description}</i>' if new_status_description else ''}

Для просмотра подробностей нажмите /my_appeals
"""
        
        await bot.send_message(
            chat_id=telegram_user_id,
            text=message_text,
            parse_mode=ParseMode.HTML
        )
        
        logger.info(f"Notification sent to user {telegram_user_id} for appeal {appeal_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send notification to user {telegram_user_id}: {e}")
        return False


