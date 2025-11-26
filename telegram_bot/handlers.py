from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
from aiogram.enums import ParseMode
import os

from keyboards import (
    get_main_menu_keyboard, 
    get_appeals_list_keyboard, 
    get_appeal_detail_keyboard,
    get_back_to_menu_keyboard
)
from database import get_user_appeals, get_appeal_by_id, get_status_config, get_category_name

router = Router()

WEBAPP_URL = os.environ.get("WEBAPP_URL", "")

STATUS_NAMES = {
    "new": "Новое",
    "in_progress": "В работе",
    "resolved": "Решено",
    "rejected": "Отклонено"
}

STATUS_EMOJI = {
    "new": "🆕",
    "in_progress": "🔄",
    "resolved": "✅",
    "rejected": "❌"
}


def get_webapp_url():
    return os.environ.get("WEBAPP_URL", "")


@router.message(Command("start"))
async def cmd_start(message: Message):
    webapp_url = get_webapp_url()
    
    welcome_text = """
<b>Добро пожаловать!</b>

Я бот партии <b>«Новые Люди»</b> для подачи обращений граждан.

Здесь вы можете:
• Подать новое обращение через удобную форму
• Отслеживать статус ваших обращений
• Получать уведомления об изменении статуса

Выберите действие:
"""
    
    await message.answer(
        welcome_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_menu_keyboard(webapp_url)
    )


@router.callback_query(F.data == "main_menu")
async def show_main_menu(callback: CallbackQuery):
    webapp_url = get_webapp_url()
    
    welcome_text = """
<b>Главное меню</b>

Выберите действие:
"""
    
    await callback.message.edit_text(
        welcome_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_menu_keyboard(webapp_url)
    )
    await callback.answer()


@router.callback_query(F.data == "my_appeals")
async def show_my_appeals(callback: CallbackQuery):
    user_id = callback.from_user.id
    appeals = get_user_appeals(user_id)
    
    if not appeals:
        await callback.message.edit_text(
            "<b>У вас пока нет обращений</b>\n\n"
            "Нажмите кнопку «Подать обращение», чтобы создать новое обращение.",
            parse_mode=ParseMode.HTML,
            reply_markup=get_back_to_menu_keyboard()
        )
        await callback.answer()
        return
    
    text = f"<b>Ваши обращения ({len(appeals)})</b>\n\nВыберите обращение для просмотра:"
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeals_list_keyboard(appeals, page=0)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("appeals_page_"))
async def show_appeals_page(callback: CallbackQuery):
    page = int(callback.data.split("_")[-1])
    user_id = callback.from_user.id
    appeals = get_user_appeals(user_id)
    
    text = f"<b>Ваши обращения ({len(appeals)})</b>\n\nВыберите обращение для просмотра:"
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeals_list_keyboard(appeals, page=page)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("appeal_"))
async def show_appeal_detail(callback: CallbackQuery):
    appeal_id = int(callback.data.split("_")[-1])
    appeal = get_appeal_by_id(appeal_id)
    
    if not appeal:
        await callback.answer("Обращение не найдено", show_alert=True)
        return
    
    if appeal.telegram_user_id != callback.from_user.id:
        await callback.answer("Это не ваше обращение", show_alert=True)
        return
    
    status_value = appeal.status.value if hasattr(appeal.status, 'value') else str(appeal.status)
    status_config = get_status_config(status_value)
    
    status_name = status_config.name if status_config else STATUS_NAMES.get(status_value, status_value)
    status_emoji = STATUS_EMOJI.get(status_value, "📋")
    status_description = status_config.description if status_config else ""
    
    category_name = get_category_name(appeal.category_id) if appeal.category_id else "Не указана"
    
    text = f"""
<b>Обращение #{appeal.id}</b>

<b>Статус:</b> {status_emoji} {status_name}
{f'<i>{status_description}</i>' if status_description else ''}

<b>Категория:</b> {category_name}

<b>Дата подачи:</b> {appeal.created_at.strftime('%d.%m.%Y %H:%M')}

<b>Текст обращения:</b>
{appeal.text[:500]}{'...' if len(appeal.text) > 500 else ''}
"""
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeal_detail_keyboard(appeal_id)
    )
    await callback.answer()


@router.message(Command("help"))
async def cmd_help(message: Message):
    help_text = """
<b>Справка по использованию бота</b>

<b>Команды:</b>
/start - Начать работу с ботом
/help - Показать эту справку

<b>Возможности:</b>
• <b>Подать обращение</b> - Откройте мини-приложение и заполните форму обращения
• <b>Мои обращения</b> - Просмотрите список ваших обращений и их статусы

<b>Статусы обращений:</b>
🆕 Новое - Обращение только что поступило
🔄 В работе - Обращение рассматривается
✅ Решено - Проблема решена
❌ Отклонено - Обращение отклонено

При изменении статуса вашего обращения вы получите уведомление.
"""
    
    await message.answer(
        help_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_back_to_menu_keyboard()
    )


@router.message(Command("my_appeals"))
async def cmd_my_appeals(message: Message):
    user_id = message.from_user.id
    appeals = get_user_appeals(user_id)
    
    if not appeals:
        await message.answer(
            "<b>У вас пока нет обращений</b>\n\n"
            "Нажмите кнопку «Подать обращение», чтобы создать новое обращение.",
            parse_mode=ParseMode.HTML,
            reply_markup=get_back_to_menu_keyboard()
        )
        return
    
    text = f"<b>Ваши обращения ({len(appeals)})</b>\n\nВыберите обращение для просмотра:"
    
    await message.answer(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeals_list_keyboard(appeals, page=0)
    )
