from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
from aiogram.enums import ParseMode
import os
import re
from datetime import datetime

from keyboards import (
    get_main_menu_keyboard, 
    get_appeals_list_keyboard, 
    get_appeal_detail_keyboard,
    get_back_to_menu_keyboard,
    get_webapp_appeals_keyboard
)
from database import (
    get_user_appeals, 
    get_appeal_by_id, 
    get_status_config, 
    get_category_name,
    get_all_status_configs,
    get_status_emoji,
    get_color_emoji
)

router = Router()

WEBAPP_URL = os.environ.get("WEBAPP_URL", "")


def get_webapp_url():
    return os.environ.get("WEBAPP_URL", "")


def format_date(dt: datetime) -> str:
    months = {
        1: 'января', 2: 'февраля', 3: 'марта', 4: 'апреля',
        5: 'мая', 6: 'июня', 7: 'июля', 8: 'августа',
        9: 'сентября', 10: 'октября', 11: 'ноября', 12: 'декабря'
    }
    return f"{dt.day} {months[dt.month]} {dt.year} в {dt.strftime('%H:%M')}"


def get_greeting() -> str:
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return "Доброе утро"
    elif 12 <= hour < 18:
        return "Добрый день"
    elif 18 <= hour < 23:
        return "Добрый вечер"
    else:
        return "Доброй ночи"


@router.message(Command("start"))
async def cmd_start(message: Message):
    webapp_url = get_webapp_url()
    user_name = message.from_user.first_name or "Уважаемый гражданин"
    greeting = get_greeting()
    
    appeals = get_user_appeals(message.from_user.id)
    appeals_count = len(appeals) if appeals else 0
    
    if appeals_count > 0:
        new_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'new')
        in_progress_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'in_progress')
        
        stats_text = f"\n\n📊 <b>Ваша статистика:</b>\n"
        stats_text += f"├ Всего обращений: <b>{appeals_count}</b>\n"
        if new_count > 0:
            stats_text += f"├ 🆕 Новых: <b>{new_count}</b>\n"
        if in_progress_count > 0:
            stats_text += f"└ 🔄 В работе: <b>{in_progress_count}</b>"
        else:
            stats_text = stats_text.rstrip('\n').replace('├ Всего', '└ Всего')
    else:
        stats_text = "\n\n💡 <i>Вы ещё не подавали обращений</i>"
    
    welcome_text = f"""
{greeting}, <b>{user_name}</b>! 👋

Добро пожаловать в официальный бот партии <b>«Новые Люди»</b> по работе с обращениями граждан Чувашской Республики.

🎯 <b>Что я умею:</b>
├ 📝 Принимать ваши обращения
├ 📋 Показывать историю обращений
└ 🔔 Уведомлять об изменении статуса{stats_text}

<i>Выберите действие из меню ниже:</i>
"""
    
    await message.answer(
        welcome_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_menu_keyboard(webapp_url)
    )


@router.callback_query(F.data == "main_menu")
async def show_main_menu(callback: CallbackQuery):
    webapp_url = get_webapp_url()
    user_name = callback.from_user.first_name or "Уважаемый гражданин"
    
    welcome_text = f"""
🏠 <b>Главное меню</b>

Здравствуйте, <b>{user_name}</b>!
Выберите интересующий вас раздел:
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
        empty_text = """
📭 <b>У вас пока нет обращений</b>

Вы ещё не подавали обращений в нашу систему.

Чтобы подать новое обращение:
1️⃣ Нажмите «📝 Подать обращение»
2️⃣ Выберите категорию
3️⃣ Опишите вашу проблему
4️⃣ Приложите файлы (при необходимости)

<i>Мы рассмотрим ваше обращение в кратчайшие сроки!</i>
"""
        await callback.message.edit_text(
            empty_text,
            parse_mode=ParseMode.HTML,
            reply_markup=get_back_to_menu_keyboard()
        )
        await callback.answer()
        return
    
    new_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'new')
    in_progress_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'in_progress')
    resolved_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'resolved')
    
    text = f"""
📋 <b>Ваши обращения</b>

📊 <b>Статистика:</b>
├ Всего: <b>{len(appeals)}</b>
├ 🆕 Новых: <b>{new_count}</b>
├ 🔄 В работе: <b>{in_progress_count}</b>
└ ✅ Решено: <b>{resolved_count}</b>

<i>Выберите обращение для подробностей:</i>
"""
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeals_list_keyboard(appeals, page=0)
    )
    await callback.answer()


@router.callback_query(F.data == "view_appeals_webapp")
async def show_webapp_appeals(callback: CallbackQuery):
    webapp_url = get_webapp_url()
    
    text = """
📱 <b>Просмотр обращений</b>

Для удобного просмотра всех ваших обращений с возможностью поиска и фильтрации, откройте расширенный список в мини-приложении.

<i>Нажмите кнопку ниже:</i>
"""
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_webapp_appeals_keyboard(webapp_url)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("page_"))
async def show_appeals_page(callback: CallbackQuery):
    page = int(callback.data.split("_")[1])
    user_id = callback.from_user.id
    appeals = get_user_appeals(user_id)
    
    if not appeals:
        await callback.answer("Обращения не найдены", show_alert=True)
        return
    
    text = f"📋 <b>Ваши обращения ({len(appeals)})</b>\n\n<i>Страница {page + 1} из {(len(appeals) + 4) // 5}</i>"
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeals_list_keyboard(appeals, page=page)
    )
    await callback.answer()


@router.callback_query(F.data.regexp(r"^appeal_\d+$"))
async def show_appeal_detail(callback: CallbackQuery):
    appeal_id = int(callback.data.split("_")[1])
    appeal = get_appeal_by_id(appeal_id)
    
    if not appeal:
        await callback.answer("❌ Обращение не найдено", show_alert=True)
        return
    
    if appeal.telegram_user_id != callback.from_user.id:
        await callback.answer("⚠️ Это не ваше обращение", show_alert=True)
        return
    
    status_value = appeal.status.value if hasattr(appeal.status, 'value') else str(appeal.status)
    status_config = get_status_config(status_value)
    
    status_name = str(status_config.name) if status_config else status_value
    status_emoji = get_status_emoji(status_value, str(status_config.color) if status_config and status_config.color else None)
    status_description = str(status_config.description) if status_config and status_config.description else ""
    
    category_name = get_category_name(int(appeal.category_id)) if appeal.category_id else "Не указана"
    
    created_date = format_date(appeal.created_at)  # type: ignore[arg-type]
    
    text_preview = str(appeal.text) if appeal.text else ""
    if len(text_preview) > 800:
        text_preview = text_preview[:800] + "..."
    
    text = f"""
📄 <b>Обращение #{appeal.id}</b>

━━━━━━━━━━━━━━━━━━━━

{status_emoji} <b>Статус:</b> {status_name}
<i>{status_description}</i>

📁 <b>Категория:</b> {category_name}

📅 <b>Дата подачи:</b>
{created_date}

━━━━━━━━━━━━━━━━━━━━

📝 <b>Текст обращения:</b>

<i>{text_preview}</i>
"""
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeal_detail_keyboard(appeal_id)
    )
    await callback.answer()


@router.callback_query(F.data == "refresh_appeals")
async def refresh_appeals(callback: CallbackQuery):
    user_id = callback.from_user.id
    appeals = get_user_appeals(user_id)
    
    if not appeals:
        await callback.answer("📭 У вас нет обращений", show_alert=True)
        return
    
    new_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'new')
    in_progress_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'in_progress')
    resolved_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'resolved')
    
    text = f"""
📋 <b>Ваши обращения</b> (обновлено)

📊 <b>Статистика:</b>
├ Всего: <b>{len(appeals)}</b>
├ 🆕 Новых: <b>{new_count}</b>
├ 🔄 В работе: <b>{in_progress_count}</b>
└ ✅ Решено: <b>{resolved_count}</b>

<i>Выберите обращение для подробностей:</i>
"""
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeals_list_keyboard(appeals, page=0)
    )
    await callback.answer("✅ Список обновлён")


@router.message(Command("help"))
async def cmd_help(message: Message):
    help_text = """
📖 <b>Справочный центр</b>

━━━━━━━━━━━━━━━━━━━━

<b>📌 Основные команды:</b>

/start — Запустить бота
/my_appeals — Мои обращения
/help — Эта справка
/about — О партии

━━━━━━━━━━━━━━━━━━━━

<b>📝 Как подать обращение:</b>

1️⃣ Нажмите «📝 Подать обращение»
2️⃣ Откроется форма в мини-приложении
3️⃣ Выберите категорию обращения
4️⃣ Заполните форму
5️⃣ При необходимости прикрепите файлы
6️⃣ Отправьте обращение

━━━━━━━━━━━━━━━━━━━━

<b>📊 Статусы обращений:</b>

🆕 <b>Новое</b>
Обращение принято и ожидает рассмотрения

🔄 <b>В работе</b>
Специалисты работают над вашим вопросом

✅ <b>Решено</b>
Проблема успешно решена

❌ <b>Отклонено</b>
Обращение отклонено (с указанием причины)

━━━━━━━━━━━━━━━━━━━━

<b>🔔 Уведомления:</b>

Вы будете автоматически получать уведомления при изменении статуса вашего обращения.

━━━━━━━━━━━━━━━━━━━━

<i>По всем вопросам работы бота обращайтесь к администрации.</i>
"""
    
    await message.answer(
        help_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_back_to_menu_keyboard()
    )


@router.message(Command("about"))
async def cmd_about(message: Message):
    about_text = """
🏛 <b>О партии «Новые Люди»</b>

━━━━━━━━━━━━━━━━━━━━

<b>«Новые Люди»</b> — российская политическая партия, основанная в 2020 году.

<b>🎯 Наши ценности:</b>
├ Защита интересов граждан
├ Прозрачность и открытость
├ Развитие регионов
└ Современные решения

<b>📍 Чувашское отделение:</b>

Мы активно работаем на благо жителей Чувашской Республики, помогая решать насущные проблемы и продвигая инициативы граждан.

━━━━━━━━━━━━━━━━━━━━

<b>📞 Контакты:</b>

🌐 Официальный сайт: novielyudi.ru
📱 Телеграм: @novielyudi

━━━━━━━━━━━━━━━━━━━━

<i>Вместе мы можем сделать нашу республику лучше!</i>
"""
    
    await message.answer(
        about_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_back_to_menu_keyboard()
    )


@router.message(Command("my_appeals"))
async def cmd_my_appeals(message: Message):
    user_id = message.from_user.id
    appeals = get_user_appeals(user_id)
    
    if not appeals:
        empty_text = """
📭 <b>У вас пока нет обращений</b>

Вы ещё не подавали обращений в нашу систему.

Чтобы подать новое обращение:
1️⃣ Нажмите «📝 Подать обращение»
2️⃣ Выберите категорию
3️⃣ Опишите вашу проблему

<i>Мы рассмотрим ваше обращение в кратчайшие сроки!</i>
"""
        await message.answer(
            empty_text,
            parse_mode=ParseMode.HTML,
            reply_markup=get_back_to_menu_keyboard()
        )
        return
    
    new_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'new')
    in_progress_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'in_progress')
    resolved_count = sum(1 for a in appeals if (a.status.value if hasattr(a.status, 'value') else str(a.status)) == 'resolved')
    
    text = f"""
📋 <b>Ваши обращения</b>

📊 <b>Статистика:</b>
├ Всего: <b>{len(appeals)}</b>
├ 🆕 Новых: <b>{new_count}</b>
├ 🔄 В работе: <b>{in_progress_count}</b>
└ ✅ Решено: <b>{resolved_count}</b>

<i>Выберите обращение для подробностей:</i>
"""
    
    await message.answer(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeals_list_keyboard(appeals, page=0)
    )


@router.callback_query(F.data == "show_help")
async def callback_show_help(callback: CallbackQuery):
    help_text = """
📖 <b>Справочный центр</b>

━━━━━━━━━━━━━━━━━━━━

<b>📌 Основные команды:</b>

/start — Запустить бота
/my_appeals — Мои обращения
/help — Эта справка
/about — О партии

━━━━━━━━━━━━━━━━━━━━

<b>📝 Как подать обращение:</b>

1️⃣ Нажмите «📝 Подать обращение»
2️⃣ Откроется форма в мини-приложении
3️⃣ Выберите категорию обращения
4️⃣ Заполните форму
5️⃣ При необходимости прикрепите файлы
6️⃣ Отправьте обращение

━━━━━━━━━━━━━━━━━━━━

<b>📊 Статусы обращений:</b>

🆕 <b>Новое</b> — Ожидает рассмотрения
🔄 <b>В работе</b> — Обрабатывается
✅ <b>Решено</b> — Проблема решена
❌ <b>Отклонено</b> — Отклонено

━━━━━━━━━━━━━━━━━━━━

<b>🔔 Уведомления:</b>

Вы автоматически получите уведомление при изменении статуса обращения.
"""
    
    await callback.message.edit_text(
        help_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_back_to_menu_keyboard()
    )
    await callback.answer()


@router.callback_query(F.data == "show_about")
async def callback_show_about(callback: CallbackQuery):
    about_text = """
🏛 <b>О партии «Новые Люди»</b>

━━━━━━━━━━━━━━━━━━━━

<b>«Новые Люди»</b> — российская политическая партия, основанная в 2020 году.

<b>🎯 Наши ценности:</b>
├ Защита интересов граждан
├ Прозрачность и открытость
├ Развитие регионов
└ Современные решения

<b>📍 Чувашское отделение:</b>

Мы активно работаем на благо жителей Чувашской Республики, помогая решать насущные проблемы и продвигая инициативы граждан.

━━━━━━━━━━━━━━━━━━━━

<b>📞 Контакты:</b>

🌐 Официальный сайт: novielyudi.ru
📱 Телеграм: @novielyudi

━━━━━━━━━━━━━━━━━━━━

<i>Вместе мы можем сделать нашу республику лучше!</i>
"""
    
    await callback.message.edit_text(
        about_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_back_to_menu_keyboard()
    )
    await callback.answer()


@router.callback_query(F.data.startswith("refresh_appeal_"))
async def refresh_appeal_detail(callback: CallbackQuery):
    appeal_id = int(callback.data.split("_")[2])
    appeal = get_appeal_by_id(appeal_id)
    
    if not appeal:
        await callback.answer("❌ Обращение не найдено", show_alert=True)
        return
    
    if appeal.telegram_user_id != callback.from_user.id:
        await callback.answer("⚠️ Это не ваше обращение", show_alert=True)
        return
    
    status_value = appeal.status.value if hasattr(appeal.status, 'value') else str(appeal.status)
    status_config = get_status_config(status_value)
    
    status_name = str(status_config.name) if status_config else status_value
    status_emoji = get_status_emoji(status_value, str(status_config.color) if status_config and status_config.color else None)
    status_description = str(status_config.description) if status_config and status_config.description else ""
    
    category_name = get_category_name(int(appeal.category_id)) if appeal.category_id else "Не указана"
    created_date = format_date(appeal.created_at)  # type: ignore[arg-type]
    
    text_preview = str(appeal.text) if appeal.text else ""
    if len(text_preview) > 800:
        text_preview = text_preview[:800] + "..."
    
    text = f"""
📄 <b>Обращение #{appeal.id}</b> (обновлено)

━━━━━━━━━━━━━━━━━━━━

{status_emoji} <b>Статус:</b> {status_name}
<i>{status_description}</i>

📁 <b>Категория:</b> {category_name}

📅 <b>Дата подачи:</b>
{created_date}

━━━━━━━━━━━━━━━━━━━━

📝 <b>Текст обращения:</b>

<i>{text_preview}</i>
"""
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeal_detail_keyboard(appeal_id)
    )
    await callback.answer("✅ Обновлено")


@router.callback_query(F.data == "noop")
async def noop_callback(callback: CallbackQuery):
    await callback.answer()


@router.message()
async def handle_unknown_message(message: Message):
    webapp_url = get_webapp_url()
    
    text = """
🤔 <b>Не совсем понял вас</b>

Пожалуйста, воспользуйтесь кнопками меню ниже или введите одну из команд:

/start — Главное меню
/my_appeals — Мои обращения
/help — Справка
"""
    
    await message.answer(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_menu_keyboard(webapp_url)
    )
