import asyncio
import logging
import os
import sys
from aiohttp import web

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from handlers import router
from notification_service import send_status_notification

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "")
NOTIFY_SECRET = os.environ.get("NOTIFY_SECRET", "")

bot: Bot = None


async def handle_notification(request):
    global bot
    
    if NOTIFY_SECRET:
        auth_header = request.headers.get("Authorization", "")
        expected_header = f"Bearer {NOTIFY_SECRET}"
        if auth_header != expected_header:
            logger.warning("Unauthorized notification request")
            return web.json_response({"error": "Unauthorized"}, status=401)
    
    if not bot:
        return web.json_response({"error": "Bot not initialized"}, status=500)
    
    try:
        data = await request.json()
        
        telegram_user_id = data.get("telegram_user_id")
        appeal_id = data.get("appeal_id")
        old_status = data.get("old_status")
        new_status = data.get("new_status")
        
        if not all([telegram_user_id, appeal_id, old_status, new_status]):
            return web.json_response({"error": "Missing required fields"}, status=400)
        
        success = await send_status_notification(
            bot,
            int(telegram_user_id),
            int(appeal_id),
            old_status,
            new_status
        )
        
        if success:
            return web.json_response({"status": "sent"})
        else:
            return web.json_response({"error": "Failed to send notification"}, status=500)
            
    except Exception as e:
        logger.error(f"Error handling notification request: {e}")
        return web.json_response({"error": str(e)}, status=500)


async def handle_admin_notification(request):
    global bot
    
    if NOTIFY_SECRET:
        auth_header = request.headers.get("Authorization", "")
        expected_header = f"Bearer {NOTIFY_SECRET}"
        if auth_header != expected_header:
            logger.warning("Unauthorized admin notification request")
            return web.json_response({"error": "Unauthorized"}, status=401)
    
    if not bot:
        return web.json_response({"error": "Bot not initialized"}, status=500)
    
    try:
        data = await request.json()
        
        appeal_id = data.get("appeal_id")
        text_preview = data.get("text_preview", "")
        category_name = data.get("category_name", "Без категории")
        is_anonymous = data.get("is_anonymous", False)
        admin_telegram_ids = data.get("admin_telegram_ids", [])
        
        if not appeal_id or not admin_telegram_ids:
            return web.json_response({"error": "Missing required fields"}, status=400)
        
        from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
        
        moderator_url = f"{WEBAPP_URL}/moderator" if WEBAPP_URL else "#"
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 Открыть панель модератора", url=moderator_url)]
        ])
        
        author_type = "👤 Анонимное" if is_anonymous else "👤 С контактами"
        
        message_text = f"""
🆕 <b>Новое обращение #{appeal_id}</b>

📂 <b>Категория:</b> {category_name}
{author_type}

📝 <b>Текст:</b>
<i>{text_preview[:300]}{'...' if len(text_preview) > 300 else ''}</i>

━━━━━━━━━━━━━━━━━━━━

<i>Нажмите кнопку ниже для перехода к модерации</i>
"""
        
        sent_count = 0
        for telegram_id in admin_telegram_ids:
            try:
                await bot.send_message(
                    chat_id=telegram_id,
                    text=message_text,
                    reply_markup=keyboard
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send admin notification to {telegram_id}: {e}")
        
        logger.info(f"Admin notification sent for appeal {appeal_id} to {sent_count}/{len(admin_telegram_ids)} admins")
        return web.json_response({"status": "sent", "sent_count": sent_count})
            
    except Exception as e:
        logger.error(f"Error handling admin notification request: {e}")
        return web.json_response({"error": str(e)}, status=500)


async def health_check(request):
    return web.json_response({"status": "ok", "bot_running": bot is not None})


async def start_web_server():
    app = web.Application()
    app.router.add_post('/notify', handle_notification)
    app.router.add_post('/notify_admins', handle_admin_notification)
    app.router.add_get('/health', health_check)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 3001)
    await site.start()
    logger.info("Notification server started on port 3001")
    return runner


async def main():
    global bot
    
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set!")
        return
    
    if not WEBAPP_URL:
        logger.warning("WEBAPP_URL not set! Mini-app button will not work properly.")
    
    if not NOTIFY_SECRET:
        logger.warning("NOTIFY_SECRET not set! /notify endpoint will accept unauthenticated requests.")
    
    bot = Bot(
        token=BOT_TOKEN, 
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    
    dp = Dispatcher()
    dp.include_router(router)
    
    web_runner = await start_web_server()
    
    try:
        logger.info("Starting bot polling...")
        await dp.start_polling(bot)
    finally:
        await web_runner.cleanup()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
