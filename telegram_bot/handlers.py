from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
from aiogram.enums import ParseMode
import os
from datetime import datetime
from typing import List

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
    get_category_name,
    get_all_status_configs,
    get_status_display_info,
    count_appeals_by_status,
    Appeal
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


def format_short_date(dt: datetime) -> str:
    return dt.strftime('%d.%m.%Y')


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


def get_status_key(appeal: Appeal) -> str:
    return str(appeal.status)


def build_stats_block(appeals: List[Appeal]) -> str:
    if not appeals:
        return ""
    
    status_counts = count_appeals_by_status(appeals)
    all_statuses = get_all_status_configs()
    
    lines = [f"📊 <b>Статистика обращений:</b>"]
    lines.append(f"┌ Всего: <b>{len(appeals)}</b>")
    
    shown_statuses = []
    for config in all_statuses:
        count = status_counts.get(config.status_key, 0)
        if count > 0:
            info = get_status_display_info(config.status_key)
            shown_statuses.append((info['emoji'], config.name, count))
    
    for i, (emoji, name, count) in enumerate(shown_statuses):
        prefix = "└" if i == len(shown_statuses) - 1 else "├"
        lines.append(f"{prefix} {emoji} {name}: <b>{count}</b>")
    
    if not shown_statuses:
        lines[-1] = lines[-1].replace("┌", "└")
    
    return "\n".join(lines)


@router.message(Command("start"))
async def cmd_start(message: Message):
    webapp_url = get_webapp_url()
    user_name = message.from_user.first_name or "Уважаемый гражданин"
    greeting = get_greeting()
    
    appeals = get_user_appeals(message.from_user.id)
    
    if appeals:
        stats_text = "\n\n" + build_stats_block(appeals)
    else:
        stats_text = "\n\n💡 <i>Вы ещё не подавали обращений</i>"
    
    welcome_text = f"""
{greeting}, <b>{user_name}</b>! 👋

╔══════════════════════════════╗
   🏛 <b>Партия «Новые Люди»</b>
   <i>Чувашская Республика</i>
╚══════════════════════════════╝

Добро пожаловать в официальную систему по работе с обращениями граждан!

<b>🎯 Возможности бота:</b>
┌ 📝 Подача обращений
├ 📋 Просмотр истории
└ 🔔 Уведомления о статусе{stats_text}

<i>👇 Выберите действие:</i>
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
╔══════════════════════════════╗
     🏠 <b>Главное меню</b>
╚══════════════════════════════╝

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
╔══════════════════════════════╗
     📭 <b>Нет обращений</b>
╚══════════════════════════════╝

Вы ещё не подавали обращений в нашу систему.

<b>📝 Как подать обращение:</b>
┌ 1️⃣ Нажмите «Подать обращение»
├ 2️⃣ Выберите категорию
├ 3️⃣ Опишите проблему
└ 4️⃣ Приложите файлы (опционально)

<i>✨ Мы рассмотрим ваше обращение в кратчайшие сроки!</i>
"""
        await callback.message.edit_text(
            empty_text,
            parse_mode=ParseMode.HTML,
            reply_markup=get_back_to_menu_keyboard()
        )
        await callback.answer()
        return
    
    stats_block = build_stats_block(appeals)
    total_pages = (len(appeals) + 4) // 5
    
    text = f"""
╔══════════════════════════════╗
     📋 <b>Мои обращения</b>
╚══════════════════════════════╝

{stats_block}

<i>📄 Страница 1 из {total_pages}</i>
<i>👇 Нажмите на обращение для подробностей:</i>
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
╔══════════════════════════════╗
   📱 <b>Расширенный просмотр</b>
╚══════════════════════════════╝

Для удобного просмотра всех ваших обращений с возможностью поиска и фильтрации, откройте расширенный список.

<b>✨ Возможности:</b>
┌ 🔍 Поиск по тексту
├ 📊 Фильтрация по статусу
└ 📁 Сортировка по дате

<i>👇 Нажмите кнопку ниже:</i>
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
        await callback.answer("📭 Обращения не найдены", show_alert=True)
        return
    
    stats_block = build_stats_block(appeals)
    total_pages = (len(appeals) + 4) // 5
    
    text = f"""
╔══════════════════════════════╗
     📋 <b>Мои обращения</b>
╚══════════════════════════════╝

{stats_block}

<i>📄 Страница {page + 1} из {total_pages}</i>
<i>👇 Нажмите на обращение для подробностей:</i>
"""
    
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
    
    status_key = get_status_key(appeal)
    status_info = get_status_display_info(status_key)
    
    category_name = get_category_name(int(appeal.category_id)) if appeal.category_id else "Не указана"
    created_date = format_date(appeal.created_at)
    
    text_preview = str(appeal.text) if appeal.text else ""
    if len(text_preview) > 600:
        text_preview = text_preview[:600] + "..."
    
    text = f"""
╔══════════════════════════════╗
   📄 <b>Обращение #{appeal.id}</b>
╚══════════════════════════════╝

┌─────────────────────────────┐
│ {status_info['emoji']} <b>Статус:</b> {status_info['name']}
│ <i>{status_info['description']}</i>
└─────────────────────────────┘

<b>📁 Категория:</b>
   {category_name}

<b>📅 Дата подачи:</b>
   {created_date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📝 Текст обращения:</b>

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
    
    stats_block = build_stats_block(appeals)
    total_pages = (len(appeals) + 4) // 5
    
    text = f"""
╔══════════════════════════════╗
     📋 <b>Мои обращения</b>
          <i>(обновлено ✓)</i>
╚══════════════════════════════╝

{stats_block}

<i>📄 Страница 1 из {total_pages}</i>
<i>👇 Нажмите на обращение для подробностей:</i>
"""
    
    await callback.message.edit_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeals_list_keyboard(appeals, page=0)
    )
    await callback.answer("✅ Список обновлён")


@router.message(Command("help"))
async def cmd_help(message: Message):
    all_statuses = get_all_status_configs()
    
    status_lines = []
    for config in all_statuses:
        info = get_status_display_info(config.status_key)
        status_lines.append(f"{info['emoji']} <b>{config.name}</b>\n   <i>{config.description or 'Нет описания'}</i>")
    
    status_block = "\n\n".join(status_lines) if status_lines else "Статусы загружаются..."
    
    help_text = f"""
╔══════════════════════════════╗
     📖 <b>Справочный центр</b>
╚══════════════════════════════╝

<b>📌 Основные команды:</b>
┌ /start — Запустить бота
├ /my_appeals — Мои обращения
├ /help — Справка
└ /about — О партии

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📝 Как подать обращение:</b>

┌ 1️⃣ Нажмите «Подать обращение»
├ 2️⃣ Откроется форма
├ 3️⃣ Выберите категорию
├ 4️⃣ Заполните данные
├ 5️⃣ Прикрепите файлы (опционально)
└ 6️⃣ Отправьте обращение

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📊 Статусы обращений:</b>

{status_block}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>🔔 Уведомления:</b>

Вы будете автоматически получать уведомления при изменении статуса вашего обращения.

<i>💬 По всем вопросам обращайтесь к администрации.</i>
"""
    
    await message.answer(
        help_text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_back_to_menu_keyboard()
    )


@router.message(Command("about"))
async def cmd_about(message: Message):
    about_text = """
╔══════════════════════════════╗
   🏛 <b>О партии «Новые Люди»</b>
╚══════════════════════════════╝

<b>«Новые Люди»</b> — российская политическая партия, основанная в 2020 году.

<b>🎯 Наши ценности:</b>
┌ 🛡 Защита интересов граждан
├ 🔓 Прозрачность и открытость
├ 🌱 Развитие регионов
└ 💡 Современные решения

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📍 Чувашское отделение:</b>

Мы активно работаем на благо жителей Чувашской Республики, помогая решать насущные проблемы и продвигая инициативы граждан.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📞 Контакты:</b>

┌ 🌐 Сайт: novielyudi.ru
└ 📱 Telegram: @novielyudi

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<i>🤝 Вместе мы сделаем нашу республику лучше!</i>
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
╔══════════════════════════════╗
     📭 <b>Нет обращений</b>
╚══════════════════════════════╝

Вы ещё не подавали обращений в нашу систему.

<b>📝 Как подать обращение:</b>
┌ 1️⃣ Нажмите «Подать обращение»
├ 2️⃣ Выберите категорию
└ 3️⃣ Опишите проблему

<i>✨ Мы рассмотрим ваше обращение в кратчайшие сроки!</i>
"""
        await message.answer(
            empty_text,
            parse_mode=ParseMode.HTML,
            reply_markup=get_back_to_menu_keyboard()
        )
        return
    
    stats_block = build_stats_block(appeals)
    total_pages = (len(appeals) + 4) // 5
    
    text = f"""
╔══════════════════════════════╗
     📋 <b>Мои обращения</b>
╚══════════════════════════════╝

{stats_block}

<i>📄 Страница 1 из {total_pages}</i>
<i>👇 Нажмите на обращение для подробностей:</i>
"""
    
    await message.answer(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_appeals_list_keyboard(appeals, page=0)
    )


@router.callback_query(F.data == "show_help")
async def callback_show_help(callback: CallbackQuery):
    all_statuses = get_all_status_configs()
    
    status_lines = []
    for config in all_statuses:
        info = get_status_display_info(config.status_key)
        status_lines.append(f"{info['emoji']} <b>{config.name}</b> — <i>{config.description or 'Нет описания'}</i>")
    
    status_block = "\n".join(status_lines) if status_lines else "Статусы загружаются..."
    
    help_text = f"""
╔══════════════════════════════╗
     📖 <b>Справочный центр</b>
╚══════════════════════════════╝

<b>📌 Основные команды:</b>
┌ /start — Запустить бота
├ /my_appeals — Мои обращения
├ /help — Справка
└ /about — О партии

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📝 Как подать обращение:</b>
┌ 1️⃣ Нажмите «Подать обращение»
├ 2️⃣ Откроется форма
├ 3️⃣ Выберите категорию
├ 4️⃣ Заполните данные
├ 5️⃣ Прикрепите файлы
└ 6️⃣ Отправьте

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📊 Статусы обращений:</b>
{status_block}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>🔔 Уведомления</b> автоматически приходят при изменении статуса.
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
╔══════════════════════════════╗
   🏛 <b>О партии «Новые Люди»</b>
╚══════════════════════════════╝

<b>«Новые Люди»</b> — российская политическая партия, основанная в 2020 году.

<b>🎯 Наши ценности:</b>
┌ 🛡 Защита интересов граждан
├ 🔓 Прозрачность и открытость
├ 🌱 Развитие регионов
└ 💡 Современные решения

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📍 Чувашское отделение:</b>

Мы активно работаем на благо жителей Чувашской Республики.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📞 Контакты:</b>
┌ 🌐 novielyudi.ru
└ 📱 @novielyudi

<i>🤝 Вместе мы сделаем республику лучше!</i>
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
    
    status_key = get_status_key(appeal)
    status_info = get_status_display_info(status_key)
    
    category_name = get_category_name(int(appeal.category_id)) if appeal.category_id else "Не указана"
    created_date = format_date(appeal.created_at)
    
    text_preview = str(appeal.text) if appeal.text else ""
    if len(text_preview) > 600:
        text_preview = text_preview[:600] + "..."
    
    text = f"""
╔══════════════════════════════╗
   📄 <b>Обращение #{appeal.id}</b>
          <i>(обновлено ✓)</i>
╚══════════════════════════════╝

┌─────────────────────────────┐
│ {status_info['emoji']} <b>Статус:</b> {status_info['name']}
│ <i>{status_info['description']}</i>
└─────────────────────────────┘

<b>📁 Категория:</b>
   {category_name}

<b>📅 Дата подачи:</b>
   {created_date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📝 Текст обращения:</b>

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
╔══════════════════════════════╗
     🤔 <b>Не понял команду</b>
╚══════════════════════════════╝

Пожалуйста, воспользуйтесь кнопками меню или введите команду:

┌ /start — Главное меню
├ /my_appeals — Мои обращения
└ /help — Справка
"""
    
    await message.answer(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=get_main_menu_keyboard(webapp_url)
    )
