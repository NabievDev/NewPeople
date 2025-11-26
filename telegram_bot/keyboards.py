from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder


def get_main_menu_keyboard(webapp_url: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    
    builder.row(
        InlineKeyboardButton(
            text="Подать обращение",
            web_app=WebAppInfo(url=webapp_url)
        )
    )
    
    builder.row(
        InlineKeyboardButton(
            text="Мои обращения",
            callback_data="my_appeals"
        )
    )
    
    return builder.as_markup()


def get_appeals_list_keyboard(appeals: list, page: int = 0, page_size: int = 5) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    
    start_idx = page * page_size
    end_idx = start_idx + page_size
    page_appeals = appeals[start_idx:end_idx]
    
    status_emoji = {
        "new": "🆕",
        "in_progress": "🔄",
        "resolved": "✅",
        "rejected": "❌"
    }
    
    for appeal in page_appeals:
        status = appeal.status.value if hasattr(appeal.status, 'value') else str(appeal.status)
        emoji = status_emoji.get(status, "📋")
        text_preview = appeal.text[:30] + "..." if len(appeal.text) > 30 else appeal.text
        builder.row(
            InlineKeyboardButton(
                text=f"{emoji} #{appeal.id}: {text_preview}",
                callback_data=f"appeal_{appeal.id}"
            )
        )
    
    nav_buttons = []
    total_pages = (len(appeals) + page_size - 1) // page_size
    
    if page > 0:
        nav_buttons.append(
            InlineKeyboardButton(text="◀️ Назад", callback_data=f"appeals_page_{page - 1}")
        )
    
    if page < total_pages - 1:
        nav_buttons.append(
            InlineKeyboardButton(text="Вперед ▶️", callback_data=f"appeals_page_{page + 1}")
        )
    
    if nav_buttons:
        builder.row(*nav_buttons)
    
    builder.row(
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")
    )
    
    return builder.as_markup()


def get_appeal_detail_keyboard(appeal_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    
    builder.row(
        InlineKeyboardButton(text="◀️ К списку обращений", callback_data="my_appeals")
    )
    
    builder.row(
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")
    )
    
    return builder.as_markup()


def get_back_to_menu_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")
    )
    return builder.as_markup()
