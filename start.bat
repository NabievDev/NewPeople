@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

:: ============================================
:: Скрипт запуска системы обращений граждан
:: Партия «Новые Люди» - Чувашская Республика
:: ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Система управления обращениями граждан                 ║
echo ║     Партия «Новые Люди» — Чувашская Республика            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Проверка Python
echo [1/5] Проверка Python...
python --version > nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Python не установлен
    echo Скачайте Python с https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo   %%i

:: Проверка Node.js
echo [2/5] Проверка Node.js...
node --version > nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Node.js не установлен
    echo Скачайте Node.js с https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo   Node.js %%i

:: Установка зависимостей backend
echo.
echo [3/5] Установка зависимостей backend...
cd backend
if exist requirements.txt (
    pip install -r requirements.txt -q
    echo   Зависимости backend установлены
) else (
    echo ОШИБКА: requirements.txt не найден
    cd ..
    pause
    exit /b 1
)
cd ..

:: Установка зависимостей frontend
echo.
echo [4/5] Установка зависимостей frontend...
cd frontend
if exist package.json (
    call npm install --silent
    echo   Зависимости frontend установлены
) else (
    echo ОШИБКА: package.json не найден
    cd ..
    pause
    exit /b 1
)
cd ..

:: Инициализация базы данных
echo.
echo [5/5] Инициализация базы данных...
cd backend
python init_db.py
cd ..

echo.
echo ═══════════════════════════════════════════════════════════════
echo                      ЗАПУСК СЕРВИСОВ
echo ═══════════════════════════════════════════════════════════════
echo.

:: Запуск backend в новом окне
echo Запуск Backend API (порт 8000)...
start "Backend API" cmd /k "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Задержка для запуска backend
timeout /t 3 /nobreak > nul

:: Запуск frontend в новом окне
echo Запуск Frontend (порт 5000)...
start "Frontend" cmd /k "cd frontend && npm run dev"

:: Запуск Telegram бота (если токен задан)
if defined TELEGRAM_BOT_TOKEN (
    echo Запуск Telegram бота...
    start "Telegram Bot" cmd /k "cd telegram_bot && python main.py"
) else (
    echo ВНИМАНИЕ: TELEGRAM_BOT_TOKEN не задан, бот не запущен
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                 Все сервисы запущены!                      ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║  Frontend:    http://localhost:5000                        ║
echo ║  Backend API: http://localhost:8000                        ║
echo ║  API Docs:    http://localhost:8000/docs                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Закройте это окно для остановки информационного сообщения.
echo Для остановки сервисов закройте соответствующие окна терминала.
echo.

pause
