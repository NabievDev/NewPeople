import asyncio
import logging
import os
import sys
from aiohttp import web

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from handlers import router
from notification_service import NotificationQueue, send_status_notification

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "")

bot: Bot = None
notification_queue: NotificationQueue = None


async def handle_notification(request):
    global bot
    
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


async def health_check(request):
    return web.json_response({"status": "ok", "bot_running": bot is not None})


async def start_web_server():
    app = web.Application()
    app.router.add_post('/notify', handle_notification)
    app.router.add_get('/health', health_check)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 3001)
    await site.start()
    logger.info("Notification server started on port 3001")
    return runner


async def main():
    global bot, notification_queue
    
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set!")
        return
    
    if not WEBAPP_URL:
        logger.warning("WEBAPP_URL not set! Mini-app button will not work properly.")
    
    bot = Bot(
        token=BOT_TOKEN, 
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    
    dp = Dispatcher()
    dp.include_router(router)
    
    notification_queue = NotificationQueue(bot)
    await notification_queue.start()
    
    web_runner = await start_web_server()
    
    try:
        logger.info("Starting bot polling...")
        await dp.start_polling(bot)
    finally:
        await notification_queue.stop()
        await web_runner.cleanup()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
