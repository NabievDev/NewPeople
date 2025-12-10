from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, case, extract, text
from datetime import datetime, timedelta
from typing import List, Literal
import os
from app.core.database import engine, Base, get_db, SessionLocal
from app.core.config import settings
from app.routers import auth, appeals, categories, tags, users, statuses, admin_notifications
from app.routers.auth import get_current_user, require_admin
from app.schemas.schemas import TimelineDataPoint, ModeratorStats, AppealsByPeriodStats

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migrations():
    """Run necessary database migrations on startup."""
    with engine.connect() as conn:
        try:
            result = conn.execute(text("""
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'appeals' AND column_name = 'status'
            """))
            row = result.fetchone()
            if row and row[0] == 'USER-DEFINED':
                conn.execute(text("""
                    ALTER TABLE appeals ALTER COLUMN status TYPE VARCHAR USING status::VARCHAR
                """))
                conn.commit()
                logger.info("Migrated appeals.status from enum to varchar")
        except Exception as e:
            pass


def init_database_if_needed():
    """Initialize database with default data if tables are empty."""
    from app.models.models import User, Category, PublicTag, InternalTag, AppealStatusConfig
    from app.core.security import get_password_hash
    
    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if not existing_admin:
            admin = User(
                username="admin",
                email="admin@novielyudi.ru",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin)
            logger.info("Admin user created (username: admin, password: admin123)")
        
        existing_moderator = db.query(User).filter(User.username == "moderator").first()
        if not existing_moderator:
            moderator = User(
                username="moderator",
                email="moderator@novielyudi.ru",
                hashed_password=get_password_hash("moderator123"),
                role="moderator"
            )
            db.add(moderator)
            logger.info("Moderator user created (username: moderator, password: moderator123)")
        
        if db.query(Category).count() == 0:
            categories_list = [
                Category(name="Жилищно-коммунальное хозяйство", order=1),
                Category(name="Транспорт и дороги", order=2),
                Category(name="Образование", order=3),
                Category(name="Здравоохранение", order=4),
                Category(name="Экология", order=5),
                Category(name="Благоустройство", order=6),
                Category(name="Социальная защита", order=7),
                Category(name="Другое", order=8),
            ]
            db.add_all(categories_list)
            db.flush()
            
            subcategories = [
                Category(name="Ремонт и содержание домов", parent_id=1, order=1),
                Category(name="Теплоснабжение", parent_id=1, order=2),
                Category(name="Водоснабжение", parent_id=1, order=3),
                Category(name="Общественный транспорт", parent_id=2, order=1),
                Category(name="Ремонт дорог", parent_id=2, order=2),
                Category(name="Парковки", parent_id=2, order=3),
            ]
            db.add_all(subcategories)
            logger.info("Categories created")
        
        if db.query(PublicTag).count() == 0:
            public_tags = [
                PublicTag(name="Новое", color="#00C9C8", order=0),
                PublicTag(name="В работе", color="#FFA500", order=1),
                PublicTag(name="Решено", color="#22C55E", order=2),
                PublicTag(name="Отклонено", color="#EF4444", order=3),
            ]
            db.add_all(public_tags)
            logger.info("Public tags created")
        
        if db.query(InternalTag).count() == 0:
            internal_tags = [
                InternalTag(name="Срочно", color="#DC2626", order=0),
                InternalTag(name="Требует проверки", color="#F59E0B", order=1),
                InternalTag(name="Передано в департамент", color="#3B82F6", order=2),
                InternalTag(name="Дубликат", color="#6B7280", order=3),
                InternalTag(name="Важное", color="#8B5CF6", order=4),
            ]
            db.add_all(internal_tags)
            logger.info("Internal tags created")
        
        if db.query(AppealStatusConfig).count() == 0:
            statuses_list = [
                AppealStatusConfig(
                    status_key="new",
                    name="Новое",
                    color="#3B82F6",
                    description="Обращение только поступило",
                    order=0,
                    is_system=True
                ),
                AppealStatusConfig(
                    status_key="in_progress",
                    name="В работе",
                    color="#F59E0B",
                    description="Обращение находится в обработке",
                    order=1,
                    is_system=True
                ),
                AppealStatusConfig(
                    status_key="resolved",
                    name="Решено",
                    color="#10B981",
                    description="Обращение успешно обработано",
                    order=2,
                    is_system=True
                ),
                AppealStatusConfig(
                    status_key="rejected",
                    name="Отклонено",
                    color="#EF4444",
                    description="Обращение отклонено",
                    order=3,
                    is_system=True
                ),
            ]
            db.add_all(statuses_list)
            logger.info("Appeal status configs created")
        
        db.commit()
        logger.info("Database initialization check completed")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()


app = FastAPI(title="Citizens Appeals System - Новые Люди")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
run_migrations()
init_database_if_needed()

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(appeals.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(statuses.router, prefix="/api")
app.include_router(admin_notifications.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Citizens Appeals API - Новые Люди"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/stats")
async def get_stats(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from app.models.models import Appeal, appeal_internal_tags, appeal_public_tags, InternalTag, PublicTag
    from app.schemas.schemas import Statistics, TagStatistics
    
    status_counts = db.query(
        Appeal.status,
        func.count(Appeal.id).label('count')
    ).group_by(Appeal.status).all()
    
    status_map = {status: count for status, count in status_counts}
    total_appeals = sum(status_map.values())
    new_appeals = status_map.get("new", 0)
    in_progress_appeals = status_map.get("in_progress", 0)
    resolved_appeals = status_map.get("resolved", 0)
    rejected_appeals = status_map.get("rejected", 0)
    
    public_tag_counts = db.query(
        PublicTag.id,
        PublicTag.name,
        func.count(appeal_public_tags.c.appeal_id).label('count')
    ).outerjoin(
        appeal_public_tags,
        PublicTag.id == appeal_public_tags.c.tag_id
    ).group_by(PublicTag.id, PublicTag.name).all()
    
    public_tag_stats = [
        TagStatistics(
            tag_id=tag_id,
            tag_name=tag_name,
            count=count,
            is_public=True
        )
        for tag_id, tag_name, count in public_tag_counts
    ]
    
    internal_tag_counts = db.query(
        InternalTag.id,
        InternalTag.name,
        func.count(appeal_internal_tags.c.appeal_id).label('count')
    ).outerjoin(
        appeal_internal_tags,
        InternalTag.id == appeal_internal_tags.c.tag_id
    ).group_by(InternalTag.id, InternalTag.name).all()
    
    internal_tag_stats = [
        TagStatistics(
            tag_id=tag_id,
            tag_name=tag_name,
            count=count,
            is_public=False
        )
        for tag_id, tag_name, count in internal_tag_counts
    ]
    
    avg_result = db.query(
        func.avg(
            extract('epoch', Appeal.updated_at) - extract('epoch', Appeal.created_at)
        ).label('avg_seconds')
    ).filter(
        Appeal.status.in_(["resolved", "rejected"]),
        Appeal.created_at.isnot(None),
        Appeal.updated_at.isnot(None)
    ).scalar()
    
    average_resolution_time = None
    if avg_result is not None:
        avg_seconds = float(avg_result)
        weeks = int(avg_seconds // (7 * 24 * 3600))
        remaining = avg_seconds % (7 * 24 * 3600)
        days = int(remaining // (24 * 3600))
        remaining = remaining % (24 * 3600)
        hours = int(remaining // 3600)
        remaining = remaining % 3600
        minutes = int(remaining // 60)
        
        average_resolution_time = {
            "weeks": weeks,
            "days": days,
            "hours": hours,
            "minutes": minutes
        }
    
    return Statistics(
        total_appeals=total_appeals,
        new_appeals=new_appeals,
        in_progress_appeals=in_progress_appeals,
        resolved_appeals=resolved_appeals,
        rejected_appeals=rejected_appeals,
        public_tag_stats=public_tag_stats,
        internal_tag_stats=internal_tag_stats,
        average_resolution_time=average_resolution_time
    )


@app.get("/api/stats/appeals-timeline", response_model=List[TimelineDataPoint])
async def get_appeals_timeline(
    period: Literal["hour", "day", "week", "month", "year", "all"] = Query(default="day"),
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from app.models.models import Appeal
    from app.schemas.schemas import TimelineDataPoint
    
    now = datetime.utcnow()
    result = []
    
    if period == "hour":
        start_time = now - timedelta(hours=24)
        counts = db.query(
            func.date_trunc('hour', Appeal.created_at).label('hour'),
            func.count(Appeal.id).label('count')
        ).filter(
            Appeal.created_at >= start_time,
            Appeal.created_at < now
        ).group_by(
            func.date_trunc('hour', Appeal.created_at)
        ).all()
        
        count_map = {row.hour: row.count for row in counts}
        for i in range(24):
            hour_start = start_time + timedelta(hours=i)
            hour_start = hour_start.replace(minute=0, second=0, microsecond=0)
            count = count_map.get(hour_start, 0)
            result.append(TimelineDataPoint(
                date=hour_start.strftime("%Y-%m-%d %H:%M"),
                count=count,
                label=hour_start.strftime("%H:00")
            ))
    
    elif period == "day":
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        current_hour = now.hour + 1
        counts = db.query(
            func.date_trunc('hour', Appeal.created_at).label('hour'),
            func.count(Appeal.id).label('count')
        ).filter(
            Appeal.created_at >= today_start,
            Appeal.created_at < now
        ).group_by(
            func.date_trunc('hour', Appeal.created_at)
        ).all()
        
        count_map = {row.hour: row.count for row in counts}
        for i in range(current_hour):
            hour_start = today_start + timedelta(hours=i)
            count = count_map.get(hour_start, 0)
            result.append(TimelineDataPoint(
                date=hour_start.strftime("%Y-%m-%d %H:%M"),
                count=count,
                label=hour_start.strftime("%H:00")
            ))
    
    elif period == "week":
        start_time = now - timedelta(days=7)
        start_time = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
        counts = db.query(
            func.date_trunc('day', Appeal.created_at).label('day'),
            func.count(Appeal.id).label('count')
        ).filter(
            Appeal.created_at >= start_time,
            Appeal.created_at < now
        ).group_by(
            func.date_trunc('day', Appeal.created_at)
        ).all()
        
        count_map = {row.day.date(): row.count for row in counts}
        for i in range(7):
            day_start = start_time + timedelta(days=i)
            count = count_map.get(day_start.date(), 0)
            result.append(TimelineDataPoint(
                date=day_start.strftime("%Y-%m-%d"),
                count=count,
                label=day_start.strftime("%a %d")
            ))
    
    elif period == "month":
        start_time = now - timedelta(days=30)
        start_time = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
        counts = db.query(
            func.date_trunc('day', Appeal.created_at).label('day'),
            func.count(Appeal.id).label('count')
        ).filter(
            Appeal.created_at >= start_time,
            Appeal.created_at < now
        ).group_by(
            func.date_trunc('day', Appeal.created_at)
        ).all()
        
        count_map = {row.day.date(): row.count for row in counts}
        for i in range(30):
            day_start = start_time + timedelta(days=i)
            count = count_map.get(day_start.date(), 0)
            result.append(TimelineDataPoint(
                date=day_start.strftime("%Y-%m-%d"),
                count=count,
                label=day_start.strftime("%d %b")
            ))
    
    elif period == "year":
        counts = db.query(
            extract('year', Appeal.created_at).label('year'),
            extract('month', Appeal.created_at).label('month'),
            func.count(Appeal.id).label('count')
        ).filter(
            Appeal.created_at >= datetime(now.year - 1, now.month + 1 if now.month < 12 else 1, 1) if now.month < 12 else datetime(now.year - 1, 1, 1)
        ).group_by(
            extract('year', Appeal.created_at),
            extract('month', Appeal.created_at)
        ).all()
        
        count_map = {(int(row.year), int(row.month)): row.count for row in counts}
        for i in range(12):
            month_offset = 11 - i
            year = now.year
            month = now.month - month_offset
            while month <= 0:
                month += 12
                year -= 1
            month_start = datetime(year, month, 1)
            count = count_map.get((year, month), 0)
            result.append(TimelineDataPoint(
                date=month_start.strftime("%Y-%m"),
                count=count,
                label=month_start.strftime("%b %Y")
            ))
    
    elif period == "all":
        first_appeal = db.query(Appeal).order_by(Appeal.created_at.asc()).first()
        if first_appeal and first_appeal.created_at:
            start_date = first_appeal.created_at.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        counts = db.query(
            extract('year', Appeal.created_at).label('year'),
            extract('month', Appeal.created_at).label('month'),
            func.count(Appeal.id).label('count')
        ).group_by(
            extract('year', Appeal.created_at),
            extract('month', Appeal.created_at)
        ).all()
        
        count_map = {(int(row.year), int(row.month)): row.count for row in counts}
        current_date = start_date
        while current_date <= now:
            year = current_date.year
            month = current_date.month
            count = count_map.get((year, month), 0)
            result.append(TimelineDataPoint(
                date=current_date.strftime("%Y-%m"),
                count=count,
                label=current_date.strftime("%b %Y")
            ))
            if month == 12:
                current_date = datetime(year + 1, 1, 1)
            else:
                current_date = datetime(year, month + 1, 1)
    
    return result


@app.get("/api/stats/moderators", response_model=List[ModeratorStats])
async def get_moderator_stats(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from app.models.models import User, UserRole, AppealHistory
    from app.schemas.schemas import ModeratorStats
    from sqlalchemy.orm import aliased
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_subq = db.query(
        AppealHistory.user_id,
        func.count(distinct(AppealHistory.appeal_id)).label('total_processed')
    ).group_by(AppealHistory.user_id).subquery()
    
    today_subq = db.query(
        AppealHistory.user_id,
        func.count(distinct(AppealHistory.appeal_id)).label('today_processed')
    ).filter(
        AppealHistory.created_at >= today_start
    ).group_by(AppealHistory.user_id).subquery()
    
    moderator_stats = db.query(
        User.id,
        User.username,
        User.email,
        func.coalesce(total_subq.c.total_processed, 0).label('total_processed'),
        func.coalesce(today_subq.c.today_processed, 0).label('today_processed')
    ).outerjoin(
        total_subq, User.id == total_subq.c.user_id
    ).outerjoin(
        today_subq, User.id == today_subq.c.user_id
    ).filter(
        User.role.in_([UserRole.MODERATOR, UserRole.ADMIN]),
        User.is_active == True
    ).all()
    
    result = [
        ModeratorStats(
            id=row.id,
            username=row.username,
            email=row.email or "",
            total_processed=row.total_processed,
            today_processed=row.today_processed
        )
        for row in moderator_stats
    ]
    
    return result


@app.get("/api/stats/appeals-by-period", response_model=AppealsByPeriodStats)
async def get_appeals_by_period(
    period: Literal["hour", "day", "week", "month", "year", "all"] = Query(default="all"),
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from app.models.models import Appeal
    from app.schemas.schemas import AppealsByPeriodStats
    
    now = datetime.utcnow()
    
    if period == "hour":
        start_time = now - timedelta(hours=1)
    elif period == "day":
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_time = now - timedelta(days=7)
    elif period == "month":
        start_time = now - timedelta(days=30)
    elif period == "year":
        start_time = now - timedelta(days=365)
    else:
        start_time = None
    
    query = db.query(
        func.count(Appeal.id).label('total'),
        func.count(case((Appeal.status == "new", 1))).label('new'),
        func.count(case((Appeal.status == "in_progress", 1))).label('in_progress'),
        func.count(case((Appeal.status == "resolved", 1))).label('resolved'),
        func.count(case((Appeal.status == "rejected", 1))).label('rejected')
    )
    
    if start_time:
        query = query.filter(Appeal.created_at >= start_time)
    
    result = query.one()
    
    return AppealsByPeriodStats(
        total=result.total,
        new=result.new,
        in_progress=result.in_progress,
        resolved=result.resolved,
        rejected=result.rejected
    )
