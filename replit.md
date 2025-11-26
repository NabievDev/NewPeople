# Система управления обращениями граждан для партии "Новые Люди"

## Overview

This project is a web application designed for the "New People" political party in the Chuvash Republic to manage citizen appeals. It provides a public interface for citizens to submit appeals without registration and an administrative panel for moderators and administrators to manage these appeals. The system aims to streamline the process of receiving, tracking, and resolving citizen inquiries, enhancing responsiveness and transparency. Key capabilities include appeal submission, status tracking, file attachments, comment functionality, and comprehensive analytics.

## User Preferences

- Использование FastAPI обязательно
- PostgreSQL вместо SQLite3 (из-за DATABASE_URL в окружении)
- Бирюзово-белая цветовая схема
- Обширные анимации на всех элементах интерфейса
- Многоуровневая иерархическая навигация по категориям
- Только внутренние теги (публичные удалены)
- Настраиваемые статусы обращений

## System Architecture

The system is built as a full-stack web application with a clear separation between frontend and backend.

### UI/UX Decisions
- **Color Scheme**: Primary color is Turquoise (#00C9C8), with White (#FFFFFF) and turquoise gradients for accents.
- **Components**: Utilizes `AppealCard` for displaying appeals with color-coded status indicators, `AppealDetail` for detailed views with tabs (details, comments, history), and `AdminDashboard`/`ModeratorDashboard` for specific role-based functionalities.
- **Iconography**: Unique icons for various file types (photo, video, audio, documents, spreadsheets, PDF, archives, code) to improve visual clarity.
- **Animations**: Extensive use of Framer Motion for fade-in/out effects, slide transitions, hover states, smooth modal appearances, and timeline animations in history views.
- **Navigation**: Multi-level hierarchical navigation for categories.

### Technical Implementations
- **Appeal Management**: Public appeal submission, searching, filtering by status and category, and detailed viewing.
- **File Handling**: Secure file uploads and downloads, protecting against path traversal, with authentication required for downloads. Files are stored with UUID names.
- **History Tracking**: `AppealHistory` model tracks all changes to appeals (status, tags, comments) with unique icons for each action.
- **Statistics**: Provides comprehensive statistics including total appeals, breakdown by status, categories, tags, and average processing time, visualized with PieChart and BarChart.
- **Role-Based Access Control (RBAC)**: Authentication via JWT with `bcrypt` for password hashing, ensuring secure access based on user roles (admin, moderator).
- **Configurable Elements**: Editable status display and real-color representation for internal tags in the admin panel.

### Feature Specifications
- Public appeal submission form with category dropdowns.
- Authentication page with role-based redirection.
- Moderator panel with search and filter capabilities.
- Admin panel with statistics, user management, category, and tag management.
- Attachment support for appeals and comments.
- Initialized database with test data.

### System Design Choices
- **Backend**: FastAPI for API development, SQLAlchemy for ORM with Pydantic for data validation.
- **Frontend**: React 18 + TypeScript, built with Vite 7, styled with Tailwind CSS.
- **Database**: SQLite for development, with a preference for PostgreSQL in production.
- **Deployment**: Backend runs on Uvicorn, frontend served via Vite.

## Recent Changes (November 2025)

### Telegram Bot Integration (November 26, 2025)
- Added complete Telegram bot microservice using **Aiogram 3.22**
- Bot provides /start command with mini-app button for submitting appeals
- Users can view their appeals directly in Telegram via /my_appeals command
- Backend sends automatic notifications when appeal status changes
- Frontend detects Telegram Web App environment and auto-populates user data
- Appeal submissions from Telegram save user's telegram_user_id and telegram_username

#### Bot Structure:
- telegram_bot/main.py - Main bot entry point with webhook/polling support
- telegram_bot/handlers.py - Command and callback handlers
- telegram_bot/keyboards.py - Inline keyboard builders
- telegram_bot/notification_service.py - HTTP server for receiving status notifications

#### Required Secrets:
- TELEGRAM_BOT_TOKEN - Bot token from @BotFather (REQUIRED)
- WEBAPP_URL - URL for mini-app (auto-set to deployment URL)
- TELEGRAM_BOT_URL - Internal notification URL (auto-set to http://localhost:3001)

### Drag-and-Drop Functionality
- Added @dnd-kit library for drag-and-drop functionality (core, sortable, utilities)
- Categories can be reordered by drag-and-drop in AdminDashboard
- Tags can be reordered by drag-and-drop in AdminDashboard
- Statuses can be reordered by drag-and-drop in AdminDashboard (saved to localStorage)

### UI Improvements
- Main page (PublicAppealForm) redesigned with party logo and 1.5s loading animation
- Logo file located at frontend/src/assets/logo.png
- Styled custom dropdowns replace native select elements in AdminDashboard and ModeratorDashboard
- Removed Settings tab from AdminDashboard (simplified interface)
- Added tag editing capability with color picker

### Bug Fixes
- Fixed comment count bug in ModeratorDashboard by resetting comments state when appeal changes

### API Endpoints Added
- PUT /tags/internal/{id} - Update internal tag (name, color)
- PUT /tags/internal/reorder - Reorder internal tags
- PUT /categories/reorder - Reorder categories

### Database Changes
- Added `order` INTEGER DEFAULT 0 column to internal_tags table

## External Dependencies

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL (via DATABASE_URL environment variable)
- **ORM**: SQLAlchemy
- **Authentication**: `python-jose`, `bcrypt`
- **Validation**: Pydantic
- **Server**: Uvicorn

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Forms**: `react-hook-form`
- **File Upload**: `react-dropzone`
- **Charts**: Recharts
- **Drag and Drop**: @dnd-kit (core, sortable, utilities)