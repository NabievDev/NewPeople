from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime, timedelta
from typing import List, Literal
import os
from app.core.database import engine, Base, get_db
from app.routers import auth, appeals, categories, tags, users
from app.routers.auth import get_current_user, require_admin
from app.schemas.schemas import TimelineDataPoint, ModeratorStats, AppealsByPeriodStats

app = FastAPI(title="Citizens Appeals System - Новые Люди")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(appeals.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(users.router, prefix="/api")

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
    from app.models.models import Appeal, appeal_internal_tags, appeal_public_tags, InternalTag, PublicTag, AppealStatus
    from app.schemas.schemas import Statistics, TagStatistics
    
    total_appeals = db.query(Appeal).count()
    new_appeals = db.query(Appeal).filter(Appeal.status == AppealStatus.NEW).count()
    in_progress_appeals = db.query(Appeal).filter(Appeal.status == AppealStatus.IN_PROGRESS).count()
    resolved_appeals = db.query(Appeal).filter(Appeal.status == AppealStatus.RESOLVED).count()
    rejected_appeals = db.query(Appeal).filter(Appeal.status == AppealStatus.REJECTED).count()
    
    public_tag_stats = []
    public_tags = db.query(PublicTag).all()
    for tag in public_tags:
        count = db.query(appeal_public_tags).filter(appeal_public_tags.c.tag_id == tag.id).count()
        public_tag_stats.append(TagStatistics(
            tag_id=tag.id,
            tag_name=tag.name,
            count=count,
            is_public=True
        ))
    
    internal_tag_stats = []
    internal_tags = db.query(InternalTag).all()
    for tag in internal_tags:
        count = db.query(appeal_internal_tags).filter(appeal_internal_tags.c.tag_id == tag.id).count()
        internal_tag_stats.append(TagStatistics(
            tag_id=tag.id,
            tag_name=tag.name,
            count=count,
            is_public=False
        ))
    
    resolved_or_rejected = db.query(Appeal).filter(
        Appeal.status.in_([AppealStatus.RESOLVED, AppealStatus.REJECTED])
    ).all()
    
    average_resolution_time = None
    if resolved_or_rejected:
        total_seconds = 0
        count = 0
        for appeal in resolved_or_rejected:
            if appeal.created_at and appeal.updated_at:
                diff = appeal.updated_at - appeal.created_at
                total_seconds += diff.total_seconds()
                count += 1
        
        if count > 0:
            avg_seconds = total_seconds / count
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
        for i in range(24):
            hour_start = start_time + timedelta(hours=i)
            hour_end = hour_start + timedelta(hours=1)
            count = db.query(Appeal).filter(
                Appeal.created_at >= hour_start,
                Appeal.created_at < hour_end
            ).count()
            result.append(TimelineDataPoint(
                date=hour_start.strftime("%Y-%m-%d %H:%M"),
                count=count,
                label=hour_start.strftime("%H:00")
            ))
    
    elif period == "day":
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        current_hour = now.hour + 1
        for i in range(current_hour):
            hour_start = today_start + timedelta(hours=i)
            hour_end = hour_start + timedelta(hours=1)
            count = db.query(Appeal).filter(
                Appeal.created_at >= hour_start,
                Appeal.created_at < hour_end
            ).count()
            result.append(TimelineDataPoint(
                date=hour_start.strftime("%Y-%m-%d %H:%M"),
                count=count,
                label=hour_start.strftime("%H:00")
            ))
    
    elif period == "week":
        start_time = now - timedelta(days=7)
        start_time = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
        for i in range(7):
            day_start = start_time + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            count = db.query(Appeal).filter(
                Appeal.created_at >= day_start,
                Appeal.created_at < day_end
            ).count()
            result.append(TimelineDataPoint(
                date=day_start.strftime("%Y-%m-%d"),
                count=count,
                label=day_start.strftime("%a %d")
            ))
    
    elif period == "month":
        start_time = now - timedelta(days=30)
        start_time = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
        for i in range(30):
            day_start = start_time + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            count = db.query(Appeal).filter(
                Appeal.created_at >= day_start,
                Appeal.created_at < day_end
            ).count()
            result.append(TimelineDataPoint(
                date=day_start.strftime("%Y-%m-%d"),
                count=count,
                label=day_start.strftime("%d %b")
            ))
    
    elif period == "year":
        for i in range(12):
            month_offset = 11 - i
            year = now.year
            month = now.month - month_offset
            while month <= 0:
                month += 12
                year -= 1
            month_start = datetime(year, month, 1)
            if month == 12:
                month_end = datetime(year + 1, 1, 1)
            else:
                month_end = datetime(year, month + 1, 1)
            count = db.query(Appeal).filter(
                Appeal.created_at >= month_start,
                Appeal.created_at < month_end
            ).count()
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
        
        current_date = start_date
        while current_date <= now:
            year = current_date.year
            month = current_date.month
            if month == 12:
                month_end = datetime(year + 1, 1, 1)
            else:
                month_end = datetime(year, month + 1, 1)
            count = db.query(Appeal).filter(
                Appeal.created_at >= current_date,
                Appeal.created_at < month_end
            ).count()
            result.append(TimelineDataPoint(
                date=current_date.strftime("%Y-%m"),
                count=count,
                label=current_date.strftime("%b %Y")
            ))
            current_date = month_end
    
    return result


@app.get("/api/stats/moderators", response_model=List[ModeratorStats])
async def get_moderator_stats(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from app.models.models import User, UserRole, AppealHistory
    from app.schemas.schemas import ModeratorStats
    
    moderators = db.query(User).filter(
        User.role.in_([UserRole.MODERATOR, UserRole.ADMIN]),
        User.is_active == True
    ).all()
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    result = []
    for mod in moderators:
        total_processed = db.query(distinct(AppealHistory.appeal_id)).filter(
            AppealHistory.user_id == mod.id
        ).count()
        
        today_processed = db.query(distinct(AppealHistory.appeal_id)).filter(
            AppealHistory.user_id == mod.id,
            AppealHistory.created_at >= today_start
        ).count()
        
        result.append(ModeratorStats(
            id=mod.id,
            username=mod.username,
            email=mod.email or "",
            total_processed=total_processed,
            today_processed=today_processed
        ))
    
    return result


@app.get("/api/stats/appeals-by-period", response_model=AppealsByPeriodStats)
async def get_appeals_by_period(
    period: Literal["hour", "day", "week", "month", "year", "all"] = Query(default="all"),
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from app.models.models import Appeal, AppealStatus
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
    
    base_query = db.query(Appeal)
    if start_time:
        base_query = base_query.filter(Appeal.created_at >= start_time)
    
    total = base_query.count()
    new_count = base_query.filter(Appeal.status == AppealStatus.NEW).count()
    in_progress = base_query.filter(Appeal.status == AppealStatus.IN_PROGRESS).count()
    resolved = base_query.filter(Appeal.status == AppealStatus.RESOLVED).count()
    rejected = base_query.filter(Appeal.status == AppealStatus.REJECTED).count()
    
    return AppealsByPeriodStats(
        total=total,
        new=new_count,
        in_progress=in_progress,
        resolved=resolved,
        rejected=rejected
    )
