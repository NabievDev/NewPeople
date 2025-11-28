#!/bin/bash

# ============================================
# Скрипт запуска системы обращений граждан
# Партия «Новые Люди» - Чувашская Республика
# ============================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Система управления обращениями граждан                 ║"
echo "║     Партия «Новые Люди» — Чувашская Республика            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Проверка наличия необходимых инструментов
check_requirements() {
    echo -e "${YELLOW}[1/5] Проверка требований...${NC}"
    
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Ошибка: Python 3 не установлен${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Ошибка: Node.js не установлен${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Ошибка: npm не установлен${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Все требования выполнены${NC}"
    echo "  Python: $(python3 --version)"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
}

# Установка зависимостей backend
install_backend() {
    echo -e "${YELLOW}[2/5] Установка зависимостей backend...${NC}"
    
    cd backend
    
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt --quiet
        echo -e "${GREEN}✓ Зависимости backend установлены${NC}"
    else
        echo -e "${RED}Файл requirements.txt не найден${NC}"
        exit 1
    fi
    
    cd ..
}

# Установка зависимостей frontend
install_frontend() {
    echo -e "${YELLOW}[3/5] Установка зависимостей frontend...${NC}"
    
    cd frontend
    
    if [ -f "package.json" ]; then
        npm install --silent
        echo -e "${GREEN}✓ Зависимости frontend установлены${NC}"
    else
        echo -e "${RED}Файл package.json не найден${NC}"
        exit 1
    fi
    
    cd ..
}

# Установка зависимостей Telegram бота
install_telegram_bot() {
    echo -e "${YELLOW}[4/5] Установка зависимостей Telegram бота...${NC}"
    
    cd telegram_bot
    
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt --quiet
        echo -e "${GREEN}✓ Зависимости Telegram бота установлены${NC}"
    else
        echo -e "${YELLOW}⚠ Файл requirements.txt для бота не найден, пропуск...${NC}"
    fi
    
    cd ..
}

# Инициализация базы данных
init_database() {
    echo -e "${YELLOW}[5/5] Инициализация базы данных...${NC}"
    
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}⚠ DATABASE_URL не задан, используется SQLite${NC}"
    fi
    
    cd backend
    python3 init_db.py
    cd ..
    
    echo -e "${GREEN}✓ База данных инициализирована${NC}"
}

# Запуск всех сервисов
start_services() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}Запуск сервисов...${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    
    # Запуск backend в фоне
    echo -e "${YELLOW}Запуск Backend API (порт 8000)...${NC}"
    cd backend
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    cd ..
    
    sleep 2
    
    # Запуск frontend в фоне
    echo -e "${YELLOW}Запуск Frontend (порт 5000)...${NC}"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    sleep 2
    
    # Запуск Telegram бота (если токен задан)
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        echo -e "${YELLOW}Запуск Telegram бота...${NC}"
        cd telegram_bot
        python3 main.py &
        BOT_PID=$!
        cd ..
    else
        echo -e "${YELLOW}⚠ TELEGRAM_BOT_TOKEN не задан, бот не запущен${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 Все сервисы запущены!                      ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Frontend:    http://localhost:5000                        ║${NC}"
    echo -e "${GREEN}║  Backend API: http://localhost:8000                        ║${NC}"
    echo -e "${GREEN}║  API Docs:    http://localhost:8000/docs                   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Нажмите Ctrl+C для остановки всех сервисов${NC}"
    
    # Ожидание завершения
    trap "kill $BACKEND_PID $FRONTEND_PID $BOT_PID 2>/dev/null; exit" SIGINT SIGTERM
    wait
}

# Главная функция
main() {
    check_requirements
    install_backend
    install_frontend
    install_telegram_bot
    init_database
    start_services
}

# Запуск
main
