from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from database import get_status_config, get_status_emoji, get_color_emoji
import logging

logger = logging.getLogger(__name__)


def get_notification_keyboard(appeal_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(
            text="📄 Посмотреть обращение",
            callback_data=f"appeal_{appeal_id}"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="📋 Все мои обращения",
            callback_data="my_appeals"
        )
    )
    return builder.as_markup()


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
        
        new_status_name = str(new_status_config.name) if new_status_config else new_status
        old_status_name = str(old_status_config.name) if old_status_config else old_status
        new_status_description = str(new_status_config.description) if new_status_config and new_status_config.description else ""
        
        new_emoji = get_status_emoji(new_status, str(new_status_config.color) if new_status_config and new_status_config.color else None)
        old_emoji = get_status_emoji(old_status, str(old_status_config.color) if old_status_config and old_status_config.color else None)
        new_color = get_color_emoji(str(new_status_config.color) if new_status_config and new_status_config.color else None)
        
        if new_status == "resolved":
            header = "🎉 <b>Отличные новости!</b>"
            intro = "Ваше обращение было успешно рассмотрено:"
        elif new_status == "in_progress":
            header = "📢 <b>Обновление статуса</b>"
            intro = "Ваше обращение взято в работу:"
        elif new_status == "rejected":
            header = "📢 <b>Уведомление</b>"
            intro = "Статус вашего обращения изменился:"
        else:
            header = "📢 <b>Обновление статуса</b>"
            intro = "Статус вашего обращения изменился:"
        
        message_text = f"""
{header}

{intro}

━━━━━━━━━━━━━━━━━━━━

📋 <b>Обращение #{appeal_id}</b>

{old_emoji} <s>{old_status_name}</s>
        ⬇️
{new_color} {new_emoji} <b>{new_status_name}</b>

{f'<i>{new_status_description}</i>' if new_status_description else ''}

━━━━━━━━━━━━━━━━━━━━

<i>Нажмите кнопку ниже для просмотра деталей</i>
"""
        
        await bot.send_message(
            chat_id=telegram_user_id,
            text=message_text,
            parse_mode=ParseMode.HTML,
            reply_markup=get_notification_keyboard(appeal_id)
        )
        
        logger.info(f"Notification sent to user {telegram_user_id} for appeal {appeal_id}: {old_status} -> {new_status}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send notification to user {telegram_user_id}: {e}")
        return False
