from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from database import get_status_display_info
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
        new_info = get_status_display_info(new_status)
        old_info = get_status_display_info(old_status)
        
        new_status_name = new_info['name']
        old_status_name = old_info['name']
        new_emoji = new_info['emoji']
        old_emoji = old_info['emoji']
        new_description = new_info['description']
        
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
        
        description_line = f'\n<i>{new_description}</i>' if new_description else ''
        
        message_text = f"""
╔══════════════════════════════╗
   {header}
╚══════════════════════════════╝

{intro}

┌─────────────────────────────┐
│ 📋 <b>Обращение #{appeal_id}</b>
└─────────────────────────────┘

{old_emoji} <s>{old_status_name}</s>
      ⬇️
{new_emoji} <b>{new_status_name}</b>{description_line}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<i>👇 Нажмите кнопку для просмотра:</i>
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
