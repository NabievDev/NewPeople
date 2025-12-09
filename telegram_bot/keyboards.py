from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder
from database import get_status_emoji


def get_main_menu_keyboard(webapp_url: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    
    if webapp_url:
        builder.row(
            InlineKeyboardButton(
                text="📝 Подать обращение",
                web_app=WebAppInfo(url=webapp_url)
            )
        )
    
    builder.row(
        InlineKeyboardButton(
            text="📋 Мои обращения",
            callback_data="my_appeals"
        )
    )
    
    builder.row(
        InlineKeyboardButton(
            text="📖 Справка",
            callback_data="show_help"
        ),
        InlineKeyboardButton(
            text="ℹ️ О партии",
            callback_data="show_about"
        )
    )
    
    return builder.as_markup()


def get_appeals_list_keyboard(appeals: list, page: int = 0, page_size: int = 5) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    
    start_idx = page * page_size
    end_idx = start_idx + page_size
    page_appeals = appeals[start_idx:end_idx]
    
    for appeal in page_appeals:
        status = appeal.status.value if hasattr(appeal.status, 'value') else str(appeal.status)
        emoji = get_status_emoji(status)
        
        text_preview = appeal.text[:25] + "..." if len(appeal.text) > 25 else appeal.text
        text_preview = text_preview.replace('\n', ' ')
        
        created = appeal.created_at.strftime('%d.%m')
        
        builder.row(
            InlineKeyboardButton(
                text=f"{emoji} #{appeal.id} | {created} | {text_preview}",
                callback_data=f"appeal_{appeal.id}"
            )
        )
    
    nav_buttons = []
    total_pages = (len(appeals) + page_size - 1) // page_size
    
    if page > 0:
        nav_buttons.append(
            InlineKeyboardButton(text="◀️ Назад", callback_data=f"page_{page - 1}")
        )
    
    if total_pages > 1:
        nav_buttons.append(
            InlineKeyboardButton(text=f"📄 {page + 1}/{total_pages}", callback_data="noop")
        )
    
    if page < total_pages - 1:
        nav_buttons.append(
            InlineKeyboardButton(text="Вперёд ▶️", callback_data=f"page_{page + 1}")
        )
    
    if nav_buttons:
        builder.row(*nav_buttons)
    
    builder.row(
        InlineKeyboardButton(text="🔄 Обновить", callback_data="refresh_appeals")
    )
    
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
        InlineKeyboardButton(text="🔄 Обновить статус", callback_data=f"refresh_appeal_{appeal_id}")
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


def get_webapp_appeals_keyboard(webapp_url: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    
    if webapp_url:
        builder.row(
            InlineKeyboardButton(
                text="📱 Открыть расширенный список",
                web_app=WebAppInfo(url=f"{webapp_url}/my-appeals")
            )
        )
    
    builder.row(
        InlineKeyboardButton(text="◀️ Назад", callback_data="my_appeals")
    )
    
    builder.row(
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")
    )
    
    return builder.as_markup()


def get_confirmation_keyboard(action: str, item_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    
    builder.row(
        InlineKeyboardButton(text="✅ Да", callback_data=f"confirm_{action}_{item_id}"),
        InlineKeyboardButton(text="❌ Нет", callback_data="cancel_action")
    )
    
    return builder.as_markup()
