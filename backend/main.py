from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
from app.core.database import engine, Base, get_db
from app.routers import auth, appeals, categories, tags, users
from app.routers.auth import get_current_user, require_admin

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
